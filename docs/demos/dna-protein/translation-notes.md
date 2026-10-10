# Translation chapter verification

`translation.js` is exactly 59 seconds, global 102–161, `end: 'hold'`, with no audio. Original captions remain owned by the existing manifest; the scene only adds temporary local “Amino acid” / “tRNA” leaders and the final “Protein” label.

Authorship used the written shot specification, active backend scene-craft/spatial/quality prompts, actual animlib reference, and the approved native `proof-v4.js`. No source video, reference screenshot, or `data/reference-dna-protein` material was accessed. Reference correspondence decisions came through written coordinator/reviewer findings.

The ribosome uses two unequal continuous lobed subunits and seven intersecting organic domains with outward normals, GOLD_D finish, and the v4 material vocabulary. The tRNA is explicitly a schematic cloverleaf built from shaded slate-blue tubes, complementary paired stem rods, a retained capped acceptor stem, and three exposed anticodon rods. It is not an atomistic L-shaped tRNA model. RNA and anticodon colors derive from the same sequence/complement arrays. Anticodon ends meet the corresponding RNA uprights at y = −1.5; one codon is exactly 3 × 0.76 units.

The initial P carrier holds a six-residue peptide. The A carrier docks before the old chain transfers to its amino acid at local 21–24.8 seconds. Two further dock→transfer→translocate operations complete at local 34 and 39. Each incoming amino acid uses its eventual peptide residue handle; the chain is not replaced during elongation. Empty carrier tips remain intact on departure. Elongation is a compressed schematic, not molecular kinetics.

The nine-residue connected hierarchy releases at local 45–47 and folds through joint rotations. Segment lengths remain 0.52 throughout release/folding. The final gold protein is a coarse continuous envelope plus two intersecting domains blended around the already compacted chain at 51.9–53; the same skeleton is retained beneath the envelope at zero opacity. This is an explicit display representation change rather than a claim that nine residue spheres define an atomically accurate protein surface. No unrelated protein is teleported into the shot.

The exported `exported-mRNA` hierarchy is explicitly removed at the receiving boundary to avoid duplicate persistent RNA. The initial replacement reproduces the export endpoint's first ten RNA bases, backbone, camera, nine ribosome domains, and blue-violet/cyan field. Additional coding RNA is revealed during the camera's move to the isolated carrier, outside the active framing. Export and translation share the same documented domain recipe and background strip formula.

First native verification is retained in `translation-first-frames/`, including `source.js`. The first inspection found a shallow small subunit, insufficient ribosome domains, hidden anticodons, clipped peptide, open empty acceptor tips, coarse bead-only ending, and a translucent-plane diagonal artifact. Repairs added volume and paired stems, exposed all three anticodons without moving their docking endpoints, widened framing, capped tips, supplied the golden final envelope, and replaced overlapping background layers with nonoverlapping palette-blend strips. The first baseline was preserved before these repairs.

Final native evidence is `translation-frames/`: 14 local times at 1280×720 and 960×720 (0, 7, 16, 20.5, 24.7, 30.5, 33.8, 38.8, 42, 46, 48.5, 51, 53.5, 59). Author inspected the native sheets and key individual close-ups at both aspects. Final endpoint has one gold compact protein with no residual translucent bead outside the envelope. Default-budget compilation passed three consecutive runs before final narrow revisions, and the final verifier and native renderer also compiled successfully.

`translation-verification.json` records exact duration, silent state, hold ending, no sampled text intersections at either aspect, and maximum fixed peptide-link error 1.89e−15 across quarter-second samples from local 39 through 59. These are mechanism/technical checks, not a claim of pixel equivalence. The native renderer has no depth of field, cast shadows, image textures, or volumetric light. Domains and the final envelope are conceptual approximations, with low tessellation chosen to stay inside the real compiler budget.

Regenerate from repository root:

```powershell
node docs/demos/dna-protein/translation-verify.mjs
node shared/animlib/tools/render-frames.mjs docs/demos/dna-protein/translation-render-input.json
```
