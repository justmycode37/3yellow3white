# Interaction performance

Profiling on 2026-10-10 identified three sources of interaction lag: slider input
queues full sequence recompilations, orbit input synchronously rebuilds every
view's vertex data, and static text repeatedly misses the triangulation cache.
The baseline experiments below only install temporary profiling hooks and restore
them afterward. A subsequent [reactive slider prototype](reactive-controls.md)
implements and measures a callback path; the baseline results here predate it.

The measurements are historical, not current performance promises. Procedural
texture/material support now packs 30 floats (120 bytes) per vertex instead of
15 floats (60 bytes), including for plain geometry. The CPU benchmark should be
rerun for current workloads; textures add fragment work without extra triangles.

## Measurement conditions

Baseline commit: `73a57be8806eee0dc29ef6d4802e521be0cbc637`.
Browser: Chrome 154 on Linux, 1280 × 800 CSS pixels, DPR 2, 2560 × 1600 canvas.
WebGPU had no adapter; WebGL2 used ANGLE SwiftShader software rendering.
The primary measurements suppress WebGL submission and retain production scene
evaluation, compiler worker round trips, geometry preparation, controls, and demo
subscribers. They measure CPU work and API completion, not displayed FPS or GPU
execution. A separate submission-enabled run is included in the raw results;
its timings are subject to software rendering and browser scheduling.

Each regular workload uses 5 warmups and 20 measured samples. The cache experiment
uses 30 samples. Rapid slider input submits 20 updates roughly 16.7 ms apart
without waiting for prior updates. Orbit uses synthetic drag state and the real
pointermove handler, without native pointer capture. Eight events in one task
test scheduling behavior; they do not claim a typical browser delivers that batch.
Scene scaling repeats the interactive demo under distinct scene IDs and changes
the **last** scene, exposing unnecessary work in the preceding scenes.

[Raw measurements](../bench/results/2026-10-10-interactions.json) contain method
counts, inclusive stage timings, and packed vertex sizes. Nested times overlap:
do not add `drawItemsMs` to `renderMs`, or `compileMs` to `reconstructMs`.
Timer values below browser clock resolution can appear as zero.

## Sliders rebuild an unchanged prefix and queue stale input

| Loaded scenes | Compiles per update | Median API completion | p95 API completion | p95 completion during rapid input | Work remaining after input |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 9.5 ms | 12.4 ms | 9.5 ms | 0 ms |
| 5 | 5 | 23.7 ms | 24.9 ms | 138.2 ms | 128.0 ms |
| 10 | 10 | 41.2 ms | 42.9 ms | 499.3 ms | 507.9 ms |

[`SceneSequence.setControl`](../src/sequence.ts) calls `reconstruct(this.sources,
values)` with no prefix. Every update sequentially recompiles all scenes, evaluates
handoff frames, and prepares all resulting scenes. The ten-scene run spends a
median 36.2 ms in reconstruction, including 34.6 ms waiting for compiler calls.
Renderer preparation is about 0.1 ms here; GPU pipeline initialization is not
responsible for this workload's slider latency.

[`Player.setControl`](../src/player.ts) serializes every requested value through
`enqueue`. [`ControlOverlay`](../src/controls.ts) retains the latest pending widget
value, but still submits every input. The ten-scene burst performs 200 compiles
and 20 renders and reaches 13 outstanding requests. The visual result keeps
catching up after dragging stops. During playback, each committed change also
stops/restarts the clock and audio and refreshes again; the table profiles paused
interaction, without audio.

A temporary experiment passes the first nine compiled scenes as `reconstruct`'s
existing prefix when changing scene ten. Compiles fall from ten to one, median
completion falls from 41.2 to **9.5 ms**, rapid-input p95 becomes **9.9 ms**, and
the measured queue drains before input ends. This establishes the value of prefix
reuse for this case; it is not a complete implementation for arbitrary scene edits.
Changing an earlier scene still requires rebuilding dependent handoffs afterward.

## Orbit rebuilds geometry that has not changed

[`CanvasRenderer.pointerMove`](../src/renderer.ts) immediately calls
`onOrbitChange`, which reaches `Player.invalidateFrame` and synchronous `refresh`.
`scheduleFrame` does not coalesce these calls. While playing, they can occur in
addition to the normal animation frame callback.

The interactive demo's 16 elements take a median **7.3 ms** per orbit update
(p95 9.6 ms) with GPU submission disabled. `drawItems` takes 5.8 ms and runs for
the main scene plus **both** 3D views, although only the left camera changes.
Each update packs **2,104,740 bytes** (2.10 MB) into a new vertex array. The normal
backends upload that entire array through `bufferSubData` or `queue.writeBuffer`.
Eight events in one task produce eight renders, pack 16.84 MB, and take a median
41.1 ms (p95 52.2 ms).

Static sphere scaling confirms that this also affects geometry without text:

| Static spheres | Median CPU orbit update | p95 | Packed vertex data per update |
| --- | --- | --- | --- |
| 10 | 2.8 ms | 3.6 ms | 2.19 MB |
| 100 | 22.8 ms | 27.7 ms | 21.89 MB |

Sphere tessellation is already cached in `sphereTriangles`. The remaining work
transforms all triangle vertices, writes per-vertex color/normal data, orders draw
items, and copies them into the submission array. Camera rotation is already
performed by the shaders. Static world geometry can therefore retain GPU buffers
across camera changes, with invalidation for animated geometry, transforms,
billboards, styles, palettes, and composition. Transparency still needs camera
dependent ordering; cached vertices do not justify skipping that step.

