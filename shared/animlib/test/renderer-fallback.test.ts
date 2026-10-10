import { afterEach, expect, it, vi } from 'vitest';
import { compileSource } from '../src/compiler.js';
import { evaluateScene } from '../src/timeline.js';

// These tests verify selection/lifetime/submission contracts, NOT rasterization.
// Actual GLSL compilation and pixels are tested by webgl.browser.ts in a browser.
const glState = vi.hoisted(() => ({ constructors: vi.fn(), render: vi.fn(), dispose: vi.fn() }));
vi.mock('../src/webgl.js', () => ({ WebGLBackend: class {
  maxSize = 4096;
  constructor(readonly gl: unknown) { glState.constructors(gl); }
  render = glState.render;
  dispose = glState.dispose;
} }));
import { CanvasRenderer } from '../src/renderer.js';

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
function setup(failure = '') {
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('GPUBufferUsage', { UNIFORM: 1, COPY_DST: 2, VERTEX: 4 });
  vi.stubGlobal('GPUTextureUsage', { RENDER_ATTACHMENT: 1 });
  let lose!: (info: { message: string }) => void;
  const buffer = () => ({ destroy: vi.fn() });
  const device = {
    limits: { maxTextureDimension2D: 8192 }, destroy: vi.fn(), addEventListener: vi.fn(),
    lost: new Promise(resolve => { lose = resolve; }),
    createShaderModule: () => ({ getCompilationInfo: async () => ({ messages: failure === 'shader' ? [{ type: 'error', message: 'bad shader' }] : [] }) }),
    createRenderPipelineAsync: vi.fn(async () => { if (failure === 'pipeline') throw new Error('bad pipeline'); return { getBindGroupLayout: () => ({}) }; }),
    createBuffer: vi.fn(buffer), createBindGroup: vi.fn(() => ({})),
    createTexture: vi.fn(({ size }: { size: number[] }) => ({ ...buffer(), width: size[0], height: size[1] })),
  };
  const gpu = {
    requestAdapter: vi.fn(async () => {
      if (failure === 'adapter-rejected') throw new Error('adapter rejected');
      if (failure === 'adapter-null') return null;
      return { requestDevice: async () => { if (failure === 'device') throw new Error('device rejected'); return device; } };
    }),
    getPreferredCanvasFormat: () => 'bgra8unorm',
  };
  vi.stubGlobal('navigator', failure === 'missing' ? {} : { gpu });
  const context = { configure: vi.fn(() => { if (failure === 'configure') throw new Error('configure rejected'); }), unconfigure: vi.fn() };
  function surface() {
    const gl = {};
    const events = new Map<string, EventListener>();
    const canvas = {
      width: 640, height: 480, style: {}, getBoundingClientRect: () => ({ width: 640, height: 480 }),
      getContext: vi.fn((kind: string) => kind === 'webgpu' ? (failure === 'context' ? null : context) : gl),
      addEventListener: vi.fn((name: string, handler: EventListener) => events.set(name, handler)),
      removeEventListener: vi.fn((name: string) => events.delete(name)),
      cloneNode: vi.fn(() => surface().canvas), replaceWith: vi.fn(),
    };
    return { canvas, gl, events };
  }
  const { canvas, gl, events } = surface();
  const renderer = new CanvasRenderer(canvas as unknown as HTMLCanvasElement);
  return { renderer, canvas, gl, events, device, context, gpu, lose: () => lose({ message: 'test loss' }) };
}

