import { describe, it, expect } from 'vitest';
import { detectOverlaps } from '../src/overlap.js';
import { explanatorySources } from '../demo/explanatory.js';
import { compileSource } from '../src/compiler.js';
import { evaluateScene } from '../src/timeline.js';
import { buildDrawItems } from '../src/render-geometry.js';
import { explainMesh, scalarVertexColors, outlineEdges, type Corner } from '../src/explanatory.js';
import { meshTriangles } from '../src/mesh-shading.js';
import { project, rotate } from '../src/geometry.js';
import { createSolidBuilders } from '../src/solids.js';
import { paletteResolver } from '../src/palette.js';
import { VERTEX_FLOATS } from '../src/texture-shader.js';
import { add, cameraRay, cross, planePoint, sub } from '../src/spatial.js';
import type { CompileInput, Geometry, Vec3 } from '../src/types.js';
const solids=createSolidBuilders();
const corners=(g:Geometry):Corner[]=>meshTriangles(g).points.map(p=>({p}));
const area=(c:Corner[])=>{let sum=0;for(let i=0;i<c.length;i+=3)sum+=Math.hypot(...cross(sub(c[i+1].p,c[i].p),sub(c[i+2].p,c[i].p)))/2;return sum;};
const scene=(body:string)=>compileSource(`export default scene({},s=>{${body};s.wait(1)});`);
const draw=async(body:string,time=0)=>{const c=await scene(body),f=evaluateScene(c,time);return buildDrawItems(f,f.camera,640,480,paletteResolver());};

