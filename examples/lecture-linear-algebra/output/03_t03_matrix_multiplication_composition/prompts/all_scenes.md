# Animation task: scene 1 of 8: Two motions in a row

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
- **This scene serves step 1 of 7:** Doing two linear motions in a row, first the rotation R and then the shear S, leaves a grid that still has straight, evenly spaced lines and a fixed origin. So the combined motion is itself one linear map.
  (why here: It starts with something the viewer can simply watch, using only the earlier picture of a matrix as a grid motion. It also raises the question that drives the film: if the result is a linear map, what is its matrix?; visual idea: The grid with e1 (green) and e2 (red) rotates a quarter turn, pauses, then shears to the right. The intermediate grid fades and the film replays the start-to-end motion as one smooth move, with a faint ghost of the original grid behind it. A question mark sits inside an empty 2x2 bracket.)

**All scenes of this film** (you are writing scene 1):

**→ 1. Two motions in a row: Doing a rotation and then a shear leaves a grid that is still straight, evenly spaced and pinned at the origin, so the combined motion is itself one linear map, and it must have a matrix of its own.**
   2. Follow e1 and e2: The matrix of the combined motion can be read off without any new rule: follow e1 and e2 through both steps, and their final landing spots are its two columns.
   3. S acts on the columns of R: The halfway positions of e1 and e2 are the columns of R, and the final positions are S applied to those columns: column i of the product is S times column i of R.
   4. The same answer for every vector: The matrix built from e1 and e2 does the whole two-step job for any vector: (SR) v = S(R v). This equation is what the product means.
   5. Right to left: In S(R v) the matrix next to v acts first, so SR means first R, then S; in general BA means first A, then B.
   6. The same motions, swapped: Running the shear first and the rotation second sends e1 and e2 to different places, so the product RS has different columns from SR.
   7. Two different grids: Laid on top of each other, the two results clearly do not coincide: SR and RS are different maps, so the two products are different matrices.
   8. Usually different, sometimes the same: AB ≠ BA in general because the order of motions matters, yet some pairs, such as two rotations, give the same result either way; and in every case the columns of BA are B applied to the columns of A.

**Next scene:** Follow e1 and e2: The matrix of the combined motion can be read off without any new rule: follow e1 and e2 through both steps, and their final landing spots are its two columns.
Your scene must hand over cleanly: it continues the previous scene's idea and sets up the next one, without repeating or skipping ahead.

The scene is defined by its START and its END. Your animation is the motion that turns
the start picture into the end picture while making the purpose visible.

## START scene (first frame)

The film opens here: Dark frame in the fixed layout. On the left two thirds, the resting square grid of the plane with the origin at the centre of that area and the two basis arrows drawn thick: e1 in green and e2 in red, each with a short label beside its tip. On the right third, the text panel (dark backing rectangle, thin border) is empty.

## END scene (last frame)

The grid rests in its rotated-then-sheared position over the faint ghost of the starting grid, with e1 (green) and e2 (red) at their final spots. In the panel: R and S with their matrices at the top, and below them the empty teal-framed 2x2 bracket holding a question mark.

On screen at the end, with the same names and roles used across the film:
- grid: the plane, now in its rotated-then-sheared position
- ghost grid: faint muted copy of the starting grid behind it
- e1: green basis arrow with label, riding on the grid
- e2: red basis arrow with label, riding on the grid
- R matrix: blue letter R with its matrix, top of the panel
- S matrix: gold letter S with its matrix, beside R
- product bracket: empty 2x2 bracket with a question mark, teal frame, middle of the panel

The next scene ("Follow e1 and e2") continues from your final frame: call `s.keep(x)` on every object that must still be there, with stable, descriptive ids.

## The animation: from START to END

**Purpose:** Doing a rotation and then a shear leaves a grid that is still straight, evenly spaced and pinned at the origin, so the combined motion is itself one linear map, and it must have a matrix of its own.

**What it shows:** The whole plane, with e1 and e2 riding along, turns a quarter turn (interpolated by angle, slow); as it turns, the letter R with its small matrix eases into the top of the panel in blue. A pause. Then the plane shears sideways (one parameter, slow) while S with its small matrix eases in next to R in gold. A faint muted ghost of the original grid stays behind the whole time, so the viewer can compare start and end: the lines are still straight, still parallel, still evenly spaced, and the origin has not moved. After a hold, the plane eases calmly back onto the ghost, pauses, and then travels from start to the same end position in one single smooth move (blending the matrix entries from the identity), with no stop in the middle: the same result as one motion. While it holds on the final grid, an empty 2x2 bracket with a question mark inside eases into the middle of the panel with a thin teal frame. The aha moment is seeing the one-move replay land exactly where the two-step version landed.

**Ideas the visuals must make visible, in order:**
- First a rotation, then a shear: two separate motions of the same plane
- The final grid still has straight, evenly spaced lines and a fixed origin
- The same end result can be reached as one single linear motion
- One linear map means one matrix: which one?

