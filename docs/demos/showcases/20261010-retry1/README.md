# 20261010-retry1: production scene-stage benchmark

Actual createPiGenerator scene stage and PiAgentRunner tools; fixed one-scene planning and 20-second silent timing fixtures replace editorial planning and TTS. Generated source is never manually edited. Failed scenes remain unapproved.

Model: gpt-6-astra; thinking: high; production source commit: bfefe25d4453cf7bc6526b5f022fa8ab67a28a22. Each fixed topic requests one 20-second scene. Automatic visual approval is not independent scientific/style certification. Review findings are preserved for failed and repaired runs. No generated JavaScript was manually edited.

| Topic | Mode | Production result | Seconds | Repairs |
| --- | --- | --- | ---: | ---: |
| Fourier epicycles | 2d | pending | 0.0 | 0 |
| Continuous convolution | 2d | pending | 0.0 | 0 |
| Complex Möbius map | 2d | pending | 0.0 | 0 |
| Singular-value decomposition | 2d | pending | 0.0 | 0 |
| Bicubic surface patch | 3d | pending | 0.0 | 0 |
| Torus knot and moving frame | 3d | pending | 0.0 | 0 |
| Two-source wave interference | 2d | complete | 178.8 | 0 |
| Electromagnetic plane wave | 3d | pending | 0.0 | 0 |
| Kepler orbit and equal areas | 3d | failed — Automatic visual review rejected the scene after one targeted repair; no scene was published. See saved frame evidence and findings. | 239.5 | 1 |
| Electric dipole field | 3d | pending | 0.0 | 0 |
| Refraction through a prism | 3d | pending | 0.0 | 0 |
| Gyroscope orientation | 3d | pending | 0.0 | 0 |
| Rock-salt crystal lattice | 3d | pending | 0.0 | 0 |
| Membrane and ion channel | 3d | complete | 153.8 | 1 |
| Icosahedral viral capsid | 3d | pending | 0.0 | 0 |
| Protein alpha helix | 3d | pending | 0.0 | 0 |
| Planetary gear train | 3d | complete | 304.1 | 1 |
| Slider-crank mechanism | 3d | pending | 0.0 | 0 |
| Three-joint robot arm | 3d | pending | 0.0 | 0 |
| Optimization in a curved valley | 3d | failed — Automatic frame rendering failed (1): Buffer size (341821872) exceeds the max buffer size limit (268435456). This adapter supports a higher maxBufferSize of 2147483648, which can be specified in requiredLimits when calling requestDevice(). Limits differ by hardware, so always check the adapter limits prior to requesting a higher limit.  - While calling [Device].CreateBuffer([BufferDescriptor """"]).  [Invalid Buffer (unlabeled)] is invalid due to a previous error.  - While calling [Queue].WriteBuffer([Invalid Buffer (unlabeled)], (0 bytes), data, (170910936 bytes))  [Invalid Buffer (unlabeled)] is invalid due to a previous error.  - While encoding [RenderPassEncoder (unlabeled)].SetVertexBuffer(0, [Invalid Buffer (unlabeled)], 0, 18446744073709551615).  - While finishing [CommandEncoder (unlabeled)].  [Invalid CommandBuffer] is invalid due to a previous error.  - While calling [Queue].Submit([[Invalid CommandBuffer]])  . Check Node, native WebGPU and the animlib build. | 165.8 | 0 |
| Attention matrix and token mixing | 2d | pending | 0.0 | 0 |
| Weighted shortest-path frontier | 2d | pending | 0.0 | 0 |
| Textured river valley | 3d | failed — Automatic visual review rejected the scene after one targeted repair; no scene was published. See saved frame evidence and findings. | 190.8 | 1 |
| Voxel excavator at work | 3d | pending | 0.0 | 0 |

## Replay

From backend, set SHOWCASE_BATCH=20261010-retry1 and SHOWCASE_PORT=5212, then run `bun src/agents/showcase-trial.ts serve-archive`. Start animlib demo server on port5207, then open `http://127.0.0.1:5207/showcases.html?manifest=http%3A%2F%2F127.0.0.1%3A5212%2Fmanifest.json`. The manifest server binds only 127.0.0.1:5212. Select unapproved candidates only for inspection. Their label does not change on replay.

Additional native individual frames and generation logs remain in `data/showcases/20261010-retry1`. This portable archive retains unmodified source, inputs, both review/repair attempts, contact sheets, timing metrics and SHA-256 digests. Exact per-stage combined prompt transcripts are also archived and hashed. Manifest promptFiles describe batch-start checks, not guaranteed immutable instructions during a concurrently edited checkout; use the transcripts to establish effective instructions.
