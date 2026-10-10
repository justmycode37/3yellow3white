// Run after npm run build: node shared/animlib/bench/dynamic-surfaces.mjs
// CPU-only Node/QuickJS end-to-end inputs; excludes browser worker and GPU work.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { SceneSequence } from '../dist/sequence.js';
import { SourceCompiler } from '../dist/compiler-client.js';
const source = reactive => `export default scene({mode:'3d'},s=>{
 const a=s.slider('a',{${reactive?'reactive:true,':''}default:0.6,min:0,max:1.2});
 const m=s.surface('wave',{fn:(x,y)=>${reactive?'0':'a*Math.sin(2*x)*Math.cos(2*y)'},xSegments:32,ySegments:32});
 ${reactive?'s.deform(m,[a],([x,y],i,a)=>[x,y,a*Math.sin(2*x)*Math.cos(2*y)]);':''}
 s.wait(3);
});`;
const stats = values => {const a=[...values].sort((x,y)=>x-y);return {medianMs:a[Math.floor(a.length/2)],p95Ms:a[Math.ceil(a.length*.95)-1]};};
const rows=[];
for(const reactive of [false,true]) {
 const sequence=new SceneSequence();
 const original=SourceCompiler.prototype.compile;let compiles=0;
 SourceCompiler.prototype.compile=function(...args){compiles++;return original.apply(this,args);};
 try {
  assert.equal((await sequence.submit({type:'load',scenes:[{id:'wave',source:source(reactive)}]})).ok,true);
  for(let i=0;i<5;i++)await sequence.setControl('wave','a',i/5);
  compiles=0;const times=[];const scene=sequence.compiled[0];
  for(let i=0;i<30;i++) {const t=performance.now();await sequence.setControl('wave','a',i%2?0.4:0.9);times.push(performance.now()-t);}
  assert.equal(compiles,reactive?0:30);if(reactive)assert.equal(sequence.compiled[0],scene);
  rows.push({mode:reactive?'retained':'rebuild',vertices:1089,triangles:2048,samples:times.length,compiles,...stats(times)});
 }finally{SourceCompiler.prototype.compile=original;sequence.dispose();}
}
console.log(JSON.stringify({environment:{node:process.version,platform:process.platform,arch:process.arch},scope:'CPU-only control updates; no renderer, worker round trips, or GPU timings',rows},null,2));
