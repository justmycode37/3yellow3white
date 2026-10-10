# Animation task: scene 7 of 8: Why the order matters

Write **one animlib scene** (JavaScript) for an explanatory animation about
**Matrix multiplication is composition**, for Beginning linear algebra students working in the plane R^2. They have seen linear maps as motions of the grid and know that a matrix records where the two basis vectors land; they have not yet multiplied two matrices..

## Overarching context

**Course material:** Linear Algebra, Lecture 3: Linear maps, matrices and determinants
**This film:** film 3 of 4: Matrix multiplication is composition
**What the film teaches:** Multiplying matrices means doing one linear map after another. BA means 'first A, then B', and each column of BA is B applied to the matching column of A. Because order matters for motions, AB ≠ BA in general.
**The film's question:** If we do one linear map and then another, which single matrix describes the whole motion, and does it matter which map goes first?
**Viewers already know:** A linear map moves the grid so that lines stay straight, parallel and evenly spaced, with the origin fixed, The columns of a matrix are the landing spots of e1 and e2, Applying a matrix to a vector: A v = x·(column 1) + y·(column 2), What the quarter-turn R and the shear S each do to the grid on their own
**Covered in earlier films (do not re-teach):** Basis vectors, coordinates and span, Linear maps and their matrices
**Coming in later films (do not anticipate):** The determinant as area scaling

**Teaching plan for the whole film**
- Learning goal: The student can explain that the product BA is the single matrix of the motion 'first A, then B', can compute it by following where e1 and e2 land (column i of BA = B times column i of A), and can show with the rotation R and shear S why swapping the order usually gives a different matrix.
- Key insight the film builds to: A matrix product is not a new arithmetic rule but a recording of two motions played one after the other: BA is the one matrix whose columns show where e1 and e2 end up after first A, then B. Because motions done in a different order end in a different place, AB and BA are usually different matrices.
- Running example: The quarter-turn R = [[0,-1],[1,0]] and the shear S = [[1,1],[0,1]] acting on the grid of R^2, with e1 and e2 as two coloured arrows. First rotate, then shear: e1 goes (1,0) → (0,1) → (1,1) and e2 goes (0,1) → (-1,0) → (-1,0), so SR = [[1,-1],[1,0]]. Then the opposite order, first shear, then rotate: e1 goes (1,0) → (1,0) → (0,1) and e2 goes (0,1) → (1,1) → (-1,1), so RS = [[0,-1],[1,1]]. The two final grids are visibly different.
- Misconceptions to prevent: BA means 'first B, then A' because we read left to right (in fact the matrix next to the vector acts first: B(A v)); Matrices are multiplied entry by entry, like adding them; Order does not matter, as with ordinary numbers: AB = BA; The product is just a memorised row-times-column recipe with no geometric meaning; In the column rule, mixing up which matrix acts on which columns (taking A times the columns of B to get BA); Overcorrection: matrices never commute (some pairs do, for example two rotations)
- **This scene serves step 6 of 6:** In general AB ≠ BA, because the second motion acts on whatever the first one produced. 'In general' still allows exceptions: some pairs do commute.
  (why here: It consolidates the insight by explaining why the order mattered here and marks the boundary of the claim, so the student does not overgeneralise to 'never equal'.; visual idea: Zoom on e1 in both halves. On the left the shear acts on a rotated e1, which now has height and gets pushed sideways. On the right the shear acts on the original e1, which lies on the x-axis and does not move. Then a short contrast: two rotations (R and a 45° turn) played in both orders side by side, and the final grids coincide exactly, tagged 'sometimes equal'. End on the line 'BA = first A, then B' above the two different R/S grids.)

**All scenes of this film** (you are writing scene 7):

   1. Two motions in a row: Doing a rotation and then a shear produces one overall motion of the grid, and that overall motion is again linear, so it must have a matrix of its own.
   2. Reading off the matrix: The matrix of the combined motion is read off like any other matrix: its columns are the final landing spots of e1 and e2.
   3. The product SR, read right to left: The combined matrix is called the product SR, defined by (SR) v = S(R v); the matrix written next to v acts first, so the order reads right to left.
   4. Column by column: Each column of SR is S applied to the matching column of R; in general, column i of BA is B times column i of A.
   5. Not entry by entry: Multiplying matching entries does not give the product: that matrix describes a completely different motion from the one we watched.
   6. The other order: Doing the same two motions in the opposite order, shear first and then rotation, ends in a different grid and gives a different matrix RS.
