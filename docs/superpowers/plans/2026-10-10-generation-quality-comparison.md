# Generation Quality Comparison Plan

**Goal:** Compare three matched demo tests between fast `1c79058` and previous
slow `1d47cbe`, using actual rendered evidence rather than assumed thoroughness.

**Architecture:** An isolated benchmark loads historical generator/gate modules
from Git without checking out or changing the running production branch. Both
variants retain identical shared dependencies, model, thinking, fixed prompt,
frozen two-scene plan and narration. Each second scene inherits its own first
scene's approved final frame. No manual source refinement or selective retries.

**Tech stack:** Existing Bun generator/runtime, native animlib WebGPU frames,
existing quality-player gallery, frozen benchmark audio, independent reviewers.

- [x] Add isolated harness, provenance hashes, per-stage metrics and failed-run
  retention. Check module snapshots against Git and verify frozen inputs.
- [x] Run three matched pairs. The user selected three fresh repetitions of
  the fixed RNA prompt for each version.
  One pair at a time, two variants concurrently; disclose shared-load timing.
- [x] Capture identical held-out frame times (16 per scene, both native aspects),
  distinct from the automatic publication sample grid. Copy approved source and
  frame sets into anonymous review folders. Review substantive defects by
  correctness, readability, identity/continuity and reference style. Failures
  count against completion rate; never rerun until a preferred result appears.
- [x] Inspect playback and publish a comparison table, frames, timing, verdicts,
  limitations and recommendation. Three trials cannot prove statistical quality
  equivalence. Do not change production defaults from this exploratory sample.

Known confounds: model nondeterminism, provider/cache variation, and concurrent
remote requests. Frozen narration omits script/TTS variability. The two versions
receive equal authoring inputs; they need not produce identical candidate source.
