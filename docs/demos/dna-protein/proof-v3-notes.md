# Transcription proof v3

Source: `proof-v3.js`. Final native image directory: `docs/demos/dna-protein/proof-v3-frames/`. The final endpoint is `1280x720-7.png`; the two contact sheets per aspect cover all eight samples. V1, v2 and the fixed task brief are preserved.

This revision retains v2 rods, slate backbones, pale labels, gap-free RNA exit, complementary docking and exact eight-second choreography. Four unequal deformed domains now overlap the continuous protein rear body, presenting broad convex faces, dark inter-domain valleys and visibly different depths. They are coherent intersecting domains rooted in one occupied body, not disconnected beads. The active central contact region stays unobstructed.

The spherical parameter mapping was checked against `src/surfaces.ts`: helper triangles follow du cross dv; azimuth followed by polar angle pointed inward, so v3 reverses the azimuth. Winding correction alone did not produce sufficient visible volume in the first native render. The domains were then constructed and rendered. That render exposed star-shaped cusp highlights at the poles; making the angular Z perturbation vanish cubically with polar sine removed the cusps. Final images were inspected after that targeted repair. No renderer source was modified.

Compilation and evaluation passed at 0, 1.7, 2.15, 3.85, 4.3, 6.1, 6.45 and 8 seconds. Compiled duration is exactly 8 seconds. Native WebGPU rendered all eight times at 1280×720 and 960×720 under its default compiler settings. Additional glyph inspection with a 1000 ms compilation allowance reports no sampled text intersections at either aspect, including animating text. Source and render input contain the same final scene.

Regenerate after a source change:

```powershell
node --input-type=module -e "import {readFileSync,writeFileSync} from 'node:fs'; import {compileSource,evaluateScene} from './shared/animlib/dist/core.js'; const source=readFileSync('docs/demos/dna-protein/proof-v3.js','utf8'); const c=await compileSource(source); if(c.duration!==8)throw new Error('duration'); const times=[0,1.7,2.15,3.85,4.3,6.1,6.45,8]; for(const t of times)evaluateScene(c,t); writeFileSync('docs/demos/dna-protein/proof-v3-render-input.json',JSON.stringify({source,times,directory:'docs/demos/dna-protein/proof-v3-frames'}));"
node shared/animlib/tools/render-frames.mjs docs/demos/dna-protein/proof-v3-render-input.json
```

The animation author has inspected only own-output images and written reviewer findings. No reference video, reference images or extracted chunks were accessed. Reference correspondence remains an independent review judgment. The geometry is schematic; catalytic chemistry, polarity, atomistic provenance, cast shadows, depth of field and complete transcription are outside this proof. No full video was generated or expanded.