**→ 7. Why the order matters: The order matters because the second map acts on whatever the first one produced: the shear moves a vector that has height but leaves a vector on the horizontal axis alone.**
   8. In general, not always: AB ≠ BA in general, but some pairs do commute, for example two rotations; the rule to keep is that BA means first A, then B.

**Previous scene:** The other order: Doing the same two motions in the opposite order, shear first and then rotation, ends in a different grid and gives a different matrix RS.
**Next scene:** In general, not always: AB ≠ BA in general, but some pairs do commute, for example two rotations; the rule to keep is that BA means first A, then B.
Your scene must hand over cleanly: it continues the previous scene's idea and sets up the next one, without repeating or skipping ahead.

The scene is defined by its START and its END. Your animation is the motion that turns
the start picture into the end picture while making the purpose visible.

## START scene (first frame)

The film opens here: A dark frame with the untransformed grid of the plane in the left two thirds, the green arrow e1 and the red arrow e2 at the origin with their labels, and a yellow sample vector v. The right third is empty.

## END scene (last frame)

The same side-by-side picture as before: the purple-tinted SR grid on the left and the teal-tinted RS grid on the right at full brightness, each with e1 and e2, and in the text area the matrices SR and RS with ≠ between them.

On screen at the end, with the same names and roles used across the film:
- left plane: small purple-tinted grid after rotation then shear, labelled SR
- right plane: small teal-tinted grid after shear then rotation, labelled RS
- e1: green first basis vector, one in each plane at its own final position
- e2: red second basis vector, one in each plane at its own final position
- product SR: purple-named matrix with green and red columns
- product RS: teal-named matrix with green and red columns
- not-equal sign: ≠ between SR and RS in the text area

The next scene ("In general, not always") continues from your final frame: call `s.keep(x)` on every object that must still be there, with stable, descriptive ids.

## The animation: from START to END

**Purpose:** The order matters because the second map acts on whatever the first one produced: the shear moves a vector that has height but leaves a vector on the horizontal axis alone.

**What it shows:** Both planes are undone smoothly to the starting grid, and in each plane e2 and the grid dim slightly so that the green e1 stands out. The first stage plays in both planes. On the left, e1 turns upright. On the right, the shear runs, the grid visibly slides, and e1 stays lying on the horizontal axis and does not move. After a hold, the second stage plays. On the left, the shear now meets an upright e1, and its tip is carried sideways along a horizontal grid line, which is highlighted briefly. On the right, the rotation turns the untouched e1 upright. The two green arrows end in different places, and the green first columns of SR and RS brighten together in the text area to show the same difference in numbers. The dimming is lifted and the highlight fades.

**Ideas the visuals must make visible, in order:**
- The shear pushes points sideways in proportion to their height
- Applied first, the shear finds e1 on the axis with no height, and nothing happens to it
- Applied second, the shear finds e1 already turned upright and pushes it sideways
- The same map does different things because it is fed different inputs, which is why the first columns of SR and RS differ

You choose the concrete example (numbers, vectors, positions) and how to animate it.
Pick values that make the idea easy to see and keep them consistent with the START scene.

## Interactive elements

The viewer can change these while the scene plays or is paused. Build each one:
- **shear** (slider, id `shear_strength`)
  - Drives: The strength of the shear S in both planes, from no shear to about twice the storyboarded amount; both final grids and the entries of SR and RS update; default is the storyboarded shear
  - The student should discover: The stronger the shear, the further apart the two results; only with no shear at all do the two orders agree

The default value shows exactly the example described above. The control drives the real geometry and every number or formula that depends on it, at every moment of the scene, and never changes the scene's duration.

## Style

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

Spatial subjects (chemistry, biology and anything with a real 3D shape):
- Prioritise real 3D: show molecules, orbitals, crystals, proteins, cells and organs
  with their true spatial shape, proportions and angles, and let the viewer rotate
  them, so the student grasps what the thing actually looks like and what is
  physically happening (which parts approach, bond, bend, fold or move).
- Switch to a simpler shape or a flat 2D diagram when that explains better (e.g. a
  Lewis structure, a reaction scheme, an energy diagram, a cross-section), and make
  the switch a visible transformation of the same object: the 3D model flattens or
  simplifies into the diagram, or the diagram lifts back into 3D, so the student
  sees they are the same thing.
- Never leave the student with only the abstraction when a real shape exists: return
  to the 3D picture when the abstract step is done.

Interactivity:
- Keep interactive elements wherever they help: a planned slider, toggle or select
  must be built and must drive the real geometry; 3D objects should be rotatable.
  Do not drop a planned interaction to simplify the scene.

