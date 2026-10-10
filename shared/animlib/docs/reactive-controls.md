# Retained reactive controls and surfaces

See the [before/after validation report](reactive-validation.md) for compatibility,
pixel comparisons, authoring limits, and the mixed-control ordering fix.

Open the demo with `?reactive` (for example `http://localhost:5173/?reactive`).
The size slider invokes retained JavaScript callbacks to update four sphere radii.
The scene builder and timeline stay intact. The axes toggle still uses the existing
builder path because it adds and removes objects.

## Authoring

```js
export default scene({ mode: '3d', end: 'hold' }, s => {
  const size = s.slider('size', {
    reactive: true, default: 1, min: 0.5, max: 1.5,
  });
  const ball = s.sphere('ball', { radius: 0.45 });
  s.bind(ball, [size], value => ({ radius: 0.45 * value }));
  s.play(ball.moveTo([2, 0]), { duration: 3 });
});
```

`reactive: true` returns a slider handle. Arithmetic on that handle throws; the
callback receives its current numeric value. Multiple dependencies work as
`s.bind(ball, [x, y], (x, y) => ({ position: [x, y] }))`. A target may have several bindings with disjoint property ownership; each
binding can return several properties. Existing numeric sliders, toggles,
and selects retain their current behavior without source changes.

Bindings run once after the builder and whenever a declared dependency changes.
Add `s.time` to opt into scene-local time sampling; see the
[deformation and time reference](reference.md#fixed-topology-deformation-and-scene-time).
They return absolute values for a fixed set of keys: `radius` (circle/sphere),
`position`, `rotation`, `scale`, `opacity`, `fill`, `vertices`, `normals`,
`material`, `texture`, and `scalarColors`. Coordinates and rotations
use the existing authoring conventions; fills must belong to the host palette.
Vertices retain their original count and triangle connectivity; `s.deform` maps
captured rest vertices without rebuilding the scene. Material/texture patches
replace whole settings, and `null` removes them. Scalar ramp patches retain one
value per mesh vertex. Values are validated before commit. Bindings cannot create
objects or modify timelines. Time-dependent callbacks run inside the retained
compiler sandbox; rendering receives only validated data.

A binding and timeline cannot write the same property on the same object.
Reactive radius, vertices, normals, material, texture, and scalar colors also
conflict with morphing that object. Vertices implicitly own generated normals. Reactive position
cannot share a target with an attachment, connector, or behavior. Other
properties can coexist: the example animates position while a slider owns radius.
Reactive values apply after timeline evaluation and before attachments/connectors,
so a surface connector follows the updated radius. Removed objects stay removed.

Callbacks must be synchronous, pure functions of their arguments and immutable
captured data. Do not increment closure counters or consume random values inside
them. Purity is an authoring contract, **not enforced by the runtime**; closure
mutations cannot be rolled back if an update fails. Pure bindings produce the same
frame when seeking away and back under the same current control values.

## Runtime and transactions

The compiler retains a QuickJS program for each scene with bindings. Callbacks
remain in that sandbox, inside the compiler worker in browsers. Only validated,
serialized property patches reach the player. Each invocation receives a fresh
execution deadline (default 200 ms); the existing 32 MiB VM memory cap remains.
There is no DOM, network, or host API access. Retaining programs increases memory
usage compared with one-shot compilation; superseded programs, failed candidates,
and disposed sequences release their runtimes.

`SceneSequence.setControl` invokes only bindings depending on the changed slider.
The changed builder and all earlier scenes are reused. **Later scenes still
rebuild** against the updated outgoing frame, preserving transactional handoffs.
The update commits only after that succeeds. Invalid callback results, timeouts,
and downstream failures leave the last committed controls and frames intact.
Following worker loss, a subsequent change rebuilds the affected scene and suffix
to recover its callback runtime.

When the active scene retains its identity, `Player.setControl` refreshes it at
the current clock time without restarting audio or resetting live behaviors.
The player coalesces queued updates per scene/control to their newest value;
intermediate values can be skipped. Superseded requests share the retained
request's completion or rejection. Source submissions, seeks, and ordinary control
changes are ordering barriers. The headless sequence itself serializes every
request without coalescing.

A Play request made while a seek is queued is recorded and applied after the last
queued seek completes; its promise acknowledges that intent immediately. A later
Pause or seek cancels that intent. An unknown seek target rejects without stopping
the running clock, including a target removed by a preceding queued submission.

`SceneSequence` calls `prepare` once per newly compiled scene, before sampling its
outgoing frame or compiling its successor. Hosts can resolve audio duration there;
reused prefix scenes are already prepared. Retained worker updates receive that
prepared duration, so scene-time callbacks continue through longer audio and batch
loading uses the same endpoint as appending scenes.

Compiled scenes still contain plain JSON data, including the latest binding
values. `evaluateScene` can evaluate that snapshot anywhere, using its already-sampled
outputs. For exact time callbacks use `await sequence.evaluate(index, time)`;
`await sequence.sample(index, time)` returns an exportable snapshot tagged with
`reactiveTime`. Canonical compiled scenes retain time-zero outputs. `compileSource`
returns a snapshot (optionally `{ sampleTime: seconds | 'end' }` in its third
argument) and disposes its runtime; use `SceneSequence` or the player
when values need to change through retained callbacks.

## Measured result

Browser comparison on 2026-10-10 used the same two-view scene, canvas, worker,
and rendering workload with either ordinary or reactive sliders. Chrome 154,
Linux, 1280 × 800 CSS pixels, DPR 2, WebGL2/SwiftShader. WebGL submission was
suppressed to isolate CPU work and worker round trips. These are API completion
times, not GPU timings or displayed frame rates. Each row uses 5 warmups and
20 samples, changing the **last** scene; it does not measure downstream rebuilding.

| Loaded scenes | Ordinary slider median | Reactive slider median | Compiles per update, ordinary → reactive |
| --- | ---: | ---: | ---: |
| 1 | 10.7 ms | 6.8 ms | 1 → 0 |
| 5 | 26.4 ms | 6.5 ms | 5 → 0 |
| 10 | 46.0 ms | 6.6 ms | 10 → 0 |

With ten scenes and 20 inputs about 16.7 ms apart, p95 request completion fell
from 584.6 ms to 7.8 ms. Work remaining after the input ended fell from 598.9 ms
to below timer resolution. The reactive workload kept up with this input rate;
unit tests separately force a slow callback to verify queue coalescing.

These historical measurements predate dynamic mesh/time bindings. Geometry
preparation still accounts for most of the remaining time. Orbit
rendering, vertex caching, and triangulation-cache capacity are unchanged.
This prototype addresses the slider execution path; the earlier
[orbit profile](performance.md) remains relevant.

[Raw measurements](../bench/results/2026-10-10-reactive.json) include inclusive
stage timings and method counts. Reproduce using `profileInteractions` from
`bench/interactions.mjs`, with `workloadSources: [interactionSource]` and then
`workloadSources: [reactiveInteractionSource]`, `samples: 20`, `warmup: 5`,
`sceneCounts: [1, 5, 10]`, and `submitGPU: false`. See the
[browser profiling recipe](performance.md) for imports and player access.

Tests cover callback validation and limits, seeking, dependency selection,
downstream rollback, runtime disposal, playback/audio and behavior preservation,
queue coalescing, and submission barriers. Real-browser checks also exercised
the native slider, playback, and the minified production worker build.

## Dynamic surface validation

`?surfaces` demonstrates time-dependent waves in two clipped views with isolated
groups and independent amplitude/roughness sliders. Tests compare both evaluated
geometry and real GPU pixels with rebuilt static waves at the same time/inputs,
including seek-away/back and paused controls. WebGL2 uses actual browser GLSL and
pixel readback; the native WebGPU suite uses Vulkan render targets. Mocked player
tests cover ordering and failures only, not visual correctness.

Run `npm run build && node shared/animlib/bench/dynamic-surfaces.mjs` from the repo
root for CPU-only end-to-end control measurements on a 1,089-vertex / 2,048-triangle
wave. The benchmark asserts zero compiles for 30 retained updates versus 30 for
ordinary controls and checks scene identity. It excludes rendering, GPU time,
browser worker round trips, and downstream reconstruction. Retained updates still
serialize complete changed vertex arrays; this is not a sparse vertex upload API.
The separate retained GPU cache must invalidate from effective geometry/appearance
contents, even while scene and element identities remain unchanged.

On 2026-10-10, Node 24.19.0 on Linux x64 measured 20.76 ms median / 21.40 ms p95
for reconstruction versus 4.55 ms / 5.05 ms for retained updates (5 warmups,
30 samples per path). These are CPU API timings, not frame-rate claims. The
validation run after the first review fixes passed 491 unit tests, 215 backend tests, 64 native Vulkan WebGPU
checks, and 64 Chrome 154 WebGL2/SwiftShader browser checks, including exact dynamic/static wave
pixel matches. The minified production worker demo also passed repeatable seeks,
paused amplitude/material updates, and playback/pause checks. The production-worker
audio regression decodes a real six-second WAV with a four-second authored timeline:
seeking to second five samples geometry at five, and batch/append handoffs both use
six (or twelve after doubling amplitude). Combined rendering
with the parallel clipping/scalar-color, lighting/shadow, and retained-GPU changes
requires integration validation after those changes land.
