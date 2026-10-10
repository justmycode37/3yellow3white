import { agentConfig, AgentError } from './agents/config.js';
import { generateStudyPlan, parsePlanDocument } from './agents/study-plan.js';
import { PiAgentRunner } from './agents/runtime.js';
import type { AgentRunner } from './agents/runtime.js';
import { MaterialError, readCourseMaterial } from './course-material.js';
import { proxyUser } from './identity.js';
import { logEvent } from './logging.js';

export function studyPlanAgentConfig(env: Record<string, string | undefined> = process.env) {
  return { ...agentConfig(env), model: env.STUDY_PLAN_MODEL ?? 'gpt-6.1-sol', thinking: 'medium' as const };
}

type Result = { body: unknown; status: number };
type Job = { owner: string | null; controller: AbortController; stage: 'reading' | 'planning'; result?: Result; expires: number };
const headers = { 'Cache-Control': 'private, no-store', Vary: 'X-User-Id' };
const failure = (detail: string, status: number): Result => ({ body: { detail }, status });
const respond = ({ body, status }: Result) => Response.json(body, { status, headers });

function planningError(error: unknown, signal: AbortSignal): Result {
  if (signal.aborted) return failure('Planning was cancelled or took too long. Your material is still here. Try fewer files at once.', 408);
  if (error instanceof MaterialError) return failure(error.message, 400);
  if (error instanceof AgentError) {
    logEvent('study-plan.failed', { code: error.code, ...error.diagnostics }, 'error');
    if (error.code === 'AUTH' || error.code === 'CONFIG') return failure('The course planner needs its server AI connection restored. Your material is still here.', 503);
    if (error.code === 'MODEL') return failure('The course planner’s model is unavailable. Your material is still here. Please try again later.', 503);
    if (error.code === 'LIMIT') return failure('The AI service has reached its usage limit. Your material is still here. Please try again later.', 429);
  }
  return failure('We could not finish organizing your material. Your files and notes are still here. Please try again.', 503);
}

/** Upload once, then poll short requests so the production gateway cannot time out model work. */
export function studyPlanRoutes(createRunner: () => AgentRunner = () => new PiAgentRunner(studyPlanAgentConfig()),
  options: { jobTimeoutMs?: number; resultTtlMs?: number; now?: () => number } = {}) {
  const jobs = new Map<string, Job>();
  const now = options.now ?? Date.now;
  const ttl = options.resultTtlMs ?? 15 * 60_000;
  let active = 0;

  async function plan(bytes: Uint8Array<ArrayBuffer>, contentType: string, signal: AbortSignal, progress: (stage: Job['stage']) => void): Promise<Result> {
    try {
      signal.throwIfAborted();
      if (process.env.VIDEO_GENERATOR === 'simulated') return failure('AI planning is unavailable in demo mode. Connect the AI backend and try again.', 503);
      let document, sourceNames: string[] | undefined;
      let agent: AgentRunner | undefined;
      const runner: AgentRunner = { run: task => { signal.throwIfAborted(); return (agent ??= createRunner()).run(task); } };
      if (contentType.startsWith('multipart/form-data')) {
        let form: FormData;
        try { form = await new Response(bytes, { headers: { 'Content-Type': contentType } }).formData(); }
        catch { return failure('Could not read the upload. Choose your files again.', 400); }
        const material = await readCourseMaterial(form, runner, signal);
        document = material.document; sourceNames = material.sourceNames;
      } else {
        try { document = JSON.parse(new TextDecoder().decode(bytes)); }
        catch { return failure('Provide valid course material.', 400); }
      }
      try { document = parsePlanDocument(document); }
      catch { return failure('Provide a document name and readable material, up to 200,000 characters. Split longer material into sections.', 400); }
      progress('planning');
      const result = await generateStudyPlan(runner, document, signal);
      if (sourceNames) result.sourceNames = sourceNames;
      return { body: result, status: 200 };
    } catch (error) { return planningError(error, signal); }
  }

  return async (request: Request): Promise<Response> => {
    for (const [id, job] of jobs) if (job.result && job.expires <= now()) jobs.delete(id);
    const path = new URL(request.url).pathname;
    if (path !== '/api/study-plans') {
      const id = /^\/api\/study-plans\/([a-f0-9-]{36})$/.exec(path)?.[1];
      const job = id ? jobs.get(id) : undefined;
      if (!job || job.owner !== (proxyUser(request)?.id ?? null)) return respond(failure('This planning request expired or the server restarted. Your material is still here. Please add it again.', 404));
      if (request.method === 'DELETE') {
        job.controller.abort(); jobs.delete(id!);
        return new Response(null, { status: 204, headers });
      }
      if (request.method !== 'GET') return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, DELETE' } });
      return job.result ? respond(job.result) : Response.json({ id, stage: job.stage }, { status: 202, headers });
    }
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { ...headers, Allow: 'POST' } });
    if (active >= 2) return respond(failure('Study planning is busy. Try again shortly.', 429));
    active++;
    let background = false;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(180_000)]);
    const contentType = request.headers.get('content-type') ?? '';
    try {
      const reader = request.body?.getReader();
      if (!reader) return respond(failure('Course material is required.', 400));
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
          if (size > (contentType.startsWith('multipart/form-data') ? 101 * 1024 * 1024 : 2_000_000)) {
            await reader.cancel(); return respond(failure('Course material is too large. Split it into sections.', 413));
          }
          chunks.push(value);
        }
      } finally { signal.removeEventListener('abort', abort); reader.releaseLock(); }
      signal.throwIfAborted();
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      // Keep the existing synchronous contract for older clients.
      if (!request.headers.get('prefer')?.split(',').some(value => value.trim() === 'respond-async')) {
        return respond(await plan(bytes, contentType, signal, () => {}));
      }
      // Bound retained source/results as well as active model requests.
      while (jobs.size >= 20) {
        const finished = [...jobs].find(([, job]) => job.result);
        if (!finished) return respond(failure('Study planning is busy. Try again shortly.', 429));
        jobs.delete(finished[0]);
      }
      const id = crypto.randomUUID();
      const controller = new AbortController();
      const job: Job = { owner: proxyUser(request)?.id ?? null, controller, stage: 'reading', expires: Infinity };
      jobs.set(id, job);
      const timer = setTimeout(() => controller.abort(), options.jobTimeoutMs ?? 10 * 60_000);
      timer.unref();
      background = true;
      // The job has its own lifetime; closing the upload response must not cancel it.
      void plan(bytes, contentType, controller.signal, stage => { job.stage = stage; }).then(result => {
        job.result = result; job.expires = now() + ttl;
      }).finally(() => { clearTimeout(timer); active--; });
      return Response.json({ id, stage: job.stage }, { status: 202, headers: { ...headers, 'Preference-Applied': 'respond-async', Location: `/api/study-plans/${id}` } });
    } catch (error) { return respond(planningError(error, signal)); }
    finally { if (!background) active--; }
  };
}
