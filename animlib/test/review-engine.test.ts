import { describe, expect, it } from "vitest";
import { compileSource } from "../src/compiler.js";
import { evaluateScene } from "../src/timeline.js";
import { SceneSequence } from "../src/sequence.js";
import { rotate } from "../src/geometry.js";
import type { ElementState, Frame, Vec3 } from "../src/types.js";

function renderedPoint(frame: Frame, id: string, point: Vec3): Vec3 {
  const states = new Map(frame.elements.map(e=>[e.id,e]));
  const parents = new Map<string,ElementState>();
  for(const e of frame.elements) for(const child of e.geometry.children??[]) parents.set(child,e);
  let state=states.get(id);
  while(state) {
    point=rotate(point.map(v=>v*state!.scale) as Vec3,state.rotation).map((v,i)=>v+state!.position[i]) as Vec3;
    state=parents.get(state.id);
  }
  return point;
}

function expectSamePoint(a: Vec3, b: Vec3) { a.forEach((value,i)=>expect(value).toBeCloseTo(b[i],10)); }

describe("reviewed scene boundary invariants", () => {
  it("rejects giving an inherited group child a second parent", async () => {
    const a = await compileSource(`export default scene({},s=>{
      const dot=s.circle('dot');const group=s.group('old',[dot]);
      s.play(group.moveTo([2,0]),{duration:1});s.keep(group);
    });`);
    await expect(compileSource(`export default scene({},s=>{
      s.group('new',[s.previous.get('dot')]);s.wait(1);
    });`, { previous: evaluateScene(a, a.duration) })).rejects.toThrow(/parent|group/i);
  });

  it("detaches removed children before their IDs can be reused in the next scene", async () => {
    const sequence = new SceneSequence();
    const result = await sequence.submit({type:'load',scenes:[
      {id:'a',source:`export default scene({},s=>{
        const dot=s.circle('dot');const group=s.group('old',[dot]);
        s.play(group.moveTo([2,0]),{duration:1});s.keep(group);s.remove(dot);
      });`},
      {id:'b',source:`export default scene({},s=>{s.circle('dot');s.wait(1);});`},
    ]});
    expect(result.ok).toBe(true);
    const group = sequence.frame(1,0).elements.find(e=>e.id==='old');
    expect(group?.geometry.children).not.toContain('dot');
  });

  it("keeps explicit exit promotion from breaking the next boundary", async () => {
    const sequence = new SceneSequence();
    const result=await sequence.submit({type:'load',scenes:[
      {id:'a',source:`export default scene({},s=>{s.circle('dot');s.wait(1);});`},
      {id:'b',source:`export default scene({},s=>{s.keep(s.previous.exiting());s.wait(1);});`},
      {id:'c',source:`export default scene({},s=>{s.previous.exiting();s.wait(1);});`},
    ]});
    expect(result.ok).toBe(true);
  });

  it("retains a control named __proto__ across recompilation", async () => {
    const sequence = new SceneSequence();
    await sequence.submit({type:'load',scenes:[{id:'a',source:`export default scene({},s=>{
      const x=s.slider('__proto__',{default:1,min:0,max:4});s.circle('dot',{radius:x});
    });`}]});
    await sequence.setControl('a','__proto__',3);
    expect(sequence.compiled[0].controls[0].value).toBe(3);
    expect(sequence.frame(0,0).elements[0].geometry.radius).toBe(3);
  });

  it("rejects post-builder edits that create an invalid parent graph", async () => {
    await expect(compileSource(`const result=scene({},s=>{s.circle('dot');});
      result.lifecycle[0].elements[0].geometry={kind:'group',children:['missing']};
      export default result;`)).rejects.toThrow(/group|child|missing/i);
  });

  it("retains alpha when animating an eight-digit hexadecimal color", async () => {
    const scene = await compileSource(`export default scene({},s=>{
      const dot=s.circle('dot',{fill:'#ff0000ff'});
      s.play(dot.animate({fill:'#0000ff00'}),{duration:1,ease:'linear'});
    });`);
    expect(evaluateScene(scene,1).elements[0].fill).toBe('#0000ff00');
  });

  it("rejects malformed morph data crossing the VM boundary", async () => {
    await expect(compileSource(`const result=scene({},s=>{s.circle('dot');});
      result.lifecycle[0].elements[0].morph={};export default result;
    `)).rejects.toThrow(/morph/i);
  });

  it("does not mutate inherited initial group membership while validating a later removal", async () => {
    const a = await compileSource(`export default scene({},s=>{
      const dot=s.circle('dot');const group=s.group('group',[dot]);
      s.play(group.moveTo([2,0]),{duration:1});s.keep(group);
    });`);
    const b = await compileSource(`export default scene({},s=>{
      s.wait(1);s.remove(s.previous.get('dot'));s.wait(1);
    });`, { previous: evaluateScene(a,a.duration) });
    expect(evaluateScene(b,0).elements.find(e=>e.id==='group')?.geometry.children).toEqual(['dot']);
    expect(evaluateScene(b,1).elements.find(e=>e.id==='group')?.geometry.children).toEqual([]);
  });

  it("bakes a departing parent's transform into its explicitly persistent child", async () => {
    const a=await compileSource(`export default scene({},s=>{
      const dot=s.circle('dot');const sibling=s.circle('sibling');const group=s.group('group',[dot,sibling]);
      s.play(group.moveTo([2,0]),{duration:1});s.keep(dot);
    });`);
    const previous=evaluateScene(a,a.duration);
    const b=await compileSource(`export default scene({},s=>s.wait(1));`,{previous});
    const incoming=evaluateScene(b,0);
    expect(incoming.elements.map(e=>e.id)).toEqual(['dot']);
    expect(incoming.elements[0].position).toEqual([2,0,0]);
    expectSamePoint(renderedPoint(incoming,'dot',[0,0,0]),renderedPoint(previous,'dot',[0,0,0]));
  });

  it("preserves nested departing rotations, scales, opacity, and positions", async () => {
    const a=await compileSource(`export default scene({},s=>{
      const dot=s.circle('dot',{position:[1,0.5,-0.2],rotation:[0.7,0.1,-0.2],scale:0.75,opacity:0.8});
      const inner=s.group('inner',[dot]);const outer=s.group('outer',[inner]);
      s.play([
        inner.animate({position:[-0.3,0.8,0.4],rotation:[0.1,0.2,-0.3],scale:2,opacity:0.6}),
        outer.animate({position:[2,-1,1],rotation:[0.3,-0.4,0.5],scale:3,opacity:0.5})
      ],{duration:1});s.keep(dot);
    });`);
    const previous=evaluateScene(a,a.duration);
    const b=await compileSource(`export default scene({},s=>s.wait(1));`,{previous});
    const incoming=evaluateScene(b,0);
    expect(incoming.elements[0].scale).toBeCloseTo(4.5);
    expect(incoming.elements[0].opacity).toBeCloseTo(0.24);
    for(const point of [[0,0,0],[1,0,0],[0,1,0],[0,0,1],[0.35,-0.2,0.7]] as Vec3[]) {
      expectSamePoint(renderedPoint(incoming,'dot',point),renderedPoint(previous,'dot',point));
    }
  });

  it("bakes into a surviving child group without transforming its durable descendants twice", async () => {
    const a=await compileSource(`export default scene({},s=>{
      const dot=s.circle('dot',{position:[1,0,0]});const inner=s.group('inner',[dot]);
      const sibling=s.circle('sibling');const outer=s.group('outer',[inner,sibling]);
      s.play([
        inner.animate({position:[0.5,0.3,0],rotation:[0,0,0.2],scale:0.75,opacity:0.6}),
        outer.animate({position:[2,-1,1],rotation:[0.3,-0.4,0.5],scale:2,opacity:0.5})
      ],{duration:1});s.keep(inner);
    });`);
    const previous=evaluateScene(a,a.duration);
    const b=await compileSource(`export default scene({},s=>s.wait(1));`,{previous});
    const incoming=evaluateScene(b,0);
    expect(incoming.elements.map(e=>e.id).sort()).toEqual(['dot','inner']);
    expect(incoming.elements.find(e=>e.id==='inner')!.geometry.children).toEqual(['dot']);
    expect(incoming.elements.find(e=>e.id==='dot')!.position).toEqual([1,0,0]);
    expect(incoming.elements.find(e=>e.id==='inner')!.opacity).toBeCloseTo(0.3);
    for(const point of [[0,0,0],[1,0,0],[0,1,0],[0,0,1]] as Vec3[]) {
      expectSamePoint(renderedPoint(incoming,'dot',point),renderedPoint(previous,'dot',point));
    }
  });
});
