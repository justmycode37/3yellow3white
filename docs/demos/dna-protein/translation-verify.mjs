import {readFileSync,writeFileSync} from 'node:fs';
import {compileSource,evaluateScene,detectSceneOverlaps} from '../../../shared/animlib/dist/core.js';
import {rotate} from '../../../shared/animlib/dist/geometry.js';
const path='docs/demos/dna-protein/translation.js';
const source=readFileSync(path,'utf8'),compiled=await compileSource(source);
if(compiled.duration!==59)throw Error('Translation must be exactly 59 seconds');
const times=[0,7,16,20.5,24.7,30.5,33.8,38.8,42,46,48.5,51,53.5,59];
function center(frame,id){
  const map=new Map(frame.elements.map(e=>[e.id,e])),parents=new Map();
  for(const e of frame.elements)if(e.geometry.kind==='group')for(const c of e.geometry.children)parents.set(c,e.id);
  let p=[0,0,0],e=map.get(id);
  while(e){p=rotate(p.map(v=>v*e.scale),e.rotation).map((v,i)=>v+e.position[i]);e=map.get(parents.get(e.id));}
  return p;
}
let maxLinkError=0;
for(let t=39;t<=59;t+=.25){
  const f=evaluateScene(compiled,t);
  const p=Array.from({length:9},(_,i)=>center(f,'translation-amino-acid-'+i));
  for(let i=1;i<9;i++)maxLinkError=Math.max(maxLinkError,Math.abs(Math.hypot(...p[i].map((v,j)=>v-p[i-1][j]))-.52));
}
if(maxLinkError>1e-8)throw Error('Fixed peptide segment length changed');
const overlaps=Object.fromEntries([[1280,720],[960,720]].map(([width,height])=>[`${width}x${height}`,detectSceneOverlaps(compiled,{width,height,times,includeAnimating:true})]));
if(Object.values(overlaps).some(v=>v.length))throw Error('Sampled glyph overlap');
const report={duration:compiled.duration,end:compiled.options.end,audio:compiled.options.audio??null,maxLinkError,times,overlaps,renderBackend:'native-webgpu'};
writeFileSync('docs/demos/dna-protein/translation-verification.json',JSON.stringify(report,null,2));
writeFileSync('docs/demos/dna-protein/translation-render-input.json',JSON.stringify({source,times,directory:'docs/demos/dna-protein/translation-frames'}));
console.log(JSON.stringify(report));
