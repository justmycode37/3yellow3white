# Spatial scene authoring — library integration and prompt update

## Scope

Branch: `amilibsam`. Integrated the `shared/animlib` changes from upstream commits
`90fb51e` (retained controls), `4aa7113` (curved/organic paths), and `7fb55ab`
(shaded meshes, sampled surfaces, solids and tubes). Kept this branch's targeted
geometry orbit, production native frame renderer and verification-first pipeline.
Unrelated upstream backend/UI changes are not part of this integration.

## What generation now receives

The active planning and scene-author Markdown files describe actual installed
constructors and their coordinate conventions, rather than restricting spatial
subjects to coarse sphere/line diagrams. Scene craft, quality, verification and
repair policies agree on preserving required geometric detail while limiting
annotation clutter. The condensed authoring reference also includes the new API
sections; its strict heading coverage test remains enabled.

| Subject family | General construction guidance |
| --- | --- |
| Molecular detail | Coordinate/topology data, consistent units, element identity, connectivity and explicit fidelity level; bounded close-up instead of labeling every atom. |
| Machines and articulated subjects | Solids/custom meshes, rigid groups, joint pivots, shared kinematic driver, cutaways, coherent contact and consequence. |
| Optimization and spatial fields | Function/parametric surfaces, explicit axes and slice/projection, shared objective/gradient/update rule, path height recomputed between iterates. |
| Voxel subjects | Grouped boxes or consolidated meshes, right angles, grid alignment, recognizable proportions, separately articulated limbs. |

These are reusable modeling patterns, not hard-coded DNA, engine, optimizer or
character recipes. Near-atomic fidelity requires suitable coordinate and bond
data in the authoring context; prompts forbid presenting a coarse helix or
invented structure as atom-accurate. High-dimensional objectives require an
honest two-parameter slice/projection. No unsupported physics, model import,
boolean-solid or per-frame callback API is promised.

Black background, serif/vector annotations, stable concept colors, purposeful
motion and geometry-only orbit remain the visual contract. Constructor controls,
mesh budgets, deformation constraints and retained-control limitations are stated
explicitly. No extra model stage or repair-before-verification pass was added.

## Verification

- Library unit tests: 426 passed.
- Backend tests: 196 passed, including prompt hashes and authoring reference coverage.
- Library/backend type checks: passed.
- Library build and isolated frontend app build: passed. Existing unrelated
  `frontend/site` work was preserved; app proof is in `data/spatial-site`.
- Production native frame smoke: both 16:9 and 4:3 renders contain geometry/text.
- Independent prompt/API integration review: no actionable defects found.
- Native render inspection: upstream function graph, parametric flower and
  solids/tube examples render with expected shaded silhouettes. These are library
  examples, not claims that a generated lesson has demonstrated every subject.

GPU suite and fixed-prompt generation results are recorded below after completion.

## Fixed-prompt milestone

Fresh trial: `m9-spatial-prompts`, video ID
`dd15b63e-963e-41df-ae80-5fc61f49d3a1`, model `gpt-6-astra`, high reasoning.
Same RNA prompt, frozen lesson and narration as the earlier milestones; fresh
scene code, normal production validation/review, no manual generated-source edits.
This controls the scene-generation comparison; it does not test a newly generated
lesson plan or prove all four subject families from one RNA example.

Prompt SHA-256: `d9fc8548aa918d87a164f15d4d2ad73e833b14517343ddfd67df683f567e9310`.

> Explain RNA transcription to a first-year biology student. Show how RNA polymerase opens a short DNA region and builds complementary RNA from the template strand. Use one consistent example, a spatial introduction followed by a clear flat close-up, and preserve strand identity. Keep labels readable, motion purposeful, and the screen uncluttered.

### Recorded outcome

Completed in **323.721 seconds** (5m24s). Both scene candidates passed their first
visual verification; no targeted visual repair was needed. Scene 0's author had
one technical-validation retry for a settled label overlap before submission.
This is distinct from the post-verification repair stage. Generated source bytes
were copied unchanged into [the milestone archive](demos/rna-spatial-prompts/),
with hashes and automatic verdicts in its `provenance.json`.

Independent sampled-frame review: reasoning **ready**, readability **ready**,
reference style **ready**; see [the review](spatial-visual-review.md). Native frames
cover 12 moments per scene at both 1280×720 and 960×720. Root review also inspected
the 4:3 endpoint/growth sheet. Browser WebGPU playback advanced across both scenes
to `ended`, 50.532s, with no captured browser errors. This confirms playback and
scene completion, not a continuous frame-rate audit or independently heard audio
synchronization. No encoded movie was requested or produced for this milestone.

- [Fresh same-prompt demo](http://127.0.0.1:5207/quality.html?run=m9-spatial-prompts-dd15b63e-963e-41df-ae80-5fc61f49d3a1)
- [Updated test website](http://127.0.0.1:8085/)
- [Spatial library examples](http://127.0.0.1:5207/spatial.html)

The local backend was refreshed with the current library and prompts, serving
`data/spatial-site` through the optional `FRONTEND_DIR` setting. Its default remains
`frontend/site`; the override avoids overwriting unrelated generated-site work.

### Native GPU test limitation

The upstream GPU suite forced Vulkan, unavailable on this Windows host. Its
bootstrap now selects the native platform adapter, matching production frame
rendering. Strict pixel-equality assertions were preserved. The final run passes
**45/46** tests; the reactive/rebuilt sphere comparison fails byte equality.
An earlier run also hit the identical-arrow morph comparison (44/46).

Independent investigation compared exactly equal CPU frames/draw items and
repeated identical native renders using both the prior HEAD renderer and this
integration. The prior renderer reproduces the differences: at the sphere end
pose, 240 repeats showed a maximum 6/255 channel difference across at most three
pixels; current integration showed the same maximum across four pixels. This is
pre-existing platform raster nondeterminism, not demonstrated geometry drift.
No tolerance was added and no production renderer workaround was made. The GPU
suite is therefore **not fully green**, despite successful production frame renders
and browser playback.
