import { createHandler } from "./server.js";
import { VideoService } from './videos.js';

const videos = new VideoService(process.env.VIDEO_DB_PATH ?? 'data/videos.sqlite');

const server = Bun.serve({
  hostname: process.env.HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? 8080),
  idleTimeout: 30,
  fetch: createHandler(undefined, videos),
  error(error) {
    console.error(error);
    return Response.json({ detail: "Internal Server Error" }, { status: 500 });
  },
});

console.log(`Aha! backend listening on ${server.url}`);
