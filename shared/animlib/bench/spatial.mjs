// Run from shared/animlib: npm run build && node bench/spatial.mjs [--json]
// Production QuickJS compilation and renderer CPU work, with DOM/GPU boundaries
// stubbed like render.mjs. These are not browser frame rates or GPU timings.
import { cpus } from 'node:os';
import { parseArgs } from 'node:util';
import { compileSource } from '../dist/compiler.js';
import { evaluateScene } from '../dist/timeline.js';
import { CanvasRenderer } from '../dist/renderer.js';
import { GeometryCache } from '../dist/cache.js';

const { values } = parseArgs({ options: {
  frames: { type: 'string', default: '30' },
  'compile-runs': { type: 'string', default: '3' },
  json: { type: 'boolean', default: false },
} });
const frames = Number(values.frames), compileRuns = Number(values['compile-runs']), warmup = 5;
for (const [name, value] of [['frames', frames], ['compile-runs', compileRuns]]) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`--${name} must be a positive integer`);
}
const round = value => +value.toFixed(3);
function stats(samples) {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  return { count: samples.length, medianMs: round(sorted[Math.ceil(sorted.length * 0.5) - 1]),
    p95Ms: round(sorted[Math.ceil(sorted.length * 0.95) - 1]), maxMs: round(sorted.at(-1)) };
}
const sceneSource = body => `export default scene({mode:'3d',orbit:true,end:'hold'},s=>{${body}\ns.wait(2);});`;
const helix = 'Array.from({length:25},(_,i)=>[Math.cos(i*Math.PI/12),i/12-1,Math.sin(i*Math.PI/12)])';
const loop = 'Array.from({length:32},(_,i)=>[Math.cos(i*Math.PI/16),0.2*Math.sin(i*Math.PI/8),Math.sin(i*Math.PI/16)])';
const workloads = [
  ['textured-metal', "s.sphere('metal',{fill:'GOLD',material:{metalness:1,roughness:0.25},texture:{pattern:'noise',color:'GOLD_E',scale:3}});s.torus('ring',{position:[2,0,0],fill:'GREY_A',material:{metalness:1,roughness:0.1}});"],
  ['textured-surface', "s.surface('graph',{fn:(x,y)=>0.3*Math.sin(x*2)*Math.cos(y*2),fill:'BLUE_A',texture:{pattern:'marble',color:'BLUE_E',scale:2,seed:17},material:{roughness:0.5}});"],
  ['surface-default', "s.surface('graph',{fn:(x,y)=>0.3*Math.sin(x*2)*Math.cos(y*2),fill:'BLUE'});"],
  ['parametric-default', "s.parametricSurface('map',{fn:(u,v)=>[2*u-1,2*v-1,0.4*Math.sin(u*6)*Math.cos(v*6)],fill:'BLUE'});"],
  ['box-default', "s.box('box',{fill:'BLUE'});"],
  ['cylinder-default', "s.cylinder('cylinder',{fill:'BLUE'});"],
  ['cone-default', "s.cone('cone',{fill:'BLUE'});"],
  ['torus-default', "s.torus('torus',{fill:'BLUE'});"],
  ['tube-default', `s.tube('tube',{points:${helix},fill:'BLUE'});`],
  ['mixed-modest', `
    s.surface('graph',{fn:(x,y)=>0.3*Math.sin(x*2)*Math.cos(y*2),xSegments:16,ySegments:16,scale:0.4,position:[-2,1,0],fill:'BLUE'});
    s.parametricSurface('map',{fn:(u,v)=>[Math.cos(u)*(0.6+0.2*Math.cos(v)),0.2*Math.sin(v),Math.sin(u)*(0.6+0.2*Math.cos(v))],uRange:[0,Math.PI*2],vRange:[0,Math.PI*2],uSegments:16,vSegments:12,closedU:true,closedV:true,position:[0,1,0],fill:'BLUE'});
    s.box('box',{width:0.8,height:0.8,depth:0.8,position:[2,1,0],fill:'BLUE'});
    s.cylinder('cylinder',{radius:0.35,height:1,radialSegments:16,position:[-2,-1,0],fill:'BLUE'});
    s.cone('cone',{radius:0.4,height:1,radialSegments:16,position:[-0.7,-1,0],fill:'BLUE'});
    s.torus('torus',{radius:0.4,tubeRadius:0.15,radialSegments:12,tubularSegments:16,position:[0.7,-1,0],fill:'BLUE'});
    s.tube('tube',{points:${helix},radius:0.1,radialSegments:8,scale:0.5,position:[2,-1,0],fill:'BLUE'});`],
  ['surface-holes', "s.surface('holes',{fn:(x,y)=>x*x+y*y<0.4?NaN:0.2*Math.cos(x*y),fill:'BLUE'});"],
  ['tube-closed', `s.tube('closed',{points:${loop},closed:true,radius:0.15,fill:'BLUE'});`],
  ['surface-transparent', "s.surface('transparent',{fn:(x,y)=>0.3*Math.sin(x*2)*Math.cos(y*2),fill:'BLUE',opacity:0.5});"],
  ['surface-stroked', "s.surface('outlined',{fn:(x,y)=>0.3*Math.sin(x*2)*Math.cos(y*2),fill:'BLUE',stroke:'WHITE',strokeWidth:0.01});"],
  ['mesh-morph', `
    const n=16,vertices=[],target=[],triangles=[];
    for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
      const x=i/n*2-1,y=j/n*2-1;
      vertices.push([x,y,0]);target.push([x,y,0.5*Math.cos(x*3)*Math.sin(y*3)]);
    }
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const a=j*(n+1)+i;triangles.push([a,a+1,a+n+2],[a,a+n+2,a+n+1]);
    }
    const mesh=s.mesh('morph',{vertices,triangles,shading:'smooth',stroke:'none',fill:'BLUE'});
    s.play(mesh.morphTo({kind:'mesh',vertices:target,triangles,shading:'smooth'}),{duration:2});`],
];