`refresh` also evaluates the timeline once for drawing and `getState` evaluates
it again for notification. The second evaluation is about 0.1 ms in this demo,
making it a lower priority here. Host subscribers run on every refresh; the app's
`LessonPlayback` adapter publishes a fresh state object every time, including
paused orbit events. React work is outside this demo benchmark.

## The text triangulation cache thrashes

The four static labels account for 1.12 MB of the demo's packed vertex data.
Removing them in a controlled source variant reduces median orbit CPU work from
7.3 to **1.7 ms** and packed data from 2.10 to 0.985 MB. Geometry complexity changes
with that removal, so this is an attribution experiment, not a replacement
for the original scene.

[`triangulateContours`](../src/render-geometry.ts) serializes each glyph's contours to
construct a content key on every frame. Its [`GeometryCache`](../src/cache.ts)
defaults to 1 MiB. The demo's 68 entries have an estimated working set of
**1,452,214 bytes**, exceeding that capacity. Repeated traversal evicts entries
before they are reused. Instrumenting the cache directly measures:

| Temporary cache limit | Hits per warmed frame | Misses per warmed frame | Median orbit CPU time | p95 |
| --- | --- | --- | --- | --- |
| 1 MiB, current default | 0 | 68 | 6.0 ms | 8.3 ms |
| 8 MiB | 68 | 0 | 3.9 ms | 4.4 ms |

Neither case rejects oversized individual entries. The larger cache only occupies
about 1.45 MB in this experiment. Its time reduction is measured within the same
experiment; compare those two rows rather than mixing timings from separate runs.

A separate Node/V8 profile captures 200 warmed interactive frames with GPU/DOM
boundaries mocked. Self samples attribute approximately 23.9% to
`triangulateContours`, 14.9% to the glyph scaling callback in `latexPaths`, 12.2%
to `addTriangles`, and 12.1% to garbage collection. The sampling window also includes
frame evaluation and some profiler overhead. The profile supports the observed
serialization, retessellation and allocation costs; it does not measure browser
GPU performance.

## Optimization priorities

1. Coalesce pending values for each scene/control so obsolete intermediate input
   does not accumulate. Define completion and error semantics, and preserve ordering
   with submissions and edits. Reuse compiled scenes before the changed scene.
2. Coalesce orbit/pan invalidations to one refresh per animation frame, including
   during playback. Apply all pointer deltas immediately and render the latest state.
3. Retain static prepared geometry and vertex buffers, especially text and unchanged
   views. Fix the measured triangulation eviction pattern; a larger bounded cache is
   a small tactical change, while caching immutable glyph geometry also avoids
   serializing contours on every frame.
4. Reuse evaluated metadata for notification and avoid publishing unchanged host
   playback state during paused orbiting. Profile the actual app and hardware GPU
   after the larger CPU bottlenecks are addressed.

## Reproduce

From the repository root:

```sh
npm ci
npm run build
npm run dev --workspace animlib -- --port 5189 --strictPort
```

Open `http://localhost:5189/?interactive`. In the browser console, substitute your
repository's absolute path:

```js
const root = '/absolute/path/to/repo';
const { profileInteractions, sphereWorkload, profileTriangulationCache } =
  await import(`/@fs${root}/shared/animlib/bench/interactions.mjs`);
await animlibDemo.ready;
const result = await profileInteractions(animlibDemo.player, animlibDemo.sources,
  { samples: 20, submitGPU: false }); // CPU isolation requires WebGL2
console.log(result);
```

Use a dedicated demo player. The probe temporarily loads scenes and restores
supplied sources and the playback position; control values and live view settings
reset on those loads. It accesses private implementation fields and is intended
for the unminified development build. It restores method hooks even on failure.
Keep the browser active while using animation-frame pacing.

Pass `submitGPU: true` on hardware WebGPU or WebGL2 to include normal submissions.
Backend call duration includes API work, not asynchronous GPU completion. Compare
with a browser Performance recording of actual slider/drag input to assess
presentation, input delay, and GPU/host work on your machine.

```js
const spheres = await profileInteractions(animlibDemo.player, animlibDemo.sources,
  { workloadSources: sphereWorkload(100), samples: 20,
    sceneCounts: [1], burstSize: 5, submitGPU: false });
const { GeometryCache } = await import(`/@fs${root}/shared/animlib/src/cache.ts`);
const cache = await profileTriangulationCache(animlibDemo.player, GeometryCache);
```

Reproduce the prefix experiment only for this last-scene workload:

```js
const sequence = animlibDemo.player.sequence;
const reconstruct = sequence.reconstruct;
sequence.reconstruct = function (sources, values, prefix) {
  return reconstruct.call(this, sources, values,
    prefix ?? this.compiled.slice(0, -1));
};
try {
  console.log(await profileInteractions(animlibDemo.player, animlibDemo.sources,
    { sceneCounts: [10], samples: 20, submitGPU: false }));
} finally {
  delete sequence.reconstruct; // Restore the original prototype method.
}
```

For CPU-only rendering timings and a DevTools-compatible V8 profile:

```sh
npm run bench:render --workspace animlib
node shared/animlib/bench/render.mjs --frames 200 --profile /tmp/interactive.cpuprofile
```

The console table times rendering only. `--profile` captures the warmed interactive
frame loop, including evaluation, and excludes compilation and other demo scenes.
Load the generated `.cpuprofile` into a browser's JavaScript profiler.
