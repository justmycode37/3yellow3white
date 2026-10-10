import { createHandler } from "./server.js";
import { VideoService } from './videos.js';

const videos = new VideoService(process.env.VIDEO_DB_PATH ?? 'data/videos.sqlite');

const localNarration = process.env.NODE_ENV !== "production" && process.env.NARRATION_ALLOW_LOCAL === "1";
const hostname = process.env.HOST ?? (localNarration ? "127.0.0.1" : "0.0.0.0");
if (localNarration && !["127.0.0.1", "localhost", "::1"].includes(hostname)) {
  throw new Error("NARRATION_ALLOW_LOCAL requires a backend bound to loopback. Disable it when using a shared server.");
}
const server = Bun.serve({
  hostname,
  port: Number(process.env.PORT ?? 8080),
  idleTimeout: 30,
  fetch: createHandler(undefined, videos),
  error(error) {
    console.error(error);
    return Response.json({ detail: "Internal Server Error" }, { status: 500 });
  },
});

console.log(`Aha! backend listening on ${server.url}`);
