# Independent scene-speed visual review

Historical experiment record. Its prompts, style criteria, and test counts describe that experiment; current production rules are in [instruction architecture](instruction-architecture.md).

Reviewed 2026-10-10 by the independent visual-review agent. Evidence is actual CanvasRenderer/player output for the identical frozen RNA transcription, binary-search, and derivative-of-x² lessons. This report evaluates teaching and visual quality, not generation speed. It does not establish universal losslessness or endorse a candidate on latency alone.

## Method and limits

Applied the user's `3blue1brown-explanation-style` skill, including its approved component and derivative images, rejected chart-template image, and separate review gates. Inspected timestamped contact sheets, native canvas frames where text or geometry needed confirmation, and source only to clarify observed behavior. Original and repeated baselines were compared with their corresponding candidates. Sparse frames cannot prove every animation interval, narration alignment, or complete audiovisual delivery.

Evidence directory: `C:/Users/samue/Stuff/3yellow3white/data/scene-speed-frames/`. Ordinary sheets use `{variant}-{topic}-contact.jpg`; native frames use `{variant}-{topic}-beat-{1|2}-{10|25|50|75|90|100}-canvas.png`. Dense sheets are listed below. Frozen scripts and generated sources are under `data/scene-speed/fixtures/` and `data/scene-speed/runs/` in the benchmark worktree.

The teaching checks were:

- RNA: localized sequential pairing of DNA TACGAT with RNA AUGCUA, RNA U rather than T, antiparallel polarity with compatible spatial reading/growth arrows, and release of a copy while DNA remains intact.
- Binary search: stationary sorted values, the 18 comparison eliminating the left four, the 31 comparison leaving 23, and geometric halving explaining why doubling adds a comparison.
- Derivative: exact xh/xh/h² added-area tiling, division into x,x,h contributions, shrinking geometry with the normalized x contributions retained, and an earned 2x conclusion.

`Ready*` means no clear material problem in the inspected content/composition, within this sampling limit. `Unverified` is not a failure or a pass. Technical delivery is unverified by this reviewer unless explicitly supported by a recorded player failure or separately attributed full-playback evidence. A transient overlap is not automatically a material regression; sustained obstruction of a teaching object is.

## Verdicts

