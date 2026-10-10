# Cell, chromatin and DNA — chapter author notes

Sources: `cell-chromatin.js` (24 seconds), then `packaging.js` (20 seconds). Combined exactly 44 seconds, 3D, orbit disabled, `end: 'advance'`, no audio. Built solely from the supplied written shot specification, active authoring guidance, API reference, style contract, caption timing and our own approved proof-v4 geometry language. This author did not access the original reference video, screenshots or `data/reference-dna-protein`.

## Final compilation split and freeze

The normal browser player exposed a default 200 ms interruption despite the earlier monolithic Node checks. The reviewed source was split at global 24 seconds without changing geometry, camera paths, captions or global timing. `cell-chromatin.js` retains the chromatin group with `s.keep`; `packaging.js` retrieves that exact group with `s.previous.get` and removes it after its two-second transition. The atmosphere is recreated at the same pose without durable carry. There are no persistent survivors at packaging's 20-second end, so the next chapter receives no duplicate backdrop.

Final sources passed five consecutive runs with a deliberately tighter **125 ms VM budget**. Production remains at the unchanged default 200 ms. Compiled hashes were stable: cell `43eea04e9e1974b3360f7af95f63339b1f990269b59072fff883e98733525b8b`; packaging `3ec2116f4956d0f05891ec74c22541f0f5cedd30736909a4b3a645e5d30ca49f`. `cell-chromatin-split-validation.json` records 24+20 duration, zero sampled text overlaps, and exact camera/geometry equality with the reviewed monolithic version at global 24, 26, 30, 33, 36, 37, 38, 39, 40 and 44 seconds.

The split was rendered with the native utility at both aspects into `cell-chromatin-frames-split` and `cell-chromatin-packaging-frames`. `cell-chromatin-pixel-comparison.json` compares 32 reviewed frame pairs plus both handoff frames. The maximum frame mean absolute channel delta was 0.000103 on the 0–255 scale; sparse raster rounding/edge differences remain. At the 24-second boundary, only three channels differ by one level at 1280×720 and one channel by one level at 960×720. The final DNA endpoint PNG is byte-identical at both aspects. No visual changes were made after this check. Coordinator confirmed normal browser load and automatic traversal of the scene boundaries; its final reload must include the latest nonpersistent-background correction.

Current reproduction: run `node docs/demos/dna-protein/cell-chromatin-build.mjs`, then render `cell-chromatin-render-split.json` and `cell-chromatin-packaging-render.json` using `shared/animlib/tools/render-frames.mjs`. The packaging input includes the evaluated previous cell frame. `cell-chromatin-render-final.json` and `cell-chromatin-frames-final` deliberately remain the pre-split reviewed monolithic reference for comparison, not the production input.

## Construction and timeline

- 0–8: forward approach to a pink/lilac continuous lobular cell shell; opening subject occupies approximately 72% of frame height. Fine matching-color surface bump preserves the primary shading.
- 8–18: front hemisphere explicitly fades away. The remaining shell shows a white-pink cut edge, central violet nucleus, broad thickened folded ER sheets, and three elongated teal mitochondria with pale cristae.
- 18–24: the nuclear envelope is replaced by a posterior cutaway before entering. A bundle of chromatin remains visible through the camera approach. Cell context then exits.
- 24–30: two continuous lobular chromatids meet at a narrow waist. This is illustrative packaging context, not an actively transcribed mitotic chromosome; the supplied caption makes that distinction explicit.
- 30–37: chromosome becomes smaller background context on the left; a connected fibre leads into three flattened gold histone cores, each wrapped by two turns of DNA.
- 37–40: the connected outgoing miniature helix enlarges continuously while packaging context exits. There is no all-faded empty frame.
- 40–44: large long diagonal DNA holds; the local DNA label exits before the handoff.

Local Cell, Nucleus, Chromosome, Histone and DNA labels have white leaders and bounded lifetimes. There are no title cards, panel graphics or embedded subtitles. Earlier phase geometry is removed after its exit.

