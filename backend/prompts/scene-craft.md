# Scene craft

Make the scene's purpose visible. Show a concrete change before naming its rule; every causal claim needs a visible reason, such as a correspondence, comparison, or quantity changing together with its geometry. Use the running example and exact values established in the script. Do not choose new values that contradict the speech.

Use the lesson outline to avoid repeating earlier explanations or revealing later answers. Set up the next scene's needs. The planned end picture is an intention; the evaluated previousFrame is the authoritative starting state. Retrieve carried objects with s.previous.get(id), animate the same object, and keep the declared carry IDs. Do not recreate a lookalike under a different ID. If the previous frame differs from the plan, build from the actual state without teleporting it.

Keep the fewest objects that explain the idea. Temporary copies, highlights, construction lines, and intermediate equations should leave once their purpose is served. Keep planned concept colors stable across the lesson using Color tokens. Neutral labels may use WHITE. Color alone should not be the only way to distinguish concepts.

Use motion to explain instead of filling the canvas with the narration. Prefer geometry, short labels, formulas, and meaningful numbers; use brief explanatory text when the topic needs it. Choose a layout suited to the subject, with readable labels and clear margins. A fixed formula area is useful when geometry would otherwise collide with equations, but is not required for every lesson. Labels should move with the thing they name. Check the middle of motions as well as endpoints for overlap and clipping.

The player overlays a title/menu near the top-left and playback controls near the bottom. Keep essential labels and the main inference clear of those areas. Do not assume an empty fullscreen canvas when choosing framing.

Animate the same arrow as its length or direction changes; avoid accidentally leaving a shorter arrowhead inside a longer arrow. If the lesson deliberately compares collinear reference and result vectors, distinguish them clearly through labels, styling, or a separate comparison area. Derive coupled geometry and readouts from the same values. For rotations, interpolate the angle; choose interpolation that preserves the relevant mathematical structure rather than assuming arbitrary shape morphs are true intermediate states.

Give the main inference room to be seen. Usually make one major explanatory change at a time and hold its result when the narration allows. Exact audio cues and measured duration take priority over suggested pacing. Do not extend the scene, compress speech, shift audio, or reveal an answer during a thinking pause. Cuts and deliberate discontinuities are allowed when motivated and explicit.

Use 3D for spatial subjects when it helps explain them. Add interactions only when planned: every control should drive real geometry and all dependent labels/formulas at every time, while preserving the scene duration and a coherent default example. Do not add decorative controls or require interactions to understand the narrated default path.

Before calling validate_output, review the source for: the purpose actually shown; facts and values agreeing with speech; no premature reveal; readable text; no leftover copies; smooth, meaningful motion; planned carry/cleanup IDs; and a clean final picture. On a diagnostic, change only what is needed to fix it, retaining the narration, example values, inherited state, IDs, and timing. Return the complete corrected source.
