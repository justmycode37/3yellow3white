# Smooth molecular integration — independent review

Reviewed 2026-10-11. **Ready for final browser and media verification.** This approves the repaired deposited-coordinate envelopes and their integration into the existing native animation. It does not claim atomic accuracy, a simulated folding trajectory, or pixel identity with the original reference film.

## Separate verdicts

| Gate | Verdict | Evidence and limit |
| --- | --- | --- |
| Visual smoothing and preserved style | **Ready** | Direct before/after native-frame inspection at 1280×720 and selected 960×720 frames. Repaired opaque surfaces have continuous shading and organic connected silhouettes. Gold material, slate molecular scaffold, purple atmosphere, cyan ending, camera composition, and label styling remain consistent. Finite polygonal contours remain visible. |
| Biological mechanism | **Ready as a schematic** | Foreground RNA, tRNA, anticodon rods, and peptide contacts remain visible and spatially consistent. The deposited ribosomal envelope represents the large subunit only; the lower small subunit remains schematic. The final crambin envelope is an illustrative structural example, not the specific product of the nine displayed beads. |
| Readability and motion handoff | **Ready for native proof** | Labels remain readable in the inspected frames; the moved protein envelope clears the final label in both aspects. The replaced large-subunit geometry has a continuous 102-second chapter handoff. The originally defective transparent reveal has been repaired and rerendered. Full-motion encoded inspection remains a delivery check. |
| Technical validity | **Native/assets ready; final media pending** | Reviewer independently ran the seven focused envelope tests and inspected actual asset topology. Sources match their native render inputs. Main reports three deterministic full-sequence runs under default limits. The new complete browser run and encoded output were still underway at this review cutoff. Prior-film delivery evidence is not evidence for this revision. |

## Evidence reviewed

- Preserved baseline: `before-smooth/frame-102.png`, `frame-109.png`, `frame-122.5.png`, `frame-161.png`, and the `smooth-before-*-frames` boundary renders.
- Revised native export: `smooth-export-frames`, local times 17, 21, and 26 seconds (global 93, 97, and 102).
- Revised native translation: `smooth-translation-frames`, local times 0, 7, 20.5, 51.9, 52, 52.5, 52.75, 53, and 59 seconds. Intermediate reveal frames were inspected again after the correction, including the supplementary 52.75-second frame showing a clean partially faded envelope.
- `smooth-integration-verification.json`, the verification script, current manifest captions, asset provenance, generator, preparation CLI, and focused tests.

The first rejected blocky meshes and first integrated renders are historical evidence only. This approval applies to the repaired assets and the final reveal correction.

## Observed before/after differences

The prior large subunit was assembled from a small number of separate gold lobes. The replacement reads as one connected irregular mass with broad creases and rounded valleys. Its outline is narrower and less symmetric, exposing more purple background around the left/top of the translation construction. That is an intentional structural replacement, not a camera change. RNA bases and both docked tRNAs remain in front of it and readable. The small subunit retains its earlier faceted lobe language, so the assembled ribosome deliberately mixes a deposited-coordinate large envelope with a schematic lower body.

The old final protein was a three-domain gold construction. The new endpoint is a single asymmetric crambin-derived envelope, positioned slightly left for label clearance. Its shading is substantially more continuous than the old domain assembly and the rejected first smoothing attempt. At delivery size, polygonal corners remain around parts of the silhouette and some broad ridges still look coarse. These are minor remaining resolution limits for this revision, not evidence of an atomically detailed surface.

The first repaired integration still produced conspicuous translucent triangle patches and doubled bead/envelope silhouettes at local 52–52.5 seconds. This was a substantive reveal defect despite acceptable opaque endpoints. The author changed only the representation reveal: the folded schematic fades out in an isolated display group, followed by the envelope fading in, within the original 1.1-second interval. Direct reinspection at 52, 52.5, and 53 seconds shows clean silhouettes without the intersecting transparent patchwork. There is a brief low-visibility interval between representations; it reads as a representation change, not a continuous physical deformation.

