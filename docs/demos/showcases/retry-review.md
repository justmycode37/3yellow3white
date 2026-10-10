# Independent serial retry review

Batch: `20261010-retry1`. This report is separate from the frozen `20261010-batch1` baseline. It distinguishes production approval from independent reasoning, readability, reference-style and technical judgments. No generated scene source or production prompt was manually edited for this review.

Comparison boundary: topic prompts and batch-start instruction hashes match the baseline, but effective instructions changed during the serial retry because production reads Markdown per scene/gate. This retry also uses runtime revision `bfefe25`, versus baseline manifest revision `c4ee774`. It is not a controlled isolation of concurrency, runtime or instruction changes. Baseline failures remain failures in their original record.

Saved combined-prompt evidence in [effective-prompt-audit.json](effective-prompt-audit.json), inspected for this report, distinguishes these stages:

| Retry topic | Effective author/repair instructions versus baseline | Effective review instructions versus baseline |
| --- | --- | --- |
| Planetary | Original in all saved author/repair stages | Original in both saved reviews |
| Interference | Original author instructions | Changed `scene-verify.md` |
| Kepler and lipid | Changed `scenegen/visualization.md` and `animation-quality.md` | Those changes plus changed `scene-verify.md` |
| Rosenbrock | Changed `scene-craft.md`, `scenegen/visualization.md` and `animation-quality.md` in saved author prompt | No completed review |
| Terrain | Changed `scene-craft.md`, `scenegen/visualization.md` and `animation-quality.md` in saved author/repair prompts | Those changes plus changed `scene-verify.md` in both reviews |

Thus recovered planetary retains the original instruction versions, while recovered lipid does not. Batch-start hashes alone must not be described as proof of identical effective instructions throughout the run. The audit reports original instructions across all saved baseline stages.

Reference standard: the personal 3blue1brown skill's approved component and derivative images, rejected chart-template image, and project showcase style contract already inspected during baseline review. The user's scope is silent capability showcases, not complete explanatory lessons.

## Planetary gear train

Run: `97a48862-d205-4d69-8924-5b5172670a93`, attempt 1, SHA-256 `0d98e0ffc8f6c02e624e9b2b1af486980da1a39267c9b5bc403125ede2db9b73`.

Evidence: final native 1280x720 contact sheets at 0, 0.5, 3.333, 5, 6.667, 8.333, 10, 11.667, 13.333, 15, 17.6 and 20 seconds; full-size 6.667-second 1280x720 frame and final 960x720 frame; source and both production reviews. Additional independent computation reconstructs the source tooth-profile polygons and tests their boundary vertices at 121 angular states for all three planets, without modifying the scene.

| Gate | Independent verdict | Evidence |
| --- | --- | --- |
| Reasoning | ready as an idealized kinematic mechanism | Counts 24/18/60 satisfy 60=24+2×18. Common module 0.1 gives pitch radii 1.2/0.9/3.0; each planet center stays at radius 2.1, so the external and internal pitch-circle relationships agree. The three planets retain 120-degree spacing, with (24+60)/3=28. Source rotations satisfy 24(ws−wc)+60(0−wc)=0, giving wc=(2/7)ws as displayed, and the relative planet rotation −(60/18)wc. Initial tooth phases put teeth opposite spaces at both interfaces; their phase relationships remain invariant under those rotations. |
| Visual readability | ready with minor lighting weakness | The open carrier exposes both sun–planet and planet–ring interfaces throughout sampled motion. Gold sun, silver gears and blue carrier maintain clear identities; the final ratio, fixed-ring label and tooth counts fit in both inspected aspects. Strong lower-edge highlights wash out some small metal detail, but do not hide the mechanism or principal contacts. |
| Reference style | ready for this mechanical showcase | A stable oblique view exposes one persistent constrained mechanism. Relative rotation and the fixed housing provide the visual explanation; the final ratio describes the observed relationship. Motion is restricted to the working parts, with a final inspection hold. |
| Technical delivery | ready for sampled native frames | Production approved attempt 1. Both inspected aspects render and the source totals 20 seconds with the silent fixture. Continuous playback, interactive orbit, frame-rate behavior and measured silence remain unverified. |

