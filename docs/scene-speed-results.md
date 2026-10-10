# Scene generation benchmark — 2026-10-10

## Result

Keep **Astra/high, full authoring reference, and validated-reference completion**.
Across two rounds on three fixed explanations, scene generation fell from
1,432.4 to 1,065.3 seconds in aggregate: **25.6% faster**. All six matched
topic/trial comparisons improved. Mean generation time per two-scene lesson
fell from 238.7 to 177.6 seconds. Reported output tokens fell from 76,767 to
50,475 (34.2%); provider calls fell from 29 to 27.

The change avoids emitting already validated JavaScript a second time. The model
still receives validation feedback, can revise its candidate, and makes a final
selection. The host resolves the selected ID to the exact stored source and
validates it again. Planning, editorial review, narration, scene plans, model,
thinking level, full library documentation, and scene continuity remain intact.

This is an empirical quality-preserving candidate, not proof of universal
losslessness. Independent visual review found no clear material explanation
downgrade in the six candidate lessons. Bounded text crossfades remain an existing
quality issue in both controls and candidates. See [visual review](scene-speed-visual-review.md).

## Measurements

Seconds below sum the two scene runner durations. They exclude script planning
and speech synthesis, which were intentionally frozen. Rounded to 0.1 seconds.

| Configuration | RNA | Binary search | Derivative x² | Total | Decision |
|---|---:|---:|---:|---:|---|
| Baseline, Astra/high, text | 235.0 | 248.7 | 207.3 | 691.0 | Control |
| Validated reference, Astra/high | 171.7 | 179.0 | 170.7 | 521.4 | Keep; 24.5% faster |
| Terminal submit, Astra/high | 252.6 | 196.1 | 210.9 | 659.6 | Reject: RNA labels/backbone collide |
| Submit-only, Astra/high | 196.2 | 184.2 | 208.7 | 589.1 | Save candidate; slower than reference |
| Concise-code prompt + reference | 238.9 | 149.5 | 175.0 | 563.4 | Reject: RNA active site loses locality |
| Shorter authoring guide + text | 292.1 | 268.8 | 199.3 | 760.2 | Save; no measured speed benefit |
| Luna/high, text | 218.0 | 91.3 | 86.7 | 396.0 | Reject: teaching and rendering regressions |
| Sol/high, text, completed attempts | 491.5 | 246.8 | 333.9* | 1,072.2 | Save; substantially slower |
| Baseline repeat | 286.9 | 213.6 | 240.9 | 741.4 | Counterbalanced control |
| Validated-reference repeat | 187.0 | 137.4 | 219.5 | 543.9 | Keep; 26.6% faster |

*Sol's original derivative attempt failed with `PROVIDER` after 59.0 seconds.
The separate retry completed in 333.9 seconds. Including the failed attempt,
Sol consumed 1,131.2 seconds. Its failure is preserved and shown separately;
it is not counted as a fast completion. `sol` uses `gpt-6.1-sol`; `luna` uses
`gpt-6-luna`; the other configurations use `gpt-6-astra`.

Across both rounds, matched mean topic times were:

| Topic | Baseline | Reference | Reduction |
|---|---:|---:|---:|
| RNA transcription | 261.0 s | 179.4 s | 31.3% |
| Binary search | 231.2 s | 158.2 s | 31.5% |
| Derivative of x² | 224.1 s | 195.1 s | 12.9% |

The earlier complete app run spent 707.6 of 838.9 seconds generating scene code
(84.4%). Script generation took 126.5 seconds. Narration overlapped scene work;
its exposed wait was 4.4 seconds. In this benchmark, model calls dominate;
compiler validations usually take only tens of milliseconds. In the first RNA
scene, the baseline spent about 39 seconds repeating code in its final answer;
the reference candidate returned its small ID in about 2 seconds. This is one
illustrative pair, not an isolated causal estimate.

## Controlled inputs and quality gates

- Each topic has two scenes, about 50 seconds of identical prerecorded narration
  across variants. Lesson JSON, narration package, and audio have frozen SHA-256
  hashes checked before every generation. No candidate gets a shorter explanation.
- Topics cover biological sequence mechanics, algorithmic elimination, and an
  area-based mathematical derivation. The same running examples and required
  inference chains are used throughout.
- Scene 2 inherits its own candidate's actual scene 1 end frame. This compares
  coherent complete lessons rather than an identical-input scene microbenchmark.
