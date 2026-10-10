import { StoryError, safeStoryError } from "./types.js";
import { StoryService } from "./service.js";

async function body(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new StoryError("CONTENT_TYPE", "Send application/json.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new StoryError("REQUEST", "A JSON body is required.", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 300_000) { await reader.cancel(); throw new StoryError("REQUEST_SIZE", "Request body is too large.", 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new StoryError("REQUEST", "Send valid JSON.", 400); }
}

export function storyRoutes(service = new StoryService(), options: { allowLocal?: boolean } = {}) {
  return async (request: Request, path: string): Promise<Response> => {
    try {
      const url = new URL(request.url);
      const local = options.allowLocal ?? (process.env.NODE_ENV !== "production" && process.env.STORY_ALLOW_LOCAL === "1");
      const owner = request.headers.get("x-user-id") || (local && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ? "local-developer" : null);
      if (!owner) throw new StoryError("UNAUTHORIZED", "Sign in through the application gateway, or enable local story access.", 401);
      const origin = request.headers.get("origin");
      if (request.method === "POST" && (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== (process.env.STORY_PUBLIC_ORIGIN ?? url.origin)))) throw new StoryError("ORIGIN", "Cross-origin story requests are not allowed.", 403);
      const match = /^\/api\/stories(?:\/([a-f0-9]{64})(?:\/(package|manifest|retry))?)?$/.exec(path);
      if (!match) throw new StoryError("NOT_FOUND", "Story route not found.", 404);
      const [, id, action] = match;
      const allowed = !id || action === "retry" ? ["POST"] : ["GET", "HEAD"];
      if (!allowed.includes(request.method)) return Response.json({ code: "METHOD", message: "Method not allowed." }, { status: 405, headers: { Allow: allowed.join(", "), "Cache-Control": "no-store" } });
      let response: Response;
      if (!id || action === "retry") {
        const job = id ? await service.retry(owner, id) : await service.submit(owner, await body(request));
        const { owner: _, ...safe } = job;
        response = Response.json({ ...safe, statusUrl: `/api/stories/${job.id}`, ...(job.status === "complete" ? { packageUrl: `/api/stories/${job.id}/package` } : {}) }, { status: job.status === "complete" ? 200 : 202 });
      } else if (action === "package") {
        const zip = await service.artifact(owner, id, "story.zip");
        response = new Response(zip, { headers: { "Content-Type": "application/zip", "Content-Length": String(zip.length), "X-Story-SHA256": (await service.get(owner, id)).zipSha256! } });
      } else if (action === "manifest") {
        response = new Response(await service.artifact(owner, id, "manifest.json"), { headers: { "Content-Type": "application/json" } });
      } else {
        const { owner: _, ...job } = await service.get(owner, id);
        response = Response.json({ ...job, ...(job.status === "complete" ? { packageUrl: `/api/stories/${id}/package`, manifestUrl: `/api/stories/${id}/manifest` } : {}) });
      }
      response.headers.set("Cache-Control", "private, no-store"); response.headers.set("X-Content-Type-Options", "nosniff");
      return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
    } catch (error) {
      const failure = safeStoryError(error);
      return Response.json({ code: failure.code, message: failure.message, retryable: failure.retryable }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
    }
  };
}
