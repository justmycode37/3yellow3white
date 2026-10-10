import { lightingSource } from '../demo/lighting.js';
import { describe, it, expect } from 'vitest';
import { compileSource } from '../src/compiler.js';
import { evaluateScene } from '../src/timeline.js';
import { lightingUniform, worldLightDirection } from '../src/lighting.js';
import { addPlanarShadows } from '../src/planar-shadows.js';
import { buildDrawItems } from '../src/render-geometry.js';
import { paletteResolver } from '../src/palette.js';
import { composeItems } from '../src/composition.js';
import { validateRenderableScene } from '../src/render-validation.js';
import { VERTEX_FLOATS } from '../src/texture-shader.js';
import type { CameraState, SceneLighting } from '../src/types.js';
const camera: CameraState = {yaw:0,pitch:0,target:[0,0,0],height:8,distance:12,perspective:1};
const lighting: SceneLighting = {directional:{direction:[1,2,0],space:'world',shadow:{softness:0,bias:0.002}},receiver:{position:[0,0,0],size:[2,2],fill:'WHITE'}};
const source = (options: unknown = lighting, style='') => `export default scene({lighting:${JSON.stringify(options)}},s=>{
 const b=s.box('b',{position:[0,1,0],width:1,height:1,depth:1,${style}});s.keep(b);s.play(b.moveTo([1,1,0]),{duration:1});
});`;
async function draw(style='') {
 const frame=evaluateScene(await compileSource(source(lighting,style)),0);
 const items=buildDrawItems(frame,camera,640,480,paletteResolver());
 return {items,result:addPlanarShadows(items,frame.lighting,camera,paletteResolver())};
}
describe('scene lighting and planar shadows',()=>{
 it('validates receiver colors against the rendering host palette',async()=>{
  const scene=await compileSource(source({...lighting,receiver:{size:[2,2],fill:'BLUE'}}));
  expect(()=>validateRenderableScene(scene)).not.toThrow();
  expect(()=>validateRenderableScene(scene,{colors:{BLACK:'#000000',WHITE:'#ffffff'},background:'BLACK',foreground:'WHITE'})).toThrow('BLUE');
 });
 it.each([true,false])('respects castShadow=%s on batched molecules',async castShadow=>{
  const scene=await compileSource(`export default scene({mode:'3d',lighting:${JSON.stringify(lighting)}},s=>{
   s.molecule('protein',{positions:[0,1,0],radius:0.2,castShadow:${castShadow}});s.wait(1);
  });`);
  const frame=evaluateScene(scene,0),items=buildDrawItems(frame,camera,640,480,paletteResolver());
  expect(items.length).toBeGreaterThan(0);
  expect(items.every(item=>item.castShadow===castShadow)).toBe(true);
  expect(addPlanarShadows(items,frame.lighting,camera,paletteResolver()).some(item=>item.groups?.some(group=>group.id.startsWith('@shadow')))).toBe(castShadow);
 });
 it('serializes, seeks deterministically, inherits handoffs and explicitly resets',async()=>{
  const scene=await compileSource(source());
  const frame=evaluateScene(scene,0);
  expect(frame.lighting).toEqual(lighting);
  evaluateScene(scene,1);expect(evaluateScene(scene,0)).toEqual(frame);
  const next=await compileSource('export default scene({},s=>s.wait(1))',{previous:evaluateScene(scene,1)});
  expect(next.options.lighting).toEqual(lighting);
  expect(evaluateScene(next,0).lighting).toEqual(lighting);
  const reset=await compileSource('export default scene({lighting:"studio"},s=>s.wait(1))',{previous:frame});
  expect(reset.options.lighting).toBe('studio');
  expect(lightingUniform(undefined,camera)).toEqual(lightingUniform('studio',camera));
 });
 it.each([null,{ambient:-1},{ambient:5},{ambient:Infinity},{unknown:1},{directional:null},{directional:{direction:[0,0,0]}},{directional:{direction:[1,2]}},{directional:{space:'local'}},{directional:{intensity:5}},{directional:{shadow:{}}},{...lighting,directional:{shadow:{quality:'ultra'}}},{...lighting,directional:{shadow:{bias:1}}},{...lighting,directional:{shadow:{softness:0.5}}},{receiver:{size:[0,1]}},{receiver:{size:[1,1],fill:'none'}},{receiver:{size:[1,1],fill:'red'}},{receiver:{size:[1,1],fill:{color:'WHITE',opacity:0.5}}}])('rejects invalid lighting %j',async options=>{
  await expect(compileSource(source(options))).rejects.toThrow();
 });
 it('rotates world directions into each effective view; camera directions stay fixed',()=>{
  const orbit={...camera,yaw:Math.PI/2};
  expect(lightingUniform({directional:{direction:[0,0,1],space:'world'}},orbit).slice(0,3)).toEqual([-1,0,expect.closeTo(0,10)]);
  expect(lightingUniform({},orbit)).toEqual(lightingUniform({},camera));
  expect(worldLightDirection({directional:{direction:[0,0,1]}},orbit)).toEqual([1,0,expect.closeTo(0,10)]);
 });
 it('composes the receiver and masks as one opaque layer before unrelated transparency',async()=>{
  const {result}=await draw();
  const farGlass={depth:1e5,vertices:new Float32Array(3*VERTEX_FLOATS),transparent:true,screen:false};
  const {commands}=composeItems([...result,farGlass],0);
  const receiver=commands.findIndex(c=>'children' in c&&c.receiverLight!==undefined);
  expect(receiver).toBeGreaterThanOrEqual(0);
  expect(commands[receiver]).toMatchObject({opaque:true,opacity:1});
  expect(commands.at(-1)).toMatchObject({opaque:false,count:3});
  const layer=commands[receiver];
  if('children' in layer){
   expect(layer.receiverColor).toEqual([1,1,1]);
   expect(layer.receiverShadow).toBeGreaterThan(0);
   expect(layer.children.some(c=>'children' in c&&c.additive)).toBe(true);
  }
 });
 it('clips actual packed caster triangles to finite plane bounds, with a world-unit bias',async()=>{
  const {result}=await draw();
  const shadows=result.filter(i=>i.groups?.some(g=>g.id.startsWith('@shadow')));
  expect(shadows).toHaveLength(1);
  for(const item of shadows){
   expect(item.vertices.length%VERTEX_FLOATS).toBe(0);
   for(let i=0;i<item.vertices.length;i+=VERTEX_FLOATS){
    expect(item.vertices[i]).toBeGreaterThanOrEqual(-1);expect(item.vertices[i]).toBeLessThanOrEqual(1);
    expect(item.vertices[i+1]).toBeCloseTo(0.002);expect(Math.abs(item.vertices[i+2])).toBeLessThanOrEqual(1);
    expect(item.vertices[i+6]).toBe(1);
   }
  }
 });
 it.each(['castShadow:false','opacity:0.5',"texture:{pattern:'checker',color:{color:'WHITE',opacity:0.5}}",'billboard:true','viewportOffset:[0.1,0]'])('excludes nonphysical or translucent casters: %s',async style=>{
  const {result}=await draw(style);expect(result.some(i=>i.groups?.some(g=>g.id.startsWith('@shadow')))).toBe(false);
 });
 it('excludes translucent isolated groups, bounds sample count, and never mutates packed geometry',async()=>{
  const {items}=await draw();const before=structuredClone(items);
  const high={...lighting,directional:{...lighting.directional,shadow:{quality:'high' as const}}};
  expect(addPlanarShadows(items,high,camera,paletteResolver()).filter(i=>i.groups?.some(g=>g.id.startsWith('@shadow')))).toHaveLength(13);
  expect(items).toEqual(before);
  for(const item of items)item.groups=[{id:'fade',opacity:0.5}];
  expect(addPlanarShadows(items,high,camera,paletteResolver()).some(i=>i.groups?.some(g=>g.id.startsWith('@shadow')))).toBe(false);
 });
 it('keeps inherited noncasting policy when a departing group is baked',async()=>{
  const scene=await compileSource(`export default scene({lighting:${JSON.stringify(lighting)}},s=>{
    const b=s.box('b');s.group('g',[b],{castShadow:false});s.keep(b);s.wait(1);
  })`);
  const next=await compileSource('export default scene({},s=>s.wait(1))',{previous:evaluateScene(scene,1)});
  expect(next.initial[0].castShadow).toBe(false);
  const frame=evaluateScene(next,0),items=buildDrawItems(frame,camera,640,480,paletteResolver());
  expect(addPlanarShadows(items,frame.lighting,camera,paletteResolver()).some(i=>i.groups?.some(g=>g.id.startsWith('@shadow')))).toBe(false);
 });
 it('compiles the demo and rebuilds lighting from its ordinary controls',async()=>{
  const demo=await compileSource(lightingSource.source,{controls:{space:'camera',ambient:0.5,quality:'high'}});
  expect(demo.options.lighting).toMatchObject({ambient:0.5,directional:{space:'camera',shadow:{quality:'high'}}});
 });
 it('uses final deformed triangles and excludes below-plane geometry',async()=>{
  const {items}=await draw();
  for(const item of items)for(let i=0;i<item.vertices.length;i+=VERTEX_FLOATS)item.vertices[i+1]=-2;
  expect(addPlanarShadows(items,lighting,camera,paletteResolver()).some(i=>i.groups?.some(g=>g.id.startsWith('@shadow')))).toBe(false);
 });
});