You choose the concrete example (numbers, vectors, positions) and how to animate it.
Pick values that make the idea easy to see and keep them consistent with the START scene.

## Interactive elements

The viewer can change these while the scene plays or is paused. Build each one:
- **Rotation angle** (slider, id `rotation_angle`)
  - Drives: The angle of the first motion, from no turn to a half turn (default: the quarter turn); the grid, e1, e2 and the entries of the R matrix in the panel all follow it
  - The student should discover: Whatever the angle, the grid after both motions still has straight, evenly spaced lines through a fixed origin: the combined motion is always a linear map

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
  `s.wait(seconds)`. The durations must add up to **50 s** (±0.5 s).
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


---

# Animation task: scene 2 of 8: Follow e1 and e2

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
- **This scene serves step 2 of 7:** The matrix of the combined motion can be read off by following e1 and e2 through both steps: e1 lands on (1,1) and e2 lands on (-1,0), so the matrix is [[1,-1],[1,0]].
  (why here: The viewer already knows that columns are the landing spots of the basis vectors. Applying that fact to the two-step motion produces the answer before any product notation appears.; visual idea: Follow e1 alone: it turns to (0,1), then the shear pushes it to (1,1), and its coordinates drop into the first column of the empty bracket. Then follow e2: it turns to (-1,0), which lies on the horizontal axis, so the shear leaves it there, and its coordinates fill the second column. The bracket now reads [[1,-1],[1,0]].)

**All scenes of this film** (you are writing scene 2):

   1. Two motions in a row: Doing a rotation and then a shear leaves a grid that is still straight, evenly spaced and pinned at the origin, so the combined motion is itself one linear map, and it must have a matrix of its own.
**→ 2. Follow e1 and e2: The matrix of the combined motion can be read off without any new rule: follow e1 and e2 through both steps, and their final landing spots are its two columns.**
   3. S acts on the columns of R: The halfway positions of e1 and e2 are the columns of R, and the final positions are S applied to those columns: column i of the product is S times column i of R.
   4. The same answer for every vector: The matrix built from e1 and e2 does the whole two-step job for any vector: (SR) v = S(R v). This equation is what the product means.
   5. Right to left: In S(R v) the matrix next to v acts first, so SR means first R, then S; in general BA means first A, then B.
   6. The same motions, swapped: Running the shear first and the rotation second sends e1 and e2 to different places, so the product RS has different columns from SR.
   7. Two different grids: Laid on top of each other, the two results clearly do not coincide: SR and RS are different maps, so the two products are different matrices.
   8. Usually different, sometimes the same: AB ≠ BA in general because the order of motions matters, yet some pairs, such as two rotations, give the same result either way; and in every case the columns of BA are B applied to the columns of A.

**Previous scene:** Two motions in a row: Doing a rotation and then a shear leaves a grid that is still straight, evenly spaced and pinned at the origin, so the combined motion is itself one linear map, and it must have a matrix of its own.
**Next scene:** S acts on the columns of R: The halfway positions of e1 and e2 are the columns of R, and the final positions are S applied to those columns: column i of the product is S times column i of R.
Your scene must hand over cleanly: it continues the previous scene's idea and sets up the next one, without repeating or skipping ahead.

The scene is defined by its START and its END. Your animation is the motion that turns
the start picture into the end picture while making the purpose visible.

## START scene (first frame)

The film opens here: Dark frame in the fixed layout. On the left two thirds, the resting square grid of the plane with the origin at the centre of that area and the two basis arrows drawn thick: e1 in green and e2 in red, each with a short label beside its tip. On the right third, the text panel (dark backing rectangle, thin border) is empty.

## END scene (last frame)

The grid rests in the rotated-then-sheared position over the ghost grid, e1 and e2 at their final spots, no drop lines left. The panel shows R and S at the top and the teal-framed matrix below them, completely filled, with a green first column and a red second column.

On screen at the end, with the same names and roles used across the film:
- grid: the plane in its rotated-then-sheared position
- ghost grid: faint muted starting grid, used to read coordinates
- e1: green arrow at its final landing spot
- e2: red arrow at its final landing spot
- R matrix: blue, top of the panel
- S matrix: gold, top of the panel
- product bracket: now filled, first column green, second column red, teal frame

The next scene ("S acts on the columns of R") continues from your final frame: call `s.keep(x)` on every object that must still be there, with stable, descriptive ids.

## The animation: from START to END

**Purpose:** The matrix of the combined motion can be read off without any new rule: follow e1 and e2 through both steps, and their final landing spots are its two columns.

