# Production scene-stage results

## User review follow-up — 2026-10-11

The counts below describe the original sampled review, not current acceptance.
The user's later playback review rejects additional clutter/motion in scenes 4
and 10 and solid penetration in scene 24. Their earlier independent-ready verdicts
are withdrawn pending a fresh generated proof. This leaves at most 15 of the 24
topics without a recorded unresolved issue; it is not a new exhaustive approval.

| Scene | Follow-up evidence | Instruction correction |
| --- | --- | --- |
| 4, SVD | Native frame 6 shows a full numeric factorization, underbraces and another active-operation expression competing with the geometry. | Start showcases without optional equations; use necessary local notation and plain factor labels; inspect rendered delimiters. |
| 7, interference | Retry frame 6 shows coarse cells; its source splits positive/negative color layers before interpolation. | Choose resolution by projected feature size; interpolate signed values before color mapping and inspect zero crossings. |
| 10, dipole | Source spends 9.6 seconds tracing 18 lines and 4 seconds turning a camera after the trace; the user rejects this extra motion. | Require a specific visible purpose for each motion; prefer an already-clear static field and reading hold. |
| 24, excavator | Contact at 6.8 seconds places bucket-floor bounds at x=[2.2783,3.4383], y=[0.8481,0.9781], z=[-0.52,0.52]. Intact bank cell `bank-2-2-2` occupies x=[2.832,3.148], y=[0.642,0.958], z=[-0.158,0.158]. Positive overlap proves penetration at that axis-aligned pose. Removing separate `cut-soil` objects at 7.4 seconds does not remove this bank cell. | Check swept bodies against actual remaining occupancy; synchronize cutting, removal and carried material from one shared state. |

Updated active `scene-craft`, `animation-quality`, `scene-verify` and `scene-repair`
Markdown. The production loader reads these directly; no demo source was edited.
The first-verification-before-repair sequence remains unchanged. Fifteen existing
prompt/verification/patch tests pass. Guidance application probes cover these four
subjects and a piston-wall transfer case; these are instruction checks, not fresh
generated animations or proof that future model output cannot fail. Library-level
sampling, collision and resource diagnostics remain necessary follow-up work.

## Baseline: 24 fixed topics

The batch used the actual scene generator, configured `gpt-6-astra` / `high`,
production Markdown, validation tools, native frame renderer, visual reviewer,
and targeted repair/re-verification. Only planning and narration were replaced
with the user-approved one-scene, 20-second silent fixture. No generated scene
source was manually edited and no compiler or quality limit was relaxed.

| Outcome | Count |
| --- | ---: |
| Topics attempted | 24 (7 in 2D, 17 in 3D) |
| Approved on first visual review | 5 |
| Approved after automatic visual repair | 13 |
| Failed native rendering/compilation | 5 |
| Rejected after final visual review | 1 |
| Production-approved and independently ready within sampled scope | 16 |
| Production-approved but independent revision needed | 2 |

“First visual review” does not mean the author passed every earlier validation
call. There were 17 unsuccessful validation calls across the batch. The single
per-scene visual repair stage can itself make multiple validation calls.

## What the frame audit found

- **Fourier:** coherent coefficient-derived motion, but small epicycles remain
  crowded and the formula is detached from its geometric referents.
- **Dijkstra:** correct shortest path and cost, but two intermediate node-distance
  replacements still overlap. Production approval missed these local transitions.
- **Kepler:** coherent orbit and area construction, rejected because the orbital
  path still crosses equation text after repair.
- **Interference:** initial rejected frames crossfade phase snapshots rather than
  showing a continuously synchronized field. The repaired source failed native
  rendering, so it has no final visual verdict.
- **Planetary gears, membrane, optimization and terrain:** native compilation
  interrupted before frame evidence. Their visual/scientific quality is unverified.
- The other 16 approved scenes pass the independent sampled review with documented
  qualifications. For example, capsid and protein geometry are explicitly
  idealized; gyroscope motion is prescribed kinematics, not integrated dynamics.

See the [full independent review](independent-review.md) for scene-specific
source checks, reviewed timestamps, aspect ratios and limits. A visual verdict
applies to those samples; it is not exhaustive scientific certification or proof
of every frame and orbit angle. Native review includes 16:9 and 4:3 samples.

## Timing and reproducibility

Median scene elapsed time was **176.9 seconds**, range **98.8–463.4 seconds**.
The sum of individual scene times was 4,672.7 seconds; this is **not wall time**,
because three jobs ran concurrently. Summed recorded stages were 3,453.2 seconds
authoring, 589.8 seconds repair, and 544.5 seconds visual review. Stage metrics
include their validation calls. The batch made 120 provider calls.

