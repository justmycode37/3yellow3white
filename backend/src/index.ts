import { createHandler } from "./server.js";
import { VideoService } from './videos.js';
import { NarrationService } from './narration/service.js';
import { agentConfig } from './agents/config.js';
import { PiAgentRunner } from './agents/runtime.js';
import { createPiGenerator } from './agents/generator.js';
import { createThumbnailGenerator, thumbnailAgentConfig } from './agents/thumbnail.js';

const generation = process.env.VIDEO_GENERATOR ?? 'pi';
if (generation !== 'pi' && generation !== 'simulated') throw new Error('VIDEO_GENERATOR must be pi or simulated.');
const narration = new NarrationService();
const config = generation === 'pi' ? agentConfig() : undefined;
const videos = new VideoService(process.env.VIDEO_DB_PATH ?? 'data/videos.sqlite',
  config ? createPiGenerator(new PiAgentRunner(config), narration, config.dataDir) : undefined, generation,
  config ? createThumbnailGenerator(new PiAgentRunner(thumbnailAgentConfig())) : undefined);

const localNarration = process.env.NODE_ENV !== "production" && process.env.NARRATION_ALLOW_LOCAL === "1";
const hostname = process.env.HOST ?? (localNarration ? "127.0.0.1" : "0.0.0.0");
if (localNarration && !["127.0.0.1", "localhost", "::1"].includes(hostname)) {
  throw new Error("NARRATION_ALLOW_LOCAL requires a backend bound to loopback. Disable it when using a shared server.");
}
const handler = createHandler(undefined, videos, narration);
const server = Bun.serve({
  hostname,
  port: Number(process.env.PORT ?? 8080),
  idleTimeout: 30,
  maxRequestBodySize: 101 * 1024 * 1024,
  fetch(request, server) {
    // Planning is a bounded model request and can exceed the default idle timeout.
    if (new URL(request.url).pathname === '/api/study-plans') server.timeout(request, 210);
    return handler(request);
  },
  error(error) {
    console.error(error);
    return Response.json({ detail: "Internal Server Error" }, { status: 500 });
  },
});

console.log(`Aha! backend listening on ${server.url}`);

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  server.stop(true);
  await videos.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
