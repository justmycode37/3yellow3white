# Animation task: scene 3 of 8: S acts on the columns of R

Write **one animlib scene** (JavaScript) for an explanatory animation about
**Matrix multiplication is composition**, for Beginning linear algebra students working in the plane R^2. They already picture a 2x2 matrix as a motion of the grid and know that its columns are where e1 and e2 land; they have not yet seen a matrix product..

## Overarching context

**Course material:** Linear Algebra, Lecture 3: Linear maps, matrices and determinants
**This film:** film 3 of 4: Matrix multiplication is composition
**What the film teaches:** Multiplying matrices means doing one linear map after another. BA means 'first A, then B', and each column of BA is B applied to the matching column of A. Because order matters for motions, AB ≠ BA in general.
**The film's question:** If we do one linear motion of the plane and then another, which single matrix describes the result, and does the order of the two motions matter?
**Viewers already know:** A 2x2 matrix describes a linear map of the plane: grid lines stay straight and evenly spaced, the origin stays fixed, The columns of a matrix are the landing spots of e1 and e2, Applying a matrix to a vector: A v = x·(column 1) + y·(column 2), A linear map is fully determined by where e1 and e2 go
**Covered in earlier films (do not re-teach):** Basis vectors, coordinates and span, Linear maps and their matrices
**Coming in later films (do not anticipate):** The determinant as area scaling

**Teaching plan for the whole film**
- Learning goal: The student can explain that the product BA is the single matrix for 'first A, then B', can build it column by column by following where e1 and e2 land (column i of BA = B times column i of A), and can show with the rotation-and-shear pair why swapping the order usually gives a different matrix.
- Key insight the film builds to: A matrix product is not a new arithmetic rule to memorise. It is the record of where e1 and e2 end up after two motions are done one after the other. The columns of BA are what B does to the columns of A, so a different order of motions gives a different final grid and a different matrix.
- Running example: The quarter-turn R = [[0,-1],[1,0]] and the shear S = [[1,1],[0,1]] acting on the grid of R^2, with e1 and e2 followed as coloured arrows. First rotate then shear: e1 goes (1,0) -> (0,1) -> (1,1) and e2 goes (0,1) -> (-1,0) -> (-1,0), giving SR = [[1,-1],[1,0]]. Then shear first and rotate second: e1 goes (1,0) -> (1,0) -> (0,1) and e2 goes (0,1) -> (1,1) -> (-1,1), giving RS = [[0,-1],[1,1]]. The two final grids are visibly different.
- Misconceptions to prevent: BA means 'first B, then A' because we read left to right (in fact the matrix next to the vector acts first); Matrix multiplication is commutative like multiplication of numbers, so AB = BA; The product is formed by multiplying matching entries; The row-times-column recipe is an arbitrary rule with no meaning behind it; The composite of two linear maps might be something more complicated than a linear map, needing more than one matrix; AB ≠ BA means matrices never commute (it only fails in general; some pairs do agree)
- **This scene serves step 3 of 7:** The intermediate positions of e1 and e2 are the columns of R, and the final positions are S applied to those columns. This is the column rule: column i of SR equals S times column i of R.
  (why here: The viewer has just watched this happen and only needs it named. Turning the motion into a rule comes after the motion has been seen.; visual idea: Freeze the halfway frame, with the arrows at (0,1) and (-1,0), and show the matrix R beside it with its columns glowing in the same green and red. Then S acts on each coloured column separately: S·(0,1) = (1,1) and S·(-1,0) = (-1,0). The two results slide together into the matrix from step 2, with the colours carried through.)

**All scenes of this film** (you are writing scene 3):

   1. Two motions in a row: Doing a rotation and then a shear leaves a grid that is still straight, evenly spaced and pinned at the origin, so the combined motion is itself one linear map, and it must have a matrix of its own.
   2. Follow e1 and e2: The matrix of the combined motion can be read off without any new rule: follow e1 and e2 through both steps, and their final landing spots are its two columns.
**→ 3. S acts on the columns of R: The halfway positions of e1 and e2 are the columns of R, and the final positions are S applied to those columns: column i of the product is S times column i of R.**
   4. The same answer for every vector: The matrix built from e1 and e2 does the whole two-step job for any vector: (SR) v = S(R v). This equation is what the product means.
   5. Right to left: In S(R v) the matrix next to v acts first, so SR means first R, then S; in general BA means first A, then B.
   6. The same motions, swapped: Running the shear first and the rotation second sends e1 and e2 to different places, so the product RS has different columns from SR.
   7. Two different grids: Laid on top of each other, the two results clearly do not coincide: SR and RS are different maps, so the two products are different matrices.
   8. Usually different, sometimes the same: AB ≠ BA in general because the order of motions matters, yet some pairs, such as two rotations, give the same result either way; and in every case the columns of BA are B applied to the columns of A.

**Previous scene:** Follow e1 and e2: The matrix of the combined motion can be read off without any new rule: follow e1 and e2 through both steps, and their final landing spots are its two columns.
**Next scene:** The same answer for every vector: The matrix built from e1 and e2 does the whole two-step job for any vector: (SR) v = S(R v). This equation is what the product means.
Your scene must hand over cleanly: it continues the previous scene's idea and sets up the next one, without repeating or skipping ahead.

The scene is defined by its START and its END. Your animation is the motion that turns
the start picture into the end picture while making the purpose visible.

## START scene (first frame)

The film opens here: Dark frame in the fixed layout. On the left two thirds, the resting square grid of the plane with the origin at the centre of that area and the two basis arrows drawn thick: e1 in green and e2 in red, each with a short label beside its tip. On the right third, the text panel (dark backing rectangle, thin border) is empty.

## END scene (last frame)

