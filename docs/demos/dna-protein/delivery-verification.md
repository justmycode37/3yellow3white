# Delivery verification

Historical verification for the pre-smoothing film, now preserved as `film-before-smooth.mp4`. See `smooth-revision.md` for the updated delivery; the hash below identifies the preserved baseline.

Branch: `amilibsam`. Reference: [yourgenome / From DNA to protein – 3D](https://www.youtube.com/watch?v=gG7uCskUOrA).

## Delivered artifacts

- Native browser player: `http://127.0.0.1:5207/dna-protein.html`.
- Silent MP4: `data/dna-protein/film.mp4` (16,270,547 bytes).
- H.264 High, yuv420p, 1280×720, 24 fps, 3,864 frames, exactly 161 seconds.
- No audio stream. Default English `mov_text` subtitle stream; all 19 extracted cues matched the manifest. SRT and VTT sidecars accompany the MP4.
- MP4 SHA-256: `17f5d4305c917c211f287439f9c34e4836ae3390f8dc6f697428fd7664b28b95`.

The MP4 was rendered through animlib's actual compiler, timeline, geometry and native WebGPU renderer. FFmpeg encoded native RGBA frames and muxed newly written subtitles; it never read the original video. No original frames, video chunks, audio or watermark are included.

## Verification

`film-validation.json` records three deterministic full-sequence compiles using the default 200 ms VM limit, evaluated previous-frame handoffs, matching durations, silent scenes and unique sampled element IDs. The five source scenes last 24, 20, 32, 26 and 59 seconds. No production timeout was increased.

The normal browser player loaded the frozen sequence and completed uninterrupted playback from 0 to 161 seconds, automatically crossing the 24, 44, 76 and 102 second boundaries. Subtitle text advanced with the global clock; the final UI returned to Play at 2:41 / 2:41 (`final-playback-end.png`). Earlier browser timeouts were reproduced and repaired through an opening chapter split and native geometry batching/precomputation. They are retained in the review history, not hidden by a larger timeout.

FFmpeg decoded all 3,864 encoded frames without an error (`data/dna-protein/film-decode.log`). Encoded frames at 64, 109 and 159 seconds were visually inspected after export; they retain the reviewed nucleotide pairing, exposed tRNA recognition rods and continuous gold protein envelope. Native chapter evidence covers both 1280×720 and 960×720. The encoded deliverable is 16:9.

Focused prompt/agent tests: 23 passed, 0 failed, 183 assertions. Animlib TypeScript check and Vite demo build passed. Build reports its existing large-chunk advisory. Windows sandbox denied some existing-path/temp operations; the same local checks passed outside that filesystem restriction.

## Actual visual result

Four versions of the same eight-second docking brief demonstrate improvement from an empty enzyme ring and short pegs to an occupied, asymmetrical, lobed cleft with long paired bases and continuous RNA. Full chapters were then authored and revised after native-frame verification. Authors received written observations and findings only. The separate reviewer inspected the reference pixels directly. See `full-film-review.md` and `proof-v4-review.md` for the independent gates.

This is an original, recognizable native reconstruction with substantial remaining differences from the requested exact visualizations. Cell interiors are sparser; chromosome/histone packaging is simpler; RNA and peptide chains are shorter; protein surfaces are coarser; some camera paths and framing differ. The final protein is a conceptual envelope, not a measured atomic model. Cinematic depth of field, volumetric lighting, cast shadows and subsurface scattering are absent. Sparse reference stills and playback checks do not establish exact motion correspondence.

Reusable lessons are active in production guidance, with snapshots `skills-v1` through `skills-v5`. These guided iterations provide concrete evidence of improved author output, not a controlled benchmark or guarantee for every future generation.
