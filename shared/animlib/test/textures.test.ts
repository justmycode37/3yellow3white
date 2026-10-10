import { describe, expect, it } from 'vitest';
import { compileSource } from '../src/compiler.js';
import { evaluateScene } from '../src/timeline.js';
import { SceneSequence } from '../src/sequence.js';
import { buildDrawItems } from '../src/render-geometry.js';
import { paletteResolver } from '../src/palette.js';
import { VERTEX_FLOATS } from '../src/texture-shader.js';
import type { Frame } from '../src/types.js';

const texture = { pattern:'checker', color:'BLUE', scale:[2,3,4], offset:[0.2,0.3,0.4], seed:42, bumpStrength:0.15 };
const options = JSON.stringify(texture);
const material = {metalness:0.8,roughness:0.2,specular:0.6,emissive:'GOLD',emissiveIntensity:0.25};
const items = (frame: Frame) => buildDrawItems(frame,frame.camera,640,480,paletteResolver());

describe('procedural textures', () => {
  it('preserves texture data on every spatial constructor and scene handoff', async () => {
    const scene = await compileSource(`export default scene({},s=>{
      const texture=${options}, material=${JSON.stringify(material)};
      const objects=[s.sphere('sphere',{texture,material}),s.box('box',{texture,material}),s.cylinder('cylinder',{texture,material}),
        s.cone('cone',{texture,material}),s.torus('torus',{texture,material}),s.tube('tube',{texture,material,points:[[0,0,0],[0,1,0]]}),
        s.surface('surface',{texture,material,fn:(x,y)=>x+y,xSegments:1,ySegments:1}),
        s.parametricSurface('parametric',{texture,material,fn:(u,v)=>[u,v,0],uSegments:1,vSegments:1}),
        s.mesh('mesh',{texture,material,vertices:[[0,0],[1,0],[0,1]],triangles:[[0,1,2]]})];
      s.keep(s.group('all',objects));s.wait(1);
    });`);
    const frame=evaluateScene(JSON.parse(JSON.stringify(scene)),1);
    expect(frame.elements.filter(e=>e.geometry.kind!=='group')).toHaveLength(9);
    for(const e of frame.elements.filter(e=>e.geometry.kind!=='group')) { expect(e.geometry.texture).toEqual(texture);expect(e.geometry.material).toEqual(material); }
    const next=await compileSource(`export default scene({},s=>{s.previous.get('all');s.wait(1)});`,{previous:frame});
    expect(evaluateScene(next,0).elements).toEqual(frame.elements);
  });

  it('keeps object-space coordinates under group transforms and orbit; strokes stay plain', async () => {
    const scene=await compileSource(`export default scene({},s=>{
      const box=s.box('box',{texture:${options},stroke:'WHITE',fill:'RED'});
      const group=s.group('group',[box]);s.play(group.rotateTo([0,1,0]),{duration:1});
    });`);
    const first=items(evaluateScene(scene,0)), last=items(evaluateScene(scene,1));
    for(let i=0;i<first.length;i++) {
      const a=first[i].vertices,b=last[i].vertices;
      for(let j=0;j<a.length;j+=VERTEX_FLOATS) {
        expect(Array.from(b.slice(j+15,j+24))).toEqual(Array.from(a.slice(j+15,j+24)));
        expect(a[j+18]).toBe(first[i].component==='fill'?1:0);
      }
    }
    expect(last[0].vertices.slice(0,3)).not.toEqual(first[0].vertices.slice(0,3));
    const frame=evaluateScene(scene,1);frame.camera.yaw=1;
    expect(items(frame)[0].vertices).toEqual(last[0].vertices);
  });

  it('scales bump height with nested object transforms without changing geometry',async()=>{
    const scene=await compileSource(`export default scene({},s=>{
      const box=s.box('box',{texture:${options},scale:2});
      const group=s.group('group',[box],{scale:3});s.play(group.scaleTo(6),{duration:1});
    });`);
    const start=evaluateScene(scene,0),end=evaluateScene(scene,1);
    expect(end.elements[0].geometry).toEqual(start.elements[0].geometry);
    expect(items(start)[0].vertices[30]).toBeCloseTo(0.15*6);
    expect(items(end)[0].vertices[30]).toBeCloseTo(0.15*12);
  });

  it('routes either translucent color through triangle sorting and honors fill none', async () => {
    const scene=await compileSource(`export default scene({},s=>{
      s.box('alpha',{fill:'RED',texture:{pattern:'stripes',color:{color:'BLUE',opacity:0.25}}});
      s.box('hidden',{fill:'none',texture:${options}});
      s.sphere('hidden-sphere',{fill:'none',texture:${options}});
    });`);
    const draws=items(evaluateScene(scene,0));
    expect(draws).toHaveLength(12);
    expect(draws.every(d=>d.transparent&&d.elementId==='alpha'&&d.vertices.length===3*VERTEX_FLOATS)).toBe(true);
    expect(draws[0].vertices[22]).toBe(0.25);
  });

  it('rebuilds texture controls, persists the result, and seeks deterministically', async () => {
    const sequence=new SceneSequence();
    try {
      expect((await sequence.submit({type:'load',scenes:[{id:'a',source:`export default scene({},s=>{
        const frequency=s.slider('frequency',{default:1,min:1,max:4});
        const ball=s.sphere('ball',{texture:{pattern:'wood',color:'GOLD',scale:frequency}});
        s.keep(ball);s.play(ball.moveTo([2,0,0]),{duration:2});
      });`},{id:'b',source:`export default scene({},s=>{s.previous.get('ball');s.wait(1)});`}]})).ok).toBe(true);
      await sequence.setControl('a','frequency',3);
      expect(sequence.frame(1,0).elements[0].geometry.texture?.scale).toBe(3);
      const middle=items(sequence.frame(0,1));sequence.frame(0,2);
      expect(items(sequence.frame(0,1))).toEqual(middle);
    }finally{sequence.dispose();}
  });

  it('uses target texture for compatible morph interiors and exact endpoint textures', async () => {
    const scene=await compileSource(`export default scene({},s=>{
      const ball=s.sphere('ball',{texture:${options}});
      s.play(ball.morphTo({kind:'sphere',radius:2,texture:{pattern:'wood',color:'RED'}}),{duration:1});
    });`);
    expect(items(evaluateScene(scene,0))[0].vertices[18]).toBe(1);
    expect(items(evaluateScene(scene,0.5))[0].vertices[18]).toBe(5);
    expect(items(evaluateScene(scene,1))[0].vertices[18]).toBe(5);
  });

  it.each([
    'null','{metalness:-0.1}','{metalness:1.1}','{roughness:0}','{roughness:1.1}',
    '{specular:2}','{emissiveIntensity:-1}','{emissiveIntensity:5}',
    '{roughness:NaN}','{emissive:"#fff"}','{bump:1}',
  ])('rejects invalid material %s',async material=>{
    await expect(compileSource(`export default scene({},s=>{s.sphere('bad',{material:${material}})});`)).rejects.toThrow();
  });

  it('validates emissive palette slots in initial geometry, morphs, and inherited states',async()=>{
    const palette={colors:{WHITE:'#fff',BLACK:'#000'},background:'BLACK',foreground:'WHITE'} as const;
    for(const body of [`s.sphere('bad',{material:{emissive:'BLUE'}})`,
      `const a=s.sphere('a');s.play(a.morphTo({kind:'sphere',material:{emissive:'BLUE'}}),{duration:1})`]) {
      await expect(compileSource(`export default scene({},s=>{${body}});`,{palette})).rejects.toThrow(/active palette/);
    }
    const previous=evaluateScene(await compileSource(`export default scene({},s=>{
      const a=s.sphere('a',{material:{emissive:'BLUE'}});s.keep(a);
    });`),0);
    await expect(compileSource(`export default scene({},s=>{s.previous.get('a')});`,{previous,palette})).rejects.toThrow(/active palette/);
  });

  it.each([
    "null", "{}", "{pattern:'image',color:'BLUE'}", "{pattern:'noise',color:'#fff'}",
    "{pattern:'noise',color:'BLUE',scale:0}", "{pattern:'noise',color:'BLUE',scale:-1}",
    "{pattern:'noise',color:'BLUE',scale:1001}", "{pattern:'noise',color:'BLUE',scale:[1,2]}",
    "{pattern:'noise',color:'BLUE',scale:NaN}", "{pattern:'noise',color:'BLUE',offset:[0,Infinity,0]}",
    "{pattern:'noise',color:'BLUE',seed:0.5}", "{pattern:'noise',color:'BLUE',seed:65536}",
    "{pattern:'noise',color:'BLUE',bumpStrength:NaN}", "{pattern:'noise',color:'BLUE',bumpStrength:1.1}",
    "{pattern:'noise',color:'BLUE',bumpStrength:-1.1}",
    "{pattern:'noise',color:'BLUE',url:'https://example.com'}",
  ])('rejects invalid texture %s', async value => {
    await expect(compileSource(`export default scene({},s=>{s.box('bad',{texture:${value}})});`)).rejects.toThrow();
  });

  it('rejects unsupported geometry and colors outside the host palette, including morphs', async () => {
    await expect(compileSource(`export default scene({},s=>{s.rectangle('bad',{texture:${options}})});`)).rejects.toThrow(/mesh or sphere/);
    const palette={colors:{WHITE:'#fff',BLACK:'#000'},background:'BLACK',foreground:'WHITE'} as const;
    for(const body of [`s.box('bad',{texture:${options}})`, `const a=s.sphere('a');s.play(a.morphTo({kind:'sphere',texture:${options}}),{duration:1})`]) {
      await expect(compileSource(`export default scene({},s=>{${body}});`,{palette})).rejects.toThrow(/active palette/);
    }
  });
});
