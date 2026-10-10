# Animlib capabilities for storyboard planning

Plan code-authored explanatory animations using the capabilities below. Animlib
renders geometric scenes in a browser canvas, with reproducible playback,
seeking, and optional interaction. The scene author chooses exact layout,
geometry, camera choreography, and API calls. Your storyboard should specify
what changes, why it teaches the idea, what stays the same, and the reveal order.
Keep these instructions in nonspoken planning; they are not narration.

## Visual building blocks

- **2D geometry:** circles, rectangles, open or closed paths, lines, arrows,
  and groups. Paths support smooth curves through points, precise Bézier curves,
  SVG path data, and compound outlines with holes. Use these for organic shapes
  such as leaves, curved diagrams, plots, axes, grids, bars, regions, and vectors.
- **Text and mathematics:** short vector-rendered labels and mathematical LaTeX,
  including fractions, scripts, and matrices. Named formula parts allow specific
  symbols or terms to move between equations; anchored parts can stay fixed.
  Numeric slots can count between values without shifting surrounding symbols.
- **3D geometry:** shaded spheres, boxes, cylinders, cones, tori, swept tubes,
  function graphs `z = f(x, y)`, two-parameter surfaces, explicit triangle meshes,
  round lines and arrows, and groups. Use these for spatial vectors, curved sheets,
  flower petals, stems, and schematic molecules. Meshes support flat or smooth
  directional shading; raw meshes remain unlit unless shading is requested.
  Labels can face the camera and remain attached to objects.
- **Views:** a main camera plus clipped rectangular regions with independent
  cameras. Side-by-side views can compare the same construction from different
  angles. Screen-space labels can remain fixed while world geometry moves.
- **Color:** named palette tokens such as BLUE, GREEN, RED, YELLOW, TEAL, GOLD,
  PURPLE, GREY, and WHITE. The default is a black background with white foreground
  and selective accents. Keep each concept's color consistent across scenes.

## Motion and transformation

Objects can move, rotate, scale, change style, fade in or out, and animate together
or in sequence, with explicit holds. Groups can move as one object; isolated
groups let overlapping components fade as one composited object.

Compatible single closed outlines (circles, rectangles, single-contour closed
paths) can morph into each other; compatible open outlines (paths, lines, arrows)
can also morph.
Curved paths with matching segment structures can bend by interpolating their
control points; corresponding parts such as leaf veins need coordinated morphs.
Compound paths can morph when their contours and segment structures correspond;
incompatible compound paths crossfade. The author must preserve contour order
and meaningful correspondence rather than relying on semantic shape matching.
Arrow-to-arrow morphs retain arrowheads. Formula morphs require explicit
one-to-one correspondence between named parts; unmatched parts fade in or out.
Mesh morphs need corresponding vertices and compatible topology. Other
incompatible representations crossfade.
Sampled surfaces, solids, and tubes are ordinary meshes with the same rules;
changing sample counts, holes, or caps can break correspondence. Shape callbacks
are sampled during compilation, not evaluated as a per-frame animation.

A geometric morph does not establish a mathematical or physical transformation.
If intermediate states matter, ask for geometry calculated from the underlying
parameter or rule. For example, a rotating vector should retain its length
through the rotation, and a linear map should act consistently on the grid and
vectors. The scene author must construct those states.

The camera can pan, zoom, rotate, and transition between an orthographic 2D view
and a perspective 3D view. Camera movement does not create depth, extrude shapes,
or infer molecular structure; the author must supply spatial geometry.

## Scene continuity and timing

Each scene has a local timeline. Objects carry into the next scene only when
explicitly kept. Use stable entity IDs and preserve their meanings and colors;
describe deliberate exits for temporary helpers and entrances for new concepts.
A carried object can change representation while retaining its identity.
The evaluated previous scene's end is the actual next starting state; planned
end pictures express intent and do not replace that state.

Playback can pause, seek, and reconstruct later scenes. One optional audio track
per scene follows playback. In this app, narration is generated externally;
measured audio and alignment determine scene duration and reveal cues. Estimate
scope and pacing, but do not invent exact timestamps. The narrated default must
explain the lesson without requiring viewer actions.

### Plan an object's later uses before its introduction

For each reusable object, establish which parts move together, which can move
independently, what remains connected, and which quantities must stay constant
throughout motion. State intentional changes to those relationships too. A still
opening picture does not imply that its parts are independent drawing strokes.
For example: "The same amino-acid chain is introduced in beat-1 and folds in
beat-4; residue order and adjacency remain unchanged, links stay attached, and
each adjacent center-to-center distance stays constant while joint angles change."
This describes a schematic model, not a molecular simulation. Fixed world-space
lengths may appear shorter under 3D projection.

In the structured lesson plan, put a concise description of later uses (with
actual beat IDs) and lasting relationships in the shared entity's `meaning`.
Put the initial construction requirements in the introducing scene's
`visualDescription`, and describe the required continuing structure in its
`endsWith` and appropriate `carry` IDs. Repeat relevant requirements in the scenes
that use them. These are existing fields; do not invent extra JSON fields.
Each scene author receives the shared entity registry and the full outline, but
detailed scene plans only for the current and adjacent scenes. Requirements for
beat-4 must therefore not appear only in beat-4's plan. For Markdown-only scripts,
put this context in the introducing beat's `Content needed` or `Notes`.

