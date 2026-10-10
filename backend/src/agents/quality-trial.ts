/** Explicit local experiment: real scene generation, frozen narration, no new TTS. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { compileSource, evaluateScene } from 'animlib/core';
import type { Frame } from 'animlib/core';
import { agentConfig } from './config.js';
import { PiAgentRunner } from './runtime.js';
import { createPiGenerator } from './generator.js';
import type { NarrationService } from '../narration/service.js';
import { atomicWrite } from '../narration/service.js';
import type { NarrationPackageV1 } from '../narration/types.js';

import { QUALITY_DEMO_PROMPT } from './quality-demo.js';
const repo = fileURLToPath(new URL('../../..', import.meta.url));
const root = resolve(repo, 'data/animation-quality');
const fixture = resolve(repo, 'data/scene-speed/fixtures/rna');
const variant = process.argv[2] ?? 'm1';
if (!/^[a-z0-9-]+$/.test(variant)) throw new Error('Use a lowercase trial name.');
await mkdir(root, { recursive: true });
if (variant === 'serve') {
  Bun.serve({ hostname: '127.0.0.1', port: 5208, async fetch(request) {
    const path = new URL(request.url).pathname;
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (path === '/manifest.json') {
      const { readdir } = await import('node:fs/promises');
      const files = (await readdir(root)).filter(name => name.endsWith('.result.json'));
      const runs = await Promise.all(files.map(async name => JSON.parse(await readFile(join(root, name), 'utf8'))));
      for (const run of runs) for (const scene of run.scenes) scene.audio.url = `http://127.0.0.1:5208/audio/${scene.id}.wav`;
      return Response.json({ runs }, { headers });
    }
    const audio = /^\/audio\/(beat-[12])\.wav$/.exec(path);
    if (audio) return new Response(Bun.file(join(fixture, `${audio[1]}.wav`)), { headers });
    return new Response('Not found', { status: 404, headers });
  } });
  console.log('Quality demo assets: http://127.0.0.1:5208/manifest.json');
} else {
  const config = agentConfig();
  if (variant.includes('sol')) config.model = 'gpt-6.1-sol';
  const pkg: NarrationPackageV1 = JSON.parse(await readFile(join(fixture, 'narration.json'), 'utf8'));
  const lesson = JSON.parse(await readFile(join(fixture, 'lesson.json'), 'utf8'));
  const videoId = randomUUID(), directory = join(root, videoId);
  await mkdir(directory);
  await writeFile(join(directory, 'lesson.json'), JSON.stringify(lesson));
  await writeFile(join(directory, 'narration-id'), pkg.id);
  const narration = {
    available: true,
    get: async () => ({ id: pkg.id, status: 'complete' }),
    scenePackage: async () => ({ ...pkg, totalScenes: pkg.scenes.length }),
    audio: async (_owner: string, _id: string, asset: string) => {
      const scene = pkg.scenes.find(scene => scene.audio.id === asset);
      if (!scene) throw new Error('Unknown frozen audio asset.');
      return join(fixture, `${scene.id}.wav`);
    },
  } as unknown as NarrationService;
  const pi = new PiAgentRunner(config);
  let taskNumber = 0;
  const runner = { async run(task: import('./runtime.js').AgentTask) {
    const number = taskNumber++;
    let metrics: unknown;
    try { return await pi.run({ ...task, onMetrics: value => { metrics = value; } }); }
    finally { if (metrics) await atomicWrite(join(directory, `scene-${task.logContext?.sceneIndex}.${task.logContext?.stage}-${number}.metrics.json`), JSON.stringify(metrics, null, 2)); }
  } };
  const generate = createPiGenerator(runner, narration, root, { outputMode: 'validated-reference', timingMode: 'host' });
  const request = { title: 'RNA transcription quality milestones', topic: QUALITY_DEMO_PROMPT, documents: [], videoMode: 'classic' as const };
  const result = { id: `${variant}-${videoId}`, variant, topic: 'rna', title: request.title, prompt: QUALITY_DEMO_PROMPT,
    promptSha256: createHash('sha256').update(QUALITY_DEMO_PROMPT).digest('hex'), model: config.model, thinking: config.thinking,
    videoId, status: 'running', error: undefined as string | undefined, elapsedMs: 0, scenes: [] as object[] };
  await writeFile(join(directory, 'trial.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ variant, videoId, model: config.model, directory }));
  let previousFrame: Frame | undefined;
  const started = performance.now();
  const save = () => atomicWrite(join(root, `${variant}.result.json`), JSON.stringify(result));
  await save();
  try {
  for (let index = 0; index < pkg.scenes.length; index++) {
    const output = await generate(request, index, { owner: 'quality-demo', videoId, previousFrame, signal: new AbortController().signal });
    if (!output) throw new Error('Frozen lesson ended early.');
    const compiled = await compileSource(output.scene.source, { previous: previousFrame });
    previousFrame = evaluateScene(compiled, compiled.duration);
    result.scenes.push({ ...output.scene, audio: { ...output.scene.audio, url: `http://127.0.0.1:5208/audio/${output.scene.id}.wav` } });
    result.elapsedMs = performance.now() - started;
    await save();
  }
  result.status = 'complete';
  await save();
  console.log(JSON.stringify({ variant, elapsedMs: result.elapsedMs, status: result.status }));
  } catch (error) {
    result.status = 'failed'; result.elapsedMs = performance.now() - started;
    result.error = error instanceof Error ? error.message : String(error);
    await save(); throw error;
  }
}
