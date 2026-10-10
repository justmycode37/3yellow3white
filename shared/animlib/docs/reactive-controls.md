# Reactive slider prototype

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
`s.bind(ball, [x, y], (x, y) => ({ position: [x, y] }))`. Each target has one
binding, which can return several properties. Existing numeric sliders, toggles,
and selects retain their current behavior without source changes.

Bindings run once after the builder and whenever a declared dependency changes.
They return absolute values for a fixed set of keys: `radius` (circle/sphere),
`position`, `rotation`, `scale`, `opacity`, and `fill`. Coordinates and rotations
use the existing authoring conventions; fills must belong to the host palette.
Texture and material settings are geometry data: use ordinary controls to rebuild
them, together with any dependent labels. Values are validated before commit. Bindings do not create objects, modify
timelines, receive time, or run each animation frame in this prototype.

A binding and timeline cannot write the same property on the same object.
Reactive radius also conflicts with morphing that object. Reactive position
cannot share a target with an attachment, connector, or behavior. Other
properties can coexist: the example animates position while a slider owns radius.
Reactive values apply after timeline evaluation and before attachments/connectors,
so a surface connector follows the updated radius. Removed objects stay removed.

Callbacks must be synchronous, pure functions of their arguments and immutable
captured data. Do not increment closure counters or consume random values inside
them. Purity is an authoring contract, **not enforced by the prototype**; closure
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

Compiled scenes still contain plain JSON data, including the latest binding
values. `evaluateScene` can evaluate that snapshot anywhere. `compileSource`
returns a snapshot and disposes its runtime; use `SceneSequence` or the player
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

Geometry preparation still accounts for most of the remaining time. Orbit
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
