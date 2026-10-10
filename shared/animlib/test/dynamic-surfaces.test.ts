import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileSource, createSceneProgram } from '../src/compiler.js';
import { SourceCompiler } from '../src/compiler-client.js';
import { SceneSequence } from '../src/sequence.js';
import { evaluateScene } from '../src/timeline.js';
import { meshTriangles } from '../src/mesh-shading.js';
import { applyReactiveProperties } from '../src/reactive.js';
import { waveSource } from './dynamic-surface-cases.js';

const source = `export default scene({mode:'3d'},s=>{
 const a=s.slider('a',{reactive:true,default:1,min:0,max:3});
 const r=s.slider('r',{reactive:true,default:0.5,min:0.05,max:1});
 const m=s.mesh('m',{vertices:[[0,0,0],[1,0,0],[0,1,0]],triangles:[[0,1,2]],shading:'smooth',normals:[[0,0,1],[0,0,1],[0,0,1]]});
 s.deform(m,[s.time,a],([x,y,z],i,t,a)=>[x,y,z+t*a*y]);
 s.bind(m,[r],r=>({material:{roughness:r},texture:{pattern:'stripes',color:'BLUE',scale:r}}));
 s.keep(m);s.wait(3);
});`;
const sequences: SceneSequence[] = [];
async function load(text = source, suffix?: string) {
 const s = new SceneSequence(); sequences.push(s);
 const result = await s.submit({type:'load',scenes:[{id:'a',source:text},...(suffix ? [{id:'b',source:suffix}] : [])]});
 expect(result, JSON.stringify(result)).toMatchObject({ok:true}); return s;
}
afterEach(()=>{sequences.splice(0).forEach(s=>s.dispose());vi.restoreAllMocks();});