| Variant | Topic | Reasoning | Readability | Reference style | Technical delivery | Evidence / disposition |
|---|---|---|---|---|---|---|
| baseline | RNA | Ready* | Revise | Ready* | Unverified | Native 37.4s and 50.5s: RNA 3′ endpoint collides with Growing RNA/RNA copy labels. This is a control defect, not a reason to tolerate new sustained defects. |
| baseline | Binary | Ready* | Ready* | Ready* | Unverified | Required comparisons, stable cells, target and halving argument present. |
| baseline | Derivative | Ready* | Unverified transition | Ready* | Unverified | Formula overlap at 43.1s and 47.0s; final equation clean. |
| reference | RNA | Ready* | Ready* | Ready* | Ready, externally reported | Clean sampled pairing/directions/release. Lead agent reported complete 50.5s playback with audio enabled, ended status and no browser warnings/errors; this reviewer did not independently listen to it. |
| reference | Binary | Ready* | Ready* | Ready* | Unverified | No clear sampled downgrade. |
| reference | Derivative | Ready* | Ready* | Ready* | Unverified | Clean sampled area-to-rate derivation. |
| submit | RNA | Ready* | Revise | Revise | Unverified | From 37.4s through final 50.5s, backbone crosses nucleotide centers; C becomes G-like. Sustained obstruction, not merely a label morph. Do not promote unchanged. |
| submit | Binary | Ready* | Ready* | Ready* | Unverified | Core three teaching steps preserved. Midpoint-color variation alone is not a material failure. |
| submit | Derivative | Ready* | Unverified transition | Ready* | Unverified | 43.1s formula overlap; final clean. Baseline has same class of transition artifact. |
| baseline-repeat | RNA | Ready* | Ready* | Ready* | Unverified | Clean settled polarity and release; dense final interval keeps RNA label legible. |
| baseline-repeat | Binary | Ready* | Ready* | Ready* | Unverified | Valid repeated control; minor emphasis/color differences are not teaching loss. |
| baseline-repeat | Derivative | Ready* | Ready* in dense window | Ready* | Unverified | Dense limit transition overlaps briefly, then settles by 44.0s. |
| reference-repeat | RNA | Ready* | Ready* in dense window | Ready* | Unverified | Bounded label crossfade; intact sequence and polarity throughout. See dense evidence below. |
| reference-repeat | Binary | Ready* | Ready* | Ready* | Unverified | Valid comparisons and final 2n→n→n/2→n/4 geometry. Half-cleared 2n outline illustrates one extra comparison. |
| reference-repeat | Derivative | Ready* | Ready* in dense windows | Ready* | Unverified | Limit transition comparable to paired control; short final identity crossfade settles. |
| author-docs | RNA | Ready* | Ready* | Ready* | Unverified | Local active site follows pairing; clear final copy and retained DNA. |
| author-docs | Binary | Ready* | Ready* | Ready* | Unverified | No clear sampled downgrade across all three steps. |
| author-docs | Derivative | Ready* | Ready* | Ready* | Unverified | Exact tiling and normalized contributions. Minor 43.1s transition ghosting; clean later frames. |
| concise | RNA | Revise | Ready* | Revise | Unverified | 6.0–24.2s active-region/polymerase rectangle spans all six bases instead of following each pairing site. Native 21.8s confirms; scene-0 source fixes width at 8.5 through beat 1. Later direction/release steps recover, but localized mechanism is lost. Do not promote unchanged. |
| concise | Binary | Ready* | Ready* | Ready* | Unverified | Required elimination and doubling argument preserved. |
| concise | Derivative | Ready* | Ready* | Ready* | Unverified | Exact decomposition, x,x,h normalization, shrinking h and clean final derivative. |
| submit-only | RNA | Ready* | Ready* | Ready* | Unverified | No clear sampled downgrade; localized pairing and final release are readable. |
| submit-only | Binary | Ready* | Ready* | Ready* | Unverified | No clear sampled downgrade across all three steps. |
| submit-only | Derivative | Ready* | Unverified transition | Ready* | Unverified | Correct geometry and final argument; isolated 43.1s overlap needs motion context, not automatic rejection. |
| luna | RNA | Revise | Revise | Revise | Unverified | Active site remains around G during earlier pair additions; 37.4s arrow/label and backbone/glyph collisions; final released strand retains dangling pair links and detached polarity labels. |
| luna | Binary | Revise | Revise | Revise | Unverified | At 2.6s elimination appears before earned comparison; midpoint 18 is never highlighted. At 28.3–38.8s comparison/found/only-23 labels overlap and later conclusions appear too early. |
| luna | Derivative | Unverified | Unverified | Unverified | Revise | Actual player preparation fails: unsupported bundled MathJax vector glyph. Recorded in luna-derivative-render-error.txt. |
| sol | RNA | Ready* | Ready* | Ready* | Unverified | Sequential pairing, localized later active site, polarity, growth and clean release preserved. |
| sol | Binary | Ready* | Ready* | Ready* | Unverified | No clear sampled material downgrade. |
| sol-retry | Derivative | Ready* | Unverified transition | Ready* | Unverified | Exact tiling, x,x,h contribution bars, shrinking h and final2x preserved. 47.0s identity morph overlaps like baseline; native final49.6s is clean. This verdict applies to the retry artifact only. |

## Dense transition evidence

Inspected `dense-reference-repeat-rna-contact.jpg`, `dense-baseline-repeat-rna-contact.jpg`, `dense-reference-repeat-derivative-contact.jpg`, and `dense-baseline-repeat-derivative-contact.jpg` from the actual player.

- Reference-repeat RNA: label ghosting appears at 43.7s, is strongest near 44.0s, the target is readable at 44.3s, and the label is clean by 44.6s. Baseline-repeat keeps its RNA label unchanged. This is a real local legibility dip, approximately 0.6–0.9s of visible disturbance in the samples, but sequence, backbone, endpoints and DNA remain clear. It does not erase the teaching step or create a sustained ambiguous diagram.
- Reference-repeat derivative and baseline-repeat derivative both show overlapping formula states at 43.0–43.6s and clean limit equations by 44.0s. Reference's final derivative identity overlaps around 46.8–47.0s and is clean by 47.3s. Its source schedules that final morph for 0.534s. These observations support bounded transitions rather than persistent text-layout failure.
- Earlier sparse-frame readability flags for these reference repeats are superseded by this dense evidence. It supports retaining the measured reference candidate: no clear material paired downgrade was found in these windows. It does not certify all possible outputs, all motion intervals, or every other candidate's transitions.

## Decision supported by this review

Keep the reference candidate under consideration: original and paired-repeat samples preserve the lessons, and dense review resolves the previously ambiguous overlap frames without finding a material paired regression. Reject unchanged submit RNA, concise RNA, and the Luna set on the concrete failures above. Sol's three rendered topics show no clear sampled teaching/composition downgrade, with its derivative verdict limited to the completed retry and its unsampled motion/full delivery still unverified here. Other candidates remain eligible only within the stated evidence limits; complete playback evidence must be assessed separately before claiming delivery readiness.