Native `interrupted` failures are consistent with pressure on the default 200 ms
compiler execution budget, but these logs alone do not establish the root cause.
The library limit was not changed. One browser cold compilation of Fourier also
interrupted; an unchanged-source retry played to 20 seconds. Bézier interior
motion was observed in the browser; independent reviewers used native samples.

The [baseline archive](20261010-batch1/README.md) retains 24 candidate sources and
624 hashed evidence artifacts, including exact prompt transcripts. `showcase-audit.ts` verifies every archive digest
against raw data and all 18 accepted sources against their approved source hash.
The shared audio has 480,000 zero-valued mono PCM samples: exactly 20 seconds,
24 kHz, 16 bit. No encoded movie or frame-rate certification is claimed.

Baseline manifest records runtime revision `c4ee774`. A concurrent, separately committed
subtitle feature changed production code to `bfefe25` while baseline generation
was running; the existing process retained its loaded modules and the scene
Markdown did not change. Fresh serial reruns use that later production revision,
record runtime file hashes, and preserve the exact topic prompt hashes. Concurrent
work subsequently edited production Markdown during the retry process. Production
reads these files per scene and per verification stage; process lifetime does not
freeze them. Therefore rerun outcomes are **not a controlled estimate of
concurrency's effect**.

The [effective prompt audit](effective-prompt-audit.json) compares each saved
combined prompt against the original Markdown content from `c4ee774`, normalizing
CRLF to LF for the containment check. It also records each transcript's byte hash.
All baseline stages contain their original components. Retry differences:

| Topic | Authoring instructions | Verification instructions |
| --- | --- | --- |
| Planetary | Original | Original |
| Interference | Original | Updated scene-verify |
| Kepler, membrane | Updated visualization and animation-quality | Also updated scene-verify |
| Optimization | Updated scene-craft, visualization and animation-quality | No review completed |
| Terrain | Updated scene-craft, visualization and animation-quality | Also updated scene-verify |

Batch manifest `promptFiles` are startup checks, not evidence that later dynamic
reads stayed unchanged. Exact retry transcripts are preserved in its archive.
No concurrent changes were reverted or used to manually edit generated scenes.

## Serial reruns

One fresh serial rerun finished for each of the six failed topics in
`20261010-retry1`. Baseline failures and sources remain intact. The other 18
catalog entries are pending placeholders in this subset manifest, not missing
rerun work. The gallery displays only the six requested topics.

| Topic | Retry production result | Independent result |
| --- | --- | --- |
| Planetary gears | Approved after repair | Ready within idealized mechanism scope |
| Membrane | Approved after repair | Ready within schematic scope |
| Interference | Approved on first review | Revise: coarse field and incorrect sign interpolation |
| Kepler | Rejected after repair | Revise: focus label points ambiguously toward sector endpoint |
| Optimization | Native rendering failed | Partial frames hide descent; buffer allocation exceeds configured device limit |
| Terrain | Rejected after repair | River/flow front and rocky elevation layer remain hidden |

Across both batches, **21 of 24 topics have a production-approved candidate**.
Of those, **18 are independently ready within the stated sampled scope**;
Fourier, Dijkstra and interference still require revision. Kepler, optimization
and terrain remain failed. This benchmark does not claim all 24 are solved.
See [retry frame review](retry-review.md) for evidence and scientific limits.

The serial rerun used 30 provider calls and 1,232.8 summed scene seconds, with
four unsuccessful author/repair validation calls. Its portable archive has 164
hashed artifacts and six untouched candidate sources; three approved source
hashes match their final production review. Both archive identity audits and
the exact 20-second zero-audio checks passed. Backend and animlib typechecks and
the gallery production build passed.

Planetary playback reached `ended` at 20 seconds in the frozen browser preview;
[saved screenshot](gear-browser.png) shows the final mechanism. An earlier cold
browser compilation interrupted; unchanged-source Refresh succeeded. The
[failure screenshot](gear-browser-interrupted.png) is retained. A copied build
on port 5213 avoids development reloads caused by concurrent work. These browser
checks do not certify frame rate or every interactive orbit angle.

Open the [24-topic baseline](http://127.0.0.1:5213/showcases.html?run=bezier) or
[six-topic rerun](http://127.0.0.1:5213/showcases.html?manifest=http%3A%2F%2F127.0.0.1%3A5212%2Fmanifest.json&run=planetary).
