/** Local, read-only source server: bun docs/demos/dna-protein/serve.ts */
import { resolve } from 'node:path';
const root = import.meta.dir;
const video = resolve(root, '../../../data/dna-protein/film.mp4');
const stamp = (seconds: number) => {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
};
const server = Bun.serve({
  hostname: '127.0.0.1', port: 5215,
  async fetch(request) {
    const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5207', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Cache-Control': 'no-store' };
    const reply = (body: BodyInit | null, status = 200, type = 'text/plain; charset=utf-8') => new Response(request.method === 'HEAD' ? null : body, { status, headers: { ...headers, 'Content-Type': type } });
    if (request.method === 'OPTIONS') return reply(null, 204);
    if (!['GET', 'HEAD'].includes(request.method)) return reply('Method not allowed', 405);
    const path = new URL(request.url).pathname;
    try {
      if (path === '/captions.vtt') {
        const manifest = await Bun.file(resolve(root, 'manifest.json')).json();
        const cues = manifest.captions.map((cue: { start: number; end: number; text: string }, i: number) => `${i + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}\n`).join('\n');
        return reply(`WEBVTT\n\n${cues}`, 200, 'text/vtt; charset=utf-8');
      }
      const source = /^\/source\/([\w.-]+\.js)$/.exec(path);
      const filePath = path === '/manifest.json' ? resolve(root, 'manifest.json') : path === '/film.mp4' ? video : source ? resolve(root, source[1]) : undefined;
      if (!filePath) return reply('Not found', 404);
      const file = Bun.file(filePath);
      if (!await file.exists()) return reply('Not found', 404);
      return reply(file, 200, path.endsWith('.mp4') ? 'video/mp4' : path.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/javascript; charset=utf-8');
    } catch (error) { console.error(error); return reply('Unable to read requested resource', 500); }
  },
});
console.log(`DNA/protein sources: http://${server.hostname}:${server.port}`);