**What it shows:** The plane eases back onto the ghost grid so e1 and e2 are home again. Then the two steps play once more, slowly, with attention on the arrows. During the rotation both arrows turn: e1 ends pointing straight up, e2 ends pointing left along the horizontal axis. Pause. During the shear, the tip of e1 slides sideways along its grid line, while e2, lying on the horizontal axis, does not move at all; the horizontal axis glows softly for a moment to show it is the line the shear leaves in place. Hold. Now the read-off: thin muted drop lines run from the tip of e1 to the two axes of the ghost grid, its two coordinates appear in green in the panel and glide into the first column of the bracket as the question mark fades. The drop lines leave, then the same happens for e2 in red, filling the second column. The bracket is now a complete matrix, its columns coloured like the arrows that produced them.

**Ideas the visuals must make visible, in order:**
- Follow e1 through both motions to its final landing spot
- Follow e2: the rotation lays it on the axis that the shear does not move
- Landing spot of e1 becomes column 1, landing spot of e2 becomes column 2
- The matrix of the combined motion is found from the picture alone

You choose the concrete example (numbers, vectors, positions) and how to animate it.
Pick values that make the idea easy to see and keep them consistent with the START scene.

## Interactive elements

None in this scene: it should simply play. Do not add controls.

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


---

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


---

# Animation task: scene 4 of 8: The same answer for every vector

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
- **This scene serves step 4 of 7:** This one matrix does the whole job for every vector, not just e1 and e2: (SR) v = S(R v). That equation is the definition of the product, and in general (BA) v = B(A v).
  (why here: With the matrix built from the basis vectors, the viewer needs to see that it handles any vector. This justifies calling it 'the' matrix of the composite and motivates the general definition.; visual idea: A yellow test vector v = (2,1) takes the two-step route: R sends it to (-1,2), then S sends it to (1,2). A second copy of v takes the direct route, with the single matrix [[1,-1],[1,0]] applied in one move, and lands on the same point (1,2). The two paths form a triangle that closes, and the equation (SR) v = S(R v) is written underneath.)

**All scenes of this film** (you are writing scene 4):

   1. Two motions in a row: Doing a rotation and then a shear leaves a grid that is still straight, evenly spaced and pinned at the origin, so the combined motion is itself one linear map, and it must have a matrix of its own.
   2. Follow e1 and e2: The matrix of the combined motion can be read off without any new rule: follow e1 and e2 through both steps, and their final landing spots are its two columns.
   3. S acts on the columns of R: The halfway positions of e1 and e2 are the columns of R, and the final positions are S applied to those columns: column i of the product is S times column i of R.
**→ 4. The same answer for every vector: The matrix built from e1 and e2 does the whole two-step job for any vector: (SR) v = S(R v). This equation is what the product means.**
   5. Right to left: In S(R v) the matrix next to v acts first, so SR means first R, then S; in general BA means first A, then B.
   6. The same motions, swapped: Running the shear first and the rotation second sends e1 and e2 to different places, so the product RS has different columns from SR.
   7. Two different grids: Laid on top of each other, the two results clearly do not coincide: SR and RS are different maps, so the two products are different matrices.
   8. Usually different, sometimes the same: AB ≠ BA in general because the order of motions matters, yet some pairs, such as two rotations, give the same result either way; and in every case the columns of BA are B applied to the columns of A.

**Previous scene:** S acts on the columns of R: The halfway positions of e1 and e2 are the columns of R, and the final positions are S applied to those columns: column i of the product is S times column i of R.
**Next scene:** Right to left: In S(R v) the matrix next to v acts first, so SR means first R, then S; in general BA means first A, then B.
Your scene must hand over cleanly: it continues the previous scene's idea and sets up the next one, without repeating or skipping ahead.

The scene is defined by its START and its END. Your animation is the motion that turns
the start picture into the end picture while making the purpose visible.

## START scene (first frame)

The film opens here: Dark frame in the fixed layout. On the left two thirds, the resting square grid of the plane with the origin at the centre of that area and the two basis arrows drawn thick: e1 in green and e2 in red, each with a short label beside its tip. On the right third, the text panel (dark backing rectangle, thin border) is empty.

## END scene (last frame)

The grid is at rest with e1 and e2 at home and the yellow vector v sitting at the point where both routes ended; no trails or dot remain. The panel shows R and S at the top, the matrix now labelled SR in teal, and beneath it the equation (SR) v = S(R v).

On screen at the end, with the same names and roles used across the film:
- grid: the plane at rest, coinciding with the ghost grid
- e1: green arrow at home
- e2: red arrow at home
- v: yellow test vector, resting at its final landing spot
- R matrix: blue frame, green and red columns
- S matrix: gold
- SR matrix: the teal-framed matrix, now labelled SR, green and red columns
- definition: the equation (SR) v = S(R v) under the SR matrix

The next scene ("Right to left") continues from your final frame: call `s.keep(x)` on every object that must still be there, with stable, descriptive ids.

## The animation: from START to END

**Purpose:** The matrix built from e1 and e2 does the whole two-step job for any vector: (SR) v = S(R v). This equation is what the product means.