describe('explanatory geometry',()=>{
  it.each(explanatorySources)('compiles $id with the production sandbox budget',async({source})=>{
    // No test-only execution limit: this is the same budget the demo host uses.
    const c=await compileSource(source);
    expect(evaluateScene(c,0).elements.length).toBeGreaterThan(0);
  });
  it.each(explanatorySources)('rebuilds $id controls with the production sandbox budget',async({id,source})=>{
    const cases: Record<string, NonNullable<CompileInput['controls']>[]> = {
      'section-lab': [{cut:-0.65,caps:false},{cut:0,caps:true},{cut:0.65,caps:true}],
      'scalar-lab': [{amplitude:0.25,cut:-2},{amplitude:1.5,cut:2}],
      'outline-lab': ['depth','hide','fade','overlay'].map((mode,i)=>({mode,angle:i*60})),
    };
    for(const controls of cases[id]) {
      const c=await compileSource(source,{controls}),f=evaluateScene(c,0);
      for(const [key,value] of Object.entries(controls)) expect(c.controls.find(control=>control.id===key)?.value).toBe(value);
      if(id==='section-lab') {
        for(const key of ['ring','section-ring']) {
          const plane=f.elements.find(e=>e.id===key)!.geometry.clipPlanes![0];
          expect(plane.offset).toBe(controls.cut);
          expect(plane.section?.cap).toBe(controls.caps?'GOLD':undefined);
        }
      } else if(id==='scalar-lab') {
        const g=f.elements.find(e=>e.id==='field')!.geometry;
        expect(g.clipPlanes![0].offset).toBe(controls.cut);
        expect(g.scalarColors!.values).toEqual(g.vertices!.map(p=>p[2]));
        expect(Math.max(...g.scalarColors!.values)).toBeCloseTo(Number(controls.amplitude),1);
      } else {
        for(const key of ['a','b']) expect(f.elements.find(e=>e.id===key)!.geometry.labelOcclusion).toBe(controls.mode);
        expect(f.elements.find(e=>e.id==='box')!.geometry.outline!.creaseAngle).toBe(Number(controls.angle)*Math.PI/180);
      }
      evaluateScene(c,c.duration);
      expect(evaluateScene(c,0)).toEqual(f);
    }
  });
  it('uses displayed overlay footprints and hidden anchors in overlap diagnostics',async()=>{
    const c=await scene("s.box('b',{width:3,height:3,depth:1});s.text('a',{text:'TEXT',position:[1,0,-2],labelOcclusion:'overlay'});s.text('b-label',{text:'TEXT',position:[1,0,-2],labelOcclusion:'overlay'});s.text('hidden',{text:'TEXT',position:[1,0,-2],labelOcclusion:'hide'})");
    const f=evaluateScene(c,0),issues=detectOverlaps(f,{width:640,height:480});
    expect(issues).toHaveLength(1);expect(issues[0].elements).toEqual(['a','b-label']);
    expect(issues[0].bounds.left).toBeGreaterThan(300);expect(issues[0].bounds.right).toBeLessThan(500);
  });
  it('tests anchors against transformed occluders and recomputes after geometry morphs',async()=>{
    const c=await scene("const b=s.box('b',{width:2,height:2,depth:2});s.group('g',[b],{position:[2,0,0],scale:1.5,rotation:[0,0,0.4]});s.text('label',{text:'inside',position:[2,0,-3],billboard:true,labelOcclusion:'hide'})");
    const f=evaluateScene(c,0),render=()=>buildDrawItems(f,f.camera,640,480,paletteResolver());
    expect(render().some(i=>i.elementId==='label')).toBe(false);
    f.elements.find(e=>e.id==='g')!.position=[-3,0,0];
    expect(render().some(i=>i.elementId==='label')).toBe(true);
    const m=await scene("const g={kind:'mesh',vertices:[[-4,-2,0],[-2,-2,0],[-2,2,0],[-4,2,0]],triangles:[[0,1,2],[0,2,3]]};const m=s.mesh('m',g);s.text('l',{text:'label',position:[0,0,-2],labelOcclusion:'hide'});s.play(m.morphTo({...g,vertices:[[-1,-2,0],[1,-2,0],[1,2,0],[-1,2,0]]}),{duration:2})");
    const visible=(t:number)=>{const f=evaluateScene(m,t);return buildDrawItems(f,f.camera,640,480,paletteResolver()).some(i=>i.elementId==='l');};
    expect(visible(0)).toBe(true);expect(visible(2)).toBe(false);expect(visible(0)).toBe(true);
  });
  it('camera facing changes silhouette edge selection independently of fill geometry',()=>{
    const g=solids.box({});g.outline={color:'WHITE',creaseAngle:Math.PI};const c=corners(g);
    expect(outlineEdges(c,g,(_p,n)=>n[0]+n[2])).not.toEqual(outlineEdges(c,g,(_p,n)=>n[1]-n[2]));
  });
  it('retains fill alpha for scalar colors',async()=>{
    const items=await draw("s.mesh('m',{vertices:[[0,0,0],[1,0,0],[0,1,0]],triangles:[[0,1,2]],fill:{color:'WHITE',opacity:0.4},scalarColors:{values:[0,1,0],domain:[0,1],colors:['BLUE','RED']}})");
    expect(items[0].vertices[6]).toBeCloseTo(0.4);expect(items[0].transparent).toBe(true);
  });
  it('keeps the documented half-space, interpolates attributes and closes a box section',()=>{
    const original=corners(solids.box({width:2,height:2,depth:2}));
    const r=explainMesh(original,[{normal:[2,0,0],offset:0,section:{color:'RED',cap:'BLUE'}}]);
    expect(r.corners.every(c=>c.p[0]<=0)).toBe(true);
    expect(area(r.caps[0].corners)).toBeCloseTo(4);
    expect(r.sections[0].points.every(p=>p[0]===0)).toBe(true);
    const tri:Corner[]=[{p:[-1,0,0],c:[0,0,0,1],n:[0,0,1]},{p:[1,0,0],c:[1,0,0,1],n:[0,1,0]},{p:[0,1,0],c:[0.5,0,0,1],n:[0,0,1]}];
    const cut=explainMesh(tri,[{normal:[1,0,0],offset:0}]).corners.find(c=>c.p[0]===0&&c.p[1]===0)!;
    expect(cut.c).toEqual([0.5,0,0,1]);expect(cut.n).toEqual([0,0.5,0.5]);
  });
  it('preserves holes in torus caps and clips earlier caps at subsequent planes',()=>{
    const torus=solids.torus({radius:2,tubeRadius:0.5,radialSegments:32,tubularSegments:16});
    // Torus lies around Y; horizontal cut is an annulus.
    const r=explainMesh(corners(torus),[{normal:[0,1,0],offset:0.05,section:{color:'RED',cap:'BLUE'}}]);
    expect(area(r.caps[0].corners)).toBeGreaterThan(10);
    expect(area(r.caps[0].corners)).toBeLessThan(14);
    for(let i=0;i<r.caps[0].corners.length;i+=3){const p=r.caps[0].corners.slice(i,i+3).map(c=>c.p);const center=[0,1,2].map(a=>p.reduce((n,p)=>n+p[a],0)/3);expect(Math.hypot(center[0],center[2])).toBeGreaterThan(1.4);}
    const box=explainMesh(corners(solids.box({width:2,height:2,depth:2})),[{normal:[1,0,0],offset:0,section:{color:'RED',cap:'BLUE'}},{normal:[0,1,0],offset:0,section:{color:'RED',cap:'GREEN'}}]);
    expect(box.caps.map(c=>area(c.corners))).toEqual([2,2]);
  });
  it('does not cap open, degenerate, tangent or fully removed sections',()=>{
    const open:Corner[]=[{p:[-1,0,0]},{p:[1,0,0]},{p:[0,1,0]}];
    expect(explainMesh(open,[{normal:[1,0,0],offset:0,section:{color:'RED',cap:'BLUE'}}]).caps[0].corners).toHaveLength(0);
    const box=corners(solids.box({width:2,height:2,depth:2}));
    expect(explainMesh(box,[{normal:[1,0,0],offset:-2,section:{color:'RED',cap:'BLUE'}}]).corners).toHaveLength(0);
    expect(explainMesh(box,[{normal:[1,0,0],offset:1,section:{color:'RED',cap:'BLUE'}}]).sections[0].points).toHaveLength(0);
    expect(explainMesh([{p:[0,0,0]},{p:[0,0,0]},{p:[0,0,0]}],[{normal:[1,0,0],offset:0}]).corners.every(c=>c.p.every(Number.isFinite))).toBe(true);
  });
  it.each([1,-1])('does not invent contours or caps at either tangent torus edge (normal %s)',sign=>{
    const torus=corners(solids.torus({radius:2,tubeRadius:0.5,radialSegments:32,tubularSegments:16}));
    const cut=(offset:number)=>explainMesh(torus,[{normal:[0,sign,0],offset,section:{color:'RED',cap:'BLUE'}}]);
    for(const offset of [-0.5,0.5]) {
      const r=cut(offset);
      expect(r.caps[0].corners).toHaveLength(0);
      expect(r.sections[0].points).toHaveLength(0);
      if(offset<0)expect(area(r.corners)).toBe(0);
    }
    // The immediately adjacent genuine cut remains an annulus, not a disk.
    const adjacent=cut(-0.5+1e-4);
    expect(area(adjacent.caps[0].corners)).toBeGreaterThan(0);
    expect(area(adjacent.caps[0].corners)).toBeLessThan(0.1);
  });
  it('distinguishes tangent contact from a real cut in another disconnected component',()=>{
    const torus=corners(solids.torus({radius:2,tubeRadius:0.5,radialSegments:32,tubularSegments:16}));
    const box=corners(solids.box({width:2,height:2,depth:2})).map(c=>({...c,p:add(c.p,[5,0,0])}));
    const r=explainMesh([...torus,...box],[{normal:[0,1,0],offset:-0.5,section:{color:'RED',cap:'BLUE'}}]);
    expect(area(r.caps[0].corners)).toBeCloseTo(4);
    expect(r.sections[0].points.every(p=>p[0]>=4)).toBe(true);
  });
  it.each([
    {normal:[1,1,0] as Vec3,offset:0,expected:4*Math.SQRT2},
    {normal:[1,1,1] as Vec3,offset:1,expected:2*Math.sqrt(3)},
  ])('preserves actual box cuts through edges or vertices: $normal',({normal,offset,expected})=>{
    const r=explainMesh(corners(solids.box({width:2,height:2,depth:2})),[{normal,offset,section:{color:'RED',cap:'BLUE'}}]);
    expect(area(r.caps[0].corners)).toBeCloseTo(expected);
    expect(r.sections[0].points.length).toBeGreaterThan(0);
  });
  it.each([0,0.5,1])('projects and unprojects visible near-plane anchors at perspective %s',perspective=>{
    const camera={yaw:0.7,pitch:-0.3,distance:10,height:8,target:[1,2,3] as Vec3,perspective};
    for(const depth of [0.0101,0.05,0.1]) {
      const local:Vec3=[0.003,-0.002,camera.distance-depth];
      const point=add(rotate(local,[camera.pitch,camera.yaw,0]),camera.target);
      const p=project(point,camera,320,480),scale=60/(1-perspective+perspective*depth/10);
      expect(p.visible).toBe(true);expect(p.x).toBeCloseTo(160+local[0]*scale,6);expect(p.y).toBeCloseTo(240-local[1]*scale,6);
      const hit=planePoint(cameraRay(p.x,p.y,camera,320,480),point,rotate([0,0,1],[camera.pitch,camera.yaw,0]))!;
      hit.forEach((v,i)=>expect(v).toBeCloseTo(point[i],8));
    }
  });
  it('shows creases without triangulation diagonals, welding split normal seams',()=>{
    const g=solids.box({width:2,height:2,depth:2});g.outline={color:'WHITE',silhouette:false};
    expect(outlineEdges(corners(g),g,()=>1)).toHaveLength(24);
    g.outline.creaseAngle=Math.PI;
    expect(outlineEdges(corners(g),g,()=>1)).toHaveLength(0);
  });
  it('clamps a uniformly spaced palette ramp and resamples scalar values with surfaces',async()=>{
    const colors=scalarVertexColors({values:[-10,0,0.5,1,10],domain:[0,1],colors:['PURE_BLUE','PURE_RED']},paletteResolver());
    expect(colors).toEqual([[0,0,1,1],[0,0,1,1],[0.5,0,0.5,1],[1,0,0,1],[1,0,0,1]]);
    const c=await scene("s.surface('f',{fn:(x,y)=>x===0?NaN:x+y,xSegments:2,ySegments:2,scalar:{fn:(x,y,z)=>z,domain:[-4,4],colors:['BLUE','RED']}})");
    const g=evaluateScene(c,0).elements[0].geometry;
    expect(g.scalarColors!.values).toEqual(g.vertices!.map(p=>p[2]));
  });
  it.each([
    "clipPlanes:[{normal:[0,0,0],offset:0}]", "clipPlanes:Array(5).fill({normal:[1,0,0],offset:0})",
    "clipPlanes:[{normal:[1,0,0],offset:0,section:{color:'#ff0000'}}]", "outline:{color:'WHITE',width:0}",
    "outline:{color:'WHITE',creaseAngle:4}", "scalarColors:{values:[0],domain:[0,1],colors:['BLUE','RED']}",
    "scalarColors:{values:[0,0,0],domain:[0,0],colors:['BLUE','RED']}",
    "scalarColors:{values:[0,0,0],domain:[0,1],colors:['none','RED']}",
  ])('rejects invalid or unbounded options: %s',async options=>{
    await expect(scene(`s.mesh('bad',{vertices:[[0,0,0],[1,0,0],[0,1,0]],triangles:[[0,1,2]],${options}})`)).rejects.toThrow();
  });
  it('applies clipping in local space before nested transforms and retains isolation',async()=>{
    const items=await draw("const b=s.box('b',{width:2,height:2,depth:2,clipPlanes:[{normal:[1,0,0],offset:0,section:{color:'RED',cap:'BLUE'}}]});s.group('g',[b],{position:[3,0,0],rotation:[0,0,Math.PI/2],scale:2,opacity:0.5,isolated:true})");
    const fill=items.filter(i=>i.component==='fill');
    expect(fill.length).toBeGreaterThan(0);
    for(const item of fill){expect(item.groups).toEqual([{id:'g',opacity:0.5}]);for(let i=0;i<item.vertices.length;i+=VERTEX_FLOATS)expect(item.vertices[i+1]).toBeLessThanOrEqual(1e-6);}
  });
  it('recomputes camera silhouettes and anchor label occlusion for independent views',async()=>{
    const c=await scene("s.box('b',{width:2,height:2,depth:2,outline:{color:'WHITE',creaseAngle:Math.PI}});s.text('label',{text:'hidden',position:[0,0,-2],billboard:true,labelOcclusion:'hide'});s.view('other',{rect:[0.5,0,0.5,1]},()=>s.text('other-label',{text:'visible',position:[0,0,-2],labelOcclusion:'hide'}))");
    const f=evaluateScene(c,0),a=buildDrawItems(f,f.camera,640,480,paletteResolver());
    expect(a.some(i=>i.elementId==='label')).toBe(false);
    const b=buildDrawItems(f,{...f.camera,yaw:Math.PI},640,480,paletteResolver());
    expect(b.some(i=>i.elementId==='label')).toBe(true);
    expect(b.some(i=>i.cameraDependentGeometry)).toBe(true);
    const region=buildDrawItems(f,f.views![0].camera,320,480,paletteResolver(),'other');
    expect(region.every(i=>i.elementId==='other-label')).toBe(true);expect(region.length).toBeGreaterThan(0);
  });
  it('ignores translucent occluders for anchor modes, preserves default glyph depth, and fades to 20%',async()=>{
    const body=(mode:string,opacity=1)=>`s.box('b',{width:2,height:2,depth:2,opacity:${opacity}});s.text('l',{text:'X',position:[0,0,-2],labelOcclusion:'${mode}'})`;
    const fade=(await draw(body('fade'))).find(i=>i.elementId==='l')!;
    expect(fade.vertices[6]).toBeCloseTo(0.2);expect(fade.vertices[7]).toBe(1);
    expect((await draw(body('depth'))).find(i=>i.elementId==='l')!.vertices[7]).toBe(0);
    expect((await draw(body('hide',0.5))).some(i=>i.elementId==='l')).toBe(true);
  });
  it('interpolates scalar values and plane offsets deterministically during seekable morphs',async()=>{
    const c=await scene("const g={kind:'mesh',vertices:[[-1,-1,0],[1,-1,0],[0,1,0]],triangles:[[0,1,2]],scalarColors:{values:[0,0,0],domain:[0,1],colors:['PURE_BLUE','PURE_RED']},clipPlanes:[{normal:[1,0,0],offset:0}]};const m=s.mesh('m',g);s.play(m.morphTo({...g,scalarColors:{...g.scalarColors,values:[1,1,1]},clipPlanes:[{normal:[1,0,0],offset:1}]}),{duration:2,ease:'linear'})");
    const at=(t:number)=>{const f=evaluateScene(c,t);return buildDrawItems(f,f.camera,640,480,paletteResolver());};
    const mid=at(1);expect(mid[0].vertices[3]).toBeCloseTo(0.5);expect(mid[0].vertices[5]).toBeCloseTo(0.5);
    at(2);at(0);expect(at(1)).toEqual(mid);
  });
});
