/** Matched generation experiments. Never mutates production configuration or prior jobs. */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID, randomInt } from 'node:crypto';
import { compileSource, evaluateScene } from 'animlib/core';
import type { Frame } from 'animlib/core';
import type { createPiGenerator } from '../src/agents/generator.js';
import { agentConfig } from '../src/agents/config.js';
import { PiAgentRunner } from '../src/agents/runtime.js';
import type { AgentTask, AgentRunMetrics } from '../src/agents/runtime.js';
import { renderSceneFrames } from '../src/agents/frame-renderer.js';
import { QUALITY_DEMO_PROMPT } from '../src/agents/quality-demo.js';
import type { NarrationPackageV1 } from '../src/narration/types.js';
import type { NarrationService } from '../src/narration/service.js';
import { atomicWrite } from '../src/narration/service.js';

const repo = resolve(import.meta.dir, '../..');
const root = join(repo, 'data/quality-comparison');
const versions = { fast: '1c79058', slow: '1d47cbe' } as const;
const prompts = {
  rna: QUALITY_DEMO_PROMPT,
  binary: 'Explain binary search to a first-year student. Find 23 in the sorted array [3,7,12,18,23,31,42,56], using lower midpoints. Show why sorted order lets one comparison eliminate a whole range, then repeat until found. Preserve array positions and identities. Keep labels readable, motion purposeful, and the screen uncluttered in the existing mathematical serif/vector style.',
  derivative: 'Explain why the derivative of x squared is two x to a first-year student. Start with an x-by-x square, add two x-by-h strips and an h-by-h corner, then divide the added area by h and let h approach zero. Preserve geometric identities and connect every algebraic term to its region. Keep labels readable, motion purposeful, and the screen uncluttered in the existing mathematical serif/vector style.',
};
type Topic = keyof typeof prompts;
type Variant = keyof typeof versions;
const json = async (path: string) => JSON.parse(await readFile(path, 'utf8'));
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const save = (path: string, value: unknown) => atomicWrite(path, JSON.stringify(value, null, 2));
const batch = process.argv[3];
if (!batch || !/^[a-z0-9-]+$/.test(batch)) throw new Error('Use prepare|pair|serve BATCH [TEST_NUMBER] [rna|binary|derivative].');
const batchDir = join(root, batch);