Specify observable relationships and invariants; leave API choices to the scene
author. Live connectors can keep edges attached, but do not fix their length.
Rigid groups can move together; articulated groups can bend at authored joints
with fixed offsets. There is no built-in fixed-distance chain solver. Request
only relationships needed by the lesson, and preserve reveal order: preparing
an object for a later fold does not mean showing that fold early.

## Interaction

Sliders, toggles, and selects can change scene inputs and redraw even while
paused. Request a control only when varying a quantity exposes a useful pattern;
specify the quantity, sensible range/options, dependent geometry/readouts, and
what the viewer should discover. The current lesson-plan contract permits
0–2 such controls per scene; no controls is the default. Control changes must
preserve the measured scene duration.

An ordinary slider can resample a surface or rebuild a solid/tube together with
its dependent labels. Retained property bindings do not rebuild mesh geometry.
Keep sampling modest so planned controls remain responsive.

Animlib also supports requested orbit rotation in 3D, independent rotation of
view regions, draggable objects, spring return, attached labels, and connectors
that follow object endpoints. These are scene-authored behaviors, not additional
slider/toggle/select plan types. Drag and spring affect the viewer's presentation;
do not make later narration or canonical scene handoffs depend on where a viewer
dragged an object. Custom behaviors require host-registered implementations.

## Diagrams assembled by scene code

Matrices, coordinate systems, charts, molecules, arrays, graphs, trees, and
algorithm traces are built from the primitives above; dedicated domain APIs are
not built into animlib. Suitable requests include:

- Show a matrix acting on two basis vectors and a small grid, with the same
  vectors carried into a second view.
- Show a schematic molecule using spheres and bonds, then reveal its explicitly
  authored spatial arrangement.
- Show array entries as labeled rectangles; move two entries to explain a swap
  and clear the comparison highlight before the next step.
- Plot a sampled function and vary one parameter with a slider, updating the
  curve and its numeric label together.
- Show a shaded two-variable height graph, then vary its amplitude with a slider.
- Build a spatial flower from parametric petals and a swept tube stem, grouping
  parts that rotate together. Surface maps and tube centerlines must be authored;
  there is no botanical growth or automatic modeling system.
- Grow a plant from a stem, curved leaves, and branching roots; group each leaf
  with its vein at the attachment point and coordinate their bends.

State the exact example values and teaching relation. Do not assume symbolic
algebra, chemistry simulation, automatic graph layout, or an algorithm simulator.
Scene code can calculate modest examples with JavaScript and provided math
helpers; it cannot import packages, fetch data, access the surrounding page, or
run asynchronous builders.

## Current boundaries

- No images or video textures, imported 3D models, photorealistic materials,
  full physics solver, or automatic extrusion. Prefer schematic geometry.
- SVG support accepts path geometry, not complete SVG files or their styling.
  Filled contours must be closed, simple, and nonintersecting; nested contours
  create holes. Open paths are stroked. Smooth curves through points can overshoot;
  explicit Bézier controls give more precise boundaries and pointed leaf tips.
- Curved paths use bounded tessellation, so extreme zoom or very complex shapes
  can expose approximation limits. Curved outlines do not add general path
  picking or automatic surface-clipped connectors; those retain their existing
  supported shapes.
- Text uses bundled glyphs. Custom fonts, emoji, broad international text
  coverage, full document TeX, and automatic multiline text layout are not
  available. Use short labels and supported mathematical notation; narration
  language support does not imply matching on-canvas glyph support.
- No automatic semantic shape matching, arbitrary mesh correspondence, or
  formula part split/merge morphs. Describe meaningful correspondence or use
  a deliberate exit and entrance.
- Transparent intersecting surfaces may render incorrectly. Prefer opaque
  geometry or views that do not depend on correct transparency ordering.
- Surface and solid helpers produce bounded triangle meshes with simple lighting,
  not physically based materials. Each mesh is limited to 20,000 vertices and
  20,000 triangles; 32 segments per surface axis is the default. Nonfinite numeric
  samples leave holes. Closed parameter axes require periodic maps. Tubes have
  constant radius and authored centerline samples; avoid immediate reversals and
  self-intersections. Caps close ends but do not resolve intersecting geometry.
- No branching lesson navigation, infinite scenes, playback-rate controls, or
  built-in video export. Interactive controls vary visuals within the lesson.
- Target modest explanatory scenes rather than dense particle simulations or
  huge datasets. There is no large-scene performance guarantee. Compiler
  ceilings include 2,000 object IDs per builder and 32 view regions; these are
  hard limits, not recommended scene sizes.

For implementation details, the scene author receives the full
[API reference](reference.md). Maintain this summary alongside changes to that
reference and the public [scene types](../src/types.ts).