**What it shows:** The plane eases back to rest on the ghost grid, which now simply serves as a still reference so coordinates stay readable; e1 and e2 are home. A yellow test vector v grows from the origin, labelled v. Only v moves in this scene. First the two-step route: v turns under the rotation (R glows blue in the panel) and leaves a thin faint trail; pause; then it slides under the shear (S glows gold), leaving a second trail, and a small muted dot marks where its tip has landed. Hold. Then v eases back home along a calm path, pauses, and takes the direct route: the teal-framed matrix glows and v travels in one single move (matrix entries blended from the identity), drawing a third trail that closes a thin triangle of paths, and its tip arrives exactly on the dot. Hold longer. Only now does the name appear: the label SR writes itself in teal beside the teal-framed matrix, and beneath it the equation (SR) v = S(R v) forms, with v in yellow, R in blue, S in gold. The trails and the dot fade.

**Ideas the visuals must make visible, in order:**
- Send v through R, then through S: the two-step route
- Send the same v through the single combined matrix: the direct route
- Both routes end at exactly the same point, for any v
- This is the definition of the product: (SR) v = S(R v)

You choose the concrete example (numbers, vectors, positions) and how to animate it.
Pick values that make the idea easy to see and keep them consistent with the START scene.

## Interactive elements

The viewer can change these while the scene plays or is paused. Build each one:
- **v across** (slider, id `v_x`)
  - Drives: The horizontal coordinate of the starting vector v, across the visible grid (default: the storyboarded v); both routes and the landing dot follow it
  - The student should discover: Wherever v starts, the two-step route and the one-matrix route land on the same point
- **v up** (slider, id `v_y`)
  - Drives: The vertical coordinate of the starting vector v, across the visible grid (default: the storyboarded v); both routes and the landing dot follow it
  - The student should discover: The triangle of paths always closes: one matrix really does the work of both motions for every vector

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
  `s.wait(seconds)`. The durations must add up to **55 s** (±0.5 s).
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


---

# Animation task: scene 5 of 8: Right to left

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
- **This scene serves step 5 of 7:** The order of writing is right to left. In S(R v) the matrix next to v acts first, so SR means 'first R, then S', and BA means 'first A, then B'.
  (why here: The notation S(R v) is on screen, so this is the natural moment to settle the reading order. It must be fixed before the order is swapped in the next step.; visual idea: In the expression S R v, the vector v sits on the right. R lights up first as the grid rotates, then S lights up as the grid shears, so the highlight moves right to left. Small labels '1st' under R and '2nd' under S appear, and an arrow sweeps leftward across the product.)

**All scenes of this film** (you are writing scene 5):

   1. Two motions in a row: Doing a rotation and then a shear leaves a grid that is still straight, evenly spaced and pinned at the origin, so the combined motion is itself one linear map, and it must have a matrix of its own.
   2. Follow e1 and e2: The matrix of the combined motion can be read off without any new rule: follow e1 and e2 through both steps, and their final landing spots are its two columns.
   3. S acts on the columns of R: The halfway positions of e1 and e2 are the columns of R, and the final positions are S applied to those columns: column i of the product is S times column i of R.
   4. The same answer for every vector: The matrix built from e1 and e2 does the whole two-step job for any vector: (SR) v = S(R v). This equation is what the product means.
**→ 5. Right to left: In S(R v) the matrix next to v acts first, so SR means first R, then S; in general BA means first A, then B.**
   6. The same motions, swapped: Running the shear first and the rotation second sends e1 and e2 to different places, so the product RS has different columns from SR.
   7. Two different grids: Laid on top of each other, the two results clearly do not coincide: SR and RS are different maps, so the two products are different matrices.
   8. Usually different, sometimes the same: AB ≠ BA in general because the order of motions matters, yet some pairs, such as two rotations, give the same result either way; and in every case the columns of BA are B applied to the columns of A.

**Previous scene:** The same answer for every vector: The matrix built from e1 and e2 does the whole two-step job for any vector: (SR) v = S(R v). This equation is what the product means.
**Next scene:** The same motions, swapped: Running the shear first and the rotation second sends e1 and e2 to different places, so the product RS has different columns from SR.
Your scene must hand over cleanly: it continues the previous scene's idea and sets up the next one, without repeating or skipping ahead.

The scene is defined by its START and its END. Your animation is the motion that turns
the start picture into the end picture while making the purpose visible.

## START scene (first frame)

The film opens here: Dark frame in the fixed layout. On the left two thirds, the resting square grid of the plane with the origin at the centre of that area and the two basis arrows drawn thick: e1 in green and e2 in red, each with a short label beside its tip. On the right third, the text panel (dark backing rectangle, thin border) is empty.

## END scene (last frame)

