# Transcription proof v4

Source: `proof-v4.js`. Final frames: `docs/demos/dna-protein/proof-v4-frames/`; final hold `1280x720-7.png`. V1, v2, v3 and the fixed task brief remain unchanged.

The asymmetric wedge follows the written composition review: upper DNA near the upper left edge bends downward toward the right; lower DNA rises strongly from the lower left to reconverge at right; RNA exits left and ends around the center. The camera height is now 6.25 with oblique yaw/pitch. Seven unequal medium protein domains occupy the space behind and between strands. Slate backbones, slender bases, pale selected letters, single-piece RNA exit and its matched tangent, cap-overlap joins, complementary U/C/A docking and exact eight-second timing remain.

The first native v4 frame showed the upper-left DNA too low. Its centerline was corrected after that inspection, lifting the upper left while retaining rightward convergence. The final render was inspected at both aspect ratios. The outside-site wedge coordinate asymptotically flattens to prevent DNA crossing; rods shorten only where the background DNA strands converge. Selected RNA/template partners retain 1.15-unit rods and a 0.10-unit pairing gap. The active RNA grows beside a stable template.

The first dense build exceeded the default compilation budget. Reducing hidden rear-body sampling and using appropriate tube/domain sampling restored default-budget compilation without removing domains or changing the motion. Final `compileSource` and eight `evaluateScene` samples pass, duration exactly 8 seconds. The native WebGPU tool rendered 16 frames: 0, 1.7, 2.15, 3.85, 4.3, 6.1, 6.45 and 8 seconds at 1280×720 and 960×720. Sampled glyph-overlap inspection, including animating labels, returned no intersections at both aspects (1000 ms compilation allowance for that inspection).

Regenerate from repository root:

```powershell
node --input-type=module -e "import {readFileSync,writeFileSync} from 'node:fs'; import {compileSource,evaluateScene} from './shared/animlib/dist/core.js'; const source=readFileSync('docs/demos/dna-protein/proof-v4.js','utf8'); const c=await compileSource(source); if(c.duration!==8)throw new Error('duration'); const times=[0,1.7,2.15,3.85,4.3,6.1,6.45,8]; for(const t of times)evaluateScene(c,t); writeFileSync('docs/demos/dna-protein/proof-v4-render-input.json',JSON.stringify({source,times,directory:'docs/demos/dna-protein/proof-v4-frames'}));"
node shared/animlib/tools/render-frames.mjs docs/demos/dna-protein/proof-v4-render-input.json
```

The author inspected only written comparison findings and own native renders. No reference video, images or chunks were accessed. This is a bounded native schematic approximation; no atomistic fidelity, catalytic chemistry, full transcription, reference-motion identity, depth of field or cast-shadow match is claimed. No full video expansion or renderer changes occurred in this proof task.
