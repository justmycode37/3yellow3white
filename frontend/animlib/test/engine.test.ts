import { describe, expect, it } from "vitest";
import { compileSource } from "../src/compiler.js";
import { evaluateScene } from "../src/timeline.js";
import { SceneSequence } from "../src/sequence.js";
import colorString from "color-string";

const first = `export default scene({end:'hold'}, s => {
  const a = s.slider('a', {default:1,min:0,max:4});
  const dot = s.circle('dot', {position:[a,0],radius:0.5});
  const label = s.text('title', {text:'first'});
  s.play(dot.moveTo([a+2,0]), {duration:2,ease:'linear'});
  s.keep(dot);
});`;
const second = `export default scene({}, s => {
  const old=s.previous.exiting();
  s.play(old.fadeOut(),{duration:1}); s.remove(old);
  const dot=s.previous.get('dot');
  s.play(dot.moveTo([6,0]),{duration:2,ease:'linear'});
});`;

describe("isolated scene compilation", () => {
  it("calculates frames without accumulating playback state", async () => {
    const s = await compileSource(first);
    expect(s.duration).toBe(2);
    const at1 = evaluateScene(s, 1);
    expect(at1.elements.find(e=>e.id==='dot')!.position).toEqual([2,0,0]);
    evaluateScene(s, 2);
    expect(evaluateScene(s, 1)).toEqual(at1);
    expect(evaluateScene(s, 0).elements.find(e=>e.id==='dot')!.position).toEqual([1,0,0]);
  });
  it("parallel property animations preserve independent starting values", async () => {
    const s = await compileSource(`export default scene({},s=>{ const a=s.circle('a'); s.play([a.moveTo([2,0]),a.scaleTo(3)],{duration:2,ease:'linear'}); });`);
    const e=evaluateScene(s,1).elements[0]; expect(e.position).toEqual([1,0,0]); expect(e.scale).toBe(2);
    await expect(compileSource(`export default scene({},s=>{ const a=s.circle('a'); s.play([a.moveTo([2,0]),a.moveTo([3,0])],{duration:1}); });`)).rejects.toThrow('Conflicting');
  });
  it("fadeIn begins at zero opacity, morph retains ID and camera tracks own view", async () => {
    const s=await compileSource(`export default scene({mode:'2d'},s=>{ const a=s.circle('a'); s.play(a.fadeIn(),{duration:1,ease:'linear'}); s.play([a.morphTo({kind:'rectangle',width:1,height:2}),s.camera.to3D()],{duration:1,ease:'linear'}); });`);
    expect(evaluateScene(s,0).elements[0].opacity).toBe(0);
    expect(evaluateScene(s,0.5).elements[0].opacity).toBe(0.5);
    const middle=evaluateScene(s,1.5); expect(middle.elements[0].id).toBe('a'); expect(middle.elements[0].morph?.progress).toBe(0.5);
    expect(middle.camera.perspective).toBe(0.5); expect(middle.cameraAnimated).toBe(true);
    expect(evaluateScene(s,2).cameraAnimated).toBe(false);
    expect(evaluateScene(s,2).elements[0].geometry.kind).toBe('rectangle');
  });
  it("has no browser/network/Node globals, including through the JS Function constructor", async () => {
    for (const forbidden of ['fetch', 'window', 'document', 'process', 'XMLHttpRequest', 'WebSocket']) {
      await expect(compileSource(`export default scene({},s=>{ Function('return ${forbidden}')(); });`)).rejects.toThrow();
    }
  });
  it("interrupts runaway code and still compiles a later valid scene", async () => {
    await expect(compileSource(`export default scene({},s=>{while(true){}});`,{}, {executionLimitMs:20})).rejects.toThrow(/interrupted/);
    expect((await compileSource(first)).duration).toBe(2);
  });
  it("rejects nonfinite geometry, async builders, imports, duplicate IDs, and invalid meshes", async () => {
    const sources=[
      `export default scene({},s=>s.circle('a',{radius:NaN}));`,
      `export default scene({},async s=>s.wait(1));`,
      `import x from 'https://example.com'; export default scene({},s=>{});`,
      `export default scene({},s=>{s.circle('a');s.circle('a');});`,
      `export default scene({},s=>s.mesh('a',{vertices:[[0,0,0]],triangles:[[0,1,2]]}));`,
    ];
    for(const source of sources) await expect(compileSource(source)).rejects.toThrow();
  });
  it("seeded math is repeatable and LaTeX requires explicit mappings", async () => {
    const source=`export default scene({},s=>s.circle('a',{radius:math.random()}));`;
    expect(await compileSource(source,{seed:4})).toEqual(await compileSource(source,{seed:4}));
    expect(await compileSource(source,{seed:4})).not.toEqual(await compileSource(source,{seed:5}));
    await expect(compileSource(`export default scene({},s=>{const a=s.latex('a',{tex:'x'});s.play(a.morphTo({kind:'latex',tex:'y'}),{duration:1});});`)).rejects.toThrow('explicit map');
  });
  it("creates real sphere geometry and validates radius and stationary billboards", async()=>{
    const compiled=await compileSource(`export default scene({mode:'3d'},s=>{
      s.sphere('atom',{radius:0.4,position:[0,0,1]});s.text('label',{text:'C',billboard:true,billboardOffset:[0,0.43,0.3]});s.wait(1);
    });`);
    const frame=evaluateScene(compiled,0);
    expect(frame.elements[0].geometry).toMatchObject({kind:'sphere',radius:0.4});
    expect(frame.elements[1].billboard).toBe(true);
    expect(frame.elements[1].billboardOffset).toEqual([0,0.43,0.3]);
    await expect(compileSource(`export default scene({},s=>s.sphere('atom',{radius:-1}));`)).rejects.toThrow('nonnegative');
    await expect(compileSource(`export default scene({},s=>s.text('label',{text:'C',billboard:'yes'}));`)).rejects.toThrow('billboard');
  });
  it("animates normalized viewport offsets deterministically from an implicit zero",async()=>{
    const compiled=await compileSource(`export default scene({},s=>{
      const dot=s.circle('dot');s.play(dot.animate({viewportOffset:[-1.5,0.2]}),{duration:2,ease:'linear'});
    });`);
    expect(evaluateScene(compiled,1).elements[0].viewportOffset).toEqual([-0.75,0.1]);
    expect(evaluateScene(compiled,2).elements[0].viewportOffset).toEqual([-1.5,0.2]);
    expect(evaluateScene(compiled,0).elements[0].viewportOffset).toEqual([0,0]);
    await expect(compileSource(`export default scene({},s=>s.circle('dot',{viewportOffset:[1,2,3]}));`)).rejects.toThrow('two coordinates');
    await expect(compileSource(`export default scene({},s=>s.circle('dot',{viewportOffset:[1,NaN]}));`)).rejects.toThrow('viewport offset');
  });
  it("fades none fills and strokes through transparent color without a final-frame pop or black tint",async()=>{
    const compiled=await compileSource(`export default scene({},s=>{
      const entering=s.circle('entering',{fill:'none',stroke:'none'});
      const exiting=s.circle('exiting',{fill:'#58c4dd',stroke:'rgba(88,196,221,0.4)'});
      const invisible=s.circle('invisible',{fill:'none',stroke:'none'});
      s.play([
        entering.animate({fill:'#58c4dd',stroke:'rgba(88,196,221,0.4)'}),
        exiting.animate({fill:'none',stroke:'none'}),invisible.animate({fill:'none',stroke:'none'})
      ],{duration:2,ease:'linear'});
    });`);
    const first=evaluateScene(compiled,0),half=evaluateScene(compiled,1),end=evaluateScene(compiled,2);
    expect(first.elements[0].fill).toBe('none');
    expect(first.elements[1].fill).toBe('#58c4dd');
    for(const id of ['entering','exiting']) {
      const element=half.elements.find(e=>e.id===id)!;
      expect(colorString.get.rgb(element.fill)).toEqual([88,196,221,0.5]);
      expect(colorString.get.rgb(element.stroke)).toEqual([88,196,221,0.2]);
      expect(element.opacity).toBe(1);
    }
    expect(half.elements.find(e=>e.id==='invisible')!.fill).toBe('none');
    expect(half.elements.find(e=>e.id==='invisible')!.stroke).toBe('none');
    expect(end.elements[0].fill).toBe('#58c4dd');
    expect(end.elements[0].stroke).toBe('rgba(88,196,221,0.4)');
    expect(end.elements[1].fill).toBe('none');expect(end.elements[1].stroke).toBe('none');
    expect(evaluateScene(compiled,1)).toEqual(half);
  });
});

