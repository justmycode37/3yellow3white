# 20261010-batch1: production scene-stage benchmark

Actual createPiGenerator scene stage and PiAgentRunner tools; fixed one-scene planning and 20-second silent timing fixtures replace editorial planning and TTS. Generated source is never manually edited. Failed scenes remain unapproved.

Model: gpt-6-astra; thinking: high; production source commit: c4ee774270e931fbb518650ba51d40e6d0345b27. Each fixed topic requests one 20-second scene. Automatic visual approval is not independent scientific/style certification. Review findings are preserved for failed and repaired runs. No generated JavaScript was manually edited.

| Topic | Mode | Production result | Seconds | Repairs |
| --- | --- | --- | ---: | ---: |
| Fourier epicycles | 2d | complete | 152.1 | 1 |
| Continuous convolution | 2d | complete | 142.3 | 0 |
| Complex Möbius map | 2d | complete | 236.6 | 1 |
| Singular-value decomposition | 2d | complete | 175.4 | 1 |
| Bicubic surface patch | 3d | complete | 228.7 | 1 |
| Torus knot and moving frame | 3d | complete | 173.5 | 1 |
| Two-source wave interference | 2d | failed — Automatic frame rendering failed (1): interrupted . Check Node, native WebGPU and the animlib build. | 463.4 | 1 |
| Electromagnetic plane wave | 3d | complete | 182.5 | 1 |
| Kepler orbit and equal areas | 3d | failed — Automatic visual review rejected the scene after one targeted repair; no scene was published. See saved frame evidence and findings. | 184.8 | 1 |
| Electric dipole field | 3d | complete | 138.7 | 0 |
| Refraction through a prism | 3d | complete | 187.2 | 1 |
| Gyroscope orientation | 3d | complete | 219.5 | 1 |
| Rock-salt crystal lattice | 3d | complete | 113.2 | 1 |
| Membrane and ion channel | 3d | failed — Automatic frame rendering failed (1): interrupted . Check Node, native WebGPU and the animlib build. | 132.9 | 0 |
| Icosahedral viral capsid | 3d | complete | 117.0 | 0 |
| Protein alpha helix | 3d | complete | 276.8 | 1 |
| Planetary gear train | 3d | failed — Automatic frame rendering failed (1): interrupted . Check Node, native WebGPU and the animlib build. | 154.3 | 0 |
| Slider-crank mechanism | 3d | complete | 150.2 | 0 |
| Three-joint robot arm | 3d | complete | 139.2 | 1 |
| Optimization in a curved valley | 3d | failed — Automatic frame rendering failed (1): interrupted . Check Node, native WebGPU and the animlib build. | 366.3 | 0 |
| Attention matrix and token mixing | 2d | complete | 196.2 | 0 |
| Weighted shortest-path frontier | 2d | complete | 178.4 | 1 |
| Textured river valley | 3d | failed — Automatic frame rendering failed (1): interrupted . Check Node, native WebGPU and the animlib build. | 98.8 | 0 |
| Voxel excavator at work | 3d | complete | 264.7 | 1 |

## Replay

From backend, set SHOWCASE_BATCH=20261010-batch1 and SHOWCASE_PORT=5211, then run `bun src/agents/showcase-trial.ts serve-archive`. Start animlib demo server on port5207, then open `http://127.0.0.1:5207/showcases.html`. The manifest server binds only 127.0.0.1:5211. Select unapproved candidates only for inspection. Their label does not change on replay.

Additional native individual frames and generation logs remain in `data/showcases/20261010-batch1`. This portable archive retains unmodified source, inputs, both review/repair attempts, contact sheets, timing metrics and SHA-256 digests. Exact per-stage combined prompt transcripts are also archived and hashed. Manifest promptFiles describe batch-start checks, not guaranteed immutable instructions during a concurrently edited checkout; use the transcripts to establish effective instructions.
