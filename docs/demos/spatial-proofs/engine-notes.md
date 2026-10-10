# Engine proof — construction and evidence

Source: `shared/animlib/demo/proofs/engine.ts`, exported `engineProof`.

This is a silent, 16-second, single-cylinder engine kinematic cutaway: two seconds
for initial inspection, twelve seconds for four crank revolutions (two idealized
four-stroke cycles), then a two-second still hold. One fixed camera reveals the
sectioned cylinder, piston crown and rings, wrist pin, I-section connecting rod,
crank pin, counterweight, flywheel and spokes, bearing, shaft, housing, cooling
fins, fasteners, valve heads/stems and separated inlet/exhaust port sections.
Whole-scene orbit is disabled; dragging model geometry rotates its dedicated view.
No explanatory text, narration or generated raster imagery is embedded in the scene.

## Kinematic contract

The crank radius is `R=0.9`, connecting-rod length `L=2.8`, in arbitrary model units.
For crank angle θ, the crank pin is `(R sin θ, R cos θ)`. The rod's world rotation
is `asin(R sin θ/L)` and the wrist pin follows
`y=R cos θ+sqrt(L²−R² sin²θ)` at each keyframe. Nested groups make the rod a rigid
body connected to the crank; the piston counter-rotates to stay upright. Neither
a line connector nor independently moving endpoints substitute for this mechanism.

There are 120 angular samples per revolution. Rotation interpolation preserves
rod length and coincident crank pivots exactly, but approximates the slider guide
between samples. Inspection of 1,921 evaluated times, including interior fractions
of every angular interval, measured maximum lateral guide error
`0.0003082776` scene unit, below `0.001`. Maximum rod-length error was
`8.9e-16`; crank-pivot mismatch was zero; piston upright error was `4.3e-15`.
These are floating-point/sample measurements, not a continuous rigid-body solver.

Valve lift follows a deliberately simplified `0.19 sin²(phase)` profile during
the intake and exhaust strokes, driven by the same angle with a 720° cycle.
Camshaft, followers and valve springs are omitted; valve lift is prescribed.
There is no combustion, gas flow, thermal, structural or lubrication simulation.
Ports, dimensions, material colors and clearances are illustrative rather than
measurements of a manufactured engine. The open half-cylinder and open crankcase
are intentional cutaways, not missing opaque shell rendering.

## Verification

- Compiled with the installed `shared/animlib/dist/core.js` `compileSource`.
- Native production renderer generated 16 frame images: eight times each at
  1280×720 and 960×720. Times: 0, 2.75, 3.5, 5, 7.25, 9.5, 12.5 and 16 seconds.
- Inspected the 16:9 contact sheet and individual bottom-dead-center frame, plus
  the 4:3 angled-rod frame. Housing silhouette and fasteners stay clear of canvas
  boundaries; the piston stays inside the bore; the visible rod and joints remain
  attached; solid depth shading exposes real geometry. No labels can collide.
- Images were inspected after initial rendering. No manual visual repair was
  needed for these sampled frames. Browser playback and drag interaction belong
  to the integrated gallery's subsequent verification, not this native check.

Ignored reproducibility/evidence files:

- `data/spatial-proofs/engine-check.ts`: compile and native-render job preparation.
- `data/spatial-proofs/engine-render.json`: exact source and sampling request.
- `data/spatial-proofs/engine-frames/frames.json`: native image manifest.
- `data/spatial-proofs/engine-frames/1280x720-sheet-0.png`: initial/motion samples.
- `data/spatial-proofs/engine-frames/960x720-1.png`: alternate-aspect inspection.
- `data/spatial-proofs/engine-validate.ts` and `engine-validation.json`: sampled
  world-transform invariants using the library's own `SpatialFrame`.

Run the compile/render job from the repository root:

```powershell
node_modules/.bin/bun data/spatial-proofs/engine-check.ts
node shared/animlib/tools/render-frames.mjs data/spatial-proofs/engine-render.json
node_modules/.bin/bun data/spatial-proofs/engine-validate.ts
```
