// Browser-only implementation probe. Run against the demo using the recipe in
// docs/performance.md. Timers are inclusive; nested stages must not be added.
// This deliberately accesses implementation details without adding production
// instrumentation. Use a dedicated demo player: scene loads reset live views.
const tick = () => new Promise(resolve => requestAnimationFrame(resolve));
const round = value => Math.round(value * 1000) / 1000;
function stats(values) {
  if (!values.length) return { count: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = p => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
  return { count: values.length, median: round(percentile(0.5)), p95: round(percentile(0.95)), max: round(sorted.at(-1)), total: round(values.reduce((a, b) => a + b, 0)) };
}

/** Warm samples of the production player, worker compiler and renderer. */
export async function profileInteractions(player, sources, {
  samples = 30, warmup = 5, sceneCounts = [1, 5, 10], burstSize = 20,
  inputIntervalMs = 1000 / 60, submitGPU = true,
  workloadSources = sources,
} = {}) {
  if (!Number.isInteger(samples) || samples < 1 || !Number.isInteger(warmup) || warmup < 0
    || !Number.isInteger(burstSize) || burstSize < 1 || !Number.isFinite(inputIntervalMs) || inputIntervalMs < 0
    || !sceneCounts.length || sceneCounts.some(n => !Number.isInteger(n) || n < 1 || n > 100)) {
    throw new Error('Invalid profiling workload');
  }
  if (!sources.length || !workloadSources.length) throw new Error('Supply the loaded scene sources and a nonempty workload');
  const originalSources = structuredClone(sources), originalState = player.getState();
  if (originalState.scene && !sources.some(s => s.id === originalState.scene)) throw new Error('sources must describe the currently loaded player; pass synthetic scenes as workloadSources');
  player.pause();
  await player.operations;
  const renderer = player.renderer, sequence = player.sequence;
  const restorers = [], rows = [];
  let bucket;
  const add = (key, value) => { if (bucket) bucket[key] = (bucket[key] ?? 0) + value; };
  function wrap(target, key, async = false) {
    const own = Object.getOwnPropertyDescriptor(target, key), original = target[key];
    if (typeof original !== 'function') throw new Error(`Profiling hook missing: ${key}`);
    target[key] = function (...args) {
      const start = performance.now();
      add(`${key}Calls`, 1);
      if (async) return Promise.resolve(original.apply(this, args)).finally(() => add(`${key}Ms`, performance.now() - start));
      try { return original.apply(this, args); }
      finally { add(`${key}Ms`, performance.now() - start); }
    };
    restorers.push(() => own ? Object.defineProperty(target, key, own) : delete target[key]);
  }
  function summarize(name, measurements, extra = {}) {
    const keys = [...new Set(measurements.flatMap(Object.keys))];
    const row = { name, ...extra, metrics: Object.fromEntries(keys.map(key => [key, stats(measurements.map(m => m[key] ?? 0))])) };
    rows.push(row);
    return row;
  }
  async function measure(work) {
    const results = [];
    for (let i = 0; i < warmup + samples; i++) {
      await tick();
      bucket = {};
      const start = performance.now();
      try { await work(i); bucket.wallMs = performance.now() - start; }
      finally { if (i >= warmup) results.push(bucket); bucket = undefined; }
    }
    return results;
  }
  async function load(scenes) {
    const result = await player.submit({ type: 'load', scenes });
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    await tick();
  }
  const context = renderer.gl?.gl;
  const debug = context?.getExtension('WEBGL_debug_renderer_info');
  const environment = {
    userAgent: navigator.userAgent, backend: player.backend,
    devicePixelRatio, cssSize: [renderer.size.width, renderer.size.height],
    canvasSize: [player.canvas.width, player.canvas.height],
    gpu: debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
    submitGPU, samples, warmup, burstSize, inputIntervalMs,
  };
  try {
    for (const key of ['refresh', 'getState']) wrap(player, key);
    for (const key of ['render', 'syncInteraction']) wrap(renderer, key);
    wrap(player.behaviors, 'evaluate');
    if (player.overlay) wrap(player.overlay, 'update');
    wrap(sequence, 'frame');
    wrap(sequence, 'reconstruct', true);
    wrap(sequence.compiler, 'compile', true);
    wrap(renderer, 'prepare', true);
    // Count packed bytes at the actual backend boundary, even when submissions
    // are suppressed to isolate shared CPU work from a software GPU.
    if (renderer.gl) {
      const backend = renderer.gl, original = backend.render;
      const own = Object.getOwnPropertyDescriptor(backend, 'render');
      backend.render = function (data, ...args) {
        add('packedVertexBytes', data.byteLength);
        add('backendCalls', 1);
        const start = performance.now();
        try { if (submitGPU) return original.call(this, data, ...args); }
        finally { add('backendMs', performance.now() - start); }
      };
      restorers.push(() => own ? Object.defineProperty(backend, 'render', own) : delete backend.render);
    } else if (renderer.device) {
      if (!submitGPU) throw new Error('CPU-only submission suppression currently requires WebGL2');
      const queue = renderer.device.queue, original = queue.writeBuffer;
      const own = Object.getOwnPropertyDescriptor(queue, 'writeBuffer');
      queue.writeBuffer = function (buffer, offset, data, ...args) {
        if (buffer === renderer.vertices) add('packedVertexBytes', data.byteLength);
        return original.call(this, buffer, offset, data, ...args);
      };
      restorers.push(() => own ? Object.defineProperty(queue, 'writeBuffer', own) : delete queue.writeBuffer);
    }
    await load(workloadSources);
    const active = player.getState();
    const view = active.views.find(v => v.orbitEnabled)?.id ?? '';
    if (view || active.orbitEnabled) {
      const bounds = player.canvas.getBoundingClientRect();
      const region = active.views.find(v => v.id === view)?.rect ?? [0, 0, 1, 1];
      const x = bounds.left + bounds.width * (region[0] + region[2] / 2);
      const y = bounds.top + bounds.height * (region[1] + region[3] / 2);
      let moves = 0;
      // Synthetic drag state lets the real pointermove handler run without
      // asking setPointerCapture to capture an untrusted, inactive pointer.
      renderer.drag = { id: -1, x, y, view, pan: false };
      const move = () => renderer.pointerMove({ pointerId: -1, clientX: x + 40 * Math.sin(++moves / 12), clientY: y + 20 * Math.cos(moves / 12) });
      const orbit = await measure(async () => { move(); await tick(); });
      summarize('orbit: one pointermove per animation frame', orbit, { view, elementCount: renderer.lastFrame.elements.length });
      summarize('orbit: eight pointermoves in one task', await measure(async () => { for (let i = 0; i < 8; i++) move(); await tick(); }));
      renderer.drag = null;
    }
    for (const count of sceneCounts) {
      const scenes = Array.from({ length: count }, (_, i) => ({ ...workloadSources[i % workloadSources.length], id: `profile-${i}` }));
      await load(scenes);
      // Changing the last scene reveals unnecessary recompilation of its prefix.
      await player.seek({ scene: scenes.at(-1).id, time: 0 });
      const control = player.getState().controls.find(c => c.kind === 'slider');
      if (!control) continue;
      const value = i => control.min + Math.round(((i % 9) + 1) / 10 * (control.max - control.min) / (control.step ?? 0.01)) * (control.step ?? 0.01);
      const change = i => player.setControl({ scene: scenes.at(-1).id, id: control.id, value: value(i) });
      summarize('slider: sequential API changes', await measure(change), { sceneCount: count, changedSceneIndex: count - 1 });
      // Mimic rapid user input with independent tasks, without waiting for each
      // recompilation. Promise resolution includes queue wait and synchronous
      // render/notification, but does not measure presentation on the display.
      const requests = [], completions = [];
      let pending = 0, maxPending = 0;
      await tick();
      bucket = {};
      const start = performance.now();
      try {
        for (let i = 0; i < burstSize; i++) {
          const sent = performance.now();
          pending++; maxPending = Math.max(maxPending, pending);
          requests.push(change(i).then(() => { pending--; completions.push(performance.now() - sent); }));
          if (inputIntervalMs) await new Promise(resolve => setTimeout(resolve, inputIntervalMs));
        }
        const inputEnd = performance.now();
        await Promise.all(requests);
        const end = performance.now();
        summarize('slider: rapid input', [bucket], {
          sceneCount: count, maxPending, completionMs: stats(completions),
          inputDurationMs: round(inputEnd - start), totalDurationMs: round(end - start),
          drainAfterInputMs: round(end - inputEnd), finalValue: player.getState().controls.find(c => c.id === control.id)?.value,
        });
      } finally { await Promise.allSettled(requests); bucket = undefined; }
    }
    return { environment, rows };
  } finally {
    bucket = undefined;
    renderer.drag = null;
    for (const restore of restorers.reverse()) restore();
    await load(originalSources);
    if (originalState.scene) await player.seek({ scene: originalState.scene, time: originalState.time });
    if (originalState.status === 'playing') await player.play();
  }
}

/** Additional independent scene with many static spheres, to test orbit scaling. */
export function sphereWorkload(count) {
  if (!Number.isInteger(count) || count < 1 || count > 500) throw new Error('Sphere count must be 1..500');
  return [{ id: `spheres-${count}`, source: `export default scene({mode:'3d',orbit:true,end:'hold'}, s => {
    const size=s.slider('size',{default:1,min:0.5,max:1.5,step:0.05});
    for(let i=0;i<${count};i++)s.sphere('sphere-'+i,{radius:0.15*size,position:[(i%10-4.5)*0.5,(Math.floor(i/10)%10-4.5)*0.5,Math.floor(i/100)*0.5],fill:'BLUE'});
    s.wait(10);
  });` }];
}

/** Measure cache eviction directly, using the same GeometryCache module as the player. */
export async function profileTriangulationCache(player, GeometryCache, {
  limits = [1024 * 1024, 8 * 1024 * 1024], samples = 30, warmup = 5, view = 'left',
} = {}) {
  if (!Number.isInteger(samples) || samples < 1 || !Number.isInteger(warmup) || warmup < 0
    || !limits.length || limits.some(n => !Number.isFinite(n) || n < 1)) throw new Error('Invalid cache workload');
  const renderer = player.renderer, backend = renderer.gl;
  if (!backend) throw new Error('Cache isolation currently requires WebGL2');
  const wasPlaying = player.getState().status === 'playing';
  player.pause();
  await player.operations;
  const originalOrbit = renderer.getOrbit(view);
  const prototype = GeometryCache.prototype, get = prototype.get, set = prototype.set;
  const own = Object.getOwnPropertyDescriptor(backend, 'render');
  const caches = new Map(), rows = [];
  let counts;
  prototype.get = function (key) {
    if (!caches.has(this)) caches.set(this, { limit: this.limit, size: this.size, entries: new Map(this.entries) });
    const result = get.call(this, key);
    if (counts) counts[result === undefined ? 'misses' : 'hits']++;
    return result;
  };
  prototype.set = function (key, value, bytes) {
    if (counts) { counts.sets++; if (key.length * 2 + bytes > this.limit) counts.oversize++; }
    return set.call(this, key, value, bytes);
  };
  backend.render = () => {};
  try {
    player.invalidateFrame(); await tick(); // Discover caches before changing their capacity.
    for (const limit of limits) {
      for (const cache of caches.keys()) cache.limit = limit;
      const measurements = [];
      for (let i = 0; i < samples + warmup; i++) {
        await tick();
        counts = { hits: 0, misses: 0, sets: 0, oversize: 0 };
        renderer.setOrbit({ ...originalOrbit, yaw: originalOrbit.yaw + i / 100 }, view);
        const start = performance.now();
        player.invalidateFrame(); await tick();
        if (i >= warmup) measurements.push({ wallMs: performance.now() - start, ...counts });
      }
      counts = undefined;
      rows.push({ limit, metrics: Object.fromEntries(Object.keys(measurements[0]).map(key => [key, stats(measurements.map(m => m[key]))])), cacheSizes: [...caches.keys()].map(c => ({ bytes: c.size, entries: c.entries.size })) });
    }
    return { submitGPU: false, samples, warmup, rows };
  } finally {
    prototype.get = get; prototype.set = set;
    if (own) Object.defineProperty(backend, 'render', own); else delete backend.render;
    for (const [cache, saved] of caches) Object.assign(cache, saved);
    renderer.setOrbit(originalOrbit, view);
    player.invalidateFrame();
    if (wasPlaying) await player.play();
  }
}