describe('retained fixed-topology deformation',()=>{
 it('samples exact absolute time, regenerates normals, preserves topology and serializes snapshots',async()=>{
  const s=await load(), original=s.compiled[0], before=structuredClone(original);
  const compile=vi.spyOn(SourceCompiler.prototype,'compile');
  const snapshot=await s.sample(0,2), frame=evaluateScene(snapshot,2), g=frame.elements[0].geometry;
  expect(g.vertices).toEqual([[0,0,0],[1,0,0],[0,1,2]]);
  expect(g.triangles).toEqual([[0,1,2]]);expect(g.normals).toBeUndefined();
  expect(meshTriangles(g).normals![0]).toEqual([0,-2/Math.sqrt(5),1/Math.sqrt(5)]);
  expect(evaluateScene(JSON.parse(JSON.stringify(snapshot)),2)).toEqual(frame);
  await s.evaluate(0,0.2);expect(await s.evaluate(0,2)).toEqual(frame);
  expect(s.compiled[0]).toBe(original);expect(original).toEqual(before);
  expect(compile).not.toHaveBeenCalled();
 });
 it('updates material independently, then deforms with current controls while paused',async()=>{
  const s=await load(), compiler=vi.spyOn(SourceCompiler.prototype,'update');
  await s.setControl('a','r',0.8);
  expect(compiler).toHaveBeenCalledTimes(1);expect(compiler.mock.calls[0][2]).toEqual(['r']);
  expect((await s.evaluate(0,2)).elements[0].geometry).toMatchObject({material:{roughness:0.8},vertices:[[0,0,0],[1,0,0],[0,1,2]]});
  await s.setControl('a','a',2);
  expect((await s.evaluate(0,2)).elements[0].geometry.vertices![2]).toEqual([0,1,4]);
  expect(compiler).toHaveBeenCalled();
 });
 it('keeps unrelated control-only bindings out of time sampling',async()=>{
  const p=await createSceneProgram(source);
  try { const updates=p.update({a:2,r:0.8},[],2);expect(updates).toHaveLength(1);expect(updates[0].properties).toHaveProperty('vertices'); }
  finally {p.dispose();}
 });
 it('uses end-time geometry for handoffs and updates downstream scenes transactionally',async()=>{
  const s=await load(source,`export default scene({},s=>{s.previous.get('m');s.wait(1);});`);
  expect(s.frame(1,0).elements[0].geometry.vertices![2]).toEqual([0,1,3]);
  await s.setControl('a','a',2);
  expect(s.frame(1,0).elements[0].geometry.vertices![2]).toEqual([0,1,6]);
  const before=s.compiled.slice();vi.spyOn(SourceCompiler.prototype,'compile').mockRejectedValueOnce(Error('suffix failed'));
  await expect(s.setControl('a','a',3)).rejects.toThrow('suffix failed');
  expect(s.compiled).toEqual(before);expect((await s.evaluate(0,2)).elements[0].geometry.vertices![2]).toEqual([0,1,4]);
 });
 it('does not resurrect removed meshes and clamps time',async()=>{
  const s=await load(source.replace('s.keep(m);s.wait(3);','s.wait(1);s.remove(m);s.wait(2);'));
  expect((await s.evaluate(0,-1)).elements[0].geometry.vertices![2]).toEqual([0,1,0]);
  expect((await s.evaluate(0,8)).elements).toEqual([]);
 });
 it('matches rebuilt wave geometry in independent views and isolated groups',async()=>{
  const s=await load(waveSource());
  for(const t of [0,0.5,1.5,4,0.5]) {
   const expected=await compileSource(waveSource(t));
   expect(await s.evaluate(0,t)).toEqual(evaluateScene(expected,t));
  }
 });
 it('rejects changed topology and nonfinite vertices atomically',async()=>{
  for(const expression of ['[[0,0,0]]','[[0,0,0],[1,0,0],[0,1,Infinity]]']) {
   const s=await load(source.replace("s.deform(m,[s.time,a],([x,y,z],i,t,a)=>[x,y,z+t*a*y]);",`s.bind(m,[a],a=>({vertices:a===2?${expression}:[[0,0,0],[1,0,0],[0,1,0]]}));`));
   const before=s.frame(0,1);await expect(s.setControl('a','a',2)).rejects.toThrow();expect(s.frame(0,1)).toEqual(before);
  }
 });
 it.each([
  "s.bind(m,[a],a=>({triangles:[[0,2,1]]}));",
  "s.bind(m,[a],a=>({normals:[[0,0,0],[0,0,1],[0,0,1]]}));",
  "s.bind(m,[a],a=>({material:{roughness:0}}));",
  "s.bind(m,[a],a=>({material:NaN}));",
  "s.bind(m,[a],a=>({texture:{pattern:'noise',color:'#ffffff'}}));",
  "s.bind(m,[a],a=>({vertices:[[0,0,0],[1,0,0],[0,1,0]]}));s.bind(m,[a],a=>({normals:null}));",
 ])('validates all geometry ownership and appearance patches: %s',async binding=>{
  await expect(compileSource(source.replace(/s.deform\(m,.*?;\n s.bind\(m,.*?;\n/,binding+'\n'))).rejects.toThrow();
 });
 it('rejects morph ownership and callbacks trying to rebuild the scene',async()=>{
  await expect(compileSource(source.replace('s.keep(m);','s.play(m.morphTo({kind:"mesh",vertices:[[0,0,0],[1,0,0],[0,1,1]],triangles:[[0,1,2]]}),{duration:1});'))).rejects.toThrow('own');
  await expect(compileSource(source.replace('[x,y,z+t*a*y]','(s.sphere("unsafe"),[x,y,z])'))).rejects.toThrow('building');
 });
 it('bounds each time callback and recovers after invalid samples without mutation',async()=>{
  const p=await createSceneProgram(source.replace('[x,y,z+t*a*y]','(t===1?(()=>{while(true){}})():[x,y,z+t*a*y])'),{}, {executionLimitMs:20});
  try { expect(()=>p.update({a:1,r:0.5},[],1)).toThrow();expect(p.update({a:1,r:0.5},[],2)[0].properties.vertices![2]).toEqual([0,1,2]); }
  finally {p.dispose();}
 });
 it('preserves extension geometry fields while replacing arrays and resets appearance explicitly',async()=>{
  const s=await load(), e=(await s.evaluate(0,2)).elements[0];
  Object.assign(e.geometry,{clipPlanes:[{normal:[0,1,0],offset:1}],outline:{color:'BLUE'}});
  applyReactiveProperties(e,{vertices:[[0,0,0],[1,0,0],[0,1,0]],material:null,texture:null});
  expect(e.geometry).toMatchObject({clipPlanes:[{normal:[0,1,0],offset:1}],outline:{color:'BLUE'}});
  expect(e.geometry.material).toBeUndefined();expect(e.geometry.texture).toBeUndefined();
 });
 it('recovers time-only runtime loss, and copies reused callback result arrays',async()=>{
  const text=`export default scene({},s=>{const m=s.surface('m',{fn:()=>0,xSegments:1,ySegments:1});
    const point=[0,0,0];s.deform(m,[s.time],([x,y],i,t)=>{point[0]=x;point[1]=y;point[2]=t;return point;});s.wait(3);});`;
  const s=await load(text), original=s.compiled[0];
  const frame=await s.evaluate(0,2);expect(new Set(frame.elements[0].geometry.vertices!.map(v=>v[0]+','+v[1])).size).toBe(4);
  const compiler=(s as unknown as {compiler:SourceCompiler}).compiler;
  (compiler as unknown as {failWorker(error:Error):void}).failWorker(Error('worker lost'));
  expect(await s.evaluate(0,2)).toEqual(frame);expect(s.compiled[0]).not.toBe(original);
  s.dispose();await expect(s.evaluate(0,2)).rejects.toThrow('disposed');
 });
 it('validates scalar ramp replacement against unchanged vertex count and palette',async()=>{
  const valid=source.replace("s.bind(m,[r],r=>({material:{roughness:r},texture:{pattern:'stripes',color:'BLUE',scale:r}}));", "s.bind(m,[r],r=>({scalarColors:{values:[0,r,1],domain:[0,1],colors:['BLUE','RED']}}));");
  const s=await load(valid);await s.setControl('a','r',0.8);
  expect((await s.evaluate(0,1)).elements[0].geometry.scalarColors?.values).toEqual([0,0.8,1]);
  for(const [from,to] of [["[0,r,1]","[0,r]"],["['BLUE','RED']","['none','RED']"],["[0,1],colors","[1,0],colors"]]) await expect(compileSource(valid.replace(from,to))).rejects.toThrow();
 });
});
