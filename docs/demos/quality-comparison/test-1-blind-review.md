# Test 1 — blind visual review

**Prefer A, moderate confidence.** Overall quality is close. B has a localized, substantive overlap defect in the active explanatory region; this is a readability downgrade, not a wholesale scientific or style downgrade. No version identities or performance results were inspected.

Evidence: A/B context, source for correctness/continuity, and all 16 sampled times per scene at both 1280×720 and 960×720 through contact sheets (128 candidate/aspect/time frames). Suspected defects and selected comparison/end frames were reopened as individual native PNGs. Compared with `backend/prompts/visual-style-reference.jpg` and the skill's approved components/derivative images. Times below are scene-local.

| Gate | A | B | Basis |
|---|---|---|---|
| Scientific / explanatory reasoning | ready | ready | Both build complementary RNA from the same template, teach opposite chemical directions with rightward reading/growth, and retain DNA when RNA releases. |
| Readability | ready at sampled times | revise | B's moving purple rim intersects active base letters; A keeps its outline between the letter rows. |
| Identity / continuity | ready | ready | Same teal DNA, green RNA, purple enzyme; four-base prefix carries between scenes and extends to six bases. Source uses inherited objects. |
| Existing / 3Blue1Brown reference style | ready | ready | Open black molecular space, serif/local labels, restrained semantic colors, spatial setup followed by a planar construction. Neither becomes a slide/card layout. The readability issue remains a separate failure. |
| Technical delivery | ready for sampled native frames; full delivery unverified | ready for sampled native frames; full delivery unverified | No sampled clipping or malformed final frames. Playback, audio synchronization, interaction, and every unsampled transition were not tested by this review. |

## Required revision

**B, scene 1, 3.762071429 s:** the left side of the moving polymerase ellipse crosses the upper RNA **C** and lower template **G**. These are the active bases, so the interference occurs where the viewer should read correspondence. Confirmed individually in both [1280×720 PNG](../../../data/quality-comparison/rna-fast-slow-20261010/test-1/blind/B/scene-1/1280x720-3.png) and [960×720 PNG](../../../data/quality-comparison/rna-fast-slow-20261010/test-1/blind/B/scene-1/960x720-3.png). The [same-time A PNG](../../../data/quality-comparison/rna-fast-slow-20261010/test-1/blind/A/scene-1/1280x720-3.png) leaves letters clear. Keep B's established look; adjust the outline/letter relationship so the moving path clears the glyphs, then inspect intermediate frames again.

Secondary, nonblocking observation: B scene 0 at **5.185348214 s** has the dim outgoing gray DNA strand behind the `RNA polymerase` label ([full PNG](../../../data/quality-comparison/rna-fast-slow-20261010/test-1/blind/B/scene-0/1280x720-4.png)). The label remains legible; this is weaker evidence than the active-base collision and does not independently decide the ranking. A's same-time opening has very faint departing rungs, but they do not obscure its label; no required change inferred from that isolated transition sample.

## Correctness and scope of verdict

Both final states at **scene 1, 26.3345 s** show template **3′ TACGAT 5′** and released RNA **5′ AUGCUA 3′**, with intact backbones: [A](../../../data/quality-comparison/rna-fast-slow-20261010/test-1/blind/A/scene-1/1280x720-15.png), [B](../../../data/quality-comparison/rna-fast-slow-20261010/test-1/blind/B/scene-1/1280x720-15.png). Both show the first four complementary bases before the handoff. A puts DNA above RNA; B uses the reference's RNA-above-DNA arrangement. Both are internally consistent, so orientation is not treated as a defect or a preference criterion.

No cosmetic redesign requested. **A passes the sampled visual gate; B needs the local overlap repair.** Still frames plus source support the sequence and continuity judgment, not a claim of fully verified motion or final media playback. Apparent disappearing repeated patches in tool-displayed sheets were not counted as renderer defects.