Layout (keep it identical in every scene):
- Geometry (2D or 3D) on the left two thirds of the frame; the right third is a fixed text
  area for formulas and matrices. It is just empty space: NO box, border, frame,
  backing rectangle or panel shape around text anywhere. Geometry never enters the
  text area; text never sits on the grid except short object labels.
- Labels sit beside what they name with a visible gap and move with it; nothing
  touches or overlaps, including during motion.
- Minimum text height about 0.35 scene units; keep 0.4+ margin from the frame edge.
- Draw vectors with clearly thicker strokes than grid lines so they stay crisp.

Colour meanings (fixed for the whole film; map each role to the closest animlib
palette token such as `Color.GREEN`, `Color.RED`, `Color.YELLOW`, `Color.BLUE`, and
use the same token for the same concept in every scene):
- first basis vector e1 and every first column: palette role `accent_green`
- second basis vector e2 and every second column: palette role `accent_red`
- sample vector v: palette role `secondary`
- rotation R (matrix, letter and highlight while it acts): palette role `primary`
- shear S (matrix, letter and highlight while it acts): palette role `accent_gold`
- product SR (first R, then S): its letter, matrix bracket and grid tint: palette role `accent_purple`
- product RS (first S, then R): its letter, matrix bracket and grid tint: palette role `accent_teal`
- general letters A, B, the second rotation T, and the signs = and ≠: palette role `text`
- resting grid lines: palette role `grid`
- discarded entrywise matrix, faint trails and stop markers: palette role `muted`

## animlib: how to write the scene

Read these before writing (paths relative to `C:\Users\felix\Desktop\VIS Hackathon\3yellow3white`):
- `shared/animlib/docs/reference.md`: the API. Sections 1, 3, 4 and 5 are essential
  (source format, timing, elements, persistence/handoffs, morphing and LaTeX).
- `shared/animlib/demo/scenes.ts`: complete working scenes, including a grid, arrows,
  a LaTeX formula with `\\animpart` / `\\animnum`, and a handoff with `s.previous`.
- `shared/animlib/src/types.ts`: exact option and method names.

Hard rules:
- The source is exactly one module: `export default scene({ mode: "2d", end: "advance", background: "BLACK" }, s => { ... });`
  No imports, no audio option, no DOM, timers or async code.
- Use `mode: "2d"` for flat subjects. When the subject is genuinely spatial (molecules,
  3D geometry), use 3D: spheres, `line3D` / `arrow3D`, camera transitions, and
  `orbit: true` or an `s.view` region so the viewer can rotate it with the mouse
  (reference section 6; the chemistry scene in `demo/scenes.ts` is a worked example).
- Colours are palette tokens only (`Color.BLUE` or `"BLUE"`); raw CSS colours are rejected.
- Timing is sequential: `s.play(action or [actions], { duration, ease: "smooth" })` and
  `s.wait(seconds)`. The durations must add up to **50 s** (±0.5 s).
- Every element needs a stable, descriptive id (`"grid"`, `"i-hat"`, `"matrix-A"`).
  Reuse the ids of kept objects from earlier scenes; never invent a second object
  for the same thing.
- To change an arrow's length or direction, morph that same arrow
  (`arrow.morphTo({ kind: "arrow", points: [...] })`); never draw a longer arrow on
  top of the old one. Rotate a whole grid by putting its lines in a group and using
  `rotateTo`; for other linear maps morph each line's points to its image.
- Formulas use `s.latex` with named parts so later scenes can morph them; keep them
  in the right-hand text area (no box around it), clear of the geometry.
- Interactive elements use animlib controls with exactly the ids listed above:
  `const k = s.slider("id", { label, default, min, max, step, position: [x, y], width })`,
  `s.toggle("id", { label, default })`, `s.select("id", { label, default, options })`.
  They return plain values; compute geometry, numbers and formulas from them with
  ordinary JavaScript so the picture is correct for ANY value at ANY time (the
  builder is re-run when the viewer moves a control). Place controls over the
  bottom-left of the geometry area (e.g. `position: [0.05, 0.80]`), clear of the
  formula area and of the objects. Add no controls other than the listed ones.
  (animlib has no draggable points; sliders, toggles and selects are the tools.)
- Kept objects must be created from the control values too, so the next scene
  inherits whatever the viewer chose.

## Deliverable

Return only the complete scene source in one ```js block. It is compiled by animlib
together with the earlier scenes; any diagnostic is sent back to you to fix.
