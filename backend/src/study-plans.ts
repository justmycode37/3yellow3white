import { agentConfig, AgentError } from './agents/config.js';
import { generateStudyPlan, parsePlanDocument } from './agents/study-plan.js';
import { PiAgentRunner } from './agents/runtime.js';
import type { AgentRunner } from './agents/runtime.js';
import { MaterialError, readCourseMaterial } from './course-material.js';

export function studyPlanAgentConfig(env: Record<string, string | undefined> = process.env) {
  return { ...agentConfig(env), model: env.STUDY_PLAN_MODEL ?? 'gpt-6.1-sol', thinking: 'medium' as const };
}

/** Bounded, cancellable planning, started by the course Add action. */
export function studyPlanRoutes(createRunner: () => AgentRunner = () => new PiAgentRunner(studyPlanAgentConfig())) {
  let active = 0;
  return async (request: Request): Promise<Response> => {
    const headers = { 'Cache-Control': 'no-store' };
    const reply = (detail: string, status: number) => Response.json({ detail }, { status, headers });
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { ...headers, Allow: 'POST' } });
    if (active >= 2) return reply('Study planning is busy. Try again shortly.', 429);
    active++;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(180000)]);
    const multipart = request.headers.get('content-type')?.startsWith('multipart/form-data') ?? false;
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
          if (size > (multipart ? 101 * 1024 * 1024 : 2000000)) { await reader.cancel(); return reply('Course material is too large. Split it into sections.', 413); }
          chunks.push(value);
        }
      } finally { signal.removeEventListener('abort', abort); reader.releaseLock(); }
      signal.throwIfAborted();
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      if (process.env.VIDEO_GENERATOR === 'simulated') return reply('AI planning is unavailable in demo mode. Connect the AI backend and try again.', 503);
      let document, sourceNames: string[] | undefined;
      let agent: AgentRunner | undefined;
      const runner: AgentRunner = { run: task => (agent ??= createRunner()).run(task) };
      if (multipart) {
        let form: FormData;
        try { form = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type')! } }).formData(); }
        catch { return reply('Could not read the upload. Choose your files again.', 400); }
        const material = await readCourseMaterial(form, runner, signal);
        document = material.document; sourceNames = material.sourceNames;
      } else {
        try { document = JSON.parse(new TextDecoder().decode(bytes)); }
        catch { return reply('Provide valid course material.', 400); }
      }
      try { document = parsePlanDocument(document); }
      catch { return reply('Provide a document name and at least 20 words, up to 200,000 characters. Split longer material into sections.', 400); }
      const plan = await generateStudyPlan(runner, document, signal);
      if (sourceNames) plan.sourceNames = sourceNames;
      return Response.json(plan, { headers });
    } catch (error) {
      if (error instanceof MaterialError) return reply(error.message, 400);
      if (signal.aborted) return reply('Planning was cancelled or took too long. Your material has been kept. Please try again.', 408);
      return reply(error instanceof AgentError ? 'AI planning is unavailable. Your material has been kept. Please try again.' : 'We could not create a valid plan. Your material has been kept. Please try again.', 503);
    } finally { active--; }
  };
}