## Verification and evidence

Run `node docs/demos/dna-protein/cell-chromatin-build.mjs`, then `node shared/animlib/tools/render-frames.mjs docs/demos/dna-protein/cell-chromatin-render-final.json` from the repository root.

`cell-chromatin-frames-v1` and its render input preserve the first native verification, before visual repairs. V2–V6 preserve subsequent native evidence and source snapshots within their render inputs. `cell-chromatin-frames-final` contains the final native WebGPU frames, at 1280×720 and 960×720, for 0, 7, 10, 14, 18, 20, 23, 26, 30, 33, 36, 37, 38, 39, 40 and 44 seconds. Actual sheets and selected individual frames were inspected at both aspects. These are renderer evidence, not reference-derived images.

The pre-split reviewed monolithic source passed three consecutive `compileSource` runs with its unchanged default execution budget, and identical compiled SHA-256 `b31041724f5d7437b0b07799093a27ee418d755910d36b2f8fd5193f6206ea9e`. Host wall times were 395, 320 and 313 ms, which include work outside the 200 ms VM execution interval. Native frame generation passed again after the last cell-surface refinement. `cell-chromatin-validation.json` records exact duration 44, scene options, deterministic hashes, endpoint camera, and zero sampled text intersections at both aspects including animated text. Final frame has 87 elements: 80 atmosphere strips and the DNA group plus its six geometry children.

Repairs were driven by native evidence and the coordinator's written comparison feedback: removed diagonal transparent-background seams; removed the t38 empty gap; replaced wirelike ER with broad membrane faces; reduced cell texture contrast; differentiated mitochondrial bodies/folds; increased opening occupancy; smoothed the front cell pole. Batched static base half-rods into four native colored meshes to make default compilation dependable without raising its budget.

## Exact handoff to transcription

There is no persisted `s.keep` state at global 44 seconds. Only the intermediate 24-second boundary carries chromatin; packaging removes it. The next standalone transcription source can reproduce this evaluated endpoint pose at its zero time.

- Camera: yaw 0.12, pitch 0.06, height 11.5, distance 32, perspective 1, target `[0,0,0]`.
- DNA axis: x from −12 to 12, centerline `[x, 0.30*x, 0]`. Strand point `[x, 0.30*x + 1.1*cos(1.3*x + phase), 1.1*sin(1.3*x + phase)]`; phases 0 and π. Backbone radius 0.13.
- Base half-rods: radius 0.075; 31 pairs at `x=-11.4+i*0.76`, sharing the strand endpoints and midpoint. Repeated first-strand sequence `G,A,C,T,G,A,C,T,G,A,C,A,G,T,C,G,A,T,C,G,A,T,C`; second half complementary. A GREEN, T RED, C BLUE_A, G YELLOW_D.
- Backbone finish: GREY_C with GREY_D noise, scale 0.16, seed 12, bump 0.001; roughness 0.62, specular 0.32, PURE_BLUE emission 0.07.
- Atmosphere: PURPLE_D scene background; 80 adjacent non-overlapping rectangles at `y=-24+i*0.6`, position `[0,y+0.3,-12]`, width 80, height 0.6, BLUE_A fill with alpha `0.12+0.55/(1+exp((y+1)/4))`, no stroke. This avoids the native transparent-triangle overlap seam observed with giant nested translucent backgrounds.

## Limits

All geometry and motion are illustrative, not measured cellular ultrastructure or molecular dynamics. Histone wraps are a coarse DNA-centreline abstraction; DNA becomes explicitly double-stranded at the outgoing helix. ER is a compact set of folded sheets, not a complete organelle network. Packaging enlargement is an explanatory scale transition, not simulated enzymatic unwinding. Native material/shading approximates soft atmosphere and organic relief; there is no physical volumetric scattering, depth of field, cast shadow or custom light renderer. The native test utility does not include playback UI or captions; the coordinator must inspect the assembled player and final encoded video separately.