The plane rests in the rotated-then-sheared position over the ghost grid, with e1, e2 and v at their landing spots. The panel shows R and S at the top, the SR matrix in the middle, and below it (BA) v = B(A v) with a small 1 under A, a small 2 under B and a thin arrow pointing leftward beneath them.

On screen at the end, with the same names and roles used across the film:
- grid: the plane in its rotated-then-sheared position
- ghost grid: faint muted starting grid
- e1: green arrow at its final landing spot
- e2: red arrow at its final landing spot
- v: yellow vector at its landing spot
- R matrix and S matrix: blue and gold, top of the panel
- SR matrix: teal label and frame, green and red columns
- order formula: (BA) v = B(A v) with numeral 1 under A, numeral 2 under B and a leftward arrow

The next scene ("The same motions, swapped") continues from your final frame: call `s.keep(x)` on every object that must still be there, with stable, descriptive ids.

## The animation: from START to END

**Purpose:** In S(R v) the matrix next to v acts first, so SR means first R, then S; in general BA means first A, then B.

**What it shows:** v eases back to its starting position. In the lower panel the equation simplifies in place to the bare expression S R v, large, with v on the right. Then the whole plane moves, with v riding along: as the plane rotates, the letter R, the one touching v, glows blue and a small muted numeral 1 eases in beneath it; pause; as the plane shears, the letter S glows gold and a numeral 2 eases in beneath it. The glow has travelled from right to left, against the reading direction, and a thin muted arrow sweeps leftward under the expression from the 1 to the 2 to confirm it. Hold. Finally the letters S and R in the expression change in place into B and A (text colour), keeping v, the numerals 1 and 2 and the leftward arrow exactly where they are, and the expression completes to (BA) v = B(A v): the same reading order for any two matrices.

**Ideas the visuals must make visible, in order:**
- The matrix written next to v is the one that touches v first
- So the motions happen in right-to-left order: R is 1, S is 2
- SR means first R, then S
- In general: BA means first A, then B, and (BA) v = B(A v)

You choose the concrete example (numbers, vectors, positions) and how to animate it.
Pick values that make the idea easy to see and keep them consistent with the START scene.

## Interactive elements

None in this scene: it should simply play. Do not add controls.

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
  `s.wait(seconds)`. The durations must add up to **40 s** (±0.5 s).
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


---

# Animation task: scene 6 of 8: The same motions, swapped

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
- **This scene serves step 6 of 7:** Doing the same two motions in the opposite order, first S then R, sends e1 to (0,1) and e2 to (-1,1), so RS = [[0,-1],[1,1]]. This is a different grid and a different matrix from SR = [[1,-1],[1,0]].
  (why here: This is the payoff. The viewer can now build a product from columns and read the order correctly, so they can run the swapped version themselves and see the result differ.; visual idea: Split screen with two identical starting grids. On the left the grid rotates then shears; on the right it shears then rotates, in sync. On the right e1 is untouched by the shear and then turns to (0,1), while e2 shears to (1,1) and then turns to (-1,1). The final grids are overlaid in two colours and clearly do not match, and the two matrices appear beneath with SR ≠ RS.)

**All scenes of this film** (you are writing scene 6):

   1. Two motions in a row: Doing a rotation and then a shear leaves a grid that is still straight, evenly spaced and pinned at the origin, so the combined motion is itself one linear map, and it must have a matrix of its own.
   2. Follow e1 and e2: The matrix of the combined motion can be read off without any new rule: follow e1 and e2 through both steps, and their final landing spots are its two columns.
   3. S acts on the columns of R: The halfway positions of e1 and e2 are the columns of R, and the final positions are S applied to those columns: column i of the product is S times column i of R.
   4. The same answer for every vector: The matrix built from e1 and e2 does the whole two-step job for any vector: (SR) v = S(R v). This equation is what the product means.
   5. Right to left: In S(R v) the matrix next to v acts first, so SR means first R, then S; in general BA means first A, then B.
**→ 6. The same motions, swapped: Running the shear first and the rotation second sends e1 and e2 to different places, so the product RS has different columns from SR.**
   7. Two different grids: Laid on top of each other, the two results clearly do not coincide: SR and RS are different maps, so the two products are different matrices.
   8. Usually different, sometimes the same: AB ≠ BA in general because the order of motions matters, yet some pairs, such as two rotations, give the same result either way; and in every case the columns of BA are B applied to the columns of A.

**Previous scene:** Right to left: In S(R v) the matrix next to v acts first, so SR means first R, then S; in general BA means first A, then B.
**Next scene:** Two different grids: Laid on top of each other, the two results clearly do not coincide: SR and RS are different maps, so the two products are different matrices.
Your scene must hand over cleanly: it continues the previous scene's idea and sets up the next one, without repeating or skipping ahead.

The scene is defined by its START and its END. Your animation is the motion that turns
the start picture into the end picture while making the purpose visible.

## START scene (first frame)

