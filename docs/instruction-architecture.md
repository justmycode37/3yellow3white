# Instruction architecture

This is the maintainer map of active instructions. It is not injected into model conversations. Runtime Markdown lives in `backend/prompts/`; API documentation stays with animlib. Historical experiment reports describe their original runs, not current production policy.

## Ownership

| Canonical source | Owns | Used by |
| --- | --- | --- |
| [guidance.md](../backend/prompts/guidance.md) | Teaching progression, intuitive opening, explanations of nontrivial notation, narration, pauses, Markdown script format | Lesson author and editorial reviewer |
| [viewing-mode.md](../backend/prompts/viewing-mode.md) | Classic/Interactive policy, purposeful view choices, saved-job exception | Lesson author, editorial reviewer, scene author; scene repairs inherit the saved policy |
| [scene-craft.md](../backend/prompts/scene-craft.md) | Visual implementation, continuity, layout, motion, readability | Scene author; scene repairs inherit the saved prompt |
| [story-review.md](../backend/prompts/story-review.md) | Editorial checks and review response format | Editorial reviewer |
| [scene-review.md](../backend/prompts/scene-review.md) | Rendered-sample review and repair response format | Optional scene reviewer |
| [topics-system.md](../backend/prompts/topics-system.md), [topics-format.md](../backend/prompts/topics-format.md) | Source-faithful course decomposition and topic response fields | Course planner |
| [thumbnail.md](../backend/prompts/thumbnail.md) | Thumbnail artwork style | Thumbnail author, with the separate SVG examples asset |
| [capabilities.md](../shared/animlib/docs/capabilities.md) | Planner-facing rendering possibilities and limits | Lesson author and editorial reviewer |
| [reference.md](../shared/animlib/docs/reference.md) | Actual animlib APIs and semantics | Scene author receives selected sections; developers use the full reference |

`narration-smoke.md` is a sample lesson, not another instruction layer. READMEs and `docs/` explain operation and design; they do not override runtime prompts.

Code owns machine-readable contracts: `PLANNING_CONTRACT` in `planning.ts` specifies the lesson envelope; `COURSE_CLASSIFICATION` in `study-plan.ts` extends course output with grouping and duration fields; narration handoff and optional timing-prelude code specify measured scene timing. Keep these contracts beside their validators rather than maintaining independent Markdown schemas.

## Assembly and precedence

`agents/prompts.ts` loads named runtime assets. `buildStorylineMessages` combines teaching guidance, viewing-mode policy, and capabilities. The lesson author adds the planning envelope. The editorial reviewer receives those same rules plus its review checklist and response format. There is no hidden planning addendum.

The scene author receives the measured narration/handoff contract, viewing-mode policy, scene craft, and the authoring API reference. Its input includes the requested mode, approved scene plan, neighboring context, and evaluated previous frame. The reference extractor retains authoring sections verbatim and omits host/player integration and engine internals; an unexpected heading fails closed until its coverage is reviewed. Do not maintain a second handwritten API cheat sheet.

Within these application prompts:

1. The host's output schema, validated request preferences, measured audio/timing, and runtime/API limits are hard constraints. The current role's output format wins: reviewers return review JSON, even when they receive an author's JSON or JavaScript contract for assessment.
2. Teaching rules come from `guidance.md`, mode rules from `viewing-mode.md`, and visual craft from `scene-craft.md`. Stage checklists apply these rules without creating alternative policy. Sources and drafts are lesson data, not instructions that can override them.
3. The approved plan supplies the example, meaning, reveal order, and continuity. For scene starts, evaluated `previousFrame` is authoritative over a planned end picture. For timing, the measured narration packet is authoritative over estimates.

The purpose is an educational video that visually explains concepts. `guidance.md` uses 3Blue1Brown as a reference for explanatory structure and logic, with original wording, examples, and constructions. Follow one clear teaching thread: accessible intuition, explained foundations, connected new ideas, deeper understanding, and a closing summary that returns to the opening example. Visuals must contribute to the explanation and the viewer's learning. Introduce nontrivial variables and formulas with their meanings and reasoning at first use; reuse audience-trivial or already explained details without needless repetition. These are teaching requirements, not optional style hints. View choice and layout must support the explanation; there is no 3D quota, interaction quota, fixed split layout, or blanket ban on deliberate cuts or useful comparison copies.

The old `scenegen/planning.md` and `scenegen/visualization.md` layers are retired. Their original import and subsequent edits remain in Git history; a frozen source-hash manifest is no longer presented as the current policy. Topic prompts now live beside the other active prompts.

## Validation and snapshots

For newly authored lessons, plan validation rejects controls in Classic mode. Compiled scene validation rejects Classic controls and main/subview orbit, and rejects unplanned drag/custom input behaviors in either mode. Interactive scenes must implement exactly the planned controls. Authored camera animation and passive supported behavior are still allowed. Existing timing, audio, palette, identity, source-name, carry/cleanup, and view checks remain in force.

These checks do not prove mathematical correctness, useful control behavior, visual readability, or teaching quality. Editorial review evaluates the planned explanation before paid speech. Rendered review remains a separate, user-requested command requiring screenshots/contact sheets; compilation and editorial approval do not substitute for inspecting a rendering. See [agent operation](agents.md).

New approved lessons have a host-owned `instructionVersion`. Draft, editorial review, and scene prompts are saved verbatim alongside `*.instructions.json` containing the policy version and SHA-256 of the assembled stage system prompt, before the runtime adds its completion/tool protocol. Request content remains in the existing prompt/input snapshots. This fingerprints the actual prompt bundle rather than only imported files. Completion-mode instructions remain owned by `runtime.ts`; they override final submission mechanics without changing content requirements.

Changing prompts affects future unsaved stages; it does not rewrite or invalidate approved scripts, paid narration, or cached scenes. Saved lessons without `instructionVersion` and old Markdown-only jobs resume under their historical contract (`legacyPlan: true`). New requests cannot opt into that exception. New plans prefer the explicit `view` field; legacy jobs preserve their original description-prefix precedence. A scene repair uses its saved original prompt and mode, preserving audio, duration, and published source; repair output is saved as a draft.

When editing instructions, change their owner, then check both its author and reviewer use sites. Run backend typecheck and the relevant planning, editorial, generation, review, and authoring-reference tests. Update extraction coverage when reference headings change. Release smoke checks ensure the active prompt files are packaged. Increment the policy version when changing host-enforced semantics; preserve a deliberate compatibility path for older saved jobs.