async function snapshotModules() {
  const metadata: Record<string, unknown> = {};
  for (const variant of Object.keys(versions) as Variant[]) {
    const directory = join(batchDir, 'snapshots', variant);
    await mkdir(directory, { recursive: true });
    const files: Record<string, string> = {};
    for (const name of ['generator', 'visual-gate']) {
      const originalPath = `backend/src/agents/${name}.ts`;
      const original = execFileSync('git', ['show', `${versions[variant]}:${originalPath}`], { cwd: repo, encoding: 'utf8', windowsHide: true });
      files[originalPath] = hash(original);
      await writeFile(join(directory, `${name}.original.txt`), original);
      const originalUrl = pathToFileURL(join(repo, originalPath)).href;
      const relocated = original.replace(/(from\s+)(['"])(\.[^'"]+)\2/g, (_all, from, _quote, specifier: string) => {
        const path = name === 'generator' && specifier === './visual-gate.js'
          ? join(directory, 'visual-gate.ts') : resolve(dirname(join(repo, originalPath)), specifier);
        return `${from}${JSON.stringify(pathToFileURL(path).href)}`;
      }).replaceAll('import.meta.url', JSON.stringify(originalUrl));
      await writeFile(join(directory, `${name}.ts`), relocated);
    }
    metadata[variant] = { revision: execFileSync('git', ['rev-parse', versions[variant]], { cwd: repo, encoding: 'utf8', windowsHide: true }).trim(), files };
    // Loading both proves relocation is valid before spending model calls.
    const loaded = await import(pathToFileURL(join(directory, 'generator.ts')).href);
    if (typeof loaded.createPiGenerator !== 'function') throw new Error('Historical generator export missing.');
  }
  return metadata;
}

async function auditPair(number: number) {
  if (![1, 2, 3].includes(number)) throw new Error('Pass test 1–3.');
  const pairDir = join(batchDir, `test-${number}`), pair = await json(join(pairDir, 'pair.json'));
  const fixture = join(repo, 'data/scene-speed/fixtures', pair.topic);
  const [pkg, lesson] = await Promise.all([json(join(fixture, 'narration.json')), json(join(fixture, 'lesson.json'))]);
  const results = await Promise.all(['fast', 'slow'].map(variant => json(join(pairDir, variant, 'result.json'))));
  if (results.some(result => result.status === 'running')) throw new Error('Wait for both generation timers to finish before auditing.');
  for (const result of results) {
    const blind = join(pairDir, 'blind', result.blindLabel); await mkdir(blind, { recursive: true });
    const context = { prompt: pair.prompt, lesson, scenes: pkg.scenes, completedScenes: result.scenes.length, status: result.status, unpublishedCandidate: false };
    let previous: Frame | undefined;
    const render = async (source: string, name: string, expectedDuration: number) => {
      const compiled = await compileSource(source, { previous });
      if (!Number.isFinite(expectedDuration) || Math.abs(compiled.duration - expectedDuration) > 1e-6) throw new Error('Audit duration mismatch.');
      const times = [0, Math.min(0.5, compiled.duration / 4), ...Array.from({ length: 14 }, (_, i) => compiled.duration * (i + 1) / 14)];
      const audit = join(blind, name);
      await renderSceneFrames({ source, previousFrame: previous, times, directory: audit, signal: AbortSignal.timeout(120_000) });
      await writeFile(join(audit, 'source.js'), source);
      previous = evaluateScene(compiled, compiled.duration);
    };
    for (let index = 0; index < result.scenes.length; index++) {
      const scene = result.scenes[index];
      if (hash(scene.source) !== scene.sourceSha256) throw new Error('Saved source changed before audit.');
      await render(scene.source, `scene-${index}`, scene.duration);
    }
    if (result.status === 'failed') {
      const index = result.scenes.length, visual = join(result.directory, `scene-${index}.visual`);
      const attempts = (await readdir(visual).catch(() => [])).filter(name => /^[0-2]$/.test(name)).sort();
      if (attempts.length) {
        const source = await readFile(join(visual, attempts.at(-1)!, 'candidate.js'), 'utf8');
        await render(source, `unpublished-scene-${index}`, pkg.scenes[index].durationSec);
        context.unpublishedCandidate = true;
      }
    }
    await save(join(blind, 'context.json'), context);
  }
  console.log(JSON.stringify({ event: 'comparison.audited', number }));
}

if (process.argv[2] === 'prepare') {
  await mkdir(root, { recursive: true });
  await mkdir(batchDir, { recursive: false });
  const snapshots = await snapshotModules();
  const config = agentConfig();
  await save(join(batchDir, 'experiment.json'), { batch, createdAt: new Date().toISOString(), snapshots,
    model: config.model, thinking: config.thinking, provider: config.provider, protocol: 'Three paired fresh generations; same frozen inputs; no manual edits; retain all failures.' });
  console.log(JSON.stringify({ batchDir, snapshots }));
} else if (process.argv[2] === 'pair') {
  const number = Number(process.argv[4]), topic = process.argv[5] as Topic;
  if (![1, 2, 3].includes(number) || !Object.hasOwn(prompts, topic)) throw new Error('Pass test 1–3 and known topic.');
  const experiment = await json(join(batchDir, 'experiment.json'));
  const config = agentConfig();
  if (config.model !== experiment.model || config.thinking !== experiment.thinking || config.provider !== experiment.provider) throw new Error('Model configuration changed.');
  const pairDir = join(batchDir, `test-${number}`);
  await mkdir(pairDir, { recursive: false }); // Existing results are never overwritten or silently retried.
  const fixture = join(repo, 'data/scene-speed/fixtures', topic);
  const pkg: NarrationPackageV1 = await json(join(fixture, 'narration.json'));
  const lesson = await json(join(fixture, 'lesson.json'));
  const frozen = await json(join(fixture, 'frozen.json'));
  if (hash(JSON.stringify(pkg)) !== frozen.packageHash || hash(JSON.stringify(lesson)) !== frozen.fixtureHash) throw new Error('Frozen fixture changed.');
  for (const scene of pkg.scenes) if (hash(await readFile(join(fixture, `${scene.id}.wav`))) !== frozen.audioHashes[scene.id]) throw new Error('Frozen audio changed.');
  const labels: Record<Variant, string> = randomInt(2) ? { fast: 'A', slow: 'B' } : { fast: 'B', slow: 'A' };
  await save(join(pairDir, 'pair.json'), { number, topic, prompt: prompts[topic], promptSha256: hash(prompts[topic]), frozen, blindMapping: labels });
  const run = async (variant: Variant) => {
    const videoId = randomUUID(), generationRoot = join(pairDir, variant), directory = join(generationRoot, videoId);
    await mkdir(directory, { recursive: true });
    await save(join(directory, 'lesson.json'), lesson);
    await writeFile(join(directory, 'narration-id'), pkg.id);
    const factory: typeof createPiGenerator = (await import(pathToFileURL(join(batchDir, 'snapshots', variant, 'generator.ts')).href)).createPiGenerator;
    const narration = { available: true, get: async () => ({ id: pkg.id, status: 'complete' }),
      scenePackage: async () => ({ ...pkg, totalScenes: pkg.scenes.length }),
      audio: async (_owner: string, _id: string, asset: string) => {
        const scene = pkg.scenes.find(s => s.audio.id === asset); if (!scene) throw new Error('Unknown audio.');
        return join(fixture, `${scene.id}.wav`);
      },
    } as unknown as NarrationService;
    const pi = new PiAgentRunner(config); let taskNumber = 0;
    const metrics: { stage: string; scene: number; metrics?: AgentRunMetrics }[] = [];
    const runner = { async run(task: AgentTask) {
      const index = taskNumber++, entry = { stage: task.logContext?.stage ?? 'unknown', scene: task.logContext?.sceneIndex ?? -1, metrics: undefined as AgentRunMetrics | undefined };
      try { return await pi.run({ ...task, onMetrics: m => { entry.metrics = m; task.onMetrics?.(m); } }); }
      finally { metrics.push(entry); await save(join(directory, `task-${index}.metrics.json`), entry); }
    } };
    const generate = factory(runner, narration, generationRoot, { outputMode: 'validated-reference', timingMode: 'host' });
    const request = { title: topic === 'rna' ? 'RNA transcription quality milestones' : lesson.plan.centralQuestion, topic: prompts[topic], documents: [], videoMode: 'classic' as const };
    const result = { id: `${batch}-${number}-${variant}`, variant: `Test ${number}: ${variant} (${topic})`, version: variant,
      topic, title: request.title, model: config.model, thinking: config.thinking, videoId, directory, blindLabel: labels[variant],
      promptSha256: hash(prompts[topic]), status: 'running', error: undefined as string | undefined, elapsedMs: 0, metrics,
      scenes: [] as { id: string; source: string; duration: number; sourceSha256: string; approvedAttempt: number; audio: { id?: string; url: string } }[] };
    await save(join(generationRoot, 'result.json'), result);
    const start = performance.now(); let previousFrame: Frame | undefined;
    console.log(JSON.stringify({ event: 'comparison.started', number, variant, directory }));
    try {
      for (let index = 0; index < pkg.scenes.length; index++) {
        const output = await generate(request, index, { owner: 'quality-comparison', videoId, previousFrame, signal: AbortSignal.timeout(30 * 60 * 1000) });
        if (!output) throw new Error('Lesson ended early.');
        const compiled = await compileSource(output.scene.source, { previous: previousFrame });
        const receipt = await json(join(directory, `scene-${index}.visual-review.json`));
        if (!receipt.approved || receipt.sourceSha256 !== hash(output.scene.source)) throw new Error('Approval/source mismatch.');
        result.scenes.push({ ...output.scene, sourceSha256: hash(output.scene.source), approvedAttempt: receipt.attempt,
          audio: { ...output.scene.audio, url: `http://127.0.0.1:5209/audio/${topic}/${output.scene.id}.wav` } });
        previousFrame = evaluateScene(compiled, compiled.duration);
        result.elapsedMs = performance.now() - start;
        await save(join(generationRoot, 'result.json'), result);
      }
      result.status = 'complete';
    } catch (error) { result.status = 'failed'; result.error = error instanceof Error ? error.message : String(error); }
    result.elapsedMs = performance.now() - start;
    await save(join(generationRoot, 'result.json'), result);
    console.log(JSON.stringify({ event: 'comparison.finished', number, variant, status: result.status, elapsedMs: result.elapsedMs }));
  };
  const outcomes = await Promise.allSettled((number % 2 ? ['fast', 'slow'] : ['slow', 'fast']).map(v => run(v as Variant)));
  for (const outcome of outcomes) if (outcome.status === 'rejected') { console.error(outcome.reason); process.exitCode = 1; }
  // Neither audit may consume CPU/GPU while its partner's generation timer runs.
  if (!process.exitCode) await auditPair(number);
} else if (process.argv[2] === 'audit') {
  await auditPair(Number(process.argv[4]));
} else if (process.argv[2] === 'serve') {
  Bun.serve({ hostname: '127.0.0.1', port: 5209, async fetch(request) {
    const path = new URL(request.url).pathname, headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
    if (path === '/manifest.json') {
      const runs = [], trials = [];
      for (const pair of (await readdir(batchDir)).filter(p => /^test-[123]$/.test(p))) for (const variant of ['fast', 'slow']) {
        const result = await json(join(batchDir, pair, variant, 'result.json')).catch(() => null);
        if (!result) continue; trials.push({ id: result.id, status: result.status, error: result.error });
        if (result.status === 'complete') runs.push(result);
      }
      return Response.json({ runs, trials }, { headers });
    }
    const audio = /^\/audio\/(rna|binary|derivative)\/(beat-[12])\.wav$/.exec(path);
    if (audio) return new Response(Bun.file(join(repo, 'data/scene-speed/fixtures', audio[1], `${audio[2]}.wav`)), { headers });
    return new Response('Not found', { status: 404, headers });
  } });
  console.log(`Comparison gallery assets: http://127.0.0.1:5209/manifest.json (${batch})`);
} else throw new Error('Use prepare, pair or serve.');
