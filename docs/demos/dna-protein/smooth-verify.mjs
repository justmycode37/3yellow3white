import {readFileSync,writeFileSync} from 'node:fs';
import {compileSource,evaluateScene,detectSceneOverlaps} from '../../../shared/animlib/dist/core.js';
import {rotate} from '../../../shared/animlib/dist/geometry.js';
const root='docs/demos/dna-protein/';
const source=f=>readFileSync(root+f,'utf8');
const tx=await compileSource(source('transcription-export.js'));
const incoming=evaluateScene(tx,tx.duration);
const oldEx=await compileSource(source('smooth-integration-baseline/rna-export.js'),{previous:incoming});
const oldTr=await compileSource(source('smooth-integration-baseline/translation.js'),{previous:evaluateScene(oldEx,26)});
const exSource=source('rna-export.js'),trSource=source('translation.js');
const ex=await compileSource(exSource,{previous:incoming});
const exEnd=evaluateScene(ex,26),tr=await compileSource(trSource,{previous:exEnd});
if(ex.duration!==26||tr.duration!==59||ex.options.audio||tr.options.audio||tr.options.end!=='hold')throw Error('Delivery contract changed');
const cameraTracks=c=>JSON.stringify(c.tracks.filter(t=>t.action.type==='camera'));
if(cameraTracks(ex)!==cameraTracks(oldEx)||cameraTracks(tr)!==cameraTracks(oldTr))throw Error('Authored camera/timing changed');
const transforms=frame=>{
  const map=new Map(frame.elements.map(e=>[e.id,e])),parents=new Map();
  for(const e of frame.elements)if(e.geometry.kind==='group')for(const c of e.geometry.children)parents.set(c,e.id);
  return(id,point=[0,0,0])=>{let p=point,e=map.get(id);while(e){p=rotate(p.map(q=>q*e.scale),e.rotation).map((q,k)=>q+e.position[k]);e=map.get(parents.get(e.id));}return p;};
};
let maxLinkError=0,maxMechanismDifference=0;
for(let t=0;t<=59;t+=.25){
  const f=evaluateScene(tr,t),before=evaluateScene(oldTr,t),a=transforms(f),b=transforms(before);
  for(const e of f.elements.filter(e=>/translation-(?:amino-acid-|[PA]-carrier|next-carrier|third-carrier|mRNA-base-)/.test(e.id))){
    maxMechanismDifference=Math.max(maxMechanismDifference,Math.hypot(...a(e.id).map((q,k)=>q-b(e.id)[k])));
  }
  if(t>=39){const points=Array.from({length:9},(_,i)=>a('translation-amino-acid-'+i));for(let i=1;i<9;i++)maxLinkError=Math.max(maxLinkError,Math.abs(Math.hypot(...points[i].map((q,k)=>q-points[i-1][k]))-.52));}
}
if(maxMechanismDifference>1e-8||maxLinkError>1e-8)throw Error('Mechanism positions or fixed peptide lengths changed');
const start=evaluateScene(tr,0),exMesh=exEnd.elements.find(e=>e.id==='ribosome-large-envelope'),trMesh=start.elements.find(e=>e.id==='translation-large-subunit');
if(!exMesh||!trMesh||JSON.stringify(exMesh.geometry)!==JSON.stringify(trMesh.geometry))throw Error('Subunit geometry differs across boundary');
const ew=transforms(exEnd),tw=transforms(start);
let maxBoundaryError=0,largeFront=-Infinity;
for(const p of trMesh.geometry.vertices){const a=ew(exMesh.id,p),b=tw(trMesh.id,p);maxBoundaryError=Math.max(maxBoundaryError,Math.hypot(a[0]-20-b[0],a[1]-b[1],a[2]-b[2]));largeFront=Math.max(largeFront,b[2]);}
if(maxBoundaryError>1e-8||largeFront>-.8)throw Error('Boundary mismatch or active-plane clearance violation');
const times=[0,7,20.5,51.9,52,52.5,53,59,52.75];
const overlaps=Object.fromEntries([[1280,720],[960,720]].map(([width,height])=>[`${width}x${height}`,detectSceneOverlaps(tr,{width,height,times,includeAnimating:true})]));
if(Object.values(overlaps).some(a=>a.length))throw Error('Sampled glyph overlap');
const envelopeTrack=tr.tracks.find(t=>t.action.ids.includes('translation-protein-envelope')&&t.action.properties?.opacity===1);
const schematicTrack=tr.tracks.find(t=>t.action.ids.includes('translation-folded-schematic-display')&&t.action.properties?.opacity===0);
const report={duration:{export:26,translation:59},audio:null,end:tr.options.end,sourceCharacters:{export:exSource.length,translation:trSource.length},cameraTracksUnchanged:true,maxMechanismDifference,maxLinkError,maxBoundaryError,largeFront,representationBlend:envelopeTrack&&schematicTrack?{start:schematicTrack.start,duration:schematicTrack.duration+envelopeTrack.duration,schematicFadeOut:schematicTrack.duration,exampleFadeIn:envelopeTrack.duration,isolated:true}:null,times,overlaps};
writeFileSync(root+'smooth-integration-verification.json',JSON.stringify(report,null,2));
writeFileSync(root+'smooth-export-render-input.json',JSON.stringify({source:exSource,previousFrame:incoming,times:[17,21,26],directory:root+'smooth-export-frames'}));
writeFileSync(root+'smooth-translation-render-input.json',JSON.stringify({source:trSource,previousFrame:exEnd,times,directory:root+'smooth-translation-frames'}));
console.log(JSON.stringify(report));
