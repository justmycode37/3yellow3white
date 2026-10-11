# Production single-scene showcases

24 fixed prompts cover mathematics, geometry, physics, astronomy, chemistry,
biology, engineering, robotics, machine learning, computing and spatial worlds.
Each requests one detailed 20-second silent scene. See
[catalog](../../../backend/src/agents/showcase-catalog.ts),
[style contract](../../showcase-batch-style-contract.md), and
[independent frame review](independent-review.md).
See [measured results and limitations](results.md) for acceptance counts,
timings, independent disagreements, and reruns.

## What is the real pipeline here?

The harness calls production `createPiGenerator` with the configured
`PiAgentRunner`, model, reasoning, output mode and timing mode. The generator
loads its normal scene-craft, visualization and quality Markdown plus the actual
animlib reference. Its ordinary web-research and validation tools remain enabled.
Compiler/plan/quality checks, native WebGPU frame rendering, findings-only visual
verification, at most one targeted repair, and final re-verification are the
production implementations. No limits or acceptance gates are relaxed.

The user explicitly selected silent showcases. A fixed one-scene plan and a
20-second PCM silence packet replace editorial planning and speech synthesis.
There are no fabricated word timings: the packet's utterances and pauses are
empty. The parser-only narration placeholder never enters audio or scene speech.
This tests scene creation, not the whole narrated-video workflow.

## Running and replaying

From `backend`:

```powershell
..\node_modules\.bin\bun src/agents/showcase-trial.ts prepare
..\node_modules\.bin\bun src/agents/showcase-trial.ts run
..\node_modules\.bin\bun src/agents/showcase-trial.ts serve
```

Run only one generation process for a batch. Three independent scene jobs run
concurrently inside it. Optional quoted comma-separated topic IDs select a subset.
`SHOWCASE_CONCURRENCY=1` runs serially for controlled resource-contention checks;
the default is three, and the maximum is three. It does not change scene prompts,
compiler limits, or validation behavior.
Completed and failed runs are retained rather than automatically regenerated.
Set a new `SHOWCASE_BATCH` for fresh repetitions with the same fixed prompts.

Start animlib's normal Vite demo server on port 5207, then open
[showcase gallery](http://127.0.0.1:5207/showcases.html).
Data/evidence server binds to `127.0.0.1:5211`. Set `SHOWCASE_PORT` consistently
during generation and serving to use a separate port for another batch.

For playback without development reloads, build with `npm run demo:build --workspace animlib`.
Then from `shared/animlib` run
`node ../../node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5213`.
Open `/showcases.html` on that port with the same optional `manifest` query.
This session serves a copied build from `data/showcases/gallery-preview-20261010`
on 5213, keeping parallel demo edits from reloading the player.

Current session: [24-topic baseline](http://127.0.0.1:5213/showcases.html?run=bezier)
and [six-topic rerun](http://127.0.0.1:5213/showcases.html?manifest=http%3A%2F%2F127.0.0.1%3A5212%2Fmanifest.json&run=planetary).

Export with `bun src/agents/showcase-export.ts`. The exported batch includes
untouched sources, hashes, inputs, metrics, both review/repair attempts and native
contact sheets. `showcase-trial.ts serve-archive` replays the repository archive
without needing the ignored raw run directory.
New exports also retain exact per-stage prompt transcripts. Startup file hashes
do not freeze dynamically read Markdown if another task edits the checkout;
consult the effective-prompt audit and results for the observed retry drift.
After exporting, `bun src/agents/showcase-audit.ts` verifies artifact hashes,
byte-identical scene sources, the production-approved source hashes, and the
20-second PCM silence against raw generation data. It never edits or compiles scenes.

## Interpreting results

“Complete” means the production gate accepted the source. It is not a claim of
independent scientific or style certification. The separate reviewer can and does
disagree. “Failed” candidates may be inspected but remain visibly unapproved;
render/compiler failures must not be counted as completed showcases.

Raw generation data lives under `data/showcases/<batch>`. Evidence is sampled at
two aspect ratios, not exhaustive proof of every frame or arbitrary orbit angle.
No generated scene source was manually fixed to improve this benchmark.
