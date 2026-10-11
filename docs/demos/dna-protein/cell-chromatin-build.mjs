// Reproduce geometry-preserving 24+20s scene-split verification.
import {readFileSync,writeFileSync} from 'node:fs';
import {compileSource,evaluateScene,detectSceneOverlaps} from '../../../shared/animlib/dist/core.js';
import {createHash} from 'node:crypto';
const source=readFileSync('docs/demos/dna-protein/cell-chromatin.js','utf8');
const packagingSource=readFileSync('docs/demos/dna-protein/packaging.js','utf8');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const runs=[];let cell,packaging,previousFrame;
for(let i=0;i<5;i++){
 cell=await compileSource(source,{executionLimitMs:125});previousFrame=evaluateScene(cell,24);
 packaging=await compileSource(packagingSource,{previous:previousFrame,executionLimitMs:125});
 runs.push({budgetMs:125,cellHash:hash(cell),packagingHash:hash(packaging)});
}
const cellTimes=[0,7,10,14,18,20,23,24],packagingTimes=[0,.5,2,6,9,12,13,14,15,16,20];
const before=JSON.parse(readFileSync('docs/demos/dna-protein/cell-chromatin-render-final.json','utf8'));
const original=await compileSource(before.source,{executionLimitMs:1000});
function visible(frame){return frame.elements.filter(e=>e.kind!=='group').map(e=>{const o={...e};delete o.persistent;delete o.transient;delete o.parent;return o;}).sort((a,b)=>a.id.localeCompare(b.id));}
const comparisons=[24,26,30,33,36,37,38,39,40,44].map(t=>{const old=evaluateScene(original,t),now=evaluateScene(packaging,t-24);return {globalTime:t,cameraEqual:hash(old.camera)===hash(now.camera),geometryEqual:hash(visible(old))===hash(visible(now))};});
const report={durations:[cell.duration,packaging.duration],total:cell.duration+packaging.duration,runs,comparisons,overlaps:[1280,960].map(width=>({width,cell:detectSceneOverlaps(cell,{width,height:720,times:cellTimes,includeAnimating:true}),packaging:detectSceneOverlaps(packaging,{width,height:720,times:packagingTimes,includeAnimating:true})})),finalCamera:evaluateScene(packaging,20).camera,finalPersistent:evaluateScene(packaging,20).elements.filter(e=>e.persistent).map(e=>e.id)};
writeFileSync('docs/demos/dna-protein/cell-chromatin-split-validation.json',JSON.stringify(report,null,2));
writeFileSync('docs/demos/dna-protein/cell-chromatin-render-split.json',JSON.stringify({source,times:cellTimes,directory:'docs/demos/dna-protein/cell-chromatin-frames-split'}));
writeFileSync('docs/demos/dna-protein/cell-chromatin-packaging-render.json',JSON.stringify({source:packagingSource,previousFrame,times:packagingTimes,directory:'docs/demos/dna-protein/cell-chromatin-packaging-frames'}));
console.log(JSON.stringify(report,null,2));
