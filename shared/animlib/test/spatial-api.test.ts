import { describe, expect, it } from "vitest";
import { compileSource } from "../src/compiler.js";
import { SceneSequence } from "../src/sequence.js";
import { evaluateScene } from "../src/timeline.js";
import type { CompiledScene, Frame, Geometry } from "../src/types.js";

// These are authored source strings: every constructor and callback runs in QuickJS.
const constructors = [
  ["surface", "fn:(x,y)=>a*(x+y),xSegments:3,ySegments:2"],
  ["parametricSurface", "fn:(u,v)=>[u,v,a*(u-v)],uSegments:3,vSegments:2"],
  ["box", "width:a,height:2,depth:3"],
  ["cylinder", "radius:a,height:2,radialSegments:8"],
  ["cone", "radius:a,height:2,radialSegments:8"],
  ["torus", "radius:a,tubeRadius:0.2,radialSegments:8,tubularSegments:6"],
  ["tube", "points:[[0,0,0],[0,1,0],[1,2,0]],radius:a/10,radialSegments:6"],
] as const;

function meshes(frame: Frame) {
  return frame.elements.filter(element => element.geometry.kind === "mesh");
}

function mesh(frame: Frame, id: string): Geometry {
  const element = frame.elements.find(candidate => candidate.id === id);
  expect(element, `Missing mesh ${id}`).toBeDefined();
  expect(element!.geometry.kind).toBe("mesh");
  return element!.geometry;
}

function expectSerializable(value: unknown): void {
  expect(typeof value).not.toBe("function");
  if (value && typeof value === "object") {
    expect(Object.hasOwn(value, "fn")).toBe(false);
    for (const child of Object.values(value)) expectSerializable(child);
  }
}