The film opens here: Dark frame in the fixed layout. On the left two thirds, the resting square grid of the plane with the origin at the centre of that area and the two basis arrows drawn thick: e1 in green and e2 in red, each with a short label beside its tip. On the right third, the text panel (dark backing rectangle, thin border) is empty.

## END scene (last frame)

Two half-size planes sit side by side in the geometry area: on the left the teal grid tagged SR in its rotated-then-sheared position, on the right the purple grid tagged RS in its sheared-then-rotated position, each with its own green e1 and red e2. The panel shows R and S at the top, then the SR matrix, then the RS matrix, each with green and red columns.

On screen at the end, with the same names and roles used across the film:
- left grid: teal plane tagged SR, rotated then sheared, with its e1 (green) and e2 (red)
- right grid: purple plane tagged RS, sheared then rotated, with its e1 (green) and e2 (red)
- R matrix and S matrix: blue and gold, top of the panel
- SR matrix: teal frame, green and red columns
- RS matrix: purple frame, green and red columns, below SR

The next scene ("Two different grids") continues from your final frame: call `s.keep(x)` on every object that must still be there, with stable, descriptive ids.

## The animation: from START to END

**Purpose:** Running the shear first and the rotation second sends e1 and e2 to different places, so the product RS has different columns from SR.

**What it shows:** v and the order formula fade away and the plane eases back to rest; the ghost grid fades out, since two grids are about to share the space. The grid, with its e1 and e2, then shrinks calmly and glides into the left half of the geometry area, its lines warming to teal, with the short tag SR above it; an identical grid with its own green e1 and red e2 fades in on the right half, lines in purple, tagged RS. Both start in the same resting position. Now the two play in step. Step one: the left plane rotates (R glows) while the right plane shears (S glows); on the right, e1 lies on the horizontal axis and stays put, while e2 leans over. Pause. Step two: the left plane shears while the right plane rotates, carrying both right-hand arrows round a quarter turn. Hold: the two final grids, side by side, visibly lean in different ways, and the arrows point to different places. Then the right-hand arrows are read off as before: the landing spot of its e1 fills the green first column, and the landing spot of its e2 the red second column, of a new purple-framed matrix labelled RS, which builds beneath the SR matrix in the panel.

**Ideas the visuals must make visible, in order:**
- Same two motions, opposite order, started from the same grid
- Shear first: e1 does not move, e2 leans; then both turn
- e1 and e2 end in different places than before
- Reading off the columns gives RS, a different matrix from SR

You choose the concrete example (numbers, vectors, positions) and how to animate it.
Pick values that make the idea easy to see and keep them consistent with the START scene.

## Interactive elements

The viewer can change these while the scene plays or is paused. Build each one:
- **Shear amount** (slider, id `shear_amount`)
  - Drives: The strength of the shear used in both orders, from none to a strong shear (default: the storyboarded shear); both final grids, all four arrows and both product matrices follow it
  - The student should discover: With no shear the two grids agree; as soon as the shear is switched on the two orders drift apart, and more shear means a bigger difference

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
  `s.wait(seconds)`. The durations must add up to **55 s** (±0.5 s).
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


---

# Animation task: scene 7 of 8: Two different grids

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
- **This scene serves step 6 of 7:** Doing the same two motions in the opposite order, first S then R, sends e1 to (0,1) and e2 to (-1,1), so RS = [[0,-1],[1,1]]. This is a different grid and a different matrix from SR = [[1,-1],[1,0]].
  (why here: This is the payoff. The viewer can now build a product from columns and read the order correctly, so they can run the swapped version themselves and see the result differ.; visual idea: Split screen with two identical starting grids. On the left the grid rotates then shears; on the right it shears then rotates, in sync. On the right e1 is untouched by the shear and then turns to (0,1), while e2 shears to (1,1) and then turns to (-1,1). The final grids are overlaid in two colours and clearly do not match, and the two matrices appear beneath with SR ≠ RS.)

**All scenes of this film** (you are writing scene 7):

   1. Two motions in a row: Doing a rotation and then a shear leaves a grid that is still straight, evenly spaced and pinned at the origin, so the combined motion is itself one linear map, and it must have a matrix of its own.
   2. Follow e1 and e2: The matrix of the combined motion can be read off without any new rule: follow e1 and e2 through both steps, and their final landing spots are its two columns.
   3. S acts on the columns of R: The halfway positions of e1 and e2 are the columns of R, and the final positions are S applied to those columns: column i of the product is S times column i of R.
   4. The same answer for every vector: The matrix built from e1 and e2 does the whole two-step job for any vector: (SR) v = S(R v). This equation is what the product means.
   5. Right to left: In S(R v) the matrix next to v acts first, so SR means first R, then S; in general BA means first A, then B.
   6. The same motions, swapped: Running the shear first and the rotation second sends e1 and e2 to different places, so the product RS has different columns from SR.