// Instrument only existing cache boundaries. Clear between workloads so cold
// frames cannot inherit shared mesh entries from an earlier workload.
const caches = new Set(), originalGet = GeometryCache.prototype.get, originalSet = GeometryCache.prototype.set;
let counters;
GeometryCache.prototype.get = function (key) {
  caches.add(this);
  const value = originalGet.call(this, key);
  if (counters) counters[value === undefined ? 'misses' : 'hits']++;
  return value;
};
GeometryCache.prototype.set = function (key, value, bytes) {
  caches.add(this);
  if (counters) {
    counters.sets++;
    if (key.length * 2 + bytes > this.limit) counters.oversize++;
  }
  return originalSet.call(this, key, value, bytes);
};
function cacheState() {
  return [...caches].map(cache => ({ limitBytes: cache.limit, retainedBytesEstimate: cache.size, entries: cache.entries.size }));
}
function clearCaches() { for (const cache of caches) { cache.entries.clear(); cache.size = 0; } }
const newCounters = () => ({ hits: 0, misses: 0, sets: 0, oversize: 0, vertexUploadBytes: 0, vertexBufferAllocations: 0, draws: 0 });

globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.devicePixelRatio = 1;
globalThis.GPUBufferUsage = { UNIFORM: 1, COPY_DST: 2, VERTEX: 4, INDEX: 8 };
globalThis.GPUTextureUsage = { RENDER_ATTACHMENT: 1 };
let validateUploads = false, renderError;
const device = {
  limits: { maxTextureDimension2D: 8192 }, lost: new Promise(() => {}),
  addEventListener() {}, destroy() {},
  createShaderModule: () => ({ getCompilationInfo: async () => ({ messages: [] }) }),
  createRenderPipelineAsync: async () => ({ getBindGroupLayout: () => ({}) }),
  createBuffer: ({ usage }) => {
    const vertex = Boolean(usage & GPUBufferUsage.VERTEX);
    if (vertex && counters) counters.vertexBufferAllocations++;
    return { vertex, destroy() {} };
  },
  createBindGroup: () => ({}),
  createTexture: ({ size }) => ({ width: size[0], height: size[1], createView: () => ({}), destroy() {} }),
  queue: {
    writeBuffer(buffer, offset, data) {
      if (buffer.vertex && counters) counters.vertexUploadBytes += data.byteLength;
      if (validateUploads && !data.every(Number.isFinite)) throw new Error('Nonfinite packed renderer data');
    },
    submit() {},
  },
  createCommandEncoder: () => ({
    beginRenderPass: () => ({ setPipeline() {}, setBindGroup() {}, setVertexBuffer() {}, setIndexBuffer() {}, setViewport() {}, setScissorRect() {},
      draw() { if (counters) counters.draws++; }, drawIndexed() { if (counters) counters.draws++; }, end() {} }),
    finish: () => ({}),
  }),
};
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { gpu: {
  requestAdapter: async () => ({ requestDevice: async () => device }),
  getPreferredCanvasFormat: () => 'bgra8unorm',
} } });
function newRenderer() {
  const canvas = {
    width: 1280, height: 800, style: {},
    getBoundingClientRect: () => ({ width: 1280, height: 800 }),
    getContext: () => ({ configure() {}, unconfigure() {}, getCurrentTexture: () => ({ createView: () => ({}) }) }),
    addEventListener() {}, removeEventListener() {},
  };
  const renderer = new CanvasRenderer(canvas);
  renderer.onError = error => { renderError = error; };
  return renderer;
}

