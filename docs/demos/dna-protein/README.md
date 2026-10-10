# DNA to protein: native animlib reconstruction

Current revision: **161 seconds, 1280×720, 24 fps, silent with 19 subtitle cues**, with smooth coordinate-derived ribosome and protein envelopes. See [smooth-revision.md](smooth-revision.md) and [smooth-final-review.md](smooth-final-review.md) for current evidence. [delivery-verification.md](delivery-verification.md) and [full-film-review.md](full-film-review.md) preserve the earlier film's checks and reference comparison.

Visual reference: [yourgenome, From DNA to protein – 3D](https://www.youtube.com/watch?v=gG7uCskUOrA), animated by Polymime. This is an independent geometry reconstruction, not the original film. Original frames, watermark, audio and video segments are not included in the animation. Captions are newly written.

## Replay

From repository root:

```powershell
node_modules/.bin/bun.cmd docs/demos/dna-protein/serve.ts
npm run dev --workspace animlib -- --host 127.0.0.1 --port 5207
```

Open `http://127.0.0.1:5207/dna-protein.html`. The source server listens only on `127.0.0.1:5215`. Proof versions use `?proof=v1`, `?proof=v2`, `?proof=v3`, or `?proof=v4`. The player uses actual animlib scene compilation, timeline and WebGPU rendering; no raster reference backdrop is loaded.

Matching before/after frames: `http://127.0.0.1:5207/dna-smooth-comparison.html`. The original film is preserved at `data/dna-protein/film-before-smooth.mp4`.

## Silent MP4

```powershell
node shared/animlib/tools/render-video.mjs --manifest docs/demos/dna-protein/manifest.json --output data/dna-protein/film.mp4 --ffmpeg data/video-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe
```

Use any available FFmpeg executable in place of the local path. Export defaults to 1280×720 at 24 fps, H.264/yuv420p with no audio track. Captions are embedded as a default English subtitle track without re-encoding the video, with SRT/VTT sidecars too. Browser playback keeps captions in a separate band below the image. Export never reads the original video. `proof-manifest.json` exports the eight-second fourth proof separately.

## Authorship and iteration

The coordinator sampled reference frames and wrote a visual specification. Animation authors were started without conversation images and instructed not to access the reference page or screenshots. They received text descriptions, installed library documentation, active authoring guidance, and later written comparison findings. A separate reviewer inspected original-reference pixels alongside native output. Generated scene changes were performed by the animation authors; the coordinator edited guidance, delivery infrastructure and original captions.

`proof-prompt.md` records the stable eight-second visual task. `skills-v1` through `skills-v6` preserve the active guidance snapshots. Version 6 adds host-precomputed molecular envelopes, coordinate preservation and scientific provenance. The same docking operation was retained through four visual iterations:

| Version | Observed result | Guidance change |
| --- | --- | --- |
| v1 | Enzyme became a ring around empty background; bases were short pegs. | Specify occupied mass and negative-space topology, projected proportions, and continuous joins. |
| v2 | Bases and occupied interior improved; protein still read as a slab. | Verify outward normals and rendered coarse volume before surface texture. |
| v3 | Real convex domains and readable docking; composition remained symmetric. | Preserve observed crop, path slopes and irregular domain distribution. |
| v4 | Asymmetric close-up and medium domains behind paired bases. | Independent gate cleared bounded native expansion; exact visual identity was not claimed. |
| v5 | Full chapters exposed browser compile timeouts despite isolated native checks. | Preserve native geometry through batching/precomputation or continuity-preserving chapter splits; require normal-player verification. |

These are guided author/reviewer iterations, not a controlled statistical model benchmark: the visual task stayed fixed while skill guidance and written findings changed. Reports preserve the differences between scientific mechanism, readability, reference correspondence and technical validity.

The v5 guidance snapshot records the full-film runtime lesson, not a fifth rendition of the eight-second proof. The first native chapter frames were retained before author repairs. `validate-film.mjs` checks the final sequence three times under default compilation limits, source/compiled hashes, durations, silence, sampled frame IDs and caption count. It does not substitute for pixel inspection or playback.

The reusable changes are active in `backend/prompts/scenegen/visualization.md`, `backend/prompts/animation-quality.md` and `backend/prompts/scene-verify.md`, so subsequent production generation receives them. Default black-stage lessons retain their style; explicit visual references can override that default. Existing verify-first/repair-afterward order is unchanged.

## Fidelity limits

Protein envelopes, cell anatomy, tRNA glyphs and reaction times are schematic. This film is not an atom-resolved simulation. In particular the cloverleaf tRNA is a secondary-structure diagram represented with tubes; real tRNA has an L-shaped three-dimensional fold ([RCSB PDB-101](https://pdb101.rcsb.org/motm/15)). Chromosome packaging is illustrative context, not a claim that transcription proceeds on a condensed mitotic chromosome.

The renderer provides shaded procedural geometry and material finish, but not the reference's depth of field, volumetric lighting, cast shadows or subsurface scattering. Matching composition and mechanism is assessed separately from those unavailable effects. See the independent proof reviews and final comparison report for actual evidence and remaining gaps.
