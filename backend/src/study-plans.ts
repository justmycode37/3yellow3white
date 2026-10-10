import { AgentError } from './agents/config.js';
import { generateStudyPlan, parsePlanDocument } from './agents/study-plan.js';
import { PiAgentRunner } from './agents/runtime.js';
import type { AgentRunner } from './agents/runtime.js';

/** Bounded, cancellable planning; drafts are saved only when the user accepts them. */
export function studyPlanRoutes(createRunner: () => AgentRunner = () => new PiAgentRunner()) {
  let active = 0;
  return async (request: Request): Promise<Response> => {
    const headers = { 'Cache-Control': 'no-store' };
    const reply = (detail: string, status: number) => Response.json({ detail }, { status, headers });
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { ...headers, Allow: 'POST' } });
    if (active >= 2) return reply('Study planning is busy. Try again shortly or use the document outline.', 429);
    active++;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(180000)]);
    try {
      const reader = request.body?.getReader();
      if (!reader) return reply('Course material is required.', 400);
      let size = 0;
      const chunks: Uint8Array[] = [];
      const abort = () => { void reader.cancel().catch(() => {}); };
      signal.addEventListener('abort', abort, { once: true });
      try {
        while (true) {
          signal.throwIfAborted();
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 2000000) { await reader.cancel(); return reply('Course material is too large. Split it into sections.', 413); }
          chunks.push(value);
        }
      } finally { signal.removeEventListener('abort', abort); reader.releaseLock(); }
      signal.throwIfAborted();
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      let document;
      try { document = parsePlanDocument(JSON.parse(new TextDecoder().decode(bytes))); }
      catch { return reply('Provide a document name and at least 20 words, up to 200,000 characters. Split longer material into sections.', 400); }
      if (process.env.VIDEO_GENERATOR === 'simulated') return reply('AI planning is unavailable in demo mode. Use the document outline instead.', 503);
      const plan = await generateStudyPlan(createRunner(), document, signal);
      return Response.json(plan, { headers });
    } catch (error) {
      if (signal.aborted) return reply('Planning was cancelled or took too long. Try again or use the document outline.', 408);
      return reply(error instanceof AgentError ? 'AI planning is unavailable. Try again or use the document outline.' : 'We could not create a valid plan. Try again or use the document outline.', 503);
    } finally { active--; }
  };
}