const results = [];
const started = performance.now();
try {
  // WASM initialization is a separate sample, not hidden in one shape's result.
  await compileSource(sceneSource(''));
  const quickjsStartupMs = round(performance.now() - started);
  for (const [name, body] of workloads) {
    const compileTimes = [], failures = [];
    let compiled;
    for (let i = 0; i < compileRuns; i++) {
      const start = performance.now();
      try {
        // Deliberately use production defaults: 200 ms execution, 32 MiB VM.
        compiled = await compileSource(sceneSource(body));
        compileTimes.push(performance.now() - start);
      } catch (error) {
        failures.push({ elapsedMs: round(performance.now() - start), message: error.message, diagnostic: error.diagnostic });
      }
    }
    const result = { scene: name, compile: stats(compileTimes), compileFailures: failures };
    results.push(result);
    if (!compiled) continue;
    const frozenFrame = evaluateScene(compiled, 0.5);
    result.geometry = {
      meshes: frozenFrame.elements.filter(e => e.geometry.kind === 'mesh').length,
      vertices: frozenFrame.elements.reduce((sum, e) => sum + (e.geometry.vertices?.length ?? 0), 0),
      triangles: frozenFrame.elements.reduce((sum, e) => sum + (e.geometry.triangles?.length ?? 0), 0),
      compiledJsonBytes: Buffer.byteLength(JSON.stringify(compiled)),
    };
    clearCaches();
    const renderer = newRenderer();
    renderError = undefined;
    try {
      await renderer.prepare([compiled]);
      function render(frame, i) {
        renderer.setOrbit({ yaw: i / 70, pitch: 0.2 * Math.sin(i / 30) });
        const start = performance.now();
        renderer.render(frame, compiled.options);
        const elapsed = performance.now() - start;
        if (renderError) throw renderError;
        return elapsed;
      }
      counters = newCounters();
      const coldMs = render(frozenFrame, 0);
      result.coldRender = { ms: round(coldMs), ...counters };
      // Check the boundary outside timed samples. No timing-based assertions.
      validateUploads = true;
      render(frozenFrame, 0);
      validateUploads = false;
      for (let i = 0; i < warmup; i++) render(frozenFrame, i);
      counters = newCounters();
      const orbitTimes = [];
      for (let i = 0; i < frames; i++) orbitTimes.push(render(frozenFrame, warmup + i));
      result.warmOrbit = { ...stats(orbitTimes), totals: counters, cache: cacheState() };

      // Fresh frames exercise content keys despite evaluator cloning. Morph
      // progress changes here; pinned orbit frames above keep progress fixed.
      const evaluationTimes = [], renderTimes = [], combinedTimes = [];
      counters = newCounters();
      for (let i = 0; i < frames + warmup; i++) {
        if (i === warmup) counters = newCounters();
        const start = performance.now();
        const frame = evaluateScene(compiled, 0.25 + i / (frames + warmup));
        const evaluated = performance.now();
        const renderMs = render(frame, i);
        if (i >= warmup) {
          evaluationTimes.push(evaluated - start); renderTimes.push(renderMs);
          combinedTimes.push(performance.now() - start);
        }
      }
      result.freshFrames = { evaluate: stats(evaluationTimes), render: stats(renderTimes), combined: stats(combinedTimes), totals: counters, cache: cacheState() };
    } finally { counters = undefined; validateUploads = false; renderer.dispose(); }
  }
  const report = {
    environment: { node: process.version, platform: process.platform, arch: process.arch, cpu: cpus()[0]?.model, frames, warmup, compileRuns, width: 1280, height: 800 },
    methodology: 'Production QuickJS defaults; CPU renderer with GPU/DOM stubs and cache counter overhead. Orbit reuses a frame; freshFrames includes separately timed timeline evaluation. Cold render is one empty-cache sample after renderer setup. Cache bytes are estimates, not heap measurements. No GPU execution, presentation, or browser FPS measured.',
    quickjsStartupMs, results,
  };
  if (values.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(report.methodology);
    console.log(`Node ${process.version}; ${report.environment.cpu}; QuickJS startup ${quickjsStartupMs} ms; ${frames} frames per warm sample.`);
    console.table(results.map(r => ({ scene: r.scene, compileMs: r.compile?.medianMs, compileFailures: r.compileFailures.length,
      vertices: r.geometry?.vertices, triangles: r.geometry?.triangles, coldCPUms: r.coldRender?.ms,
      orbitCPUms: r.warmOrbit?.medianMs, orbitP95ms: r.warmOrbit?.p95Ms,
      evaluateMs: r.freshFrames?.evaluate.medianMs, freshRenderMs: r.freshFrames?.render.medianMs,
      uploadBytesPerFrame: r.warmOrbit && r.warmOrbit.totals.vertexUploadBytes / frames,
      warmMisses: r.warmOrbit?.totals.misses, freshMisses: r.freshFrames?.totals.misses,
    })));
    for (const result of results) for (const failure of result.compileFailures) console.error(result.scene, failure);
    console.log('Use --json for cache estimates, allocation counters, and full statistics. Compilation failures are reported, never retried with relaxed limits.');
  }
} finally {
  GeometryCache.prototype.get = originalGet;
  GeometryCache.prototype.set = originalSet;
}
