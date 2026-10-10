# Transcription motion proof v1

`proof-v1.js` is a standalone native animlib scene, authored from the written brief without opening reference video, reference images or extracted chunks. It is an illustrative transcription active-site cutaway, not an atomistic or experimentally derived polymerase structure.

The camera is steady and oblique. A single continuous, smoothly shaded, lobulated parametric shell forms the cropped gold enzyme environment. Two covalently continuous DNA tubes surround a short RNA strand. Incoming U, C and A dock against template A, G and T respectively, then remain as rigid, adjoining RNA backbone units. Existing backbone geometry does not deform. The three docking endpoints occur at 2.15, 4.30 and 6.45 seconds; the scene holds through exactly 8 seconds. Satin materials and low-strength procedural bump are native animlib geometry options. The violet background uses geometry and palette tokens only.

Validation: `compileSource` succeeded; `evaluateScene` succeeded at 0, 1.7, 2.15, 3.85, 6.45 and 8 seconds; compiled duration is exactly 8. The production native WebGPU renderer produced those six times at both 1280×720 and 960×720. Own-output images were inspected for framing, pairing, rod visibility and connectivity. No renderer files were changed.

From repository root, regenerate the render input after any source edit:

```powershell
node --input-type=module -e "import {readFileSync,writeFileSync} from 'node:fs'; import {compileSource,evaluateScene} from './shared/animlib/dist/core.js'; const source=readFileSync('docs/demos/dna-protein/proof-v1.js','utf8'); const c=await compileSource(source); if(c.duration!==8)throw new Error('duration'); for(const t of [0,1.7,2.15,3.85,6.45,8])evaluateScene(c,t); console.log('duration',c.duration); writeFileSync('docs/demos/dna-protein/proof-render-input.json',JSON.stringify({source,times:[0,1.7,2.15,3.85,6.45,8],directory:'docs/demos/dna-protein/proof-v1-frames'}));"
node shared/animlib/tools/render-frames.mjs docs/demos/dna-protein/proof-render-input.json
```

Review images are in `proof-v1-frames/`; `frames.json` maps filenames to sample times. This is a motion/composition proof awaiting coordinator visual review before expansion. It has no audio, exported video, atomistic geometry, phosphates, catalytic chemistry, or DNA translocation. Incoming backbone stubs establish the schematic covalent chain upon docking; free-nucleotide triphosphate chemistry is intentionally outside this proof. Frame sampling does not establish every intervening frame's appearance.
