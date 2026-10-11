import { readFile, writeFile } from 'node:fs/promises';
import { Session } from 'node:inspector';
import { parseArgs, promisify } from 'node:util';
import ts from 'typescript';
import { CanvasRenderer } from '../dist/renderer.js';
import { SceneSequence } from '../dist/sequence.js';

const { values } = parseArgs({ options: { frames: { type: 'string', default: '30' }, profile: { type: 'string' } } });
const frames = Number(values.frames);
if (!Number.isInteger(frames) || frames < 1) throw new Error('--frames must be a positive integer');
// Capture the warmed interactive frame loop, excluding imports, scene compilation
// and the other demos. This Chrome-compatible profile can be opened in DevTools.
const profiler = values.profile ? new Session() : undefined;
profiler?.connect();
const post = profiler && promisify(profiler.post.bind(profiler));
if (post) await post('Profiler.enable');

// Demo modules only import types. Use their actual scene sources without bundling.
async function loadDemo(name) {
  const source = await readFile(new URL(`../demo/${name}.ts`, import.meta.url), 'utf8');
  const js = ts.transpile(source, { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 });
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}
const { initialSources } = await loadDemo('scenes');
const { interactionSource } = await loadDemo('interaction');

// Only GPU/DOM boundaries are stubbed. Timings measure production CPU geometry
// preparation and serialization; they exclude timeline evaluation and GPU work.
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.devicePixelRatio = 1;
globalThis.GPUBufferUsage = { UNIFORM: 1, COPY_DST: 2, VERTEX: 4, INDEX: 8 };
globalThis.GPUTextureUsage = { RENDER_ATTACHMENT: 1 };
const device = {
  limits: { maxTextureDimension2D: 8192 }, lost: new Promise(() => {}),
  addEventListener() {}, destroy() {},
  createShaderModule: () => ({ getCompilationInfo: async () => ({ messages: [] }) }),
  createRenderPipelineAsync: async () => ({ getBindGroupLayout: () => ({}) }),
  createBuffer: () => ({ destroy() {} }), createBindGroup: () => ({}),
  createTexture: ({ size }) => ({ width: size[0], height: size[1], createView: () => ({}), destroy() {} }),
  queue: { writeBuffer() {}, submit() {} },
  createCommandEncoder: () => ({
    beginRenderPass: () => ({ setPipeline() {}, setBindGroup() {}, setVertexBuffer() {}, setIndexBuffer() {}, setViewport() {}, setScissorRect() {}, draw() {}, drawIndexed() {}, end() {} }),
    finish: () => ({}),
  }),
};
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { gpu: {
  requestAdapter: async () => ({ requestDevice: async () => device }),
  getPreferredCanvasFormat: () => 'bgra8unorm',
} } });
const canvas = {
  width: 1280, height: 800, style: {},
  getBoundingClientRect: () => ({ width: 1280, height: 800 }),
  getContext: () => ({ configure() {}, unconfigure() {}, getCurrentTexture: () => ({ createView: () => ({}) }) }),
  addEventListener() {}, removeEventListener() {},
};
const renderer = new CanvasRenderer(canvas), sequence = new SceneSequence();
try {
  await renderer.prepare([]);
  const results = [];
  for (const sources of [initialSources, [interactionSource]]) {
    const loaded = await sequence.submit({ type: 'load', scenes: sources });
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
    for (let index = 0; index < sources.length; index++) {
      const scene = sequence.compiled[index], times = [];
      const profileThisScene = post && sources[index].id === interactionSource.id;
      for (let i = 0; i < frames + 5; i++) {
        // Fresh evaluated frames exercise content caches, not object identity.
        const frame = sequence.frame(index, scene.duration * (0.45 + 0.1 * i / (frames + 5)));
        if (profileThisScene && i === 5) await post('Profiler.start');
        const start = performance.now();
        renderer.render(frame, scene.options);
        if (i >= 5) times.push(performance.now() - start);
      }
      if (profileThisScene) {
        const { profile } = await post('Profiler.stop');
        await writeFile(values.profile, JSON.stringify(profile));
      }
      times.sort((a, b) => a - b);
      const percentile = p => +times[Math.ceil(times.length * p) - 1].toFixed(2);
      results.push({ scene: sources[index].id, medianMs: percentile(0.5), p95Ms: percentile(0.95) });
    }
  }
  console.log('CPU geometry preparation only; GPU calls mocked; not browser FPS.');
  console.table(results);
} finally {
  sequence.dispose();
  renderer.dispose();
  profiler?.disconnect();
}