Contact-geometry check: the source generates sampled involute working flanks at a common 20-degree pressure parameter, with a small clearance term and bevelled extrusions. Across the 121 independently sampled angular states, no tested sun/planet boundary vertex penetrated the other gear polygon, and no planet boundary vertex entered the ring's solid region. This test covers unbevelled XY profile vertices, not every edge intersection or swept volume. It does not certify continuous contact, backlash, root fillets, manufacturing tolerances, undercut, stress, lubrication or load transfer. The visible idealization note is appropriate; the result is not a measured or manufacturing-ready gear assembly.

Production repair moved and enlarged the idealization note, originally reported inside the bottom playback-control region. Initial images were not independently inspected; that original finding is production-reported. The final note is independently legible above the mechanism.

## Two-source interference

Run: `d22137a1-4d82-4e58-8ee7-9fec28a03637`, attempt 0, SHA-256 `6897386437c52085ea699b77e06ea744a6ee7376a5b4627b9e32b4f115b85721`.

Evidence: native 1280x720 contact sheets at 0, 0.5, 2.75, 4, 5.25, 6.5, 7.75, 10.25, 12.5, 15, 17.5 and 20 seconds; full-size 7.75-second 1280x720 frame and final 960x720 frame; source and production review. Samples at 2.75, 5.25, 7.75 and 10.25 seconds are inside the 0.5-second opacity actions, not only phase endpoints. The numerical sign-crossing check below is source-derived; no new native image was rendered at its exact time.

| Gate | Independent verdict | Evidence |
| --- | --- | --- |
| Reasoning | revise: the shared analytic model is correct, but intermediate sign rendering remains inconsistent | Source uses the correct factorization of the displayed equal-amplitude sum, common time/frequency, and fixed-node hyperbolae at absolute path differences 0.8 and 2.4. However, it quantizes spatial phase into 16 bins and amplitude into 4 bins, then separately interpolates clipped positive/negative color-layer opacities. During zero crossings both signs are visible simultaneously instead of reaching black at the scalar zero. |
| Visual readability | revise for the requested high-quality field | Fixed sources and yellow node curves are clear, with no baseline ghost crest rings. The 80×44 spatial grid produces roughly 10-pixel cells at the inspected scale, visibly stair-stepping the wavefronts. Action-interior images retain coarse blocks and mixed sign-transition coloring. The cancellation structure is recognizable, but the field is not a clean continuous visualization. |
| Reference style | improved, revision still required | The same source pair and stationary nodes persist through three wave periods; unnecessary crest-ring overlays are gone. Stable colors and minimal labels support the mechanism. The remaining colored-layer interpolation and coarse quantization weaken the continuous causal field operation requested by the style contract. |
| Technical delivery | production approved; independent reasoning/readability revision remains | Production approved attempt 0. Both inspected aspects render and the source totals 20 seconds with the silent fixture, including an 18–20-second hold. Continuous playback and measured silence remain unverified. |

Reproducible intermediate-phase counterexample: for the phase bin pi/8, omega=pi/3, the scalar cosine is zero at t=1.875 seconds. The source interpolates from t=1.5 to t=2.0; at that zero time its positive group opacity is approximately 0.09567 and negative group opacity approximately 0.09789, before the common child amplitude factor. Thus the two mapped colors coexist although this bin's signed scalar should vanish. Merely sharing a clock does not resolve this sign-mapping error.

This is narrower than the baseline defect: the retry no longer crossfades complete eight-phase snapshots or stationary crest-ring pictures. Its stationary cells are assigned shared phase groups. Nevertheless, the correction is incomplete because sign splitting precedes interpolation. A subsequent generated run should evaluate/interpolate the signed scalar before mapping its sign to color, use sufficient spatial/phase resolution, and verify action interiors around zero crossings. These are findings only; this reviewer did not edit the generated scene or production pipeline.

## Kepler equal-area sectors — rejected retry