it.each(['missing', 'adapter-null', 'adapter-rejected', 'device', 'shader', 'pipeline', 'context', 'configure'])(
  'falls back after %s and releases any acquired GPU resources', async failure => {
    const { renderer, canvas, gl, device, context } = setup(failure);
    await renderer.prepare([]);
    expect(renderer.backend).toBe('webgl2');
    if (failure === 'configure') {
      expect(canvas.cloneNode).toHaveBeenCalledOnce();
      expect(canvas.getContext).not.toHaveBeenCalledWith('webgl2', expect.anything());
      expect(context.unconfigure).toHaveBeenCalledOnce();
      expect(renderer.canvasElement).not.toBe(canvas);
    } else expect(glState.constructors).toHaveBeenCalledWith(gl);
    if (['shader', 'pipeline', 'context', 'configure'].includes(failure)) expect(device.destroy).toHaveBeenCalledOnce();
    if (['missing', 'adapter-null', 'adapter-rejected', 'device', 'shader', 'pipeline'].includes(failure))
      expect(canvas.getContext).not.toHaveBeenCalledWith('webgpu');
    renderer.dispose(); renderer.dispose();
    expect(glState.dispose).toHaveBeenCalledOnce();
  },
);
it('keeps WebGPU preferred and switches a lost device to a fresh WebGL2 surface', async () => {
  const { renderer, canvas, lose, device } = setup();
  const changed = vi.fn(); renderer.onCanvasChange = changed;
  await renderer.prepare([]);
  expect(renderer.backend).toBe('webgpu'); expect(glState.constructors).not.toHaveBeenCalled();
  lose(); await Promise.resolve();
  expect(renderer.backend).toBe('webgl2'); expect(changed).toHaveBeenCalledWith(renderer.canvasElement);
  expect(canvas.replaceWith).toHaveBeenCalledWith(renderer.canvasElement);
  expect(device.destroy).toHaveBeenCalledOnce();
  renderer.dispose();
});
it('does not acquire or replace a canvas after disposal when the device is lost', async () => {
  const { renderer, canvas, lose } = setup();
  await renderer.prepare([]); renderer.dispose(); lose(); await Promise.resolve();
  expect(glState.constructors).not.toHaveBeenCalled(); expect(canvas.cloneNode).not.toHaveBeenCalled();
});
it('uses WebGL2 on insecure origins too, without requesting WebGPU', async () => {
  const { renderer, gpu } = setup(); vi.stubGlobal('isSecureContext', false);
  await renderer.prepare([]); expect(renderer.backend).toBe('webgl2'); expect(gpu.requestAdapter).not.toHaveBeenCalled(); renderer.dispose();
});
it('submits shared lit geometry, opacity ordering, and viewport offsets to WebGL2', async () => {
  const { renderer } = setup('missing');
  const scene = await compileSource(`export default scene({mode:'3d'},s=>{
    s.sphere('opaque',{fill:'BLUE',viewportOffset:[0.2,0.1]});
    s.rectangle('alpha',{fill:'RED',opacity:0.5});s.wait(1);
  });`);
  await renderer.prepare([scene]); renderer.render(evaluateScene(scene, 0), scene.options);
  const [data, batches] = glState.render.mock.calls[0];
  expect(data).toBeInstanceOf(Float32Array);
  expect(batches[0].opaqueVertices).toBeGreaterThan(100);
  expect(data[11]).toBe(1); expect(data[13]).toBeCloseTo(0.2);
  expect(data[batches[0].opaqueVertices * 15 + 6]).toBe(0.5);
  renderer.dispose();
});
it('reports loss once, rebuilds WebGL resources on restore and detaches handlers on disposal', async () => {
  const { renderer, events } = setup('missing');
  const error = vi.fn(), recovered = vi.fn(); renderer.onError = error; renderer.onRecovered = recovered;
  await renderer.prepare([]);
  const event = new Event('webglcontextlost', { cancelable: true });
  events.get('webglcontextlost')!(event); expect(event.defaultPrevented).toBe(true); expect(error).toHaveBeenCalledOnce();
  events.get('webglcontextrestored')!(new Event('webglcontextrestored'));
  expect(glState.constructors).toHaveBeenCalledTimes(2); expect(recovered).toHaveBeenCalledOnce();
  renderer.dispose(); expect(events.size).toBe(0);
});

it('falls back when a device is lost during initialization, before acquiring a canvas context', async () => {
  const { renderer, canvas, lose, device } = setup();
  lose(); await renderer.prepare([]);
  expect(renderer.backend).toBe('webgl2');
  expect(canvas.getContext).not.toHaveBeenCalledWith('webgpu');
  expect(device.destroy).toHaveBeenCalledOnce(); renderer.dispose();
});
it('reports both backend initialization failures and cleans the device', async () => {
  const { renderer, device } = setup('pipeline');
  glState.constructors.mockImplementationOnce(() => { throw new Error('GL shader rejected'); });
  await expect(renderer.prepare([])).rejects.toThrow('WebGPU: bad pipeline WebGL2: GL shader rejected');
  expect(device.destroy).toHaveBeenCalledOnce();expect(renderer.backend).toBeUndefined();renderer.dispose();
});
it('recovers a WebGPU frame acquisition failure without throwing into the playback loop', async () => {
  const { renderer, context, device } = setup();
  await renderer.prepare([]);
  // Fail before submission, as a canvas/device can do just before device.lost arrives.
  Object.assign(device,{createCommandEncoder:()=>{throw new Error('GPU stopped');},queue:{}});
  const error=vi.fn();renderer.onError=error;
  const scene=await compileSource(`export default scene({},s=>s.wait(1));`);
  expect(()=>renderer.render(evaluateScene(scene,0),scene.options)).not.toThrow();
  expect(renderer.backend).toBe('webgl2');expect(glState.render).toHaveBeenCalledOnce();
  expect(context.unconfigure).toHaveBeenCalledOnce();expect(error).not.toHaveBeenCalled();renderer.dispose();
});
