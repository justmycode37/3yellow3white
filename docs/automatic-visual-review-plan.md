# Automatic generation visual gate

User requires fixes during generation, not hand-edited demonstration sources.

1. Render the validated candidate through the production CanvasRenderer into
   native WebGPU textures. Save PNG frame evidence at 16:9 and 4:3, including
   transition interiors, scene start/end, and stable reading holds.
2. Run the existing image-capable agent as an independent visual reviewer. Provide
   the same source, authoritative narration/plan, sample timestamps and current
   style policy. Reviewer returns approval or a complete repaired source.
3. Validate repairs against the original narration, plan and overlap gate, then
   render and review again. Bound repair attempts; never publish an unapproved
   candidate or silently skip unavailable rendering. Preserve old cached videos.
4. Persist source hashes, frame manifests, candidates, reviews and approved final
   frame. Make the default production generator use this path; no trial-only switch.
5. Test repair/re-render ordering, rejection, cancellation and persistence. Rerun
   canonical RNA request from fresh generation directory with frozen narration,
   no manual scene edits; inspect saved images and live demo while preserving
   existing 3Blue1Brown visual language.

Existing skill contracts apply. No new palette, typography or layout template.
Automatic still-image review covers sampled evidence, not every frame or orbit pose.