- Every generated scene passes the production compiler, narration duration/audio
  checks, and declared continuity/control checks. Actual WebGPU rendering was
  sampled at six times per scene. Independent reviewers compared contact sheets
  and native frames. Dense transition samples resolved apparent overlap concerns.
- All three first-round reference lessons completed full audio-enabled WebGPU
  browser playback with no reported player or browser errors. Additional repeat
  playback checks are recorded in the local evidence ledger.
- 31 attempts were saved: 30 generation completions and one provider failure.
  Of the completed lessons, Luna derivative failed actual rendering because it
  used a glyph absent from bundled MathJax vectors. Compilation alone missed it.
- Luna also weakened active-site motion, polarity labels, and binary midpoint
  reasoning. Concise-code guidance broadened RNA's active-site highlight across
  the whole template. Terminal-submit RNA introduced letter/backbone collisions.
  These variants are excluded from application configuration.
- Submit-only and the reduced guide remain saved research candidates. Neither
  outperformed validated-reference on the complete three-topic comparison.

## Limits and provenance

Model output is stochastic. Eight configurations received one three-topic round;
only baseline and the winner received a second, counterbalanced round. Other
requests ran concurrently and provider load/cache effects were not isolated.
These results do not establish confidence intervals or performance on all topics.
The production script/editorial pipeline was not included in the scene-only
benchmark, so the 25.6% improvement is not an end-to-end video latency claim.

The authoring guide extraction reduced 54,358 to 38,670 bytes (28.9%), preserving
author-facing sections verbatim, but measured generation increased. Existing
provider prefix-cache usage was observed. Reducing input bytes alone did not
offset reasoning/output time. Lower thinking levels and more aggressive context
cuts were not promoted because they would change reasoning capacity or remove
potentially useful constraints.

Early baseline/reference/submit/Sol prompt snapshots contain the application
prompt but omit the runtime-appended completion instructions; later snapshots
include those instructions. Provider token metrics are the authoritative usage
measure; prompt byte counts exclude tool schemas and should not be treated as
complete request size. Exact completion instructions are exported in runtime.ts.
Failed provider requests may report zero tokens despite partial streamed tool
arguments; zero reported usage is not proof of zero billing.

## Artifacts and reproduction

The local comparison player runs at `http://127.0.0.1:5197/benchmark.html`, with
the loopback artifact server on port 8082. It loads original scene source and
frozen narration, supports scene selection and seeking, and shows failed trials.

Artifacts live under `data/scene-speed/` in the benchmark checkout: `fixtures/`
contains frozen scripts, narration and hashes; `runs/` contains source, canonical
input, prompt, validation diagnostics, per-turn timing/usage, and immutable run
results; `summary.json`/`.csv` contain measurements and `reviews.json` decisions.
They are ignored local data, not checked-in credentials or generated media.
Actual browser captures and 29 contact sheets live in the original checkout's
`data/scene-speed-frames/`. All candidate animations remain replayable, including
rejected variants for inspection. This is the app's interactive animation format,
not an exported MP4.

From the repository root, with Bun and authorized server environment loaded:

```sh
bun backend/bench/scene-speed.ts prepare
bun backend/bench/scene-speed.ts run baseline gpt-6-astra text full all standard
bun backend/bench/scene-speed.ts run reference gpt-6-astra validated-reference full all standard
bun backend/bench/repeat.ts
bun backend/bench/report.ts
bun backend/bench/scene-speed.ts serve
```

Run the animlib Vite dev server on loopback and open `/benchmark.html` for playback.
Completed and failed attempt directories cannot be overwritten: use new variant
names for further trials. `prepare` performs paid speech generation only for
missing fixtures. Never publish the private data directory automatically.

## Application switch and verification

`AGENT_SCENE_OUTPUT_MODE=validated-reference` enables the winner for scene tasks
only. Omit it or set `text` to restore the original protocol. Experimental submit
modes and reduced reference are benchmark-only and are not accepted by server
configuration. Credentials and global defaults are unchanged.

33 focused tests pass (95 assertions), covering candidate selection, invalid
references, repairs, provider failures, aborts, host revalidation, metrics,
reference extraction, and configuration scoping. Backend, animlib and benchmark
typechecks pass. Independent runtime and integration reviews found no remaining
blockers. The full backend suite reports 125 pass / 6 fail on Windows. The same
six baseline failures concern three narration pipeline/persistence tests, two
narration service tests, and a CRLF-sensitive guidance test; they predate this
change. Details are recorded in the local `final-tests.log`. This is not a clean
full-suite result.
