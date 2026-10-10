# Visualization prompt (scenegen)

<!-- The scenegen visualization rules, added to every scene prompt after
     scene-craft.md. Re-read for every scene, so an edit applies to the next generated
     scene without a restart. After editing, update the checksums in provenance.json and
     backend/test/scenegen-prompts.test.ts. -->

## Visual style (scenegen)

Where a rule below is about time, the measured narration timing always wins: fit the
motion inside the given audio cues and durationSec.

Visual style: 3Blue1Brown-like explanatory animation.
- Dark background, few bright colours. Each colour means ONE concept for the whole
  film (e.g. green = first basis vector, red = second). Never recolour an object
  to mean something else.
- Show before you name: let a concrete object move or change, then put the
  formula on screen to confirm what the viewer already saw.
- Every "therefore" needs a visible reason: a moving vector, a sliding value, a
  highlighted correspondence between a number and a piece of geometry.
- Keep identities: the same object stays the same object across scenes. Move,
  transform or recolour it in place; do not fade it out and draw a lookalike.
- Continuous motion driven by real values (one animated parameter), so
  intermediate frames are mathematically true, not arbitrary morphs.
- Unhurried pacing: give the viewer time to watch and think. Build a result
  calmly, then hold it still for 2-3 s before the next change; after a key insight,
  hold longer (3-4 s). Never stack several changes back to back.
- Text is secondary to geometry: short labels, large enough to read comfortably,
  never overlapping geometry. Formulas stay fixed to the screen.
- No full-screen clears without a narrative reason. No decorative motion.

Simplicity (the most important rule; clutter is the most common failure):
- Less is more. Show the fewest objects that make the point; one idea at a time.
- Never leave duplicates behind. When a vector is stretched, scaled, moved or
  rotated, animate THAT object; do not keep the original next to a stretched copy.
  A temporary helper copy must be removed as soon as it has done its job.
- A scene ends with only the core objects the story still needs (e.g. grid, basis
  vectors, the example vector, the current matrix). Helper constructions,
  highlights, counters and intermediate equations are cleared before the scene ends.
- No numeric counters/decimal readouts on the geometry; put numbers in the text area.

Smooth motion (strict; jarring motion ruins the explanation):
- Nothing changes instantly. Every visible change is an animation with a smooth
  easing; never change/add/remove something visible
  between frames.
- Whole-plane transformations (grid + vectors) take at least 3 s, driven by one
  animated parameter. Interpolate rotations by angle and other maps by blending the
  matrix entries from the identity, so the motion is calm and continuous.
- No sudden flips or resets: never snap the plane back to the identity. If a scene
  needs a fresh plane, undo the motion smoothly (>= 2.5 s) or cross-fade slowly.
  A map with negative determinant is shown slowly (>= 4 s) so the flip is legible.
- One major motion at a time; pause about 1 s between big motions. No camera
  shakes, no fast zooms, no flashes.

On-screen text (strict):
- Only necessary text: short object labels (e.g. v, î, A), formulas, matrices and
  numbers that are part of the mathematics. Nothing else.
- NO explanatory sentences or captions in the animation ("Lines stay straight",
  "Record where î lands", "Order matters!", titles, bullet points). The motion itself
  must carry the explanation; a narrator will add the words later.
- If a word seems necessary, show the idea visually instead (highlight, colour,
  motion, side-by-side comparison).

LaTeX (strict; one unsupported command stops the whole lesson from playing):
- Formulas are rendered by MathJax with only the base, ams, newcommand and html
  packages. Use plain, common commands: fractions, sub/superscripts, Greek letters,
  \vec, \mathbf, \hat, \overrightarrow, \mathrm, \text, \mathbb, \mathcal,
  matrices (bmatrix, pmatrix), \xrightarrow, \rightleftharpoons, \underbrace, ^\circ.
- NOT available: \boldsymbol and \bm (use \mathbf or \vec), \color and \textcolor
  (colour a formula with its fill, or its parts with \animpart), \ce (write
  \mathrm{H_2O}), \cancel, \si, \bra / \ket, \degree, \require, \unicode.
- When unsure whether a command exists, use a simpler one.

3D is the default (strict):
- Show the subject in real 3D unless a flat view is clearly much better for
  understanding. Anything with a real spatial shape or arrangement MUST be 3D:
  molecules, atoms and bonds, orbitals, crystals, proteins, cells, organs, physical
  objects, forces and fields in space, surfaces, solids. Give them true shapes,
  proportions and angles, and let the viewer rotate the view with the mouse.
- 2D is the exception and needs a reason: the idea itself lives in a plane (vectors
  and matrices acting on a 2D grid, a graph of a function, a number line, a flow
  chart, an energy diagram) or a flat diagram is clearly more intuitive at that
  moment (a Lewis structure, a reaction scheme, a cross-section).
- When you do go flat for a subject that has a 3D shape, make it a visible
  transformation of the same object: the 3D model turns to face the viewer and
  flattens or simplifies into the diagram, and returns to 3D when that step is
  done. Never leave the student with only the abstraction.
