import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const defaultFrontendDir = fileURLToPath(new URL("../../frontend/site/", import.meta.url));

function user(request: Request) {
  const rawName = request.headers.get("x-user-name");
  let name = rawName || null;
  if (name) {
    try { name = decodeURIComponent(name); } catch { /* Keep malformed proxy text readable. */ }
  }
  return { id: request.headers.get("x-user-id"), name };
}

function notFound() {
  return Response.json({ detail: "Not Found" }, { status: 404 });
}

function inside(root: string, path: string) {
  const suffix = relative(root, path);
  return suffix !== ".." && !suffix.startsWith(`..${sep}`) && !isAbsolute(suffix);
}

export function createHandler(frontendDir = defaultFrontendDir) {
  const root = resolve(frontendDir);

  async function serveFile(path: string) {
    const candidate = resolve(root, path);
    if (!inside(root, candidate)) return notFound();
    try {
      // Resolve symlinks as well as '..' before exposing files over HTTP.
      const [realRoot, realFile] = await Promise.all([realpath(root), realpath(candidate)]);
      if (!inside(realRoot, realFile) || !(await stat(realFile)).isFile()) return notFound();
      return new Response(Bun.file(realFile));
    } catch (error) {
      if (["ENOENT", "ENOTDIR"].includes((error as NodeJS.ErrnoException).code ?? "")) return notFound();
      throw error;
    }
  }

  return async function handle(request: Request): Promise<Response> {
    let path: string;
    try { path = decodeURIComponent(new URL(request.url).pathname); }
    catch { return Response.json({ detail: "Invalid URL" }, { status: 400 }); }
    if (path.includes("\0")) return Response.json({ detail: "Invalid URL" }, { status: 400 });

    const api = path === "/api/hello" || path === "/api/me" || path === "/healthz";
    const page = path === "/" || path === "/plan" || path === "/settings" || /^\/watch\/[^/]+$/.test(path);
    const asset = path.startsWith("/static/");
    if (!api && !page && !asset) return notFound();
    if (request.method !== "GET" && request.method !== "HEAD") {
      return Response.json({ detail: "Method Not Allowed" }, { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    let response: Response;
    if (path === "/healthz") response = Response.json({
      ok: true,
      ...(process.env.APP_REVISION ? { revision: process.env.APP_REVISION } : {}),
    });
    else if (path === "/api/me") response = Response.json({ user: user(request) });
    else if (path === "/api/hello") response = Response.json({ message: "Hello from the 3yellow3white backend", user: user(request) });
    else response = await serveFile(page ? "index.html" : path.slice("/static/".length));
    return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
  };
}
