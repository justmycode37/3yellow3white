import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { CanvasRenderer } from '../dist/renderer.js';
import { SceneSequence } from '../dist/sequence.js';

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
globalThis.GPUBufferUsage = { UNIFORM: 1, COPY_DST: 2, VERTEX: 4 };
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
    beginRenderPass: () => ({ setPipeline() {}, setBindGroup() {}, setVertexBuffer() {}, setViewport() {}, setScissorRect() {}, draw() {}, end() {} }),
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
      for (let i = 0; i < 35; i++) {
        // Fresh evaluated frames exercise content caches, not object identity.
        const frame = sequence.frame(index, scene.duration * (0.45 + 0.1 * i / 35));
        const start = performance.now();
        renderer.render(frame, scene.options);
        if (i >= 5) times.push(performance.now() - start);
      }
      times.sort((a, b) => a - b);
      results.push({ scene: sources[index].id, medianMs: +times[15].toFixed(2), p95Ms: +times[28].toFixed(2) });
    }
  }
  console.log('CPU geometry preparation only; GPU calls mocked; not browser FPS.');
  console.table(results);
} finally {
  sequence.dispose();
  renderer.dispose();
}
