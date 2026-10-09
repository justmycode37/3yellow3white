# animlib

A framework-free TypeScript library for code-authored, realtime WebGPU animations
on a canvas.
Scenes are written in ordinary JavaScript. Each scene builds a local, seekable
timeline using sequential animation instructions. A framework-free player handles
playback, scene navigation, persistent objects, interaction, live code submissions,
and one optional audio track per scene.

**Status: working initial implementation.** Scenes, live submissions, deterministic
seeking, persistence, morphing, native controls, 2D/3D camera transitions, and
per-scene audio are implemented. The API is new and may evolve. The document starts
with the gist and examples, then specifies behavior and implementation limits.

Rendering is **WebGPU only**, including 2D scenes. There is no WebGL or Canvas 2D
fallback. A missing adapter/device produces a diagnostic. WebGPU requires a secure
context, normally HTTPS or localhost. See the [WebGPU specification](https://gpuweb.github.io/gpuweb/).

From the repository root:

```sh
npm install
npm run dev          # fullscreen demo at http://localhost:5173
npm run typecheck
npm test
npm run build        # library JS, source maps, and TypeScript declarations
npm run demo:build   # bundled static demo in animlib/dist/demo
npm --workspace animlib run test:gpu  # optional native WebGPU/Dawn checks
```

The demo has a black fullscreen canvas, mostly white drawing, selective color
accents, and only a bottom progress bar and play/pause control. Its three scenes
demonstrate linear algebra, a molecule becoming 3D, and bubble sort. The demo's
scrubber maps sequence progress to `{ scene, time }`; scenes retain separate clocks.

The package is a local npm workspace named `animlib`. Build before importing
`createPlayer` from `"animlib"` elsewhere in this project. It has not been published.

## 1. The gist

```js
export default scene({ mode: "2d", end: "hold" }, s => {
  const scale = s.slider("scale", {
    label: "Scale",
    default: 1,
    min: 0.5,
    max: 3,
    step: 0.1,
  });

  const dot = s.circle("main-shape", {
    position: [-2, 0],
    radius: scale / 2,
    fill: "#58c4dd",
  });

  s.play(dot.fadeIn(), { duration: 0.5 });
  s.play(dot.moveTo([2, 0]), { duration: 1 });
  s.wait(0.5);
  s.play(dot.morphTo({ kind: "rectangle", width: scale, height: scale }), {
    duration: 1,
  });

  s.keep(dot);
});
```

The scene builder runs to **describe** the animation. Its `play` calls do not wait
for wall-clock time, and are not promises. The player evaluates the resulting
timeline at the requested scene time. Pausing and seeking therefore use the same
animation description as normal playback.

There is one authoring style: sequential `play(...)` and `wait(...)`. Multiple
animations in a single `play` run together. Explicit timestamps stay internal.

The first application demos will cover linear algebra, organic chemistry, and
computer algorithms. Matrices, molecules, arrays, and graphs belong to application
helpers built from animlib's shapes, text, paths, meshes, and groups.

### Decisions from the interview

- Each scene has its own clock and chooses whether to hold or advance at its end.
- Persistence is explicit. Only objects marked to persist become durable objects
  across scene boundaries.
- Direct navigation reconstructs incoming state from preceding scenes.
- The **incoming scene** owns boundary animations, including removing previous
  objects, introducing new ones, and morphing carried objects.
- Successful edits to the running scene restart it at time zero, preserving
  viewer settings such as slider values and camera rotation.
- Seeking uses current control values, without replaying historical input.
- Scene code chooses how elements and the camera transition between 2D and 3D.
- Viewer rotation is disabled while an authored camera animation owns the camera.
- Compatible ordinary shapes use automatic point matching for morphs.
- LaTeX morphs use explicit part mappings; unmatched parts fade in or out.
- The host submits LLM-generated JavaScript through an API supporting initial
  loading, scene replacement, and scene insertion.
- Each source defines one scene. The host can submit multiple sources together.
- Generated code gets animlib and approved math helpers, without direct access
  to the surrounding webpage or network.
- Internal dependencies are allowed; the public API has no framework dependency.
- Modern desktop browsers are the initial target.
- A scene can have one audio track.

**Controls:** providing `controlsRoot` mounts native sliders, toggles, and selects
inside that host-owned container. Position it over the canvas with CSS. Omitting
it leaves controls headless: read definitions from player state and update values
through `setControl`. Orbit interaction is on the canvas. Object picking and
dragging are future work. The minimal demo omits the control overlay.

## 2. The host interface

The host owns the page, the editor or LLM connection, and asset loading. Animlib
owns the animation player. The submitted code does not receive the player itself.

```ts
import { createPlayer } from "animlib";

const player = createPlayer({
  canvas,
  controlsRoot: overlayElement,
  assets: {
    "intro-voice": { kind: "audio", url: "/audio/intro.mp3" },
  },
});

// A single submission API handles all source changes.
const result = await player.submit({
  type: "load",
  scenes: [
    { id: "intro", source: introSource },
    { id: "explanation", source: explanationSource },
  ],
});

if (!result.ok) {
  showDiagnostics(result.diagnostics);
}

await player.play();
player.pause();
await player.seek({ scene: "explanation", time: 1.5 });

await player.submit({
  type: "replace",
  scene: "explanation",
  source: revisedExplanationSource,
});

await player.submit({
  type: "insert",
  after: "intro",
  scenes: [{ id: "interlude", source: interludeSource }],
});
```

The host assigns stable scene IDs. Source code supplies the scene's options and
builder, without duplicating its host-assigned ID. Element and control IDs are
specified inside scene code.

### TypeScript surface

These are representative public types. The complete types are in
[src/types.ts](src/types.ts), with generated declarations under `dist/` after a build.

```ts
type SceneId = string;

type SceneSource = {
  id: SceneId;
  source: string;
};

type Submission =
  | { type: "load"; scenes: SceneSource[] }
  | { type: "replace"; scene: SceneId; source: string }
  | { type: "insert"; after: SceneId | null; scenes: SceneSource[] };

type Diagnostic = {
  severity: "error" | "warning";
  code: string;
  message: string;
  scene?: SceneId;
  line?: number;
  column?: number;
  element?: string;
  hint?: string;
};

type SubmitResult =
  | { ok: true; revision: number; diagnostics: Diagnostic[] }
  | { ok: false; revision: number; diagnostics: Diagnostic[] };

type PlayerState = {
  revision: number;
  scene: SceneId | null;
  time: number;
  duration: number;
  status: "empty" | "paused" | "playing" | "ended" | "blocked";
};

interface Player {
  submit(change: Submission): Promise<SubmitResult>;
  play(): Promise<void>;
  pause(): void;
  seek(position: { scene: SceneId; time: number }): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  setControl(change: {
    scene: SceneId;
    id: string;
    value: number | boolean | string;
  }): Promise<void>;
  setMuted(muted: boolean): void;
  getState(): PlayerState;
  subscribe(listener: (state: PlayerState) => void): () => void;
  dispose(): void;
}
```

Defaults:

- `load` replaces the sequence and opens its first scene, paused at zero.
- `insert` with `after: null` prepends scenes. Otherwise it inserts after the named
  scene, without changing existing IDs.
- `seek`, `next`, and `previous` are asynchronous because reconstruction and asset
  preparation may be required. Manual navigation pauses at its destination.
- Seek time is clamped to the destination scene's duration. Seeking to a scene's
  end displays its final state; it does not trigger automatic advancement.
- `end: "advance"` takes effect when forward playback reaches the end. The last
  scene holds even if it requests advancement.
- `subscribe` returns an unsubscribe function; `dispose` releases player-owned
  rendering, audio, interaction, and runtime resources.

## 3. Writing a scene

### Source format

A source is a JavaScript module with one default-exported scene definition:

```js
export default scene(
  { mode: "2d", end: "advance", audio: "intro-voice" },
  s => {
    const heading = s.text("heading", {
      text: "A vector changes direction",
      position: [0, 2],
      fontSize: 0.4,
    });

    s.play(heading.fadeIn(), { duration: 0.4 });
    s.wait(1);
    s.keep(heading);
  },
);
```

The execution environment provides `scene` and approved `math` helpers.
Application helpers can be ordinary functions declared in the submitted source.
Host-side helper registration is not yet exposed. Arbitrary imports are not part
of the source contract.

Builders are synchronous and describe a finite animation. Ordinary variables,
loops, conditionals, and helper functions are supported. There are no sleeps,
timers, DOM operations, network requests, or per-frame mutation loops in scene code.

### Local timing

The cursor starts at zero. A `play` occupies a duration and advances the cursor by
that duration. A `wait` advances it without changing object properties.

```js
s.play(dot.fadeIn(), { duration: 0.5 });
s.play([dot.moveTo([1, 0]), label.fadeOut()], {
  duration: 1,
  ease: "smooth",
});
s.wait(0.5);
```

This describes fade-in at `0–0.5`, simultaneous movement and fade-out at
`0.5–1.5`, and a hold at `1.5–2`. All animations in one `play` share its duration
and easing. Initially, nested scheduling and different per-animation start times
are unnecessary public concepts.

Durations must be finite and nonnegative. Conflicting writes to the same property
in one `play` produce a diagnostic. Two animations may affect different properties
of the same object in parallel.

Object creation is recorded at the current cursor. A `fadeIn` begins from zero
opacity at that cursor, so compiling the scene does not briefly expose its target
state. Animation starting values come from the object's evaluated state at the
start of the interval. Scene-builder calls never draw intermediate frames.

### Elements and coordinates

Basic creation methods are `circle`, `rectangle`, `line`, `arrow`,
`path`, `text`, `latex`, `mesh`, and `group`. All take stable IDs and plain
data. Groups supply parent transforms and operate on their children together.

Common animatable properties include position, rotation, scale, opacity, fill,
stroke, stroke width, and geometry. Elements expose actions such as `moveTo`,
`rotateTo`, `scaleTo`, `fadeIn`, `fadeOut`, `animate`, and `morphTo`.

```js
s.play(dot.animate({ scale: 1.5, fill: "#ffffff" }), { duration: 0.6 });
```

Coordinate conventions:

- World-space positions accept `[x, y]` or `[x, y, z]`; omitted `z` means zero.
- The 2D drawing plane is XY, with positive Y upward. Distances use scene units,
  angles use radians, and durations use seconds.
- World text scales with the scene. `space: "screen"` uses CSS pixels, with the
  origin at the canvas center and positive Y upward. Screen-space geometry and
  labels remain fixed independently of camera movement. Default screen text is
  16 pixels; default screen LaTeX is 24 pixels.
- View framing is controlled by the camera, so resizing the canvas does not change
  the mathematical coordinates. Pixel density is handled by the renderer.

Ordinary IDs are unique within a scene. Persistent IDs must also be unambiguous
among currently carried objects. Duplicate IDs or missing inherited IDs are
errors, with source locations where available.

## 4. Persistence and scene handoffs

Scenes have independent **time**, but can depend on preceding scenes for **state**.
There is no concatenated public project timeline. A position is `{ scene, time }`.

`s.keep(element)` marks an object as durable across boundaries. It keeps its
identity, geometry, style, and final authored transform until explicitly removed.
`s.remove(element)` records removal at the current cursor and ends its persistence.
A fade changes visibility; it does not itself remove an object's identity.

The incoming scene has two ways to access the outgoing state:

- `s.previous.get(id)` accesses a carried persistent object. It is already attached
  to the incoming scene at time zero, with the preceding final authored state.
- `s.previous.exiting()` attaches a temporary group containing the previous
  scene's nonpersistent survivors. The incoming scene can animate them away.
  These objects do not become durable simply because they are used for an exit.

```js
export default scene({ mode: "2d", end: "hold" }, s => {
  const leftovers = s.previous.exiting();
  const mainShape = s.previous.get("main-shape");

  s.play(leftovers.fadeOut(), { duration: 0.3 });
  s.remove(leftovers);

  s.play(mainShape.moveTo([0, 0]), { duration: 0.8 });

  const caption = s.text("caption", {
    text: "The same object, in another scene",
    position: [0, -2],
    fontSize: 0.35,
  });
  s.play(caption.fadeIn(), { duration: 0.4 });
});
```

There is no separate transition object or clock. These exit and entrance
animations are ordinary instructions at the start of the incoming scene.

Lifetime details:

- The previous scene's nonpersistent objects are available as a frozen snapshot,
  and render in the incoming scene only if it requests `previous.exiting()`.
- An empty exit group is valid, including in the first scene.
- Temporary exit objects have a separate namespace, so an incoming caption can
  reuse a departed caption's local ID.
- Exit objects expire by the next boundary unless explicitly promoted to
  persistence. Missing exit animation means immediate disappearance at handoff.
- A morph changes the existing object's representation while preserving its ID.
  Its destination is a geometry descriptor, not a second automatically attached
  object.
- Keeping a group keeps its descendants. Keeping only a child preserves its
  visual pose by baking departing ancestor transforms into the child's incoming
  state. Its siblings do not silently become persistent.
- Removing a child detaches it from its group's membership, so later reuse of
  that local ID does not accidentally attach a new object to the old group.

### Direct navigation and reconstruction

To open scene C directly, the player evaluates preceding scenes to their final
states, in sequence, to obtain C's incoming state. It does not visibly play those
scenes, wait through their durations, play their audio, or stop at their holds.

Evaluation uses each scene's current control values, its current source, approved
assets, and a stable random seed if seeded randomness is exposed. Persistent state
and the immediately preceding scene's exit snapshot are reconstructed together.

The initial implementation rebuilds the sequence on successful source or control
changes. Direct navigation then evaluates already compiled data without executing
source again. More selective reconstruction/caching can follow once needed.
Viewer camera interaction is a separate view setting and does not silently alter
an object's authored outgoing state.

This deliberately makes later scenes state-dependent. If an upstream edit removes
an object a later scene expects, reconstruction must report that dependency error.
The library should not invent a substitute object or reuse a stale handoff.

## 5. Morphing shapes and LaTeX

### Ordinary shapes

```js
s.play(shape.morphTo({ kind: "rectangle", width: 2, height: 1 }), {
  duration: 1,
});
```

Compatible outlines are resampled by arc length. Point matching aligns winding
and the start of closed outlines before interpolation. Circles, rectangles, and
closed paths can morph into one another; open paths, lines, and arrows can morph
into compatible open outlines. Arrow-to-arrow morphs retain arrowheads.

Meshes with matching vertex counts interpolate corresponding vertex positions.
Use matching vertex ordering and compatible topology for meaningful mesh morphs.
The library cannot infer the correspondence between two arbitrary 3D models.
Other incompatible representations crossfade. Morph targets describe geometry;
animate position, scale, rotation, and color with separate actions in the same
`play` when needed.

### Named formula parts

LaTeX uses bundled MathJax SVG glyph outlines, tessellated for WebGPU. A complete
formula is laid out together, preserving fractions, scripts, and normal spacing.
The library-specific `\animpart{name}{TeX}` marker identifies a part without
changing its visual content. It is consumed before MathJax typesetting.

```js
export default scene({ mode: "2d" }, s => {
  const equation = s.latex("equation", {
    tex: String.raw`\animpart{lhs}{x^2}\animpart{eq}{=}\animpart{rhs}{4}`,
    fontSize: 0.7,
  });

  s.play(equation.fadeIn(), { duration: 0.5 });
  s.wait(0.5);
  s.play(equation.morphTo({
    kind: "latex",
    tex: String.raw`\animpart{lhs}{x}\animpart{eq}{=}\animpart{rhs}{\pm 2}`,
    fontSize: 0.7,
  }, {
    map: { lhs: "lhs", eq: "eq", rhs: "rhs" },
  }), { duration: 1.5 });
});
```

Every part that morphs needs an explicit mapping, including parts with identical
names or symbols. An empty map intentionally fades the whole formula. Unmapped
source parts fade out; unmapped destination parts fade in. Repeated symbols do
not trigger guessed matches.

Mapped parts interpolate glyph contours when their path/contour structures are
compatible. Otherwise the mapped parts move between their positions and crossfade.
This preserves the author's semantic correspondence without pretending arbitrary
glyph topology has a unique interpolation.

Part names must start with a letter and contain letters, digits, `_`, or `-`.
Names are unique within a formula, and parts cannot be nested. Mappings are
one-to-one in this version; split/merge mappings are not implemented. Invalid TeX,
unknown mapped names, and duplicate destinations reject the submission.

The configured mathematical TeX packages cover base math, AMS constructs,
new commands, and the internal HTML-class annotations used for named parts.
Full document TeX is outside the renderer. Plain `text` also uses bundled vector
glyphs; unsupported characters reject rather than silently disappear. Font
selection, emoji, multiline text layout, and broad international text coverage
need a separate text implementation.

## 6. Interaction and 2D/3D scenes

### Controls are input values

```js
const factor = s.slider("factor", {
  label: "Stretch",
  default: 1,
  min: 0.5,
  max: 3,
  step: 0.1,
});
const showGrid = s.toggle("grid", { label: "Show grid", default: true });
const order = s.select("order", {
  label: "Order",
  default: "ascending",
  options: ["ascending", "descending"],
});
```

These methods return ordinary numbers, booleans, or strings during compilation.
Normal JavaScript arithmetic and conditionals work without a reactive expression
language. The builder is reevaluated when inputs change. The current scene is
redrawn at its current local time, including while paused; it does not restart
merely because a slider changed. If the new duration is shorter, the time clamps.
Playback continues if it was running and has not reached the new end.

Stable control IDs are scoped by scene ID. Successful source edits preserve values
for controls that still exist. Slider values clamp to changed bounds; an obsolete
select option falls back to its new default. Removed controls disappear.

For a custom host UI:

```ts
const unsubscribe = player.subscribe(state => {
  renderMyControls(state.controls);
  updateMyTransport(state);
});

await player.setControl({ scene: "intro", id: "factor", value: 2 });
// Later:
unsubscribe();
```

Do not recreate the host's controls on every frame if that would lose focus.
The built-in overlay maintains keyed native widgets and reconciles pending input
updates after their compilation finishes.

### Geometry and camera transitions

2D uses the same world coordinates as 3D, with planar geometry at `z = 0` and a
front-facing orthographic camera. The first scene's `mode` chooses its initial
camera preset. Later scenes inherit the previous authored camera state; declaring
`mode: "3d"` does not silently snap the incoming view.

```js
export default scene({ mode: "3d", orbit: true }, s => {
  const point = s.previous.get("main-shape");
  const old = s.previous.exiting();
  s.play(old.fadeOut(), { duration: 0.3 });
  s.remove(old);

  s.play([
    point.moveTo([1, 0, 1.5]),
    s.camera.to3D({ yaw: 0.7, pitch: 0.4, distance: 12, height: 8 }),
  ], { duration: 1.5 });
  s.wait(2);
});
```

`to3D` animates perspective strength and camera angles. `to2D` returns to a
front-facing orthographic view. Both take optional camera properties; use
`camera.animate` for arbitrary moves involving `yaw`, `pitch`, `target`, `height`,
`distance`, and `perspective`. Camera geometry/motion is authored explicitly;
changing the camera never automatically invents molecular positions or extrudes
a 2D drawing.

`orbit: true` requests pointer-drag rotation when the evaluated camera is 3D.
The rotation input is disabled during camera-animation intervals, including when
paused within one. Saved viewer rotation remains a constant offset along the
authored path; its contribution fades with perspective when returning to 2D.
Editing code preserves these view settings. Viewer rotation is not baked into
the outgoing object state used for reconstruction.

The renderer handles 3D vertex positions, meshes, camera projection, and opaque
depth testing on the GPU. Circles/text are planar geometry, not automatically
billboards or shaded spheres. The molecule demo supplies its own spatial layout
using primitives. Lighting, physically based materials, model loading, picking,
and object dragging are not yet implemented.

## 7. Live source submissions

`submit` is the common mutation entry point for the surrounding app, whether the
code comes from an LLM, a file, or an editor. Source IDs and sequence placement
are host-owned metadata; a source still describes exactly one scene.

The submission pipeline:

1. Check source format and parse JavaScript.
2. Run each candidate scene builder in an isolated QuickJS VM.
3. Validate bounded, plain compiled animation data.
4. Reconstruct later scene dependencies using current inputs.
5. Prepare formula geometry, audio assets, and the WebGPU renderer.
6. Commit the complete candidate sequence atomically and update playback.

In browsers, compilation runs in a module worker so JavaScript building does not
occupy the playback thread. QuickJS remains the isolation boundary inside that
worker. Rendering/geometry preparation still involves the main thread.

Invalid syntax, a missing inherited object, invalid LaTeX mappings, an unknown
audio asset, execution limits, or an unavailable GPU reject the submission.
`SubmitResult` contains diagnostics and the unchanged revision. The previous
valid sequence and its playback remain available. Each successful source
submission increments the revision; control changes do not create source revisions.

Submissions and control changes are serialized. The host can send new code while
the current sequence plays. Browser audio permission is distinct from code
validity: a committed scene may be valid while its attempt to resume audio is
blocked. That is reported in player state rather than undoing valid code.

### Playback after successful changes

- Replacing the active scene restarts it at zero, retaining its controls and
  viewer rotation. Its playing/paused state is retained where playback is allowed.
- Replacing a preceding scene or inserting before the active scene also restarts
  the active scene, since its reconstructed input state changed.
- Changes strictly after the active scene keep its position.
- A full `load` resets the sequence and its control values and opens paused.
- If an upstream edit breaks a downstream dependency, the whole edit is rejected.
- Manual seeking and navigation pause at the requested position. Normal forward
  playback alone triggers `end: "advance"`.

Use diagnostic `code`, `scene`, and source `line`/`column` where available to feed
errors back to the generating LLM. Parse errors have precise locations. Builder
and asset preparation diagnostics may have less precise locations.

### Execution environment

Submitted source is JavaScript, while the library and its declarations are
TypeScript. A host wanting TypeScript source should transpile it before submission.

QuickJS exposes ordinary JavaScript language features, `scene`, and `math`/`Math`.
It receives no browser DOM, fetch, XMLHttpRequest, WebSocket, Node process, or host
function bindings. Constructing a JavaScript `Function` does not escape that VM.
Imports are unavailable. `Date` and the exposed `Promise` global are disabled;
builders must be synchronous. Randomness is seeded and repeatable.

Each compilation has a default 200 ms VM execution budget, 32 MiB VM memory
budget, and bounded stack. The host can change `executionLimitMs`. Browser-worker
startup has a separate timeout; a failed worker can be recreated on a later
submission. These limits protect the scene-building step; they are not a complete
budget for subsequent TeX layout, tessellation, or GPU allocation.

Current data limits include 256 KB per source, 100 scenes, 2,000 object IDs per
builder, 100 controls, 10,000 animation tracks, and a 24-hour visual timeline.
The VM boundary validates finite numbers, geometry sizes, mesh indices, object
lifetimes, and group references. The library intentionally does not expose
arbitrary browser callbacks in the animation data.

The host must serve the worker and WebAssembly assets produced by its bundler.
If using a content security policy, configure it to allow the library's module
worker and WebAssembly runtime. See the [QuickJS embedding documentation](https://github.com/justjake/quickjs-emscripten)
for the VM and memory/interrupt mechanisms.

## 8. One audio track per scene

The host registers audio URLs as assets. Scene code selects an asset ID and has
no network access or URL-loading responsibility:

```ts
const player = createPlayer({
  canvas,
  assets: { narration: { kind: "audio", url: "/audio/intro.wav" } },
});
```

```js
export default scene({ mode: "2d", end: "hold", audio: "narration" }, s => {
  const title = s.text("title", { text: "An introduction" });
  s.play(title.fadeIn(), { duration: 1 });
  s.wait(3);
});
```

Audio is prepared and decoded before a candidate is committed. A scene's duration
is the greater of its visual timeline and audio duration. Shorter audio ends while
visual playback continues; longer audio holds the final visual frame until the
track ends. The track starts at local scene time zero. There is no cross-scene
audio carry, mixing, or separate audio timeline.

Playback with audio uses the Web Audio clock as its local time source. Pause stops
the source; resume creates a source at the stored offset. Seeking pauses both
audio and visuals and displays the selected frame silently until Play. Restarting
an edited scene restarts its track. Reconstructing preceding scenes never plays
their tracks. Muting preserves synchronization.
If the browser interrupts a running audio context, playback becomes `blocked` at
the synchronized offset; pressing Play resumes the track and visuals there.

Web Audio provides the clock and offset scheduling mechanisms; see the
[Web Audio specification](https://www.w3.org/TR/webaudio/).
Browsers may require a user gesture to start audio. `play()` can reject and player
state becomes `blocked`; pressing Play can retry. The host should handle that
state alongside its transport. See the [browser autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

## 9. Engine structure and verification

The public player composes three concerns:

- `SceneSequence` owns sources, current inputs, atomic submissions, and
  reconstruction. It is also usable headlessly.
- `evaluateScene` calculates a frame from compiled data and local time, without
  accumulating mutations from earlier frames.
- The renderer, control overlay, and audio clock consume that data in the browser.

The main implementation files are:

- [src/types.ts](src/types.ts): public data and scene-authoring types.
- [src/runtime.ts](src/runtime.ts): sequential builder installed inside the VM.
- [src/compiler.ts](src/compiler.ts), [src/compiler-client.ts](src/compiler-client.ts),
  and [src/compiler-worker.ts](src/compiler-worker.ts): source parsing, isolated
  execution, validation, and off-thread browser compilation.
- [src/sequence.ts](src/sequence.ts) and [src/timeline.ts](src/timeline.ts):
  reconstruction, transactions, and deterministic time evaluation.
- [src/renderer.ts](src/renderer.ts), [src/geometry.ts](src/geometry.ts), and
  [src/latex.ts](src/latex.ts): WebGPU drawing, outline matching, and vector formula layout.
- [src/player.ts](src/player.ts), [src/audio.ts](src/audio.ts), and
  [src/controls.ts](src/controls.ts): transport, audio, and optional native widgets.
- [demo/scenes.ts](demo/scenes.ts): application-level demo helpers and scene sources.

Portable tests cover deterministic seeks, parallel property animation, persistence
and group lifetimes, current-control reconstruction, code replacement/insertion,
failure isolation, sandbox capabilities/limits, LaTeX mappings, shape matching,
playback ownership, audio clocks, and control races.

The separate `test:gpu` suite uses Dawn's native WebGPU API through Vulkan. It
compiles the actual shader/pipeline, renders the demo scenes off-screen, reads
back pixels, and checks intermediate morphs, per-pixel mesh depth, and screen-space
placement. It requires a native Vulkan WebGPU adapter and is not a runtime backend
or rendering fallback. Set `ANIMLIB_GPU_ARTIFACTS` to a directory to save PNG frames:

```sh
ANIMLIB_GPU_ARTIFACTS=/tmp/animlib-frames npm --workspace animlib run test:gpu
```

## 10. Current boundaries and next steps

This implementation targets modest explanatory scenes. It does not establish a
large-scene performance guarantee. TeX layout and morph correspondence are prepared
or cached where possible, but vertex generation/upload and timeline evaluation
still happen each frame. Selective reconstruction and GPU-side animation are
possible improvements after measuring real scenes.

Opaque meshes have depth testing. Intersecting transparent surfaces use approximate
sorting and can render incorrectly. Primitive strokes are tessellated ribbons,
not a comprehensive 3D line/material system. Shape matching cannot infer semantic
part correspondence or arbitrary mesh topology.

Not yet included: custom fonts and general text shaping, images/video textures,
element dragging/picking, custom interaction callbacks, LaTeX split/merge mappings,
physics integration, infinite scenes, branching navigation, playback-rate controls,
video export, or mobile-browser support guarantees. The initial control surface
is sliders, toggles, selects, and requested orbit rotation.

Useful follow-up work should be driven by the three application demos: reusable
domain helpers in the app, accessible descriptions of visual objects, measured
performance improvements, richer text support, and only then additional interaction
or rendering features. The core contract remains plain scene code, local clocks,
explicit persistence, and reproducible frames.