Same geometry as before: the rotated-then-sheared grid over the ghost, e1 and e2 at their final spots. In the panel R (with green and red columns) and S sit at the top, the teal-framed matrix with green and red columns sits below; the working lines are gone.

On screen at the end, with the same names and roles used across the film:
- grid: the plane in its rotated-then-sheared position
- ghost grid: faint muted starting grid
- e1: green arrow at its final landing spot
- e2: red arrow at its final landing spot
- R matrix: blue frame, columns now green and red
- S matrix: gold, top of the panel
- product bracket: filled matrix with green and red columns, teal frame

The next scene ("The same answer for every vector") continues from your final frame: call `s.keep(x)` on every object that must still be there, with stable, descriptive ids.

## The animation: from START to END

**Purpose:** The halfway positions of e1 and e2 are the columns of R, and the final positions are S applied to those columns: column i of the product is S times column i of R.

**What it shows:** The shear is undone smoothly, so the plane rests in the halfway position, rotated only. In the panel the two columns of the R matrix take on green and red, and each pulses once together with the arrow it describes: the halfway arrows ARE the columns of R. Then the plane shears again, slowly. After it settles, two short lines of working appear one at a time in the lower panel: S applied to the green column of R equals a green column, while the green arrow glows; then S applied to the red column of R equals a red column, while the red arrow glows. Each result column then slides up onto the matching column of the filled bracket, lands exactly on the numbers already there and pulses once in agreement. The working lines fade, leaving the matrices. The aha moment is that the rule on the panel is just a transcript of the motion the viewer has now watched twice.

**Ideas the visuals must make visible, in order:**
- After the first motion, e1 and e2 sit on the columns of R
- The second motion S moves each of those columns separately
- S times column 1 of R is column 1 of the combined matrix; same for column 2
- The results match the matrix read off from the picture

You choose the concrete example (numbers, vectors, positions) and how to animate it.
Pick values that make the idea easy to see and keep them consistent with the START scene.

## Interactive elements

The viewer can change these while the scene plays or is paused. Build each one:
- **Shear amount** (slider, id `shear_amount`)
  - Drives: How far the shear pushes sideways, from none to a strong shear (default: the storyboarded shear); the final grid, the landing spot of e1, the S matrix and the first column of the product all follow it
  - The student should discover: The columns of the product are always S applied to the columns of R; e2 never moves under the shear because the rotation has laid it on the fixed axis, so the second column never changes

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
- No numeric counters/decimal readouts on the geometry; put numbers in the panel.

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

Layout (keep it identical in every scene):
- Geometry on the left two thirds of the frame; a fixed text panel on the right
  third (dark backing rectangle, thin border) for formulas and matrices. Geometry
  never enters the panel; text never sits on the grid except short object labels.
- Labels sit beside what they name with a visible gap and move with it; nothing
  touches or overlaps, including during motion.
- Minimum text height about 0.35 scene units; keep 0.4+ margin from the frame edge.
- Draw vectors with clearly thicker strokes than grid lines so they stay crisp.

Colour meanings (fixed for the whole film; map each role to the closest animlib
palette token such as `Color.GREEN`, `Color.RED`, `Color.YELLOW`, `Color.BLUE`, and
use the same token for the same concept in every scene):
- e1 and every first column: palette role `accent_green`
- e2 and every second column: palette role `accent_red`
- rotation R (letter, matrix frame, highlight while the plane rotates): palette role `primary`
- shear S (letter, matrix frame, highlight while the plane shears): palette role `accent_gold`
- test vector v: palette role `secondary`
- order 'first R, then S': the product SR and its grid: palette role `accent_teal`
- order 'first S, then R': the product RS and its grid: palette role `accent_purple`
- ghost of the untouched starting grid, helper lines, order numerals: palette role `muted`
- neutral grid before any order is singled out: palette role `grid`
- general letters A, B, the second rotation Q, signs and other formula text: palette role `text`

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
- Colours are palette tokens only (`Color.BLUE` or `"BLUE"`); raw CSS colours are rejected.
- Timing is sequential: `s.play(action or [actions], { duration, ease: "smooth" })` and
  `s.wait(seconds)`. The durations must add up to **45 s** (±0.5 s).
- Every element needs a stable, descriptive id (`"grid"`, `"i-hat"`, `"matrix-A"`).
  Reuse the ids of kept objects from earlier scenes; never invent a second object
  for the same thing.
- To change an arrow's length or direction, morph that same arrow
  (`arrow.morphTo({ kind: "arrow", points: [...] })`); never draw a longer arrow on
  top of the old one. Rotate a whole grid by putting its lines in a group and using
  `rotateTo`; for other linear maps morph each line's points to its image.
- Formulas use `s.latex` with named parts so later scenes can morph them; keep them
  in the right-hand panel area, clear of the geometry.
- Interactive elements use animlib controls with exactly the ids listed above:
  `const k = s.slider("id", { label, default, min, max, step, position: [x, y], width })`,
  `s.toggle("id", { label, default })`, `s.select("id", { label, default, options })`.
  They return plain values; compute geometry, numbers and formulas from them with
  ordinary JavaScript so the picture is correct for ANY value at ANY time (the
  builder is re-run when the viewer moves a control). Place controls over the
  bottom-left of the geometry area (e.g. `position: [0.05, 0.80]`), clear of the
  formula panel and of the objects. Add no controls other than the listed ones.
  (animlib has no draggable points; sliders, toggles and selects are the tools.)
- Kept objects must be created from the control values too, so the next scene
  inherits whatever the viewer chose.

## Deliverable

Return only the complete scene source in one ```js block. It is compiled by animlib
together with the earlier scenes; any diagnostic is sent back to you to fix.