describe("spatial constructors through the sandbox", () => {
  it("compiles every API into ordinary finite meshes with its shading default", async () => {
    const compiled = await compileSource(`export default scene({mode:'3d'},s=>{
      const a=1;
      ${constructors.map(([name, props]) => `s.${name}('${name}',{${props}});`).join("\n")}
      s.mesh('raw',{vertices:[[0,0,0],[1,0,0],[0,1,0]],triangles:[[0,1,2]]});
      s.wait(1);
    });`);
    const frame = evaluateScene(compiled, 0);
    expect(meshes(frame)).toHaveLength(8);
    for (const [name] of constructors) {
      const geometry = mesh(frame, name);
      expect(geometry.shading).toBe(name === "box" ? "flat" : "smooth");
      expect(geometry.vertices!.length).toBeGreaterThan(0);
      expect(geometry.triangles!.length).toBeGreaterThan(0);
      expect(geometry.vertices!.flat().every(Number.isFinite)).toBe(true);
      expect(frame.elements.find(element => element.id === name)!.stroke).toBe("none");
    }
    expect(mesh(frame, "raw").shading ?? "unlit").toBe("unlit");
    expectSerializable(compiled);
    const restored = JSON.parse(JSON.stringify(compiled)) as CompiledScene;
    expect(evaluateScene(restored, 0.5)).toEqual(evaluateScene(compiled, 0.5));
  });

  it("samples graph Z from XY and uses 32 cells per default surface axis", async () => {
    const compiled = await compileSource(`export default scene({},s=>{
      s.surface('graph',{fn:(x,y)=>2*x-3*y});
      s.parametricSurface('parametric',{fn:(u,v)=>[u,v,u+v]});
    });`);
    const frame = evaluateScene(compiled, 0);
    const graph = mesh(frame, "graph"), parametric = mesh(frame, "parametric");
    for (const geometry of [graph, parametric]) {
      expect(geometry.vertices).toHaveLength(33 * 33);
      expect(geometry.triangles).toHaveLength(2 * 32 * 32);
    }
    expect(graph.vertices![0]).toEqual([-2, -2, 2]);
    expect(graph.vertices!.at(-1)).toEqual([2, 2, -2]);
    for (const [x, y, z] of graph.vertices!) expect(z).toBe(2 * x - 3 * y);
    expect(parametric.vertices![0]).toEqual([0, 0, 0]);
    expect(parametric.vertices!.at(-1)).toEqual([1, 1, 2]);
  });

  it("supports omitted solid options and tube options through the public runtime wrappers", async () => {
    const compiled = await compileSource(`export default scene({mode:'3d'},s=>{
      s.box('box');s.cylinder('cylinder');s.cone('cone');s.torus('torus');
      s.tube('tube',{points:[[0,0,0],[0,2,0]]});
    });`);
    const frame = evaluateScene(compiled, 0);
    expect(meshes(frame)).toHaveLength(5);
    for (const element of meshes(frame)) {
      expect(element.geometry.vertices!.length).toBeGreaterThan(0);
      expect(element.geometry.triangles!.length).toBeGreaterThan(0);
      expect(element.stroke).toBe("none");
    }
  });

  it.each(["unlit", "flat", "smooth"])("retains explicit %s shading and styles through animation and serialization", async shading => {
    const compiled = await compileSource(`export default scene({mode:'3d'},s=>{
      const a=1;
      const objects=[${constructors.map(([name, props]) => `s.${name}('${name}',{${props},shading:'${shading}',fill:'BLUE',stroke:'YELLOW',opacity:0.6,position:[1,2,3]})`).join(",")}];
      objects.push(s.mesh('raw',{vertices:[[0,0,0],[1,0,0],[0,1,0]],triangles:[[0,1,2]],shading:'${shading}',fill:'BLUE',stroke:'YELLOW',opacity:0.6,position:[1,2,3]}));
      s.play(objects.map(object=>object.moveTo([3,4,5])),{duration:2,ease:'linear'});
    });`);
    const restored = JSON.parse(JSON.stringify(compiled)) as CompiledScene;
    const middle = evaluateScene(compiled, 1);
    for (const element of meshes(middle)) {
      expect(element).toMatchObject({position:[2,3,4],fill:"BLUE",stroke:"YELLOW",opacity:0.6});
      expect(element.geometry.shading).toBe(shading);
    }
    for (const time of [2, 0, 1.5, 0.25, 1]) {
      expect(evaluateScene(restored, time)).toEqual(evaluateScene(compiled, time));
    }
    expect(evaluateScene(compiled, 1)).toEqual(middle);
  });

  it("keeps detached subview constructors in their owning view and persists their group", async () => {
    const compiled = await compileSource(`export default scene({mode:'3d'},s=>{
      const a=1;let left;
      s.view('left',{rect:[0,0,0.5,1]},v=>left=v);
      const constructors=[${constructors.map(([name]) => `left.${name}`).join(",")}];
      s.view('right',{rect:[0.5,0,0.5,1]},v=>{
        const objects=[${constructors.map(([name, props], index) => `constructors[${index}]('${name}',{${props}})`).join(",")}];
        left.keep(left.group('assembly',objects));
        v.box('right-box');
      });
      s.box('global-box');s.wait(1);
    });`);
    const frame = evaluateScene(compiled, 1);
    for (const [name] of constructors) {
      expect(frame.elements.find(element => element.id === name)).toMatchObject({view:"left",persistent:true});
    }
    expect(frame.elements.find(element => element.id === "right-box")!.view).toBe("right");
    expect(frame.elements.find(element => element.id === "global-box")!.view).toBeUndefined();
    const next = await compileSource(`export default scene({},s=>{
      s.play(s.previous.get('assembly').moveTo([2,0,0]),{duration:1,ease:'linear'});
    });`, {previous:frame});
    expect(next.views!.map(view => view.id)).toEqual(["left"]);
    const entered = evaluateScene(next, 0);
    expect(entered.elements).toHaveLength(8);
    for (const [name] of constructors) expect(mesh(entered, name)).toEqual(mesh(frame, name));
    const end = evaluateScene(next, 1);
    expect(end.elements.find(element => element.id === "assembly")!.position).toEqual([2,0,0]);
    expect(evaluateScene(next, 0)).toEqual(entered);
  });

  it("rebuilds slider-dependent meshes and downstream persistence atomically", async () => {
    const source = `export default scene({mode:'3d'},s=>{
      const a=s.slider('size',{default:1,min:0.5,max:3});
      const objects=[${constructors.map(([name, props]) => `s.${name}('${name}',{${props}})`).join(",")}];
      const group=s.group('assembly',objects);s.keep(group);
      s.play(group.moveTo([2,0,0]),{duration:2,ease:'linear'});
    });`;
    const sequence = new SceneSequence();
    try {
      const result = await sequence.submit({type:"load",scenes:[
        {id:"build",source},
        {id:"reuse",source:`export default scene({},s=>{
          s.play(s.previous.get('assembly').rotateTo([0,1,0]),{duration:2,ease:'linear'});
        });`},
      ]});
      expect(result, JSON.stringify(result)).toMatchObject({ok:true});
      const original = sequence.frame(1, 0);
      await sequence.setControl("build", "size", 2);
      const changed = sequence.frame(1, 0);
      for (const [name] of constructors) {
        expect(mesh(changed, name).vertices).not.toEqual(mesh(original, name).vertices);
        expect(mesh(changed, name)).toEqual(mesh(sequence.frame(0, 2), name));
        expect(mesh(changed, name).shading).toBe(mesh(original, name).shading);
      }
      const middle = sequence.frame(1, 1);
      sequence.frame(0, 0);sequence.frame(1, 2);
      expect(sequence.frame(1, 1)).toEqual(middle);
      expect(evaluateScene(JSON.parse(JSON.stringify(sequence.compiled[1])), 1)).toEqual(middle);
      await expect(sequence.setControl("build", "size", NaN)).rejects.toThrow();
      expect(sequence.frame(1, 0)).toEqual(changed);
      await sequence.setControl("build", "size", 1);
      expect(sequence.frame(1, 0)).toEqual(original);
    } finally { sequence.dispose(); }
  });

  it("exports holes instead of JSON-null coordinates or triangles bridging invalid samples", async () => {
    const compiled = await compileSource(`export default scene({},s=>{
      s.surface('graph',{fn:(x,y)=>x===0?NaN:x+y,xRange:[-1,1],yRange:[0,1],xSegments:4,ySegments:1});
      s.parametricSurface('parametric',{fn:(u,v)=>[u,v,u===0?Infinity:u+v],uRange:[-1,1],uSegments:4,vSegments:1});
    });`);
    for (const element of meshes(evaluateScene(compiled, 0))) {
      const {vertices, triangles} = element.geometry;
      expect(vertices).toHaveLength(8);
      expect(triangles).toHaveLength(4);
      expect(vertices!.flat().every(Number.isFinite)).toBe(true);
      for (const triangle of triangles!) {
        const xs = triangle.map(index => vertices![index][0]);
        expect(xs.every(x => x < 0) || xs.every(x => x > 0)).toBe(true);
      }
    }
  });

  it("retains a closed spatial tube and removes duplicate authored points before serialization", async () => {
    const source = (duplicates: boolean) => `export default scene({mode:'3d'},s=>{
      const points=[[2,0,0],[0,1,2],[-2,0,0],[0,-1,-2]];
      ${duplicates ? "points.splice(1,0,points[0]);points.push(points[0]);" : ""}
      const loop=s.tube('loop',{points,closed:true,radialSegments:8});
      s.play(loop.rotateTo([0,Math.PI,0]),{duration:2,ease:'linear'});s.keep(loop);
    });`;
    const clean = await compileSource(source(false));
    const repeated = await compileSource(source(true));
    expect(repeated).toEqual(clean);
    const previous = evaluateScene(repeated, 2);
    const next = await compileSource(`export default scene({},s=>{s.previous.get('loop');s.wait(1);});`, {previous});
    const restored = JSON.parse(JSON.stringify(next)) as CompiledScene;
    expect(evaluateScene(restored, 0).elements).toEqual(previous.elements);
    expect(mesh(previous, "loop").shading).toBe("smooth");
  });

  it("preserves shared seam indices and samples closed domains only once", async () => {
    const compiled = await compileSource(`export default scene({},s=>{
      let samples=0;
      s.parametricSurface('closed',{
        uRange:[0,2*Math.PI],vRange:[0,2*Math.PI],uSegments:8,vSegments:6,closedU:true,closedV:true,
        fn:(u,v)=>{samples++;if(u===2*Math.PI||v===2*Math.PI)throw Error('duplicate endpoint');return [(2+0.5*Math.cos(v))*Math.cos(u),0.5*Math.sin(v),(2+0.5*Math.cos(v))*Math.sin(u)];}
      });
      if(samples!==48)throw Error('wrong sample count');
    });`);
    const geometry = mesh(evaluateScene(compiled, 0), "closed");
    expect(geometry.vertices).toHaveLength(48);
    expect(geometry.triangles).toHaveLength(96);
    const edges = new Map<string, number>();
    for (const [a, b, c] of geometry.triangles!) {
      for (const [from, to] of [[a,b],[b,c],[c,a]]) {
        const key = [from,to].sort((x,y) => x-y).join(":");
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect([...edges.values()].every(uses => uses === 2)).toBe(true);
  });

  it.each([
    ["nonfinite segment count", "s.surface('bad',{fn:()=>0,xSegments:NaN})", /segment/i],
    ["oversized surface", "s.surface('bad',{fn:()=>{throw Error('sampled before budget check')},xSegments:101,ySegments:100})", /budget/i],
    ["missing callback", "s.surface('bad',{})", /callback|fn/i],
    ["async graph callback", "s.surface('bad',{fn:async()=>0})", /number|synchronous/i],
    ["async parametric callback", "s.parametricSurface('bad',{fn:async()=>[0,0,0]})", /Vec3|synchronous/i],
    ["invalid vector callback", "s.parametricSurface('bad',{fn:()=>[0,1]})", /Vec3/i],
    ["callback exception", "s.surface('bad',{fn:()=>{throw Error('sample failure')}})", /sample failure/],
    ["reversed range", "s.surface('bad',{fn:()=>0,xRange:[1,-1]})", /range|increasing/i],
    ["invalid closed flag", "s.parametricSurface('bad',{fn:(u,v)=>[u,v,0],closedU:'yes'})", /closedU|boolean/],
    ["insufficient seam segments", "s.parametricSurface('bad',{fn:(u,v)=>[u,v,0],closedV:true,vSegments:2})", /segment/i],
    ["nonfinite box", "s.box('bad',{width:NaN})", /width|finite/i],
    ["invalid cylinder", "s.cylinder('bad',{radius:-1})", /radius|positive/i],
    ["invalid cone", "s.cone('bad',{height:Infinity})", /height|finite/i],
    ["oversized torus", "s.torus('bad',{radialSegments:200,tubularSegments:200})", /budget|limit|segment/i],
    ["invalid tube point", "s.tube('bad',{points:[[0,0,0],[0,NaN,1]]})", /point|finite/i],
    ["tube U-turn", "s.tube('bad',{points:[[0,0,0],[0,1,0],[0,0,0]]})", /turn|reverse|tangent/i],
    ["invalid raw shading", "s.mesh('bad',{vertices:[],triangles:[],shading:'glossy'})", /shading/i],
  ])("rejects %s at the sandbox boundary", async (_label, body, error) => {
    await expect(compileSource(`export default scene({},s=>{${body};});`)).rejects.toThrow(error);
  });
});
