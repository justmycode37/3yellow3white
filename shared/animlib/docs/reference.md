# animlib reference

For the purpose and core requirements, see the [README](../README.md).

A framework-free TypeScript library for code-authored, realtime GPU animations
on a canvas.
Scenes are written in ordinary JavaScript. Each scene builds a local, seekable
timeline using sequential animation instructions. A framework-free player handles
playback, scene navigation, persistent objects, interaction, live code submissions,
and one optional audio track per scene.

**Status: working initial implementation.** Scenes, live submissions, deterministic
seeking, persistence, morphing, native controls, 2D/3D camera transitions, and
per-scene audio are implemented. The API is new and may evolve. The document starts
with the gist and examples, then specifies behavior and implementation limits.

Rendering prefers **WebGPU**, with automatic **WebGL2** fallback for both 2D and
3D scenes when WebGPU initialization is unavailable or fails. Both backends share
tessellation, colors, draw ordering and camera evaluation. If neither works, the
player reports both failure reasons. WebGPU requires a secure context, normally
HTTPS or localhost; WebGL2 does not require disabling browser security settings. See the [WebGPU specification](https://gpuweb.github.io/gpuweb/).

Use Node.js 22.16 or newer for development. From the repository root:

```sh
npm install
npm run dev          # fullscreen demo at http://localhost:5173
npm run typecheck
npm test
npm run build        # library JS, source maps, and TypeScript declarations
npm run demo:build   # bundled static demo in shared/animlib/dist/demo
npm --workspace animlib run test:gpu  # optional native WebGPU/Dawn checks
```

The demo has a black fullscreen canvas, mostly white drawing, selective color
accents, native scene controls, and a bottom progress bar and play/pause control. Its three scenes
demonstrate linear algebra, a molecule becoming 3D, and bubble sort. The demo's
scrubber maps sequence progress to `{ scene, time }`; scenes retain separate clocks.

The package lives in `shared/animlib` and is a local npm workspace named
`animlib`. Build before importing
`createPlayer` from `"animlib"` elsewhere in this project. It has not been published.
For Bun and Node consumers, `animlib/core` exports `compileSource`, `evaluateScene`,
`SceneSequence`, and the public types without loading the browser renderer.
See the [shared evaluation example](../README.md#shared-scene-evaluation).

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
    fill: Color.BLUE,
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

The application demos cover linear algebra, organic chemistry, and
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
  slider values and viewer rotation unless the restart crosses an authored rotation.
- Seeking uses current control values, without replaying historical input.
- Scene code chooses how elements and the camera transition between 2D and 3D.
- Viewer rotation is disabled while an authored camera animation owns the camera.
- Compatible curved paths interpolate authored control points; other compatible
  single outlines use automatic point matching for morphs.
- LaTeX morphs use explicit part mappings; unmatched parts fade in or out.
- The host submits LLM-generated JavaScript through an API supporting initial
  loading, scene replacement, and scene insertion.
- Each source defines one scene. The host can submit multiple sources together.
- Generated code gets animlib and approved math helpers, without direct access
  to the surrounding webpage or network.
- Internal dependencies are allowed; the public API has no framework dependency.
- Modern desktop browsers are the initial target.
- A scene can have one audio track.

**Canvas-only by default:** `createPlayer({ canvas })` renders and handles input on
the canvas without creating surrounding DOM. Native sliders, toggles and selects
require an explicit `controlsRoot: overlayElement`. Omit it (or pass `false`) to
read definitions from player state and update values through `setControl` yourself.
This changes the previous automatic-parent-overlay default; pass
`controlsRoot: canvas.parentElement` to retain that UI. Object interaction is
declared with behaviors, and the player owns pointer capture and frame scheduling.
Open the demo at `http://localhost:5173/?interactive` for positioned controls and
two independently rotatable 3D views.
Open `/behaviors.html` for a canvas-only drag/spring/binding/compositing example.

## 2. The host interface

### Color palettes

Scene colors use the enum-like `Color` API exported by `animlib` and
`animlib/core`. Fills, strokes, animation targets, and backgrounds accept named
palette tokens. TypeScript rejects arbitrary strings; the scene compiler and
renderer enforce the same rule for JavaScript callers. Raw hex, RGB, HSL, and CSS
names are invalid even when their RGB value happens to match a palette swatch.
Invalid submissions return diagnostics and preserve the last valid sequence.

```js
export default scene({ background: Color.BLACK }, s => {
  const dot = s.circle("dot", { fill: Color.BLUE, stroke: Color.NONE });
  s.play(dot.animate({ fill: Color.RED }), { duration: 1 });
  s.line("axis", {
    points: [[-3, 0], [3, 0]],
    stroke: { color: Color.GREY_B, opacity: 0.4 },
  });
});
```

`Color.BLUE` is the literal token `"BLUE"`, so string literal tokens are also
accepted. `Color.NONE` is `"none"`. A `ColorValue` is a token or
`{ color: PaletteColor, opacity: number }`, with opacity from 0 to 1.
`ElementStyle`, `ElementState`, and animated styles use this type; backgrounds
require an opaque `PaletteColor` token. Element `opacity`, `fadeIn`, and `fadeOut`
remain available. Scene code gets frozen `Color` and `palette` objects, with
`palette.colors.BLUE` also returning the token `"BLUE"`. Unknown members produce
an error instead of silently selecting the default color.

The default `THREE_BLUE_ONE_BROWN_PALETTE` uses the full set of swatches and median
aliases from [3Blue1Brown's Manim configuration](https://github.com/3b1b/manim/blob/master/manimlib/default_config.yml)
and [constants](https://github.com/3b1b/manim/blob/master/manimlib/constants.py).
It has a black background and white foreground, following his
[video configuration](https://github.com/3b1b/videos/blob/master/custom_config.yml)
and Manim's default object color. `Color.PURE_BLUE` selects pure blue;
`Color.BLUE` selects the usual Manim blue.

The host can supply a custom palette mapping the same typed slots to other colors:

```ts
import { Color, createPlayer, type ColorPalette } from "animlib";

const palette: ColorPalette = {
  colors: { BLACK: "#222222", WHITE: "#dddddd", BLUE: "#58c4dd" },
  background: Color.WHITE,
  foreground: Color.BLACK,
};
const player = createPlayer({ canvas, palette });
// Headless equivalents:
// new SceneSequence({ palette });
// await compileSource(source, { palette, previous, controls, seed: 1 });
```

Custom palettes are immutable host configuration. They must define at least one
`Color` slot, with opaque CSS values, plus background and foreground tokens present
in that palette. Colors are required to exist in the active palette: this example
rejects `Color.RED` because it has no RED slot. CSS values are only accepted in
host palette definitions. Scene code cannot replace or disable the host palette.

Compiled scenes, evaluated frames, and JSON handoffs retain typed tokens, so
inherited elements resolve against the receiving palette. Color animations select
intermediate palette swatches by Oklab distance while interpolating alpha
continuously. This internal interpolation does not allow invalid authored colors.
The renderer resolves tokens to RGB at the drawing boundary for every view.

Enforcement applies to base drawing colors. Lighting, opacity blending,
antialiasing, and morph crossfades still produce intermediate pixel colors;
this is not a posterization filter. Backgrounds remain opaque. Native DOM controls
and surrounding application CSS are outside the scene palette.

### Player API

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
[src/types.ts](../src/types.ts), with generated declarations under `dist/` after a build.

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
  controls: ControlDefinition[];
  orbitEnabled: boolean;
  views: { id: string; rect: [number, number, number, number]; orbitEnabled: boolean }[];
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

Basic creation methods are `circle`, `sphere`, `rectangle`, `line`, `arrow`,
`path`, `text`, `latex`, `mesh`, and `group`. For spatial geometry, use
`surface`, `parametricSurface`, `box`, `cylinder`, `cone`, `torus`, and `tube`.
All take stable IDs. Groups supply parent transforms and operate on their children
together. Surface callbacks run during scene compilation and produce plain mesh data.

### Shaded meshes

`s.mesh(id, { vertices, triangles, shading?, normals?, ...style })` accepts local
positions and zero-based triangle index triples. Omitted `shading` preserves the
existing unlit appearance. Choose `"flat"` for a normal per triangle or `"smooth"`
for area-weighted normals averaged at shared vertex indices. Duplicate positions
with different indices remain separate at hard edges. Optional `normals` supply
one finite, nonzero local `Vec3` per vertex for smooth shading; the renderer
normalizes them. Flat shading ignores supplied normals. Use consistent triangle
winding when computing smooth normals.

```js
s.mesh('facet', {
  vertices: [[-1, 0, 0], [1, 0, 0], [0, 1, 0.7]],
  triangles: [[0, 1, 2]],
  shading: 'flat', fill: Color.BLUE, stroke: Color.NONE,
});
```

Flat and smooth meshes use the same simple directional lighting as spheres and
round 3D strokes on both WebGPU and WebGL2. They support element/group transforms,
independent views, depth testing, opacity, and palette colors. This is not a
material or light-source API. Prefer opaque bodies when surfaces intersect;
triangle transparency sorting does not solve every intersection. Ordinary 2D
fills and raw meshes without a shading option retain their existing appearance.

`vertices`, `triangles`, `shading`, and `normals` are geometry, while `fill`,
`stroke`, `strokeWidth`, `position`, `rotation`, `scale`, and `opacity` are element
style/transform properties. The surface and solid helpers below return ordinary
mesh element handles; their sampled callbacks and construction parameters are not
retained as animatable properties. Move, rotate, scale, group, fade, and keep these
handles like other elements. A mesh morph still needs corresponding vertices and
compatible topology. Morphs without authored normals recompute lighting from the
intermediate geometry. If either endpoint supplies normals, normalized endpoint
normals interpolate instead; the missing endpoint is derived from its geometry.
Exactly opposite normals use a finite fallback at their ambiguous midpoint.
Nonuniform changes of shape require new mesh geometry.

### Function and parametric surfaces

`s.surface(id, { fn: (x, y) => z, xRange?, yRange?, xSegments?, ySegments?,
shading?, ...style })` samples the graph **z = f(x, y)** in local XYZ coordinates.
Both ranges default to `[-2, 2]`; both segment counts default to `32`.

```js
const amplitude = s.slider('amplitude', {
  label: 'Amplitude', default: 0.6, min: 0, max: 1.2, step: 0.05,
});
s.surface('wave', {
  fn: (x, y) => amplitude * Math.sin(2 * x) * Math.cos(2 * y),
  xRange: [-2, 2], yRange: [-2, 2],
  xSegments: 32, ySegments: 32, fill: Color.TEAL,
});
s.wait(3);
```

Use this inside a `scene({ mode: '3d', orbit: true }, s => { ... })` builder,
or create the surface in an `s.view` callback. This ordinary numeric slider
recompiles the sampled geometry at the current playback time, including while
paused. Derive dependent labels from the same value and keep duration stable.
Do not use `reactive: true` or `s.bind` to change a surface callback, vertices,
segment count, solid dimensions, or tube points: retained bindings do not rebuild
mesh geometry. An ordinary control is also needed if a size change updates text.

`s.parametricSurface(id, { fn: (u, v) => [x, y, z], uRange?, vRange?,
uSegments?, vSegments?, closedU?, closedV?, shading?, ...style })` supports shapes
that are not single-valued height graphs. Both parameter ranges default to `[0, 1]`,
segment counts to `32`, and closure flags to `false`. A closed axis shares seam
indices and does not sample its duplicate upper endpoint. Set a closure flag only
when the map is periodic across that axis; it joins the seam but adds no caps.

For example, a five-lobed flower cup with real depth can be authored as one
parametric surface, with a tube stem as a separate grouped part:

```js
const flower = s.parametricSurface('flower', {
  uRange: [0, 2 * Math.PI], vRange: [0.08, 1],
  uSegments: 64, vSegments: 24, closedU: true,
  fn: (u, v) => {
    const r = v * (1 + 0.28 * Math.cos(5 * u));
    return [r * Math.cos(u), 0.7 * v * v, r * Math.sin(u)];
  },
  fill: Color.PURPLE,
});
const stem = s.tube('stem', {
  points: [[0, -1.6, 0], [0.12, -0.8, 0], [0, 0, 0]],
  radius: 0.06, fill: Color.GREEN,
});
s.group('plant', [flower, stem]);
```

Both helpers default to smooth shading and `stroke: Color.NONE`; override shading
with `"flat"` or `"unlit"` when appropriate. A nonzero stroke draws triangle edges,
including diagonals, rather than only parameter-grid lines. Sample separate paths
if the lesson needs specific coordinate curves. Drawing every triangle edge adds
substantial geometry and CPU work; keep dense surfaces stroke-free by default.

Callbacks must be synchronous and deterministic. Returning `NaN` or `Infinity`
omits that sample and every adjacent grid cell, creating a hole rather than a
bridge across an undefined domain. Returning the wrong type or throwing is an
error. Degenerate triangles are omitted. Holes and collapsed poles can change
topology, so do not assume two sampled surfaces are morph-compatible.

Ranges must contain two finite, strictly increasing endpoints within ±1,000,000.
Finite sampled coordinates have the same bound. Segment counts are integers from
1 to 20,000, or from 3 on a closed axis, subject to a **20,000 vertex and 20,000
triangle budget per surface** checked before sampling. An open grid uses
`(uSegments + 1) * (vSegments + 1)` samples and up to
`2 * uSegments * vSegments` triangles; a closed axis omits its extra endpoint.
The default open 32-by-32 grid has 1,089 vertices and at most 2,048 triangles.
Holes do not allow a larger requested grid. Start with modest segment counts:
doubling both counts roughly quadruples compilation and drawing work, and an
ordinary slider resamples on each accepted change. Keep callbacks cheap and use
transforms for rigid motion. Per-mesh limits are ceilings, not performance targets;
the scene's aggregate geometry and sandbox execution budgets also apply.

### Basic solids and swept tubes

Each helper accepts the ordinary element style/transform options plus
`shading: 'unlit' | 'flat' | 'smooth'`. All default to no stroke and smooth shading,
except `box`, which defaults to flat shading. Parameters below describe geometry
in local scene units; use `position` and `rotation` to place the resulting mesh.

- `s.box(id, { width?, height?, depth?, ...style })`: dimensions default to `1`.
  The box is centered at the origin, with width along X, height along Y, and depth
  along Z. Face vertices are separate, preserving hard edges even in smooth mode.
- `s.cylinder(id, { radius?, height?, radialSegments?, capped?, ...style })`:
  defaults are radius `1`, height `2`, radial segments `32`, and `capped: true`.
  The axis is Y, with ends at `-height / 2` and `height / 2`.
- `s.cone(id, { radius?, height?, radialSegments?, capped?, ...style })`: the same
  defaults, with a base at `-height / 2` and tip at `height / 2`. `capped` closes
  the base. Cylinder/cone caps use separate vertices to keep their rims sharp.
- `s.torus(id, { radius?, tubeRadius?, radialSegments?, tubularSegments?,
  ...style })`: defaults are `1`, `0.25`, `32`, and `12`, respectively. The ring
  lies in XZ around the Y axis, centered at the origin. `radius` measures to the
  tube center, not its outside edge; `tubeRadius` must be smaller than `radius`.
  Radial segments run around the major ring; tubular segments run around each
  cross-section. Both seams share indices.
- `s.tube(id, { points, radius?, radialSegments?, capped?, closed?, ...style })`:
  `points` is a required `Vec3[]` centerline. Defaults are radius `0.1`, radial
  segments `12`, `capped: true`, and `closed: false`. Radius is constant. Closed
  tubes join the last point to the first and ignore caps.

```js
s.box('block', { width: 1.2, height: 0.8, depth: 0.6, fill: Color.BLUE });
s.cylinder('column', { radius: 0.4, height: 1.8, position: [2, 0, 0], fill: Color.TEAL });
s.cone('tip', { radius: 0.4, height: 0.8, position: [2, 1.3, 0], fill: Color.TEAL });
s.torus('ring', { radius: 0.8, tubeRadius: 0.15, position: [-2, 0, 0], fill: Color.GOLD });
```

Tubes sweep circular rings along the supplied polyline; they do not interpolate a
Catmull–Rom curve. Sample a smooth centerline yourself when needed. Parallel
transport carries the cross-section orientation along bends, with distributed
twist correction for closed loops. Consecutive duplicate points within `1e-10`
scene units are removed, including a repeated closing endpoint. At least two
points must remain for an open tube, or three for a closed one. Exact or near
U-turns are rejected because the joint tangent is ambiguous. There is no collision
or self-intersection repair: use gentle bends and a radius small relative to the
centerline's curvature and spacing. End caps retain sharp rims.

Dimensions and radii must be finite and strictly positive, at most 1,000,000.
Input points and generated vertex coordinates must lie within ±1,000,000.
All segment counts are integers from 3 to 20,000, further constrained by the
20,000-vertex and 20,000-triangle budget per mesh. Tube input is also limited to
20,000 points before duplicate removal. Caps count toward the budget. For an open
tube with `n` retained points and `r` radial segments, the sides use `n * r`
vertices and `2 * (n - 1) * r` triangles; two caps add `2 * (r + 1)` vertices
and `2 * r` triangles. A closed tube uses `n * r` vertices and `2 * n * r`
triangles. More radial segments round the cross-section; more centerline samples
resolve bends. Keep both modest for interactive scenes.

### Curved paths and organic shapes

`s.path` accepts either a `points` array or SVG path data in `d`. Existing point
paths use straight segments (`curve: "linear"`, also the default). Set
`curve: "smooth"` to interpolate through the
points with a Catmull–Rom spline; a closed spline has a smooth closing seam.
Use at least two points for an open path and three for a closed smooth path.
Set `closed: true` on a point path to close it; open is the default. `d` and
`curve` are path-only properties, not options for rectangles, lines, or arrows.
The spline can overshoot between points; use Bézier controls when exact boundaries
or sharp tips matter.

```js
const leaf = s.path('leaf', {
  d: 'M0 0 C0.5 0.6 1.3 0.7 2 0 C1.3 -0.5 0.5 -0.4 0 0 Z',
  fill: Color.GREEN, stroke: Color.GREEN_A, strokeWidth: 0.03,
});
const root = s.path('root', {
  points: [[0, 0], [0.1, -0.5], [-0.3, -1]], curve: 'smooth',
  fill: Color.NONE, stroke: Color.GREEN_B, strokeWidth: 0.05,
});
s.play(leaf.morphTo({
  kind: 'path',
  d: 'M0 0 C0.5 0.8 1.3 1.0 2 0.3 C1.3 -0.2 0.5 -0.3 0 0 Z',
}), { duration: 1 });
```

Path data supports absolute and relative `M`, `L`, `H`, `V`, `C`, `S`, `Q`,
`T`, `A`, and `Z` commands. Start with `M` or `m` and include at least one drawing
segment. Coordinates use the element's local XY plane,
**positive Y upward**, in scene units (CSS pixels for screen-space elements).
`d` is geometry data, not an SVG document: it does not carry colors, transforms,
or a viewBox. Apply those through ordinary element/group properties. Do not mix
`d` with `points`, `curve`, or `closed`; use `Z` to close each subpath.

Closed contours receive fills and strokes; open contours receive strokes only.
Compound paths support disjoint shapes and nested holes using an even-odd fill
rule, independent of winding. Contours should be simple and must not intersect
each other; self-intersecting fills are not supported. Curves are adaptively
tessellated for both GPU backends using the element's projected scale. Subdivision
is bounded (at most 12 levels and about 20,000 tessellated points per path), so
extreme zoom or very complex paths can reach the quality limit. Path strings are
limited to 20,000 characters and 20,000 normalized control points per path.
Coordinates must be finite with magnitude at most 1,000,000, including after
relative commands are made absolute. Normalized control points count toward
the scene's geometry budget.

Compatible `d` paths interpolate normalized segment controls before tessellation.
Keep contour order, closure, segment types/counts, winding, and start points
consistent to preserve intended correspondence. Quadratic curves and arcs are
converted to cubic segments; matching SVG command counts alone do not guarantee
matching normalized structures. Compatible smooth-point paths with matching
point counts and closure interpolate the curves implied by corresponding points.
Single outlines with different
structures use ordinary outline matching; incompatible compound paths crossfade.
Put a blade and its vein in a group at the leaf's base for growth/rotation, and
author corresponding morphs for both when bending. See the
[plant scene](../demo/plant.ts) and [demo page](../demo/plant.html) for a complete
example using the library renderer. Curved geometry does not extend the supported
hit shapes or surface connectors; see [behaviors and live bindings](#behaviors-and-live-bindings).

### Choosing how objects relate and move

Choose the representation from the object's meaning and planned later uses,
including when the current scene is still. Two coordinates that happen to match
do not establish an attachment. Keep reusable parts under stable IDs so later
scenes can retrieve them and preserve their relationships.

| Need | Use | What it preserves or leaves to the author |
| --- | --- | --- |
| Independent geometry, such as an axis or reference mark | `s.line`, `s.arrow`, `s.path`; `line3D`/`arrow3D` for round shafts | Authored points. Creating a segment does not associate it with nearby objects. |
| A bond, graph edge, or arrow joining two objects | Create a line/arrow, then `s.connect(segment, from, to)` | Endpoints follow both sources every frame, even during authored motion. Their distance may change. |
| A label following an object's center | `s.attach(label, object, { offset })` | Position with a world-space offset. It does not inherit the source's rotation or scale. |
| Parts moving as one rigid object | `s.group`, then group `moveTo`/`rotateTo` | Relative distances, while child positions and scale stay fixed. `scaleTo` deliberately changes size and distances. |
| A chain bending while each link keeps its length | Nested groups with origins at joints and fixed local offsets; `rotateTo` on joints | Segment lengths throughout interpolation. The author supplies the hierarchy and joint angles. |
| Independent translation or style changes | `moveTo` or `animate` | Interpolated properties, without inferring relationships to other objects. |
| An intentional change of shape | `morphTo` | Object identity and supported geometric correspondence, not physical constraints such as length or rigidity. |
| Viewer dragging or spring return | `s.behavior` with `drag` or `spring` | Live presentation behavior. A spring returns toward an authored target; it is not a distance constraint between objects. |

For a semantic connection, prefer `connect` even if its sources are initially
still. Animate the sources instead of independently moving or replacing the
segment. Static points are sufficient inside a rigid assembly whose parts never
move relative to one another. A label that must rotate and scale with an object
belongs in its group; use `attach` when only its position should follow.
Generic outline morphing may reverse a line's endpoint correspondence to reduce
geometric travel; it does not know which endpoint belongs to which object.
Use `connect` to preserve that relationship while the sources move.

Connection and constant length are separate requirements. Independently
interpolating two endpoint positions can stretch or collapse a segment even if
its start and end lengths match. A fixed-length vector should rotate about its
tail; a folding chain should rotate about its joints. Neither a geometry morph
nor smoother easing enforces those constraints. Animlib has no built-in
fixed-distance chain solver or generated per-frame callback API. See the
[chain handoff example](#example-a-chain-that-folds-in-a-later-scene).

### Fading a composed object

Use `s.group(id, children, { isolated: true })` when overlapping components belong
to one visual object. The renderer draws its children into a transparent layer,
then applies the group's opacity once to the resulting image. Two opaque parts
at 50% group opacity therefore stay at 50% opacity where they overlap.

```js
const object = s.group('object', [shape, outline, label], { isolated: true });
s.play(object.fadeOut(), { duration: 1 });
```

Animate the **group's** opacity; fading each child separately still represents
independent translucency. Ordinary groups retain their existing behavior of
multiplying opacity into each child. Explicit child transparency is preserved
inside an isolated group, and nested isolated groups each apply their opacity
once. Isolation is a static group option, not an animated property.

Both WebGPU and WebGL2 composite premultiplied color and preserve nearest surface
depth for external occlusion. An isolated group is an atomic compositing unit:
arbitrary interleaving with other translucent objects remains approximate, as it
does for ordinary transparent meshes. Each isolated group must use one view and
one coordinate space. Nesting is limited to 16 isolated layers. Offscreen targets
are allocated lazily and reused by nesting depth, resized with the canvas, and
released on disposal/backend recovery. Use isolation for visual objects that need
it; it adds offscreen color/depth work and storage.

### Behaviors and live bindings

Scene builders declare behavior data; they do not install browser listeners or
execute an application animation loop. These declarations apply throughout the
target element's lifetime in that scene.

```js
s.behavior(atom, { type: 'drag', plane: 'screen' });
s.behavior(atom, { type: 'spring', stiffness: 65, damping: 9 });
s.attach(label, atom, { offset: [0, 0.7, 0] });
s.connect(bond, atom, otherAtom, { endpoints: 'surface' });
```

`drag` accepts a camera-facing `plane: 'screen'` (the default), a world plane
`'xy'`, `'xz'` or `'yz'`, or a world `axis: 'x'`, `'y'` or `'z'`. Choose either an
axis or a plane. The grab point is preserved, and the held object stays at its
world position while the authored target moves. After release, a drag on its own
retains its local offset from the authored timeline.

`spring` is independent of dragging. It restores the position toward the current
authored target when the object is not held. Defaults are stiffness 65 and damping
9; both must be positive and at most 1000. The player advances live behavior time
even when scene playback is paused, and stops requesting frames when all behaviors
settle. Spring integration clamps long elapsed times and subdivides its steps.

Built-in hit testing supports spheres, planar circles/rectangles, and triangle
meshes, including nested transforms and billboard placement. A behavior on a group
uses its supported descendant shapes as hit targets. Picking chooses the nearest
eligible surface; it does not test arbitrary text outlines, rods or path strokes,
nor infer continuously morphing mesh topology. Elements below 0.01 effective opacity
are ignored. Screen elements use pixel coordinates within their view.

`attach(target, source, { offset })` binds the target's position to the source's
center, with an optional offset in world units (pixels for screen elements).
`connect(line, from, to, { endpoints, offset })` maintains a line/arrow's endpoints.
`endpoints: 'surface'` clips to sphere/circle radii, accounting for scale and radius
morphs; the default is `'center'`. A signed strand `offset` creates parallel bonds
using a deterministic perpendicular. Overlapping endpoint surfaces hide the rod.
The connector binding owns the line's geometry. Bindings work across transformed
groups, require the same view/coordinate space, resolve in dependency order, and
reject cycles (including cycles through parent transforms). Missing sources hide
their dependents. A bound target cannot simultaneously have behaviors or a second
binding; animate or interact with its source instead.

Pure `evaluateScene` resolves bindings, so headless frames and scene handoffs have
attached geometry. The player evaluates the authored frame, applies live behaviors,
resolving live parent/source dependencies before dependent behaviors and bindings. Live interaction never enters
compiled tracks or outgoing scene handoffs. A seek, reset, successful recompilation,
or scene change clears live behavior state. Removing a target disposes its behaviors
and cancels its held gesture. View pan/orbit is retained across control changes;
`resetView()` clears pan/orbit and behavior state without changing scene time.

Bindings and behavior declarations belong to the compiled scene, not to an
element's persistent state. The handoff carries evaluated authored geometry,
including resolved bindings, but no declarations or live interaction state.
In each receiving scene, retrieve the existing objects and declare needed
`connect`, `attach`, and behaviors again. Declare bindings before the
first `play`/`wait` for clarity; they apply throughout the bound target's lifetime
in that scene, rather than starting at the builder's current cursor. Matching
incoming geometry and binding parameters prevents a snap at time zero.

#### Custom behaviors

Register trusted host implementations by name. Generated scene code still contains
only serializable declarations; it never receives DOM access or host callbacks.

```ts
const player = createPlayer({
  canvas,
  behaviors: {
    pulse: options => {
      let elapsed = 0;
      return {
        update(ctx) {
          elapsed += Math.min(ctx.dt, 0.04);
          ctx.element.scale = ctx.authored.scale * (1 + 0.08 * Math.sin(elapsed * 4));
          return true; // request another live frame, even when paused
        },
        dispose() { /* release any resources owned by this instance */ },
      };
    },
  },
});
// In submitted scene code:
// s.behavior(dot, { type: 'custom', name: 'pulse', options: null });
```

A factory returns a `Behavior` with optional `update`, `input`, and `dispose`
methods. The context supplies scene `time`, wall-clock `dt`, `held`, the authored
element, the mutable presentation element/frame, and world-position helpers.
`setWorldPosition` retains a local offset from the authored position.
An `input` method receives `start`, `move`, `end`, `cancel`, or `key`; pointer events
include a ray, and `start` includes the camera-plane normal. Return true from
`start` to claim pointer capture; return true from `key` to consume that key.
Keyboard input goes to the last selected behavior target on the focused canvas;
Escape cancels a held gesture. Factories are instantiated per live target and scene.
Unknown factory names reject the submission without replacing the current scene.

Multiple behaviors on one target execute in declaration order; later writes to a
property win. Parent behaviors execute before child behaviors. A behavior should
return true only while it needs another frame. Duplicate built-in behaviors or
custom names on the same target are rejected. Hosts are responsible for their
custom implementation's validity, bounded work and cleanup.

#### Canvas navigation and camera access

An unclaimed left drag rotates its view. Shift-drag, middle-drag, right-drag, or
`player.setNavigationMode('pan')` pans it. Shift takes precedence over object
picking; ordinary object dragging takes precedence over background navigation.
`setNavigationMode('orbit')` restores the default background gesture. Pan works
with 2D/3D cameras and independent views. Right-drag suppresses the context menu.

`player.getPan(view?)`, `setPan([x,y,z], view?)`, `resetView()` and
`invalidateFrame()` expose navigation and paused redraw. `getInteractionSnapshot(view?)`
returns detached frame/camera copies plus logical view dimensions and its normalized
rectangle, or undefined before rendering. `project(point, view?)` and
`ray(x, y, view?)` use that same effective camera, including pan and viewer rotation.
Ray coordinates are logical pixels from the selected view's top-left corner;
omit the view ID for the main canvas. The internal controller also accounts for
CSS canvas bounds and pixel density. Canvas replacement rebinds input automatically.
The player sets `touch-action: none`, makes an otherwise unfocusable canvas focusable,
and restores those attributes/styles when it releases that canvas.

### Element animation and coordinates

Common animatable properties include position, rotation, scale, opacity, fill,
stroke, stroke width, and geometry. Elements expose actions such as `moveTo`,
`rotateTo`, `scaleTo`, `fadeIn`, `fadeOut`, `animate`, and `morphTo`.

```js
s.play(dot.animate({ scale: 1.5, fill: Color.WHITE }), { duration: 0.6 });
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
- `viewportOffset: [x, y]` adds a camera-independent displacement in fractions
  of the viewport's width and height. It can be animated on an element or group,
  so `[-1.5, 0]` slides content left even after viewer rotation or on an ultrawide
  canvas. It does not change the underlying world coordinates.

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

  s.play(leftovers.animate({ viewportOffset: [-1.5, 0] }), { duration: 0.5, ease: "smooth" });
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
The player never crossfades entire scenes. For unrelated subjects, clear or move
the previous content offscreen before introducing the next subject. Keep an
element only when its identity has a meaningful relationship to the next scene;
the demo creates new atoms and bars rather than reusing an unrelated vector.

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
- Binding and behavior declarations do not cross the boundary. Re-declare them
  on carried IDs; otherwise a carried connector retains its last evaluated
  points when its sources move independently.

### Example: a chain that folds in a later scene

The first scene only shows a straight schematic chain. It already gives each
residue and bond an ID, binds the bonds, and creates the joint needed later.
`residue-c` is offset from `joint-b` in local coordinates; the joint's origin is
placed at `residue-b`. Keeping the root group also keeps its descendants and
their hierarchy.

```js
export default scene({ mode: "2d", end: "advance" }, s => {
  const length = 1.5;
  const a = s.circle("residue-a", { radius: 0.15 });
  const b = s.circle("residue-b", { radius: 0.15, position: [length, 0] });
  const c = s.circle("residue-c", { radius: 0.15, position: [length, 0] });
  const joint = s.group("joint-b", [c]);
  const ab = s.line("bond-ab", { strokeWidth: 0.04 });
  const bc = s.line("bond-bc", { strokeWidth: 0.04 });
  const chain = s.group("chain", [a, b, joint, ab, bc]);
  s.connect(ab, a, b, { endpoints: "surface" });
  s.connect(bc, b, c, { endpoints: "surface" });
  // Initialize the pivot; c is now at [2 * length, 0] in world coordinates.
  s.play(joint.moveTo([length, 0]), { duration: 0 });
  s.keep(chain);
  s.wait(1);
});
```

The receiving scene reuses the root and joint, re-establishes the bindings, and
animates angles. It does not create replacement residues or bonds. Both adjacent
center-to-center distances remain 1.5 at every intermediate time; with unchanged
radii, the visible surface-to-surface segments also retain their lengths.

```js
export default scene({ mode: "2d", end: "hold" }, s => {
  const chain = s.previous.get("chain");
  const joint = s.previous.get("joint-b");
  const a = s.previous.get("residue-a");
  const b = s.previous.get("residue-b");
  const c = s.previous.get("residue-c");
  s.connect(s.previous.get("bond-ab"), a, b, { endpoints: "surface" });
  s.connect(s.previous.get("bond-bc"), b, c, { endpoints: "surface" });
  s.play([
    chain.rotateTo(-Math.PI / 6),
    joint.rotateTo(Math.PI / 2),
  ], { duration: 2, ease: "smooth" });
  s.keep(chain);
});
```

For longer chains, nest downstream joints with fixed offsets, and rotate the
joint groups instead of independently translating the residues. Preserve the
joint groups when carrying the chain; keeping only individual residues preserves
their current poses but loses any departing parents needed for later articulation.
In 3D, use the same principle with authored joint rotations and `line3D` bonds;
fixed world-space lengths can change apparent length under projection. This
constructs prescribed motion, without solving collisions, joint limits, or
molecular dynamics.

An incoming scene can also `connect` an existing unbound segment to its carried
endpoints. It need not replace that segment. Match the incoming endpoint positions
and clipping convention when establishing the binding so the handoff remains
continuous. Building the intended hierarchy at introduction avoids needing to
restructure already-parented parts later.

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

For ordinary single outlines, point matching aligns winding and the start of
closed contours before interpolation. Matching vertex counts retain their corners;
other compatible outlines use arc-length samples that include every corner from both shapes.
An unchanged outline retains its exact geometry throughout the morph.
Circles, rectangles, and single-contour closed paths can morph into one another;
open paths, lines, and arrows can morph
into compatible open outlines. Arrow-to-arrow morphs retain arrowheads.

Compatible curved paths use their authored correspondence instead: `d` paths
with matching normalized segment structures interpolate their control points,
and smooth-point paths with matching point counts interpolate corresponding
curves. This keeps straight-to-bent segments and pointed leaf tips tied to their
authored positions. Matching compound paths preserve contour correspondence;
incompatible compound paths crossfade. See
[curved paths](#curved-paths-and-organic-shapes) for authoring rules and limits.

Meshes with matching vertex counts interpolate corresponding vertex positions.
Use matching vertex ordering and compatible topology for meaningful mesh morphs.
The library cannot infer the correspondence between two arbitrary 3D models.
Unchanged text renders once at full element opacity, with font size interpolated
when it changes. Other incompatible representations crossfade. Morph targets
describe geometry; animate position, scale, rotation, and color with separate actions in the same
`play` when needed.

### Named formula parts

LaTeX uses bundled MathJax SVG glyph outlines, tessellated for both GPU backends. A complete
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

### Anchors and counting numbers

Set `anchor` to a named LaTeX part to place that part's center at the element's
origin. Use the same anchor in the morph target to keep that symbol stationary
when the rest of the formula changes, such as adding an `A` before `v`.
Without an anchor, formulas are centered as a whole.

Use `\animnum{name}` for a changing number. Its value comes from `numbers`,
and `numberFormat` reserves a fixed-width slot so changing digit widths do not
move the surrounding brackets or symbols. `countTo` interpolates the value using
the same timeline and easing as other animations; seeking displays the number
for that exact time without fading between old and new glyphs.

```js
const equation = s.latex("equation", {
  tex: String.raw`\animpart{v}{v} = \begin{bmatrix}\animnum{x}\\1\end{bmatrix}`,
  anchor: "v",
  numbers: { x: 1.5 },
  numberFormat: { decimals: 2, digits: 1 },
  position: [-2.3, 2],
  fontSize: 0.36,
});
s.play(equation.countTo({ x: 2.25 }), { duration: 2, ease: "smooth" });
```

`digits` reserves the number of integer digits; an extra sign column and the
specified decimal places are also reserved. Values must fit the selected format.
Supported formats use 1–6 integer digits and 0–4 decimal places.
Number updates and geometry morphs both write an element's geometry and cannot
run on that same element in one `play`; use separate instructions for those changes.

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
updates after they finish.

### Reactive sliders (prototype)

Opt into retained JavaScript bindings for property changes:

```js
const size = s.slider('size', { reactive: true, default: 1, min: 0.5, max: 2 });
const ball = s.sphere('ball', { radius: 0.45 });
s.bind(ball, [size], value => ({ radius: 0.45 * value }));
```

The slider returns a handle, and the callback receives its numeric value.
Callbacks must be pure and synchronous, returning a fixed set of supported
properties: radius, position, rotation, scale, opacity, or fill. A binding and
timeline cannot own the same property. The changed builder and earlier scenes
are reused; downstream scenes still rebuild transactionally. Callbacks remain
inside a retained QuickJS sandbox, with a fresh execution deadline per update;
compiled snapshots contain only their validated results. See the
[prototype contract, limitations, and measurements](reactive-controls.md).

Use this opt-in path only when every value driven by the slider can be expressed
with supported properties. Keep an ordinary numeric slider when a control changes
text, LaTeX numbers, path/mesh geometry, object counts, camera settings, animation
targets, or timing. For example, a vector-length slider that also updates a formula
should continue using the ordinary builder path so both remain consistent. Both
styles may coexist in one scene; this prototype does not replace or restrict the
existing authoring API. Do not simplify a planned explanation to fit the fast path.
Reactive callbacks must use their supplied values and immutable captured data;
mutation of closure state or consuming random values breaks reproducibility.

### Control appearance

Controls sit directly over the scene with transparent backgrounds, fine slider
tracks, compact numeric readouts, and small switches. Labels and strokes adjust
for the scene's background color. Native inputs preserve keyboard interaction
and focus while their values change. The host can set `--animlib-control-accent`
on the overlay host to match its scene colors. Range inputs retain a generous
20-pixel hit area around the thin visible track.

### Overlay placement

All three control methods accept `position: [x, y]` and `width`. Position is the
widget's top-left corner in fractions of the canvas width and height, measured
from the canvas's top-left corner. Width is in CSS pixels (default 220). Omit
position to use the automatic panel at the top-right. Explicit positions remain
relative to the whole canvas, including controls declared inside a view. Authors
should leave room for each widget and the host's playback controls.

```js
const radius = s.slider("radius", {
  label: "Radius", default: 1, min: 0.2, max: 2,
  position: [0.04, 0.06], width: 200,
});
```

Widgets receive pointer and keyboard input without initiating a canvas drag.
They keep their DOM identity and focus when their value or placement changes.

### Round lines and arrows in 3D

`line3D` and `arrow3D` use cylindrical strokes with lit surfaces and capped ends.
Arrowheads are circular cones, so the shaft and head stay visible while orbiting
around an axis. `strokeWidth` is the tube's diameter in world units.

```js
v.line3D("bond", {
  points: [[0, 0, 0], [1.4, 0.5, 0.8]], stroke: Color.WHITE, strokeWidth: 0.08,
});
v.arrow3D("axis-z", {
  points: [[0, 0, -2], [0, 0, 2]], stroke: Color.RED, strokeWidth: 0.035,
});
```

Alternatively, set `strokeProfile: "round"` on world-space lines, arrows, or paths.
The profile stays fixed through geometric morphs. Ordinary strokes default to
`"flat"`; round strokes require world space and respect depth testing and group
transforms. Multi-segment round paths share rings at joins. Sharp bends and
self-intersections can overlap; a round stroke is not a solid-modeling operation.

### Independent view regions

`s.view(id, options, builder)` creates a rectangular region with its own camera
and objects. `rect` is `[left, top, width, height]` in fractions of the canvas size;
the region must fit inside the canvas. Its default camera is 3D and orbit is enabled.
Views share the scene's timeline, controls, and element ID namespace. View builders
are synchronous and cannot be nested. `v.play` advances the same scene clock as
`s.play`; create both views before scheduling simultaneous camera animations.

```js
export default scene({}, s => {
  let leftCamera, rightCamera;
  s.view("left", { rect: [0, 0.15, 0.5, 0.7] }, v => {
    v.sphere("left-ball", { position: [1, 0, 0], fill: Color.BLUE });
    leftCamera = v.camera;
  });
  s.view("right", {
    rect: [0.5, 0.15, 0.5, 0.7], camera: { yaw: -0.5, height: 5 },
  }, v => {
    v.sphere("right-ball", { position: [1, 0, 0], fill: Color.RED });
    rightCamera = v.camera;
  });
  s.wait(3);
  s.play([
    leftCamera.animate({ yaw: 1.2 }),
    rightCamera.animate({ yaw: -1.2 }),
  ], { duration: 2 });
  s.wait(3);
});
```

Left-button dragging rotates only the view where the drag started, even when the
pointer leaves it. Set `orbitHitTest: "geometry"` alongside `orbit: true` to require
a hit on a visible sphere, circle, rectangle, or triangle mesh before starting
orbit. Standalone text, paths, lines and empty space do not start rotation;
billboard labels stay upright and may sit over pickable model surfaces. Keep
explanatory text outside the model view. Omit this option for legacy region-wide
orbit. Pan gestures remain available across the region. The setting is saved in
evaluated frames and inherited with a view. Scrolling does not zoom. Regions clip their geometry and use
independent depth buffers; overlapping regions render in declaration order, with
the last region receiving pointer input. Regions render transparently over the scene and
have no automatic border. Empty space outside them uses the main scene camera.
Screen-space geometry inside a view uses CSS pixels centered on that region;
main-scene screen labels render above all regions. Groups cannot span views.
The callback's `v` builder and its detached methods retain their view ownership
when called later in the synchronous scene builder, including from another view's
callback. Objects made with the outer `s` after a view callback remain in the main
scene. Keep related model parts and attached labels in the same view; use `v.attach`
for labels that must follow an object. Global screen headings may remain outside
views.
Kept objects retain their region and its outgoing authored camera in later scenes;
redeclaring the same view ID can change its rectangle, camera, and orbit setting.
`player.getState().views` reports each region's rectangle and whether orbit is enabled.

### Geometry and camera transitions

2D uses the same world coordinates as 3D, with planar geometry at `z = 0` and a
front-facing orthographic camera. The first scene's `mode` chooses its initial
camera preset. Later scenes inherit the previous authored camera state; declaring
`mode: "3d"` does not silently snap the incoming view.

```js
export default scene({ mode: "3d", orbit: true }, s => {
  const point = s.previous.get("main-shape");
  const old = s.previous.exiting();
  s.play(old.animate({ viewportOffset: [-1.5, 0] }), { duration: 0.5, ease: "smooth" });
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
Horizontal dragging rotates around world-up; vertical dragging tilts around the
camera's right axis, keeping the horizon upright. The front of the scene follows
the pointer. Dragging across a view's shorter dimension turns it 180 degrees;
both axes use that same scale, independent of canvas size or pixel density.
Viewer tilt stops just short of the poles to prevent flipping upside down.
The rotation input is disabled during camera-animation intervals, including when
paused within one. Between authored rotations, viewer rotation stays as an offset to the camera.
An authored yaw/pitch animation captures the viewer's current orientation as its
starting pose and blends to the authored destination using the track's duration
and easing. Both viewer yaw and tilt fade out, so the exact authored pose is
reached at the end. In a fully 3D view, user-adjusted yaw takes the shortest route
to that destination instead of unwinding accumulated viewer turns. Untouched
authored rotations retain their original path, including intentional full turns.
Pausing or scrubbing within the animation follows that same captured path.
Seeking backward to before it restores the authored starting pose and clears
the captured handoff; a subsequent drag supplies a new starting pose. Jumping
past an animation lands on its authored destination. Zero-duration rotations
remain immediate cuts.
Other views retain their rotations and remain interactive unless their own cameras
are being animated. Camera moves that only change framing do not clear rotation.
Viewer offsets and captured handoffs are scoped by scene and view ID. Control
updates that leave the camera tracks unchanged preserve an in-progress handoff.
Restarting before a rotation resets it. A full `load` clears viewer state. Viewer rotation is not baked into
the outgoing object state used for reconstruction.

The renderer handles 3D vertex positions, meshes, camera projection, depth testing,
and four-sample antialiasing on the GPU. `sphere` creates an actual tessellated
sphere with simple directional shading. Circles and text remain planar unless
`billboard: true` makes their plane face the current camera, including viewer
rotation. `billboardOffset: [x, y, z]` displaces a billboard along camera right,
up, and toward the viewer in scene units; this keeps an atom label beside or in
front of its sphere while orbiting. The molecule demo supplies tetrahedral spatial
layout and surface-to-surface bond meshes. Physically based materials, model
loading are not yet implemented. Object interaction uses the behavior API above.

## 7. Live source submissions

`submit` is the common mutation entry point for the surrounding app, whether the
code comes from an LLM, a file, or an editor. Source IDs and sequence placement
are host-owned metadata; a source still describes exactly one scene.

The submission pipeline:

1. Check source format and parse JavaScript.
2. Run each candidate scene builder in an isolated QuickJS VM.
3. Validate bounded, plain compiled animation data.
4. Reconstruct later scene dependencies using current inputs.
5. Prepare formula geometry, audio assets, and the GPU renderer.
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
  viewer rotation unless the restart crosses an authored rotation. Its
  playing/paused state is retained where playback is allowed.
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
builder, 100 controls, 32 view regions, 10,000 animation tracks, and a 24-hour visual timeline.
SVG path data is limited to 20,000 characters and 20,000 normalized control
points per path. Point arrays are limited to 20,000 entries; added scene geometry
has a 100,000-point budget, including SVG path control points.
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

## Overlap inspection

`detectOverlaps(frame, options)` and `detectSceneOverlaps(compiled, options)` are
host inspection APIs exported from both `animlib` and `animlib/core`. They work in
Node/Bun and browsers without initializing a canvas, DOM, or GPU. They report
**only intersections between glyphs belonging to distinct text or LaTeX
elements**. Shapes may overlap other shapes or text without producing reports.
These APIs do not change scene data, reposition objects, or run automatically
during playback.

```js
import { evaluateScene, detectOverlaps, detectSceneOverlaps } from 'animlib/core';

const frame = evaluateScene(compiled, 1.25);
const overlaps = detectOverlaps(frame, {
  width: 1280,
  height: 720,
  minOpacity: 0.01,
  ignorePairs: [['outgoing-title', 'incoming-title']],
});
const samples = detectSceneOverlaps(compiled, {
  width: 1280,
  height: 720,
  sampleRate: 10,
});
// Or inspect specific local times:
const selected = detectSceneOverlaps(compiled, {
  width: 1280, height: 720, times: [0, 1.25, compiled.duration],
});
```

`width` and `height` must be positive finite **CSS pixel** dimensions of the
intended canvas. Projection depends on these dimensions and aspect ratio.
`minOpacity` defaults to `0.01` and must lie in `[0, 1]`; it includes paint alpha,
ancestor/group opacity, and morph fades. Zero-alpha and degenerate geometry are
always excluded. `palette` optionally supplies the host palette; scene inspection
otherwise uses the compiled scene's palette.

Each `OverlapDiagnostic` contains:

- `elements`: two distinct text/LaTeX element IDs in lexical order. Groups apply
  transforms and opacity; separate text elements within the same group are still
  checked against each other.
- `severity` and `kind`: always `unacceptable` / `text-overlap`.
- `bounds`: `{ left, top, right, bottom }`, the bounding box of actual
  intersections in canvas pixels, with origin at the top left. Multiple disjoint
  intersections can share this bounding box.
- `elementBounds`: the clipped glyph bounds for the two text elements.
- `witness`: a point inside an actual glyph intersection.

Reports are JSON-serializable and pair ordering is stable. One report aggregates
all glyph intersections for a pair of distinct elements. Glyphs and named parts
inside one formula or text element are never compared with each other, including
old/new glyphs overlapping during a morph of that element. Only the text portion
of a shape/text morph participates in detection.

`ignorePairs` optionally excludes intentional text pairs in either order. A group ID matches
all its descendants; `['labels', 'labels']` excludes internal text pairs in that
group while preserving checks against other text. Group membership by itself
does not imply an exclusion.

The detector reuses the renderer's text tessellation, including MathJax glyph
holes, LaTeX anchors/numeric slots, current morph geometry, nested transforms,
billboards, and viewport offsets. Broad bounding-box checks are followed by
positive-area glyph intersections. Overlapping text bounding boxes, empty glyph
holes, and edge-only contact therefore do not by themselves trigger a report.
Geometry is clipped at the camera's near/far planes, each view rectangle, and the
canvas. View-local results are translated to common canvas coordinates, including
collisions with screen labels. Non-text shapes are skipped during tessellation.

This measures **projected text overlap**, including text at different depths.
It does not remove glyphs hidden by another object's depth or by compositing.
Text crossing a border and intersecting shapes are outside the detection scope.
Bounds use logical viewport dimensions; device-pixel rounding and raster
antialiasing can differ slightly at edges. No minimum-clearance/near-miss check
or continuous collision solver is included.

Scene inspection returns `{ time, overlaps }[]` for **only samples with
collisions between settled text**. By default it samples at 10 Hz and includes scene endpoints,
lifecycle events, and track start/end times. `times` replaces that schedule and
must contain finite values within `[0, compiled.duration]`; values are sorted and
deduplicated. Empty `times` inspects nothing. Each call supports up to 100,000
samples; reduce `sampleRate` or split explicit times for larger jobs. Sampling
can miss collisions between inspected frames. Reports use authored cameras and
current compiled controls/bindings.

`detectSceneOverlaps` excludes text affected by an active animation at each sample.
That includes move/style, fade, morph, and numeric-value tracks on the text itself,
tracks on its ancestors, and animations of binding sources (including chained
attachments). This dependency rule is conservative: any active track on a binding
source makes its dependent text ineligible until the track ends. Active camera
tracks exclude world-space text only in the affected view; screen-space labels
remain eligible. Other stationary text is still checked, even while unrelated
elements animate.

A track is active on `[start, start + duration)`. Its exact endpoint is eligible
unless another animation affecting that text starts there. Zero-duration tracks
apply immediately and do not suppress a check. Consequently, transient crossings
and text crossfades are ignored by default, while an overlapping final placement
is reported when the text settles. Explicit `times` use the same policy. Set
`includeAnimating: true` to include text during its animations for debugging.

`detectOverlaps(frame, options)` remains a pure geometry check: a single `Frame`
has no per-element track history, so this lower-level API does not infer whether
text is animating. This also applies to presentation frames supplied by a host
during live interaction. Use the scene API for authored-animation filtering.

## 9. Engine structure and verification

The public player composes three concerns:

- `SceneSequence` owns sources, current inputs, atomic submissions, and
  reconstruction. It is also usable headlessly.
- `evaluateScene` calculates a frame from compiled data and local time, without
  accumulating mutations from earlier frames.
- The renderer, control overlay, and audio clock consume that data in the browser.

The main implementation files are:

- [src/types.ts](../src/types.ts): public data and scene-authoring types.
- [src/runtime.ts](../src/runtime.ts): sequential builder installed inside the VM.
- [src/compiler.ts](../src/compiler.ts), [src/compiler-client.ts](../src/compiler-client.ts),
  and [src/compiler-worker.ts](../src/compiler-worker.ts): source parsing, isolated
  execution, validation, and off-thread browser compilation.
- [src/sequence.ts](../src/sequence.ts) and [src/timeline.ts](../src/timeline.ts):
  reconstruction, transactions, and deterministic time evaluation.
- [src/renderer.ts](../src/renderer.ts), [src/render-geometry.ts](../src/render-geometry.ts), [src/geometry.ts](../src/geometry.ts), and
  [src/latex.ts](../src/latex.ts): GPU drawing, outline matching, and vector formula layout.
- [src/path.ts](../src/path.ts): shared SVG parsing and bounded curve tessellation
  (also used by glyph layout), smooth-point curves, and path control-point morphing.
- [src/overlap.ts](../src/overlap.ts): projected geometry intersections and sampled
  animation diagnostics.
- [src/player.ts](../src/player.ts), [src/audio.ts](../src/audio.ts), and
  [src/controls.ts](../src/controls.ts): transport, audio, and optional native widgets.
- [demo/scenes.ts](../demo/scenes.ts): application-level demo helpers and scene sources.
- [demo/plant.ts](../demo/plant.ts): curved leaf shapes, smooth roots, grouped
  growth, and coordinated blade/vein bending.

Portable tests cover deterministic seeks, parallel property animation, persistence
and group lifetimes, current-control reconstruction, code replacement/insertion,
failure isolation, sandbox capabilities/limits, LaTeX mappings, shape matching,
curved-path validation, compound fills, curve accuracy, control-point morphs,
playback ownership, audio clocks, and control races.

The separate `test:gpu` suite uses Dawn's native WebGPU API through Vulkan. It
compiles the actual shader/pipeline, renders the demo scenes off-screen, reads
back pixels, and checks intermediate morphs, per-pixel mesh depth, and screen-space
placement. It requires a native Vulkan WebGPU adapter and is not a runtime backend
or rendering fallback. Set `ANIMLIB_GPU_ARTIFACTS` to a directory to save PNG frames:

```sh
ANIMLIB_GPU_ARTIFACTS=/tmp/animlib-frames npm --workspace animlib run test:gpu
```

Run `npm --workspace animlib run bench:render` to measure CPU geometry preparation
on the four library demonstrations. It evaluates fresh frames and reports median
and p95 times after warmup. GPU calls are stubbed, so these measurements exclude
GPU work and timeline evaluation and are not browser frame rates.

## 10. Current boundaries and next steps

This implementation targets modest explanatory scenes. It does not establish a
large-scene performance guarantee. TeX layout is cached, and bounded caches reuse
parsed paths, curve tessellations, contour triangulations, and morph correspondence
across evaluated frames. Object transforms are prepared once per element, and
vertex data is assembled directly
in typed arrays. Vertex generation/upload and timeline evaluation still happen
each frame. Selective reconstruction and GPU-side animation are possible
improvements after measuring real scenes.

Opaque meshes have depth testing. Translucent world geometry is sorted back to front
per triangle, including sphere surfaces and round strokes, using the current camera
for each view. This preserves front/back blending and lets other translucent surfaces
sort between an object's faces. Intersecting triangles still use approximate sorting
and can render incorrectly; isolated groups remain atomic compositing units.
Default strokes are tessellated ribbons; opt-in round strokes use lit tubes
and cones. The renderer does not provide a comprehensive material system. Shape matching cannot infer semantic
part correspondence or arbitrary mesh topology.

Not yet included: custom fonts and general text shaping, images/video textures,
general path/text hit shapes, LaTeX split/merge mappings, a full physics solver,
infinite scenes, branching navigation, playback-rate controls,
video export, or mobile-browser support guarantees. The initial control surface
is sliders, toggles, selects, and requested orbit rotation.

Useful follow-up work should be driven by the three application demos: reusable
domain helpers in the app, accessible descriptions of visual objects, measured
performance improvements, richer text support, and only then additional interaction
or rendering features. The core contract remains plain scene code, local clocks,
explicit persistence, and reproducible frames.
