# Independent DNA decongestion review

## Final reviewed revision

Final source uses 75% displayed radii and camera yaw 4.289 → 5.37 at fixed pitch −0.12. Inspected both new native contact sheets for each aspect ratio, covering 0, 2, 4.5, 6, 8.5, 10.5 and 13.9 seconds at 1280x720 and 960x720.

| Gate | Final verdict | Evidence and limits |
| --- | --- | --- |
| Reasoning | ready | Labeled display radii and retained 100% option distinguish readability from molecular volume. The supplied coordinate audit confirms original atom centers, proper rotation and twelve complementary pairs. No cartoon geometry or bond lines were added. |
| Visual readability | ready | The starting groove-facing view reveals several base-pair spans across separated backbone edges. The bounded turn exposes the complementary stack and helical silhouette; the zoom and final hold preserve full framing in both aspects. These sampled views meaningfully reduce the prior visual congestion. |
| Reference style | ready | Geometry remains the entire visual subject. Same black stage, restrained element colors, quiet surface finish and purposeful single camera inspection. No decorative explanatory overlay was added. |
| Technical delivery | unverified by this reviewer | Native sampled images pass. Parent reports typecheck, demo build and all four control-combination audits passed; browser control/playback checks are separate and ongoing. Sampled images do not verify every playback frame. |

No unresolved blocking finding in the reviewed final source or image samples. Remaining limitation: an opaque 486-atom short crystal fragment naturally hides some far-side atoms and does not show two continuously disjoint cartoon rails. The revision makes grooves and base stacks more discernible without claiming idealized ladder clarity or altering the molecule.

## Initial radius-only review

Reviewed the proposed 75% atom-radius default after the user found the full-volume view congested and difficult to recognize as DNA. Compared actual `dna-long-frame.png` against new native 1280x720 frames at 0, 4.5 and 10.5 seconds and the six-frame sheet. Inspected the updated source and style contract; the approved component/derivative baseline remains the reference for spatial continuity and restrained presentation.

| Gate | Verdict | Finding |
| --- | --- | --- |
| Reasoning | ready for the display change | A uniform 0.75 radius multiplier changes glyph size, not deposited atom centers or relative element radii. The UI/notes explicitly distinguish this from full van der Waals volume and retain a 100% option. No bond geometry or invented molecular deformation appears. The separate coordinate/chemistry audit was pending at this review and is not certified here. |
| Visual readability | revise | Decongestion is meaningful but does not fully resolve the stated recognition problem. New black gaps expose more stacked blue/grey base atoms, particularly at 4.5 and 10.5 seconds. However, the near red/gold backbone dominates and the second backbone is repeatedly hidden by foreground atoms. A viewer can recognize a helical molecular cluster, but cannot reliably trace two distinct backbone paths from these views alone. |
| Reference style | ready | Same open black stage, stable element colors, single purposeful camera turn and final hold. No dashboard composition, extra slogans or decorative motion. Added radius control makes the representation choice explicit without altering scientific coordinates. |
| Technical delivery | unverified | Sampled native frames show no crop, unexpected bond lines or missing model. This reviewer did not inspect the new 100% control behavior, 4:3 output, full playback or build/test results. |

## Focused next revision

Before shrinking atoms further or changing scientific data, inspect a small set of camera azimuths and choose a groove-facing default where both phosphate/backbone traces separate most clearly. Recheck setup, the interior of the camera turn and final hold. If a camera change cannot make both chains readable under the atom-only constraint, an optional backbone-emphasis inspection mode could reduce base-atom prominence while retaining their actual centers and the same element color roles. This would need clear labeling and actual frame review; it is not a claim that the current result already provides that clarity.

The 75% version is an improvement, not evidence that the user's recognition concern is completely solved. Accurate deposited coordinates and an instantly recognizable teaching representation are separate acceptance conditions. This short, bent crystal fragment should not be distorted into an idealized long ladder to satisfy the latter.

## Camera trial follow-up

Inspected all eight trial azimuths in `data/spatial-proofs/dna-angles/1280x720-sheet-{0,1}.png`, plus full-size frames 4 and 5. All use 75% radii and pitch −0.12.

Frame 4 (yaw approximately 4.289) offers the clearest groove-facing view: the upper three grey/blue base-pair spans cross visibly between separated red/gold backbone edges. Frame 5 (yaw approximately 5.37) gives a complementary helical silhouette and lower-stack view, but its upper groove is less open. Either is more informative than the original angle. Use frame 4 as the paused gallery default when immediate recognition matters most; a bounded turn toward frame 5 exposes the complementary side. Alternatively, a frame-5-to-frame-4 turn ends on the strongest groove view. These are selected candidate endpoints, not a review of a newly rendered final interval.

Readability of the selected candidate frames is **ready** within the actual-atom constraint. Some far-side atoms remain occluded; continuously visible, disjoint cartoon rails are not a reasonable requirement for an opaque 486-atom crystal fragment. The useful improvement is visible base-pair spans and more separable groove edges, not an invented ideal helix. Retain the labeled radius reduction and full-volume comparison.

Read the supplied `dna-accuracy-audit.json`: it reports exact identity of all 486 PDB atom records, twelve antiparallel complementary pairs, a chirality-preserving rotation, unchanged centers within numerical precision and all four control combinations. This supports the geometry's provenance; the independent image review does not infer chemistry from appearance or substitute for that audit. Final animation interior, controls and browser behavior still require their separate check.

## Parent delivery verification

After the independent frame review, the integrated browser completed the 14-second timeline without a scene error. Selecting Full molecular volume (100%) visibly restored larger spheres; reloading the DNA proof restored the 75% default and groove-facing start. All four control combinations passed the mesh-coordinate audit. Typecheck and demo build passed (existing large-chunk warning only). This combines sampled native images and observed browser states; it does not claim exhaustive inspection of every rendered frame.