**→ 7. Two different grids: Laid on top of each other, the two results clearly do not coincide: SR and RS are different maps, so the two products are different matrices.**
   8. Usually different, sometimes the same: AB ≠ BA in general because the order of motions matters, yet some pairs, such as two rotations, give the same result either way; and in every case the columns of BA are B applied to the columns of A.

**Previous scene:** The same motions, swapped: Running the shear first and the rotation second sends e1 and e2 to different places, so the product RS has different columns from SR.
**Next scene:** Usually different, sometimes the same: AB ≠ BA in general because the order of motions matters, yet some pairs, such as two rotations, give the same result either way; and in every case the columns of BA are B applied to the columns of A.
Your scene must hand over cleanly: it continues the previous scene's idea and sets up the next one, without repeating or skipping ahead.

The scene is defined by its START and its END. Your animation is the motion that turns
the start picture into the end picture while making the purpose visible.

## START scene (first frame)

The film opens here: Dark frame in the fixed layout. On the left two thirds, the resting square grid of the plane with the origin at the centre of that area and the two basis arrows drawn thick: e1 in green and e2 in red, each with a short label beside its tip. On the right third, the text panel (dark backing rectangle, thin border) is empty.

## END scene (last frame)

One full-size picture: the teal SR grid and the purple RS grid overlaid on a common origin, visibly not matching, each with its own green and red arrow and its tag. The panel shows R and S at the top and, below, the SR matrix and the RS matrix on one line with a not-equal sign between them.

On screen at the end, with the same names and roles used across the film:
- teal grid: result of first R then S, with its e1 and e2, tagged SR
- purple grid: result of first S then R, with its e1 and e2, tagged RS
- R matrix and S matrix: blue and gold, top of the panel
- SR matrix: teal frame, green and red columns
- RS matrix: purple frame, green and red columns
- not-equal sign: between the SR and RS matrices

The next scene ("Usually different, sometimes the same") continues from your final frame: call `s.keep(x)` on every object that must still be there, with stable, descriptive ids.

## The animation: from START to END

**Purpose:** Laid on top of each other, the two results clearly do not coincide: SR and RS are different maps, so the two products are different matrices.

**What it shows:** The two planes glide toward the centre of the geometry area and grow back to full size until their origins coincide; the tags SR and RS settle near the top corners of the geometry area. The teal lines and the purple lines cross each other instead of lying on top of one another. The two green arrows point to different spots, and so do the two red arrows; a thin muted arc briefly spans the gap between each pair of same-coloured tips and then fades. In the panel the SR matrix and the RS matrix move onto one line, and the entries where they disagree pulse once together with the arrows that produced them; a not-equal sign eases in between the two matrices. Hold on the mismatched overlay.

**Ideas the visuals must make visible, in order:**
- Overlay the two final grids on a shared origin
- The grid lines do not coincide, and neither do the landing spots of e1 or of e2
- Different landing spots mean different columns
- SR ≠ RS

You choose the concrete example (numbers, vectors, positions) and how to animate it.
Pick values that make the idea easy to see and keep them consistent with the START scene.

## Interactive elements

The viewer can change these while the scene plays or is paused. Build each one:
- **Rotation angle** (slider, id `rotation_angle`)
  - Drives: The angle of the rotation used in both orders, from no turn to a half turn (default: the quarter turn); both overlaid grids, their arrows, both matrices and the sign between them follow it
  - The student should discover: For almost every angle the grids disagree, but at no turn and at a half turn they fall exactly on top of each other: order usually matters, not always
- **RS grid** (toggle, id `show_rs`)
  - Drives: Shows or hides the purple sheared-then-rotated grid and its arrows on the overlay (default: shown)
  - The student should discover: Switching one grid off and on makes it easy to see, line by line and arrow by arrow, where the two results differ

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
  `s.wait(seconds)`. The durations must add up to **35 s** (±0.5 s).
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


---

# Animation task: scene 8 of 8: Usually different, sometimes the same

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
- **This scene serves step 7 of 7:** AB ≠ BA in general because the order of motions matters, but 'in general' does not mean 'never': two rotations give the same result in either order.
  (why here: This consolidates the insight by marking its boundary. It prevents the overcorrection that matrices never commute, and it keeps the reason tied to motions.; visual idea: A short contrast clip: two rotations applied in both orders on a split screen land on identical grids, and a quiet equals sign appears. Then cut back to the mismatched rotation-and-shear overlay with AB ≠ BA and the words 'in general'. Close on the column rule in colour: the columns of BA are B applied to the columns of A.)