- A "3D" scene that is really a flat drawing does not count: the depth must be real
  (objects at different z, a perspective camera, rotation shows new sides).

Interactivity:
- Keep interactive elements wherever they help: a planned slider, toggle or select
  must be built and must drive the real geometry; 3D views are rotatable.
  Do not drop a planned interaction to simplify the scene.
- Controls always sit in the TOP RIGHT corner, in every scene (strict, checked). The
  player stacks them there by itself, right-aligned from the top, in the order they
  are declared: so NEVER pass `position` to `s.slider`, `s.toggle` or `s.select`.
  `width` is optional and at most 220. Declare a control that also exists in the
  previous scene first, so it keeps its place.
- A control must keep working for as long as it is shown, above all on the final
  held frame, where viewers pause and play with it: the end picture and its numbers
  are computed from the control's value too, not only one stretch in the middle.
- The top right corner belongs to the controls: no formula, label or geometry in the
  top third of the right-hand text area, whether or not this scene has a control.

How to build 3D with animlib:
- Follow the plan: if the scene's visualDescription starts with "3D:", the scene must
  be 3D; if it starts with "2D (because ...):", keep it flat.
- For a 3D scene use `mode: "3d"` with `orbit: true`, or put the 3D objects in an
  `s.view(id, { rect, camera }, v => { ... })` region (its camera is 3D and rotatable by
  default) and keep formulas outside it. Use `sphere`, `line3D`, `arrow3D`, `mesh` and
  real z coordinates. Move between flat and spatial views with `s.camera.to3D(...)` /
  `s.camera.to2D(...)` (or the view's camera) as an animated transition. See reference
  section 6 and the chemistry scene in the demo.

Alignment (strict; misplaced parts are the most visible kind of jank):
- Everything that belongs to a 3D model lives in the SAME 3D view as the model:
  create it inside that `s.view(...)` builder callback (with `opacity: 0` if it
  appears later, then fade it in). Never save the view handle and create objects
  through it after the callback has returned: those are drawn with the main camera
  and float beside the model instead of sitting on it.
- Parts attached to an object start exactly at that object: a lone pair, bond, arrow
  or direction ray begins at its atom's centre or surface, computed from the atom's
  own coordinates, never from separately typed numbers.
- Things that move or rotate together are in one group, or are computed from the same
  values, so they cannot drift apart.
- Labels: use `billboard: true` with a small `billboardOffset` (just clear of the
  object, about its radius plus 0.2) so the label stays beside its object while the
  view rotates. To move a label, change the offset, not its world position.
- Rounded 3D bodies (atoms, lobes, clouds) are built from spheres, which are shaded;
  a `mesh` is drawn flat, so a lobe made of one mesh reads as a 2D blob.
- To de-emphasise a shaded 3D body, do not leave it half transparent for long:
  overlapping transparent spheres draw with visible banding. Fade it fully, or keep
  it opaque and dim the other things instead.
- Check the picture from the starting camera AND after rotating: nothing may sit
  beside what it belongs to.

Layout (keep it identical in every scene):
- Geometry (2D or 3D) on the left two thirds of the frame; the right third is a fixed text
  area for formulas and matrices. It is just empty space: NO box, border, frame,
  backing rectangle or panel shape around text anywhere. Geometry never enters the
  text area; text never sits on the grid except short object labels.
- The right third from top to bottom: controls in the top third (kept empty when
  there are none), formulas and matrices in the middle and lower part, starting
  below the controls. The same in every scene, so nothing jumps between scenes.
- Formula column budget (strict, checked): at most THREE formulas or matrices in the
  column at once, and at most 7 formulas and labels on screen in total. Before a new
  formula comes in, fade out one the viewer no longer needs, or morph the old one
  into the new one. Do not keep a growing list of every result so far.
- Formulas never overlap or touch (strict, checked). Place them from their real
  size: a 2x2 matrix at fontSize 0.46 is about 1.1 units tall and 2.6 wide, a single
  line about 0.5 tall. Stack with a clear gap of at least half a line: matrices at
  least 1.5 units apart centre to centre, single lines at least 0.8.
- Everything stays inside the frame (strict, checked). The window can be as narrow
  as 1.5 times its height, so with the usual camera height 8 keep all text within
  x from -5.6 to 5.6 and y from -3.6 to 3.6. Centre the column near x = 4 and make
  wide formulas smaller or shorter rather than letting them run off the edge.
- Show only what the student needs for THIS step. One idea on screen at a time: the
  objects being talked about, their labels, and the one formula that states the
  point. Fade out the rest, including dimmed "ghost" copies of earlier formulas.
- Labels sit beside what they name with a visible gap and move with it; nothing
  touches or overlaps, including during motion.
- Minimum text height about 0.35 scene units; keep 0.4+ margin from the frame edge.
- Draw vectors with clearly thicker strokes than grid lines so they stay crisp.
