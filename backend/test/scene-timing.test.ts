import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileSource, evaluateScene } from 'animlib/core';
import { agentConfig } from '../src/agents/config.js';
import { createPiGenerator } from '../src/agents/generator.js';
import type { AgentTask } from '../src/agents/runtime.js';
import type { NarrationService } from '../src/narration/service.js';
import type { NarrationScenePackage } from '../src/narration/types.js';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
const packet: NarrationScenePackage = {
  id: 'saved-audio', scriptHash: 'fixed', totalScenes: 1,
  scenes: [{ id: 'beat-1', title: 'Dot', context: 'Move a dot', startSec: 0, durationSec: 1,
    audio: { id: 'saved-audio.beat-1', url: '/unused.wav', sha256: 'fixed', sampleCount: 24000 },
    utterances: [{ id: 'beat-1.u1', role: 'narration', text: 'One dot.', spokenText: 'One dot.',
      source: { start: 0, end: 8, line: 7 }, startSec: 0, endSec: 1,
      words: [{ id: 'beat-1.u1.w1', utteranceId: 'beat-1.u1', text: 'One', startSec: 0.125, endSec: 0.625, characterRange: [0, 3] }],
      sentences: [{ id: 'beat-1.u1.s1', wordIds: ['beat-1.u1.w1'], text: 'One dot.', startSec: 0, endSec: 1 }],
    }], pauses: [] }],
};
const raw = `export default scene({audio:__narration.audioAssetId,end:__narration.endMode},s=>{
  const dot=s.circle('dot');s.wait(__narration.start('beat-1.u1.w1'));
  s.play(dot.moveTo([1,0]),{duration:__narration.end('beat-1.u1.w1')-__narration.start('beat-1.u1.w1')});
  s.wait(__narration.durationSec-__narration.end('beat-1.u1.w1'));
});`;
const literal = `export default scene({audio:'saved-audio.beat-1',end:'hold'},s=>{
  const dot=s.circle('dot');s.wait(0.125);s.play(dot.moveTo([1,0]),{duration:0.5});s.wait(0.375);
});`;
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'aha-timing-')); roots.push(root);
  const context = { videoId: crypto.randomUUID(), owner: 'test-owner', signal: new AbortController().signal };
  const directory = join(root, context.videoId); await mkdir(directory);
  await writeFile(join(directory, 'script.md'), '# Dot\n\n## Beat 1\n\nContent needed: Move a dot.\n\nNarration: One dot.');
  const audio = join(root, 'audio.wav'); await writeFile(audio, new Uint8Array([1, 2, 3]));
  const narration = { available: true, async submit() { return { id: packet.id, status: 'complete' }; },
    async get() { return { id: packet.id, status: 'complete' }; }, async scenePackage() { return packet; },
    async audio() { return audio; } } as unknown as NarrationService;
  return { root, context, directory, narration, request: { title: 'Dot', topic: 'One dot', documents: [] } };
}

test('timing mode defaults to inline and rejects unsupported values', () => {
  expect(agentConfig({}).sceneTimingMode).toBe('inline');
  expect(agentConfig({ AGENT_SCENE_TIMING_MODE: 'host' }).sceneTimingMode).toBe('host');
  for (const value of ['', 'HOST', 'automatic']) expect(() => agentConfig({ AGENT_SCENE_TIMING_MODE: value })).toThrow('AGENT_SCENE_TIMING_MODE');
});

for (const outputMode of ['text', 'validated-reference'] as const) {
  test(`host timing validates raw ${outputMode} output and persists a standalone scene reusable after disabling it`, async () => {
    const f = await fixture(); let calls = 0;
    const runner = { async run(task: AgentTask) {
      calls++; expect(task.outputMode).toBe(outputMode);
      expect(task.prompt).toContain('__narration.start(fullWordId)');
      await expect(task.validate!(raw.replaceAll('beat-1.u1.w1', 'absent'))).rejects.toThrow('Unknown narration word ID');
      await task.validate!(raw); await task.validate!(raw);
      const report = await task.sceneTools!.inspect(raw, { times: [0, 1], objectIds: ['dot'] }, f.context.signal);
      expect(report.bounds[1].bounds!.left).toBeGreaterThan(report.bounds[0].bounds!.left);
      return '```javascript\n' + raw + '\n```';
    } };
    const generate = createPiGenerator(runner, f.narration, f.root, { outputMode, timingMode: 'host' });
    const first = await generate(f.request, 0, f.context);
    const saved = await readFile(join(f.directory, 'scene-0.js'), 'utf8');
    expect(saved).toBe(first!.scene.source);
    const [actual, expected] = await Promise.all([compileSource(saved), compileSource(literal)]);
    expect(actual).toEqual(expected);
    for (const t of [0, 0.125, 0.375, 0.625, 1]) expect(evaluateScene(actual, t)).toEqual(evaluateScene(expected, t));
    const cached = await generate(f.request, 0, f.context);
    expect(cached!.scene.source).toBe(saved); expect(calls).toBe(1);
    const disabled = createPiGenerator(runner, f.narration, f.root, { timingMode: 'inline' });
    const resumed = await disabled(f.request, 0, f.context);
    expect(resumed!.scene.source).toBe(saved); expect(calls).toBe(1);
    expect(await readFile(join(f.directory, 'scene-0.js'), 'utf8')).toBe(saved);
  });
}

test('generator previews assembled host-timing sources and preserves private review evidence', async () => {
  const f = await fixture();
  const image = { type: 'image' as const, mimeType: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOQi7rzHwAEQgJUZSSrPwAAAABJRU5ErkJggg==' };
  let rendered = 0;
  const generate = createPiGenerator({ async run(task) {
    expect(task.systemPrompt).toContain('Then call preview_scene');
    const previews = await task.sceneTools!.preview!(raw, { times: [0, 1] }, f.context.signal);
    expect(previews.map(p => p.time)).toEqual([0, 1]);
    return raw;
  } }, f.narration, f.root, { timingMode: 'host', preview: {
    async render(compiled, samples, signal) {
      rendered++; expect(signal).toBe(f.context.signal);
      expect(compiled.options.audio).toBe(packet.scenes[0].audio.id);
      expect(samples.map(sample => sample.frame.elements.find(e => e.id === 'dot')!.position[0])).toEqual([0, 1]);
      return samples.map(sample => ({ time: sample.time, image }));
    },
  } });
  const result = await generate(f.request, 0, f.context);
  expect(rendered).toBe(1); expect(result?.scene.source).toContain('const __narration');
  const runs = await readdir(join(f.directory, 'scene-inspection'));
  expect(runs).toHaveLength(1);
  const artifacts = join(f.directory, 'scene-inspection', runs[0]);
  expect(JSON.parse(await readFile(join(artifacts, '1-preview.json'), 'utf8')).times).toEqual([0, 1]);
  expect(await readFile(join(artifacts, '1-preview.js'), 'utf8')).toBe(result!.scene.source);
  expect(await readFile(join(artifacts, '1-preview-0.png'))).toEqual(Buffer.from(image.data, 'base64'));
});

test('enabling host timing preserves existing cached literal scenes byte for byte', async () => {
  const f = await fixture(); await writeFile(join(f.directory, 'scene-0.js'), literal);
  const generate = createPiGenerator({ async run() { throw new Error('Cached scene should not regenerate'); } }, f.narration, f.root, { timingMode: 'host' });
  const result = await generate(f.request, 0, f.context);
  expect(result!.scene.source).toBe(literal);
  expect(await readFile(join(f.directory, 'scene-0.js'), 'utf8')).toBe(literal);
});
