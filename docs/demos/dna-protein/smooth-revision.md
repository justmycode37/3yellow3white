# Smooth molecular revision

User request: make the deposited molecular models smoother, use them in the existing DNA film, preserve its visual style, and show matching before/after frames.

The existing 161-second film is the visual baseline. Preserve its camera paths, chapter timing, gold protein material, slate DNA/RNA, purple-to-cyan atmosphere, label styling and silent subtitle delivery. Molecular coordinate data comes from the existing 1CRN and 1JJ2 fixtures. Smooth envelopes are approximations derived from those coordinates, not measured molecular surfaces.

Replace the large ribosomal subunit consistently across RNA-export and translation. The small subunit remains schematic because 1JJ2 supplies only the large subunit. Keep all visible codon/anticodon contacts and peptide-link lengths. At the ending, blend from schematic folding into a crambin envelope as an explicitly labelled structural example; the animation does not claim to synthesize that specific sequence.

Preserved baseline: `before-smooth/` contains both affected sources, manifest, validation report and frames at global 102, 109, 122.5 and 161 seconds. `data/dna-protein/film-before-smooth.mp4` preserves the prior film. Historical proof and frame directories remain unchanged.

Acceptance requires native first-pass frames before repairs, matching camera/time comparisons, continuous subunit geometry at global 102 seconds, unchanged 161-second duration and default compiler budgets, complete browser playback, exported MP4 decoding, and subtitle verification. The final notes below will record actual evidence and any remaining limitations.

## Implementation and inspected evidence

The reusable host-side `createMolecularEnvelope` extracts a Gaussian-density mesh from all supplied coordinate sites, fixes face orientation, applies six Taubin smoothing cycles, and recomputes smooth normals. The prepared 1CRN and 1JJ2 assets use resolution 14: 2,080 and 2,940 triangles respectively. Their combined JSON payload is about 184 KB. The scene VM still uses its normal 200 ms execution limit and 256,000-character source limit; preprocessing runs outside it.

The first native renders exposed grid stair-steps and were preserved before repair. An independent review then caught transparent triangle patches during the protein reveal. Isolating the display groups and separating the schematic fade-out (0.45 seconds) from the envelope fade-in (0.65 seconds) removed that defect within the same original 51.9–53 second local transition window.

`smooth-integration-verification.json` records unchanged camera tracks, zero sampled RNA/tRNA/amino-acid position differences, maximum peptide-link error 1.89e-15, and maximum large-subunit vertex difference across the 102-second boundary 1.78e-15. The whole boundary frame is not claimed pixel-identical: the retained lower schematic subunit has small raster differences. Export and translation remain 26 and 59 seconds, with source sizes 177,399 and 197,962 characters.

Matching native before/after frames at global 122.5 and 161 seconds are presented by `shared/animlib/demo/dna-smooth-comparison.html`; its browser screenshot is `data/dna-protein/smooth-before-after.png`. The page preserves the same framing, gold material, purple/cyan fields, and labels. Finite polygonal detail remains visible at some silhouette angles. The envelopes are smoother explanatory geometry, not exact solvent surfaces.

Verification completed: 479 library tests, library build, typecheck and demo build; two active-prompt tests; three deterministic whole-film validation passes under default limits. `skills-v6` records active molecular-envelope guidance. The first three film chapters remain byte-identical to the preserved baseline.

## Encoded delivery

The final native WebGPU export is `data/dna-protein/film.mp4`: H.264/yuv420p, 1280×720, 24 fps, 3,864 frames, exactly 161 seconds, no audio stream, and a default English `mov_text` subtitle stream. FFmpeg decoded every frame successfully. All 19 caption texts were extracted from the embedded stream and checked against the manifest. Logs are `data/dna-protein/film-smooth-export.log` and `film-smooth-decode.log`; extracted captions are `film-smooth-extracted.srt`.

The coordinator inspected encoded frames at 122.5 and 160 seconds (`smooth-encoded-ribosome.png` and `smooth-encoded-protein.png`): smooth silhouettes, gold shading, active RNA/tRNA contacts, cyan/purple atmosphere, and clear Protein label remain intact. The original video is still preserved separately.

Final MP4 SHA-256: `66BC30D80E70CE1F3AD06078A43D01275FC497676331E3E2041AF1FA6AB13473`.

The normal browser player loaded all five frozen scenes under default limits and played continuously from 0 to 161 seconds without seeking. Observations confirmed packaging, transcription, translation and the final crambin subtitle, then the 2:41 / 2:41 hold with the Play button restored and no playback-error message. Endpoint evidence: `data/dna-protein/smooth-browser-endpoint.png`. Both the live film and matching-frame comparison page remain open for the user.
