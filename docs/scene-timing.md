# Host-provided scene timing

Set `AGENT_SCENE_TIMING_MODE=host` to supply exact narration timing constants to
scene generation. The default, `inline`, preserves the previous prompting path.
This setting is independent of `AGENT_SCENE_OUTPUT_MODE=validated-reference`;
the local installation uses both optimizations.

The host prepends a read-only `__narration` object containing the assigned audio
ID, end mode, duration, and word-ID start/end accessors. The model still receives
the complete narration packet and library guide, but no longer needs to copy a
cue table into its source. Model, reasoning effort, explanation, audio, pauses,
validation, and final review are unchanged by this setting.

Raw model output is assembled before tool validation and final validation. The
saved scene is self-contained and is validated without adding another prelude.
Existing scenes remain byte-for-byte unchanged. Switching back to `inline` does
not invalidate scenes already generated with host timing; restart the backend
after changing the environment setting.

The preceding paired experiment on RNA transcription, binary search, and the
derivative of x² measured 19.3% less scene-generation time than the already
optimized completion protocol across two observations per topic. This is a small
sample, not a guaranteed speedup for every generation. Independent sampled visual
review found no clear material explanation downgrade; all six candidate animations
completed audio-enabled playback without reported errors.

Integration verification covers exact compiled-scene/frame equivalence, invalid
word IDs, immutable accessors, both completion modes, unchanged cached scenes,
and disabling the optimization after generating a scene. Strict backend typecheck
passes. The latest full local backend run has 151 passes and five known failures
(the narration-resume failure varies between runs):

- `the video pipeline preserves narration audio IDs and reuses completed script, speech and scenes`
- `existing saved Markdown videos resume without a new planning call` (timeout)
- `guidance production example is accepted by the actual parser`
- `coalesces submissions and measures offsets from full audio including trailing silence`
- `HTTP interfaces share one user, validate input and serve committed assets`

The timing change does not include the separate in-progress scene-boundary work.