## Mechanism, continuity, and scientific limits

The inspected docking views preserve exposed anticodon rods, mRNA bases, tRNA outlines, and the emerging peptide. The authored verification samples report zero change to mechanism positions, unchanged camera tracks, peptide link error below 2×10⁻¹⁵, and large-envelope boundary error below 2×10⁻¹⁵. The script's comparisons were read; these numerical results are authored verification evidence, supplemented by independent pixel inspection.

The replacement upper envelope is visually continuous at global 102 seconds. The entire boundary frame is not pixel-identical: a reviewer pixel comparison measured mean absolute RGBA difference 0.227/255 at 1280×720, with changes concentrated below row 471 in the RNA/lower schematic body. Some edge differences are much larger than the mean. Do not convert the upper-envelope continuity check into a claim of whole-frame pixel equality.

The asset metadata identifies 1JJ2 as a large ribosomal subunit and 1CRN as crambin. The field uses all 6,567 selected CA/P sites for the former and all 327 selected heavy-atom sites for the latter. “No site subsampling” refers to these prepared selections, not to all original atoms in 1JJ2. Gaussian summation, an isovalue, coarse sampling, and Taubin smoothing produce schematic envelopes; they are neither solvent-accessible surfaces nor recovered experimental density. The displayed species, tRNA geometry, RNA, small subunit, contacts, and scale are a didactic composite.

The final manifest caption explicitly says the envelope uses crambin as a structural example and that folding and translation remain schematic. Retain that disclosure. The nine beads must not be described as a nine-residue crambin sequence or a physically calculated folding path.

## Independent asset and source checks

`npm test -- molecular-envelope.test.ts` passed **7/7** in this review. Tests include the actual prepared assets, exact regeneration from their selected sites, and both envelopes compiling together under unchanged production limits. The library author's broader 479-test/build/typecheck report is additional reported evidence, not a suite rerun by this reviewer.

Independent parsing of the delivered JSON meshes found:

| Asset | Vertices | Triangles | Components | Nonmanifold/orientation edge failures | Maximum normal-length error |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1CRN | 1,042 | 2,080 | 1 | 0 | 0.000732 |
| 1JJ2 | 1,472 | 2,940 | 1 | 0 | 0.000734 |

All coordinates and normals were finite; all triangle areas were positive; signed enclosed volumes were positive. These checks establish closed consistently oriented meshes for these two assets, not a general guarantee against self-intersections for every possible input. The generator bounds sites, resolution, work, smoothing cycles, coordinates, vertices, and triangles, and throws on exceeded work/output budgets rather than silently truncating geometry. It runs offline; the scene VM receives prepared native geometry.

Final reviewed SHA-256 values:

- `translation.js`: `066BCB0D2C7FD47989648365009C8139923B973DEE2F260A493881285ABAB068`
- `rna-export.js`: `5766A67EEF094B724C96BE28822C9C0C134C22C06C6577BBAE7E2BF8DBDE65B6`
- `1crn-envelope.json`: `4F76C0FDC12510736C592D72FCAAA17D2DEC5D3DBB0248307155F11CBC2120AA`
- `1jj2-envelope.json`: `1B8FB7154C2025EB12D510F1C31FB2EC2FAB2317C26DA3076E459B712AEABB20`

## Delivery follow-up

Main owns the final frozen browser playback, new MP4 export/decode, timing/audio/subtitle checks, and encoded frame inspection. Append those actual results here or link their final verification record. No source/library edits were made by the reviewer.

Coordinator follow-up: final frozen sources passed three deterministic sequence checks, uninterrupted browser playback reached the 161-second hold, and the native MP4 decoded all 3,864 frames at 1280×720/24 fps with no audio stream. All 19 embedded subtitle texts matched the manifest. Encoded frames at 122.5 and 160 seconds were visually inspected. Exact artifact hash, logs, screenshots and scientific limitations are recorded in [smooth-revision.md](smooth-revision.md). Final comparison page and player were left open.
