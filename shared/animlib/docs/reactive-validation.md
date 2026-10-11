# Reactive prototype compatibility checks

Validated on 2026-10-10 against clean baseline commit
`73a57be8806eee0dc29ef6d4802e521be0cbc637`. The baseline was exported and built
separately; comparisons use its compiler and evaluator alongside the prototype.
This report supplements the [performance measurements](reactive-controls.md).

## Regression found and fixed

A mixed-control burst exposed an ordering bug in the prototype's input coalescing:

1. Queue reactive slider `x = 2` with bounds `0..3`.
2. Queue an ordinary toggle that expands its bounds to `0..10`.
3. Queue `x = 8` before either request finishes.

The last value used to merge into the first request and clamp against the old
bounds, leaving **3 instead of 8**. Ordinary control changes now act as ordering
barriers, alongside source edits and seeks. The new regression test failed with
the old implementation and passes with the fix. A real-browser worker test
exercises the same burst.

## Before/after evidence

- **42 unchanged scene workloads:** identical compiled data and **1,384 identical
  evaluated frames**, including 105 control changes. The corpus covers the three
  production demos, two-view interaction, six app lessons in both themes, group
  compositing, and general authoring patterns. [Raw results](../bench/results/2026-10-10-compatibility.json).
- **12 reactive/rebuilt scene pairs:** 32 deterministic randomized control changes
  each, including out-of-range values, tested at seven time samples and repeated
  seeks. All **2,688 frame pairs** match. JSON-serialized reactive snapshots also
  match those same 2,688 frames.
- **Rendered output:** each pair is tested at three control values and three
  timeline times on both real WebGL2 and native Vulkan WebGPU. All **216 pixel
  comparisons** match exactly within each backend. This does not require WebGL
  and WebGPU to match one another pixel for pixel.
- **Ordering and resource stress:** 500 queued changes across two sliders and a
  seek retain the correct final values, with four callback requests. Forty rounds
  of successful replacement plus failed candidate submission keep exactly one
  live callback program, then zero after disposal.
- **Failure recovery:** invalid results, callback exceptions, time limits, a later
  callback failing, downstream preparation failure, and worker loss retain the
  last valid frame or recover on the next change. Mixed ordinary/reactive controls,
  insertion, replacement, and persistent downstream objects retain their values.
- **Playback:** the browser checks native WAV audio synchronization through a
  reactive update, plus seeking, graphics loss, recovery, and disposal. Player
  tests also check live behavior identity and queued request rejection.

The paired scenes cover every supported reactive property: radius, position,
rotation (scalar and 3D), scale, opacity, and palette fill/alpha. They include
attached billboards, surface connectors, isolated groups, animated children,
subviews, creation/removal, and compatible morphs.

## Test runs

After integrating main at `c588ac7` for the PR, the expanded suites pass with
320 library tests, 173 backend tests, 40 frontend tests, 45 native Vulkan WebGPU
tests, and 43 browser WebGL2 checks. Library/backend typechecks and library, app,
and demo builds pass. Both transparency and reactive GPU regressions are retained.
The authoring-reference extractor recognizes and preserves the new callback
section and its fallback guidance. The table below records the earlier isolated
prototype run used for the before/after comparisons.

| Check | Result |
| --- | --- |
| Clean baseline library suite | 239 passed |
| Prototype library suite | 277 passed |
| Native Vulkan WebGPU suite | 42 passed |
| Browser WebGL2 suite | 40 passed |
| Backend integration suite | 123 passed |
| Frontend suite | 31 passed |
| Library/backend typechecks, library build, production demo build | Passed |

Browser checks ran in Chrome 154 on Linux with SwiftShader WebGL2. Native Vulkan
checks exercise the production WGSL and GPU pipeline through Dawn. These checks
are correctness evidence, not a hardware-performance guarantee or an exhaustive
proof that no bugs remain.

## Scene-authoring models

The existing authoring API remains available. Before/after fixtures specifically
exercise object-count loops, text and LaTeX readouts, vector endpoints, path/mesh
geometry, conditional shapes, timeline duration, and control-dependent morphs.
Those features do not need conversion to the limited callback API. Backend plan
validation accepts both a reactive radius scene and an ordinary formula-driven
scene while retaining timing, persistence, and planned-control requirements.

The full reference supplied to the scene generator now explicitly tells authors
to keep ordinary sliders when a control drives unsupported properties, including
formulas and timeline structure, and to keep all coupled readouts consistent.
It also says not to simplify an explanation merely to fit the fast path. This
guidance is in the actual injected reference, not only in a linked document.

**Fresh model-generation quality was not measured.** `npm run agents:status`
reports `configured: false` for the app's generation provider in this workspace.
The model-related backend tests use controlled responses. Passing them verifies
the integration contract; it does not establish unchanged model success rates or
visual teaching quality. Callback purity remains an authoring contract, and the
prototype still rebuilds downstream scenes after upstream reactive changes.

## Reproduce

Run the standard library suite, `npm --workspace animlib run test:gpu`, backend
and frontend tests. Open `/webgl-test.html` on the demo development server and
click **Run browser tests**; `window.webglResult` contains the full browser report.

For the independent baseline comparison, build `shared/animlib` from the baseline
commit in a separate checkout, then run from this repository root:

```sh
node_modules/.bin/bun shared/animlib/bench/compatibility.ts \
  /path/to/baseline/shared/animlib/dist/core.js /tmp/compatibility.json
```

The reusable paired fixtures live in `test/reactive-cases.ts`; unit and both GPU
suites consume the same source pairs. The comparison harness exits nonzero on
any compile, frame, or control mismatch.