describe("scene reconstruction and atomic changes", () => {
  it("reconstructs persistent and temporary outgoing objects on direct entry", async () => {
    const sequence=new SceneSequence();
    expect((await sequence.submit({type:'load',scenes:[{id:'first',source:first},{id:'second',source:second}]})).ok).toBe(true);
    const frame=sequence.frame(1,0);
    expect(frame.elements.find(e=>e.id==='dot')!.position).toEqual([3,0,0]);
    expect(frame.elements.find(e=>e.id==='@exit:title')!.transient).toBe(true);
    expect(sequence.frame(1,1).elements.some(e=>e.id==='@exit:title')).toBe(false);
    expect(sequence.frame(1,2).elements.find(e=>e.id==='dot')!.position).toEqual([4.5,0,0]);
  });
  it("reconstructs downstream with current upstream controls", async () => {
    const sequence=new SceneSequence(); await sequence.submit({type:'load',scenes:[{id:'a',source:first},{id:'b',source:second}]});
    await sequence.setControl('a','a',3);
    expect(sequence.frame(1,0).elements.find(e=>e.id==='dot')!.position).toEqual([5,0,0]);
    expect(sequence.frame(0,0).elements.find(e=>e.id==='dot')!.position).toEqual([3,0,0]);
  });
  it("rejects invalid edits and upstream dependency removal without changing committed state", async () => {
    const sequence=new SceneSequence();await sequence.submit({type:'load',scenes:[{id:'a',source:first},{id:'b',source:second}]});
    const before=sequence.frame(1,2), revision=sequence.revision;
    const result=await sequence.submit({type:'replace',scene:'a',source:`export default scene({},s=>s.wait(1));`});
    expect(result.ok).toBe(false);expect(result.diagnostics[0].scene).toBe('b');expect(sequence.revision).toBe(revision);expect(sequence.frame(1,2)).toEqual(before);
  });
  it("serializes submissions, supports prepend, and makes preparation failure atomic", async () => {
    let reject=false;
    const sequence=new SceneSequence({prepare:async()=>{if(reject)throw new Error('asset failed');}});
    const a=sequence.submit({type:'load',scenes:[{id:'a',source:first}]});
    const b=sequence.submit({type:'insert',after:'a',scenes:[{id:'b',source:second}]});
    expect((await a).ok).toBe(true);expect((await b).ok).toBe(true);
    expect(sequence.sources.map(s=>s.id)).toEqual(['a','b']);
    reject=true;expect((await sequence.submit({type:'insert',after:null,scenes:[{id:'blank',source:`export default scene({},s=>s.wait(1));`}]})).ok).toBe(false);
    expect(sequence.sources.map(s=>s.id)).toEqual(['a','b']);
  });
  it("group persistence includes descendants and transients are not replayed beyond their boundary", async () => {
    const sequence=new SceneSequence();
    const group=`export default scene({},s=>{const a=s.circle('a');const b=s.circle('b');const g=s.group('g',[a,b]);s.play(g.rotateTo(1),{duration:1});s.keep(g);});`;
    expect((await sequence.submit({type:'load',scenes:[{id:'a',source:group},{id:'b',source:`export default scene({},s=>{s.previous.get('g');s.wait(1);});`}]})).ok).toBe(true);
    expect(sequence.frame(1,0).elements.map(e=>e.id).sort()).toEqual(['a','b','g']);
  });
});
