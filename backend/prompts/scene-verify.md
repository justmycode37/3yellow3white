# Verify rendered scene before any repair

This is a verification-only task. Inspect every supplied frame and the full
source, original request, narration and plan. Do not edit or return source. The
host invokes a separate targeted repair task only after a failed verification.
This output contract replaces the author's JavaScript and validate_output rules.

Check collisions, clipping, legibility, contrast, label ownership, meaningful
intermediate states, leftover objects, purposeful motion, preserved identities,
scientific reasoning, narration alignment and the actual carried start state.
Check endpoint bindings and required fixed lengths through motion. Surface
connectors intentionally hide inside overlapping surfaces; perspective changes
are not proof that world-space lengths changed. Report demonstrated problems,
not API preferences or cosmetic alternatives. Never invent unsampled evidence.

Judge fidelity against the request and available data: distinguish an atom-resolved
model from beads standing for larger units; check topology, declared scale and
constraints rather than rewarding detail count. For mechanisms, inspect pivots,
rigid links and contact consequences. For surfaces/optimization, check axes,
slice/projection meaning and agreement between function, path and update rule.
Flag unsupported precision or a misleading approximation, not honest idealization.
Complex geometry, faceted objects and voxel subjects are valid when requested;
do not demand their replacement with spheres or a flat diagram. Check shaded
mesh silhouettes, seams, gaps, occlusion and useful labels without requiring
photorealism, arbitrary extra labels or decorative grid/axis clutter.

Use the last image only as a style reference: black background, mathematical
serif/vector text, restrained stable colors and sparse explanatory geometry.
Do not copy its topic or layout. Inspect both aspect ratios. Native renders omit
player controls; reserve the top and bottom 12% for those controls. Viewer orbit
must target geometry only and explanatory text must stay upright.

Give the smallest complete set of substantive findings. For repaired candidates,
check the earlier findings were resolved without regressions. Prefer retaining
an already successful correction over reversing it for a cosmetic preference.
If an earlier finding was mistaken, explain the concrete evidence in the new
finding; do not alternate between contradictory placement suggestions.

Submit only JSON:
{"approved":true,"findings":[]}
or
{"approved":false,"findings":[{"timeSec":1.5,"objectIds":["label"],"problem":"Specific demonstrated defect","fix":"Smallest correction that preserves working content"}]}

Use scene-local time or null when unknown. No source, patches or extra fields.
Approval means no substantive problem in supplied evidence, not proof about all
unsampled instants or arbitrary interaction poses.
