# Transcription proof v2

Source: `proof-v2.js`. Original `proof-v1.js`, v1 images and `proof-prompt.md` remain unchanged. This revision follows updated `visualization.md`, `animation-quality.md`, the applicable verification criteria in `scene-verify.md`, and written coordinator/reviewer findings. No reference images, video, or extracted chunks were accessed by the animation author.

Changes: replaced the toroidal opening with one continuous asymmetric protein mass, including a rear floor and broad sculpted lobes; lengthened nucleotide rods to 1.15 units with 0.21-unit diameter (5.48:1), reduced base spacing to 0.76 and backbone radius to 0.165; brought complementary RNA/template tips within 0.10 units; adjusted rendered backbone finish to slate; enlarged selected letters to pale, upright adjacent labels. The RNA exit and pre-existing RNA are now one tube with an analytically matched join tangent, removing the earlier exit seam. Docked new backbone stubs overlap their neighbor by 0.02 units along the same curve with the same radius, concealing end caps while retaining connectivity.

First v2 rendering demonstrated protein occlusion of the upper DNA backbone and teal material response. The targeted repair recessed the protein volume, corrected the backbone finish and removed the RNA join seam. The final render preserves both distinct DNA backbones. The docking choreography is retained: U/A, C/G and A/T, ending at 2.15, 4.30 and 6.45 seconds, followed by a hold to exactly 8 seconds.

Validation: `compileSource` and `evaluateScene` passed at eight sample times, including every exact docking endpoint. Native WebGPU produced 16 frames at 1280×720 and 960×720. Sampled glyph overlap inspection, including animating labels, reported no intersections at either aspect ratio. Own-output final frame and operation contact sheets were visually inspected. Reference resemblance remains for the independent coordinator review; the author has only written comparison evidence.

One later compilation for glyph inspection exceeded the default 200 ms VM budget. Glyph inspection was rerun successfully with `executionLimitMs:1000`; the native frame runs had compiled under the default budget. This suggests the dense protein mesh is close to the default compilation budget on this host.

Regenerate from repository root:

```powershell
node --input-type=module -e "import {readFileSync,writeFileSync} from 'node:fs'; import {compileSource,evaluateScene} from './shared/animlib/dist/core.js'; const source=readFileSync('docs/demos/dna-protein/proof-v2.js','utf8'); const c=await compileSource(source); if(c.duration!==8)throw new Error('duration'); const times=[0,1.7,2.15,3.85,4.3,6.1,6.45,8]; for(const t of times)evaluateScene(c,t); console.log('duration',c.duration); writeFileSync('docs/demos/dna-protein/proof-v2-render-input.json',JSON.stringify({source,times,directory:'docs/demos/dna-protein/proof-v2-frames'}));"
node shared/animlib/tools/render-frames.mjs docs/demos/dna-protein/proof-v2-render-input.json
```

Final image output directory: `docs/demos/dna-protein/proof-v2-frames/`. `frames.json` records times, sizes and paths. This schematic proof does not claim atomistic fidelity, full catalytic chemistry, polarity, complete transcription, motion identity to the reference, or full-video completion. Native lighting lacks reference-grade cast shadows and depth of field. No renderer changes, video export, or full-scene expansion were made.