Run: `4708d975-7520-4e17-b7ef-e0188d105a93`, attempt 1, SHA-256 `3320bc06846eb86ae9111b544262cfef452a91cf45d6aa0e632bb3593bb3704f`. **Unapproved: final production visual review rejected the candidate after one targeted repair; no scene was published.**

Evidence: final native 1280x720 contact sheets at 0, 0.5, 2.925, 4.15, 5.375, 7.825, 10.25, 12.675, 13.9, 15.125, 17.4 and 20 seconds; full-size 12.675-second 1280x720 frame and final 960x720 frame; source and both production reviews. Independent recomputation runs only the pure orbit/sector construction without modifying the scene.

| Gate | Independent verdict | Evidence |
| --- | --- | --- |
| Reasoning | ready within the idealized sampled solution | Semimajor axis 4 and eccentricity 0.65 give focus x=2.6 and semiminor axis about 3.039737. The fixed gold body is at that focus. Newton iteration solves E−e sin(E)=M; recomputed residual over all 321 orbit samples is below 9e−16. Mean anomaly increases uniformly, giving nonuniform orbital speed. Each highlighted mean-anomaly interval spans pi/4, corresponding to 2 seconds of the 16-second period, or T/8. |
| Visual readability | revise; independent agreement with final rejection | The displaced focus label sits immediately above the upper endpoint of the periapsis sector, far from the gold body, with no leader. In the final 960x720 frame it appears to identify that orbital endpoint as the focus. Avoiding geometric overlap did not preserve a clear label-to-object relationship. The apse labels are also displaced from their tiny markers, though the focus ambiguity is the principal blocking finding. |
| Reference style | construction ready; annotation revision required | One retained ellipse, body, orbiting planet and radius support an actual equal-time area construction. Persistent colored sectors make the comparison visible. The final hold retains both areas and time values. The misleading focus annotation undermines the local-reference clarity required by the approved style. |
| Technical delivery | rejected, not ready for publication | Native frames render in both inspected aspects, but the final visual gate rejected this candidate. It must not be counted as an approved retry. Full playback, frame-rate behavior and measured silence remain unverified. |

Area approximation check: each exact analytic sector has area about 4.774807 in squared model units. The 64-triangle fan gives about 4.773228 near periapsis and 4.774780 near apoapsis, a difference about 0.0325% of the exact sector area. The displayed equality describes the analytic Kepler property, with a small tessellation discrepancy; it is not evidence of constant speed around an ellipse. The 50 ms position chords also approximate the solved orbit between samples.

Production's first rejection reported orbit/sector lines crossing all three position labels. Its repair changed offsets and removed those crossings, but the second rejection identified loss of focus-label correspondence. Final frames independently confirm the latter. Initial images were not independently inspected. A subsequent generated candidate needs a quiet leader or unambiguous local placement preserving the same focus and orbit; this reviewer made no source edits.

## Lipid bilayer and ion channel

Run: `da68f2be-7c88-4fd4-8618-af6fa124060f`, attempt 1, SHA-256 `a5554243f2ba7c162ccb5b09fea9ae23e1771ffa6f0d373223daaa861c9d871e`.

Evidence: final native 1280x720 contact sheets at 0, 0.5, 2.85, 5, 7.3, 10, 11.4, 12.65, 15, 17.1, 18.333 and 20 seconds; full-size 5-second 1280x720 frame and final 960x720 frame; source, both production reviews and the saved manifest prompt. The saved prompt requests a molecular-scale schematic with outward heads, paired inward tails and ions moving through a membrane-spanning pore; it does not request atomistic coordinates or a particular channel protein.