**All scenes of this film** (you are writing scene 8):

   1. Two motions in a row: Doing a rotation and then a shear leaves a grid that is still straight, evenly spaced and pinned at the origin, so the combined motion is itself one linear map, and it must have a matrix of its own.
   2. Follow e1 and e2: The matrix of the combined motion can be read off without any new rule: follow e1 and e2 through both steps, and their final landing spots are its two columns.
   3. S acts on the columns of R: The halfway positions of e1 and e2 are the columns of R, and the final positions are S applied to those columns: column i of the product is S times column i of R.
   4. The same answer for every vector: The matrix built from e1 and e2 does the whole two-step job for any vector: (SR) v = S(R v). This equation is what the product means.
   5. Right to left: In S(R v) the matrix next to v acts first, so SR means first R, then S; in general BA means first A, then B.
   6. The same motions, swapped: Running the shear first and the rotation second sends e1 and e2 to different places, so the product RS has different columns from SR.
   7. Two different grids: Laid on top of each other, the two results clearly do not coincide: SR and RS are different maps, so the two products are different matrices.
**→ 8. Usually different, sometimes the same: AB ≠ BA in general because the order of motions matters, yet some pairs, such as two rotations, give the same result either way; and in every case the columns of BA are B applied to the columns of A.**

**Previous scene:** Two different grids: Laid on top of each other, the two results clearly do not coincide: SR and RS are different maps, so the two products are different matrices.
Your scene must hand over cleanly: it continues the previous scene's idea and sets up the next one, without repeating or skipping ahead.

The scene is defined by its START and its END. Your animation is the motion that turns
the start picture into the end picture while making the purpose visible.

## START scene (first frame)

The film opens here: Dark frame in the fixed layout. On the left two thirds, the resting square grid of the plane with the origin at the centre of that area and the two basis arrows drawn thick: e1 in green and e2 in red, each with a short label beside its tip. On the right third, the text panel (dark backing rectangle, thin border) is empty.

## END scene (last frame)

The mismatched teal and purple grids overlaid on a common origin, each with its green and red arrow. In the panel, top to bottom: the column rule for BA with a green first column and a red second column, then AB ≠ BA, then the two small lines SR ≠ RS and QR = RQ. Held still to close the film.

On screen at the end, with the same names and roles used across the film:
- teal grid: first R then S result, with its e1 and e2
- purple grid: first S then R result, with its e1 and e2
- column rule: BA as a bracket with columns B·(column 1 of A) in green and B·(column 2 of A) in red
- general statement: AB ≠ BA
- examples: the lines SR ≠ RS and QR = RQ beneath it

This is the last scene: end on a clean, readable hold.

## The animation: from START to END

**Purpose:** AB ≠ BA in general because the order of motions matters, yet some pairs, such as two rotations, give the same result either way; and in every case the columns of BA are B applied to the columns of A.

**What it shows:** Both overlaid grids ease back to rest, where they merge into what looks like a single grid. In the panel the two product matrices shrink to the compact line SR ≠ RS, and the S matrix gives way to a second, smaller rotation Q in the text colour. Now the two grids are run through two rotations in opposite orders, in step: the teal one does the quarter turn first and the small turn second, the purple one the small turn first and the quarter turn second. Halfway they are visibly apart; at the end they glide exactly onto each other, every line and both pairs of arrows coinciding. Hold longer, and the line QR = RQ eases in beneath SR ≠ RS. Then both grids ease back to rest, pause, and in one calm blended move each travels to its rotation-and-shear result from before, so the mismatched teal and purple overlay returns. Above the two concrete lines the general statement AB ≠ BA eases in, with the two cases beneath it showing one pair that differs and one pair that agrees. Last, the R and Q matrices fade from the top of the panel and the column rule takes their place: BA written as a bracket whose first column is B applied to the first column of A in green and whose second column is B applied to the second column of A in red. Hold on the final picture.

**Ideas the visuals must make visible, in order:**
- Two rotations in either order: different halfway, identical at the end
- So some pairs do agree: QR = RQ
- Rotation and shear do not: SR ≠ RS
- In general AB ≠ BA, because order of motions matters
- Columns of BA are B applied to the columns of A

You choose the concrete example (numbers, vectors, positions) and how to animate it.
Pick values that make the idea easy to see and keep them consistent with the START scene.

## Interactive elements

The viewer can change these while the scene plays or is paused. Build each one:
- **Angle of Q** (slider, id `second_angle`)
  - Drives: The angle of the second rotation Q, from no turn to a half turn (default: the storyboarded small turn); the halfway positions and the final position of both grids in the two-rotation run follow it
  - The student should discover: However the second angle is chosen, the two orders of rotation always finish on the same grid: rotations about the origin commute with each other

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
- The source is exactly one module: `export default scene({ mode: "2d", end: "hold", background: "BLACK" }, s => { ... });`
  No imports, no audio option, no DOM, timers or async code.
- Colours are palette tokens only (`Color.BLUE` or `"BLUE"`); raw CSS colours are rejected.
- Timing is sequential: `s.play(action or [actions], { duration, ease: "smooth" })` and
  `s.wait(seconds)`. The durations must add up to **60 s** (±0.5 s).
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
