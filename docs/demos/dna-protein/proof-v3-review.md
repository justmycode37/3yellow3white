# Independent review: transcription proof v3

## Decision

**The reusable native object vocabulary is now sound. The requested near-exact reference gate is still `revise`.** The earlier empty ring, short thick bases, poor label contrast, and exit-backbone seam have been resolved. V3 supports building the scene with native geometry. It does not yet support claiming that the active-site composition closely reconstructs the reference.

The remaining substantive differences are fixable camera/framing and enzyme-domain authoring choices, not unavailable depth of field, cast shadows, or photorealism. Complete one focused composition/shape revision before copying this active-site layout through the full sequence. Independent preparation of other sequence content can use the corrected primitives, but their scenes need their own reference comparisons.

## Evidence

Read `proof-v3.js` and `proof-v3-frames/frames.json`. Viewed the native six-frame 1280×720 contact sheet for 0, 1.7, 2.15, 3.85, 4.30, and 6.10 seconds; additionally viewed the native-size 1280×720 first docking endpoint (2.15) and final hold (8), and the 960×720 final hold. The manifest contains sixteen PNGs: eight times at each size, also including 6.45 seconds. I do not claim to have individually inspected every PNG.

Reopened the actual pixels of `data/reference-dna-protein/ref-065.png`, whose player reads **1:04**. Reference 0:48 and 0:53 exterior images were directly viewed in the earlier review and inform only exterior domain vocabulary. Browser UI and watermark are excluded. No reference pixels were passed to the author or incorporated into output.

Source timestamp is 23:29:40; renders are 23:29:43–44. No version mismatch was observed. Independently compiled the source and evaluated 0, 1.7, 2.15, 3.85, 4.30, 6.10, 6.45, and 8 seconds successfully: duration **8 seconds**. This remains a sparse-still/source review, not playback.

## Separate verdicts

| Gate | Verdict | Evidence and limit |
| --- | --- | --- |
| Mechanism | **ready** for bounded schematic docking | U/A, C/G, and A/T correspondence is preserved. Arriving units extend the persistent RNA. The 4.30-second sample now supplies the second exact endpoint. Polarity, antiparallel orientation, and complete transcription chemistry remain outside what the proof visibly establishes. |
| Readability | **ready** | Slender rods remain distinct at delivery size, white letters are legible beside the selected bases, and the assembled chain is continuous. The previous exit seam is gone. |
| Reference correspondence | **revise** | Native vocabulary is much closer, but large smooth corner masses and a centered frontal ladder differ materially from the reference's oblique, tightly cropped active-site environment. |
| Technical proof | **ready** for sampled native output | Current compilation/evaluation passed at all eight times; both native frame sizes are present. Entire path smoothness, full reference timing, encoded video, final frame rate, and audio state are **unverified**. |

## Resolved findings

- **Solid active-site occupancy:** gold protein surface now fills the space behind the action. The large purple window of v1 is absent. The cleft reads as part of an occupied mass.
- **Base proportions:** world-space length/diameter is now about 5.5, and the rendered bases read as slender rods. This addresses the previous peg-like proportions without making them disappear.
- **Backbone:** thinner, dark slate/lavender tubes replace the thick teal hoses. The result is much closer to the reference's molecular vocabulary.
- **Correspondence and labels:** local pale letters are visible. One-to-one docking remains comprehensible without a caption. No title, footer, or detached explanatory card has been introduced.
- **Connectivity:** the exit and existing active-site backbone are a single tube with a shared tangent. Its former diagonal seam is not visible in the inspected native-size frames.
- **Protein surface orientation:** rendered convex domains now have coherent highlights and dark receding sides. The reported normal correction is consistent with the observed result.

## Remaining fixable reference mismatches

### 1. Camera and projected arrangement — substantive

At 1280×720 the proof's upper strand sits near y=170–190 through the central region, leaving a substantial band of protein and purple above it. The lower strand makes a broad, shallow U across the lower-middle image. Together they form a nearly frontal, centrally framed opened ladder.

In the 1:04 reference, the upper strand runs close to the top crop. The lower strand rises markedly toward the right, and the active RNA plus loose nucleotides are seen at a more oblique relationship to both strands. This arrangement occupies much more of the useful image height and feels like a close view *within* the enzyme. V3 feels like a complete opened ladder displayed *in front of* the enzyme.

**Reusable correction:** Anchor the camera brief in projected landmarks: upper strand near the upper edge, a clearly rising lower contour to the right, active RNA extending in from the left, and a foreground approach corridor. Adjust camera/whole-construction placement and strand paths coherently to produce those landmarks. A nonzero yaw/pitch alone is not sufficient. Preserve existing pairing and connectivity while reframing.

### 2. Domain size hierarchy — substantive

V3 has four dominant smooth lobes, one in each corner, with a relatively simple central floor. They read as a few large rounded masses around a shallow basin. The 1:04 reference contains several medium irregular bulges and crevices immediately behind the bases; its local surface has a denser shape hierarchy. V3's large lobe count/size is a fixable construction choice, independent of lighting sophistication.

**Reusable correction:** Require coarse body mass plus uneven medium domains around and behind the active region. Vary their scale and placement, keeping roots embedded in one coherent body. Avoid both a torus and four-corner symmetry. Retain enough supporting floor to prevent a return to the empty-window failure. The needed change is sculpted silhouette and relief, not stronger procedural noise.

### 3. Lesser correspondence differences — record without blocking the primitive set

The proof is warmer and more saturated gold than the muted ochre/olive reference. Its backbone is dark slate-purple rather than the reference's somewhat brighter blue. Labels cover only three selected pairs, while the reference labels a longer sequence. Only one free nucleotide is visible at a time in the proof; the reference still shows multiple loose nucleotides at varied depths and orientations. These should be considered in the complete scene, but the chosen single-arrival proof remains readable and causally clear.

The native surface is smoother and more uniformly sharp than the reference. Do not turn missing depth of field, cast shadows, or full cinematic rendering into an endless proof loop. They are honest rendering limitations to disclose. Camera landmarks, medium-scale geometry, and annotation density are authorable and should not be grouped with those limitations.

## Focused next gate

Recheck the same 8-second proof after the two substantive changes above, with native-size setup, a mid-approach view, and all three docking endpoints. Preserve the corrected rod proportions, slate backbones, white local letters, continuous RNA join, and complementary pairing. No engine rewrite or photorealistic material requirement is needed. Approval should state that this is an achievable native reconstruction with documented rendering limits; it must not relabel the current remaining composition differences as a near-exact match.