| Gate | Independent verdict | Evidence |
| --- | --- | --- |
| Reasoning | ready as the requested schematic | Two head planes lie at y=±1.36; each lipid has two tails directed inward toward y=±0.13. The protein wall spans y=±1.76 and encloses an open central lumen. All transmembrane ion travel stays on its axis x=z=0. Minimum lumen radius is 0.49, larger than the ion radius 0.18; docking and lateral spreading occur outside the channel ends, so the source does not route ions through lipid tails or the wall. |
| Visual readability | ready after label repair | Heads, paired tails, gold cutaway protein, central ion and its charge are distinguishable. Leaders identify local geometry, and the hydrophobic-tail label now clears the membrane silhouette in both inspected aspects. The rear lumen wall projects behind the traveling ion, but the cutaway walls and open ends preserve the channel interpretation. Dense tails are appropriate to the membrane construction and do not obscure the central operation. |
| Reference style | ready for the schematic showcase | A persistent spatial cutaway supplies context while three retained ions sequentially dock, pass through the same pore and emerge below. The stable view, local leaders, restrained colors and final hold make the operation readable without explanatory slides or decorative movement. |
| Technical delivery | ready for sampled native frames | Production approved attempt 1. Both inspected aspects render and source totals 20 seconds with the silent fixture. Continuous playback, interactive orbit and measured silence remain unverified. |

Scientific boundary: the visible note explicitly identifies a schematic cutaway that is not to scale. The fluted protein wall and lipid tails are authored geometry, not deposited atom coordinates; no named channel conformation, hydration shell, ion selectivity, gating, electrochemical driving force, transport rate or molecular dynamics is established. Sequential one-way passage illustrates the route rather than simulating its biological mechanism.

Production repair moved the tail label and adjusted its leader. Initial images were not independently inspected; their reported overlap remains production-reported. Final native images independently confirm the repaired placement.

Provenance note: this lipid run's saved combined author/repair prompts contain changed visualization and animation-quality instructions; its review prompts also contain the changed verifier. The manifest's batch-start hashes do not describe all those effective instructions. The unchanged topic prompt defines the requested output, but lipid's recovery cannot be attributed solely to serial execution. See the stage-level audit above.

## Rosenbrock descent — partial native evidence, failed delivery

Run: `7f613d33-0939-4c0f-9728-65c9e6df070e`, attempt 0, candidate SHA-256 `a3fac2fd87bf8a8af6b29f9fdeaa103f878ab82de7dfc32d1002b1bae266b862`.

The native renderer reports a requested buffer of **341,821,872 bytes exceeding the device's configured 268,435,456-byte maximum**. The diagnostic also reports that the adapter advertises a larger limit; this does not establish that raising the limit is a complete or portable fix. Later invalid-buffer/command messages follow the failed allocation. Unlike the baseline's generic interrupted render, this retry has a specific allocation-limit diagnostic. No completed production review or approved scene exists.

Evidence saved before failure: seven 1280x720 PNGs, indices 0–6, corresponding to requested times 0, 0.5, 2.933, 5.372, 7.810, 9.029 and 10.247 seconds in `render-input.json`, plus the first six-frame contact sheet. Inspected that sheet and full-size frame 6. No later/final frames or 960x720 images exist at review time. This is partial evidence, not a successful render set.

| Gate | Independent verdict | Evidence |
| --- | --- | --- |
| Reasoning | source calculation consistent; final visual realization unverified | The gradient differentiates the displayed scaled Rosenbrock function correctly. Recomputed 480 Armijo iterations lower F from 0.29 to about 0.000893961 with no increasing step; the last point is about (0.701016,0.491203), not the minimum (1,1). The trajectory stays inside the source surface patch and re-evaluates height along each line-search segment. This establishes the authored numerical sequence, not its final rendering. |
| Visual readability | revise on available partial frames | The chosen view shows the convex-looking exterior/underside of the bent surface, hiding most of the descent path and current marker. At the last available frame, readouts reach k=202 while the central action remains nearly invisible; the minimum label is partly occluded by the surface. A correct iteration counter cannot replace a visible trajectory. |
| Reference style | revise on available partial frames | A persistent mathematical surface exists, but its camera/occlusion prevents the claimed operation from being followed. Large formulas and readouts dominate while the actual descent is concealed, contrary to the requested geometric explanation. |
| Technical delivery | failed | Native buffer allocation aborts the requested evidence set. There is no final hold, alternate-aspect, production approval or playback proof. |

