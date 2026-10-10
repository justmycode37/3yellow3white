import { createWorkspacePipeline } from './story/workspace.js';
import { StoryService } from './story/service.js';
import { createHandler } from "./server.js";
import { VideoService } from './videos.js';
import { NarrationService } from './narration/service.js';
import { agentConfig } from './agents/config.js';
import { PiAgentRunner } from './agents/runtime.js';
import { createPiGenerator } from './agents/generator.js';

const generation = process.env.VIDEO_GENERATOR ?? 'astra';
if (generation !== 'astra' && generation !== 'pi' && generation !== 'simulated') throw new Error('VIDEO_GENERATOR must be astra, pi or simulated.');
const narration = new NarrationService();
const stories = new StoryService();
const config = generation === 'pi' ? agentConfig() : undefined;
const videos = new VideoService(process.env.VIDEO_DB_PATH ?? 'data/videos.sqlite',
  config ? createPiGenerator(new PiAgentRunner(config), narration, config.dataDir) : undefined, generation, generation === 'astra' ? createWorkspacePipeline(stories) : undefined);

const localNarration = process.env.NODE_ENV !== "production" && process.env.NARRATION_ALLOW_LOCAL === "1";
const localStory = process.env.NODE_ENV !== "production" && process.env.STORY_ALLOW_LOCAL === "1";
const hostname = process.env.HOST ?? (localNarration || localStory ? "127.0.0.1" : "0.0.0.0");
if ((localNarration || localStory) && !["127.0.0.1", "localhost", "::1"].includes(hostname)) {
  throw new Error("Local narration/story access requires a backend bound to loopback. Disable it when using a shared server.");
}
const server = Bun.serve({
  hostname,
  port: Number(process.env.PORT ?? 8080),
  idleTimeout: 60,
  maxRequestBodySize: 54 * 1024 * 1024,
  fetch: createHandler(undefined, videos, narration, stories),
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
  await stories.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
