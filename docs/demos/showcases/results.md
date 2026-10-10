# Production scene-stage results

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
478 hashed evidence artifacts. `showcase-audit.ts` verifies every archive digest
against raw data and all 18 accepted sources against their approved source hash.
The shared audio has 480,000 zero-valued mono PCM samples: exactly 20 seconds,
24 kHz, 16 bit. No encoded movie or frame-rate certification is claimed.

Baseline manifest records runtime revision `c4ee774`. A concurrent, separately committed
subtitle feature changed production code to `bfefe25` while baseline generation
was running; the existing process retained its loaded modules and the scene
Markdown did not change. Fresh serial reruns use that later production revision,
record runtime file hashes, and preserve the exact topic prompt hashes. Therefore
rerun outcomes are **not a controlled estimate of concurrency's effect**.

## Serial reruns

One fresh serial rerun is being made for each of the six failed topics in
`20261010-retry1`. Baseline failures and sources remain intact. Results will be
recorded here after generation and independent frame review finish.
