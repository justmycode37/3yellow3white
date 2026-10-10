# Texture update: engine and voxel world

The existing proofs were modified in place. No object, vertex, triangle, pivot,
camera, timeline track, animation timing, or base fill color changed. Surface
appearance uses the updated library's procedural `texture` and `material`
geometry fields. No imported game texture or external renderer is used.

## Engine

The blue housing and teal crank/flywheel retain their color roles, with shallow
cast-metal grain. Silver parts and the gold rod use same-color directional relief
and restrained metallic highlights. The spark-plug ceramic has a smooth finish.
These are stylized material cues, not measured machining or physically calibrated
surface roughness. Pattern coordinates follow each original local assembly.

## Minecraft-inspired proof

Existing grass and leaves gain low-contrast coarse pixel checkers; the soil gains
mottling. Original bark pixels and end-grain geometry remain, augmented by wood
patterns. Clothing has shallow same-color fabric relief, and the axe blade has a
metal finish. The tree, Steve, contacts, cracks, chips and inventory drop retain
their original geometry and motion. Procedural patterns are original, not game
assets; the simple checker is a stylized pixel surface rather than a leaf atlas.

## Evidence

`data/spatial-proofs/textures/check-models.ts` compiles the archived pre-texture
sources and current sources through production `dist/core.js`. After excluding
only `texture` and `material` fields, complete compiled scenes are deeply equal.
The same equality holds for 321 evaluated times per scene, including endpoints.

| Proof | Elements | Vertices | Triangles | Textured elements | Material elements |
| --- | ---: | ---: | ---: | ---: | ---: |
| Engine | 82 | 11,274 | 16,156 | 76 | 77 |
| Minecraft | 91 | 3,992 | 5,844 | 33 | 70 |

Results: `data/spatial-proofs/textures/models-validation.json`.
Both proofs retain their 16-second duration (engine float result
16.000000000000135 seconds).

The real native WebGPU renderer produced eight engine times and ten Minecraft
times, each at 1280×720 and 960×720, under
`data/spatial-proofs/textures/{engine,minecraft}-frames`. First-pass images were
inspected before repair: initial generic bump strengths overemphasized relief,
making the engine look dented and pixel edges too embossed. Those images remain
under `textures/first-pass`. Only finish parameters were then reduced and the
same samples rendered again. Final representative full frames and 4:3 contact
sheets show the original silhouettes, readable mechanism/impact, quieter grain,
and stable color roles. This is sampled-frame verification, not a full-motion
temporal-aliasing claim. Original baseline images remain untouched.

Reproduce:

```powershell
node_modules/.bin/bun data/spatial-proofs/textures/check-models.ts
node shared/animlib/tools/render-frames.mjs data/spatial-proofs/textures/engine-input.json
node shared/animlib/tools/render-frames.mjs data/spatial-proofs/textures/minecraft-input.json
```