No claim is made that the scene reaches the minimum or that later unavailable frames solve the occlusion. The 480 per-iteration paths and point objects are visible in source, but this review has not traced the failed buffer to a particular primitive or established the root cause of its allocation size. No source, renderer limits or instruction files were changed for this review.

## Textured river valley — rejected retry

Run: `5a31c062-d7d1-4126-bcf7-de733f399d3c`, final attempt 1, SHA-256 `4a0ab5b33ddcaf00b4748e42a226e3081cd758c762d344aba535537932c5d696`. **Unapproved: final production review rejected the candidate after one targeted repair; no scene was published.**

Evidence: both initial and final native 1280x720 contact sheets at 0, 0.5, 3, 5.375, 7.833, 10.25, 11.458, 12.667, 15.125, 16.667, 18.333 and 20 seconds; full-size final 960x720 frame; both sources and production reviews; saved topic prompt. Independent computation samples the final terrain's pure height function and its material thresholds.

| Gate | Independent verdict | Evidence |
| --- | --- | --- |
| Reasoning | source construction coherent; claimed visual result not realized | The centerline is derived from the same procedural valley function. At its center, height equals 0.9−0.255z, falling from 2.226 to −0.426 as z runs −5.2 to 5.2. Authored water/front offsets preserve that downhill slope and the short path segments follow the winding centerline. Elevation skins clip actual base triangles at 1.05 and 2.65; the sampled source mesh has 1,238 vertices below the lowland threshold and 1,562 above the rock threshold, so missing gray terrain is not explained by an empty high-ground region. This is prescribed procedural flow, not hydrodynamics. |
| Visual readability | revise; independent agreement with final rejection | The revised elevated view reveals the valley form, but the blue river is faintly visible only during the 0.5-second terrain fade and disappears once the terrain is opaque. Operation-interior samples show no readable advancing front or accumulated trace, and the final hold has no visible connected river. Ridges remain green, so the gray rock legend still lacks a corresponding region. |
| Reference style | revise | The persistent terrain is recognizable, but the requested downhill operation is effectively absent. A static landscape and legend cannot substitute for the visible flow relationship. The procedural qualification is now placed clear of the bottom controls, but that does not repair the missing operation or material distinction. |
| Technical delivery | rejected, not ready for publication | Both requested native aspects render, but production rejected the final candidate for two unresolved findings. No approval or full-playback proof is established. |

The automatic repair changed camera orientation, enlarged the front/trace, increased skin offsets, changed grouping isolation and moved the disclaimer. Initial and final images were both independently inspected: the disclaimer placement and view improve, while river/trace and rock-region visibility remain unresolved. The source contains those objects, so their existence alone does not count as successful delivery. This review has not isolated whether the rendering failure arises from depth/compositing, face visibility, camera convention or another runtime behavior. No manual scene or runtime changes were made.

## Final serial retry coverage

The six selected retry topics finished: **3 production-approved and 3 failed**. Planetary and lipid pass independent sampled review with stated qualifications. Interference is production-approved but independently needs signed-field/readability revision. Kepler and terrain remain rejected; Rosenbrock failed native delivery with seven partial frames and also shows a visibility problem.

The other 18 catalogue entries remain unused `pending` placeholders in this retry manifest; they were not rerun. Across baseline and this retry, production has approved a candidate for 21 of the 24 distinct topics. Independent sampled review still flags Fourier, Dijkstra and interference among those approvals. Eighteen distinct topics therefore have an independently ready candidate within the documented scope; this is not a claim that all playback or scientific validation has passed.

Instruction/runtime changes documented above prevent attributing the three recovered production approvals solely to serial execution. Baseline evidence and verdicts remain unchanged. The main agent reports that planetary reached its 20-second end in frozen-gallery playback; this reviewer did not observe that playback and makes no independent playback claim.

## Coverage boundary

All six selected retry topics have an independent verdict, with Rosenbrock explicitly limited to partial native evidence. Native frame samples and source checks do not replace full playback or scientific/engineering validation outside the checks stated above.
