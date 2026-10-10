# Animation quality milestones

Goal: implement the photographed requirements on `amilibsam` and show comparable
milestone demos using one fixed RNA transcription request.

## Design and scope

Reuse animlib's existing overlap detector, evaluated frame handoff, and isolated
3D views. Add host validation and source repair feedback rather than silently
moving authored geometry. Preserve narration timing, semantic IDs and saved jobs.
Keep original imported scenegen prompts byte-for-byte; append an explicit current
quality policy to planning, review and scene authoring so conflicting older style
rules cannot win. Prefer spatial setup and selective flattening when useful.

Fixed prompt: “Explain RNA transcription to a first-year biology student. Show
how RNA polymerase opens a short DNA region and builds complementary RNA from
the template strand. Use one consistent example, a spatial introduction followed
by a clear flat close-up, and preserve strand identity. Keep labels readable,
motion purposeful, and the screen uncluttered.”

## Milestones

- [x] M1: Library-backed scene quality validation and durable evaluated final
  frames. Add `backend/src/agents/scene-quality.ts`, wire generator and review,
  test real glyph collisions, settled/moving text, cached scenes and frame files.
  Demo: same RNA request with overlap correction active.
- [x] M2: Authoring policy for geometry-only rotation, selective 3D, clutter,
  holds, scene transitions and local labels. Wire every planner/reviewer/scene
  call; keep narration and API contracts. Demo: same prompt with full policy.
- [x] M3: Matched Astra/high versus gpt-6.1-sol/high trial with saved sources,
  timings, validation failures and playable demos. Keep model default unless
  measured visual evidence supports changing it. Inspect available ani 7.1 and
  Claude design guidance and adopt only relevant principles with provenance.
- [x] Verify focused tests, backend typecheck, full relevant suite, browser
  playback/rotation, rendered frames, and independent visual/code review.

## Review focus

No failure of old cached videos solely because new quality rules were added.
Final-state evidence must correspond to the exact validated source and inherited
frame. Diagnostics must be bounded and actionable. Text must remain readable
while spatial models rotate. Scene phasing may fade introductory context away;
identity continuity is required only for meaningful referents. Sampled collision
detection is not proof of visual correctness between samples or at all aspects.

## Progress and decisions

- Baseline inspected: branch clean, animlib has settled-text collision detection,
  isolated orbitable views, and evaluated final frames. Generator currently uses
  none of the collision diagnostics and does not save final frame JSON.
- Existing frozen RNA audio available under `data/scene-speed/fixtures/rna`.
- Native execution on user's requested branch. No branch switch or merge.

Results and evidence: [animation-quality-results.md](animation-quality-results.md).
