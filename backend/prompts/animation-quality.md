# Current animation quality policy

This policy overrides conflicting style defaults in the imported scenegen prompts.
It does not override the user's request, narration timing, output schema, or the
animlib API. Preserve the existing visual language: black background, clean
mathematical serif labels and vector LaTeX, white scaffold, restrained stable
Color tokens. Improve composition within that style; do not redesign it as cards,
a dashboard, branded UI, photorealistic graphics, or a new palette. Requested
faceted/voxel or other subject-specific appearance remains valid: preserve its
defining geometry and supported color roles within this explanatory language.

Procedural textures and stylized materials can clarify wood, metal, cloth,
stone or a surface's structure without changing that language. Keep black stage,
stable concept colors and quiet scaffold; choose related primary/secondary palette
colors, restrained contrast and pattern frequency that remains readable at delivery
size. Fine relief can use matching colors with a small bump. Preserve elemental or
quantitative color identities. Do not add arbitrary grain to scientific data or
make a material highlight obscure the geometry, trajectory or active contact.
Use finish where useful, not a requirement to texture every object. Requested
texture belongs in the initial generation, followed by the existing first
verification and only then a targeted repair if findings require it.

## Composition and attention

The subject's construction owns the frame. Select only objects needed for the
current inference. Stage the explanation: context, active operation, consequence,
reading hold. These are reasoning phases, not a mandatory four-screen template.
Remove obsolete helpers, text and duplicate readouts before adding more. Keep a
reference copy only when comparison needs it. Show the visible relation that
earns the claim, then name it. A changing counter plus a conclusion is insufficient.

Sparse composition does not mean low-detail geometry. When the request needs
many atoms, connected components, facets or surface samples, retain the necessary
structure. Use scale, isolation, sectioning and selective annotation to direct
attention. Do not replace requested detailed geometry with a generic icon to
make a frame look simpler. Choose mesh resolution for visible curvature, not
maximum counts, and keep dense surfaces free of gratuitous triangle-edge strokes.

Put short labels and algebra near their referents with clear anchors or leaders.
Do not force all text into a fixed panel. Account for complete glyph bounds,
fractions, changing digits, outlines, connector routes and moving-label paths.
Separate old and new annotations in space or finish one exit before the other's
entrance if their coexistence makes ownership unclear. Keep meaningful unchanged
formula terms anchored; inspect both glyph layers during formula morphs.

The live player is part of the composition. Keep essential content away from its
top-left menu/title and bottom playback/caption area. At 16:9, use the middle 76%
of height for essential labels; adapt to the actual viewport and controls rather
than filling every edge. Reframe the construction or remove redundant content
before shrinking text. Readability must survive both authored and host aspects.
Do not assume a wide side gutter exists: inspect 16:9 and 4:3 frames. Prefer
local notation within the construction's safe bounds to far-right callouts.
Check label paths against moving geometry, including strands passing in front
of billboard text. Complete an introductory label's exit before geometry crosses
its occupied region, or keep that label anchored outside the entire swept path.

## Selective spatial views and targeted rotation

Prefer a genuine 3D model for spatial setup, introductions and relevant closing
context when it clarifies the subject. A camera tilt alone does not make a flat
diagram a useful 3D model. Use 2D for the explanatory step when relationships read
better flat. There is no quota requiring most scenes to be 3D or every ending to
return to 3D. Preserve the existing visualDescription prefix and view contract:
describe a scene containing useful spatial setup as 3D, and state any later
flattening explicitly; use 2D (because ...) for wholly planar explanations.

Rotation targets visual models only. Do not put text, formulas, or the entire
annotated canvas inside a rotating group. Prefer a geometry-only s.group and
rotateTo for authored object turns, with upright labels attached separately.
For viewer orbit, put the model in its own s.view and keep explanatory text in
the main non-orbiting scene. Use orbit:true, orbitHitTest:"geometry" on that view
so only pickable model surfaces start orbit (spheres, circles, rectangles, meshes).
Standalone text and empty space do not start rotation. Labels belonging to model parts may use billboard
text with stable anchors, but text is never a rotation handle. Set whole-scene
orbit:false explicitly (mode:'3d' otherwise defaults to whole-scene orbit).
Use targeted views for all viewer rotation. Only offer manipulation
that supports the lesson and the requested interaction mode.

When transitioning 3D to 2D, retain the selected meaningful parts, show how they
open, unfold or project into the flat representation, and keep their color/identity.
An introductory image or contextual object can simply fade away when its purpose
ends. Vary transitions according to the next inference: a context fade, a local
transform, a deliberate cut, or a coherent repositioning. Do not force unrelated
objects to morph into one another or preserve every piece of introductory context.

## Motion and physical meaning

Move only to reveal a relationship, execute the represented operation, or direct
attention. Prefer one major explanatory operation followed by a real still hold.
No idle orbit, perpetual pulsing, decorative drift, or compulsory animation of
every appearance. Measured audio cues determine available timing; smooth moves
need no universal minimum duration. A motivated cut is allowed.

Keep connected parts connected and rigid lengths constant during motion. Derive
dependent geometry, labels and values from the same underlying quantities.
Teaching holds do not imply stopped physical time; label a frozen inspection if
needed to prevent that misconception. Check the subject independently: for RNA,
derive complementarity and antiparallel directions from the actual base sequence,
not merely from preserved authored IDs.

## Evidence and repair

validate_output checks sampled settled text intersections using animlib's glyph
geometry. Fix reported pairs in source; do not hide labels, change IDs to evade
checks, or alter narration/duration. That check does not certify shape collisions,
label ownership, clipping, controls, moving text or formula self-crossfades.
Inspect native frame images at setup, closest approaches, transformation interiors,
scene boundaries and final holds, with actual player controls visible. Keep style,
readability, scientific reasoning and technical validity as separate judgments.
Use evaluated previousFrame as the actual handoff; planned prose is not state.
