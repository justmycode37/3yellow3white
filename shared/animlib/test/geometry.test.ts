import {describe,it,expect} from 'vitest';
import {matchPoints,morphOutline,project,resample,rotate} from '../src/geometry.js';
import type {Vec3} from '../src/types.js';
describe('geometry interpolation',()=> {
  it('aligns reversed and offset closed paths before morphing',()=> {
    const square:Vec3[]=[[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]];
    const [a,b]=matchPoints(square,[[1,1,0],[1,-1,0],[-1,-1,0],[-1,1,0]],true,32);
    expect(a.reduce((s,p,i)=>s+Math.hypot(...p.map((v,j)=>v-b[i][j])),0)).toBeLessThan(1e-9);
  });
  it('samples open paths by distance and retains their endpoints',()=> {
    expect(resample([[0,0,0],[1,0,0],[1,3,0]],5,false)).toEqual([[0,0,0],[1,0,0],[1,1,0],[1,2,0],[1,3,0]]);
  });
  it('morphs a circle to a rectangle without changing topology',()=> {
    const result=morphOutline({kind:'circle',radius:1},{kind:'rectangle',width:4,height:2},0.5);
    expect(result?.closed).toBe(true);expect(result?.points).toHaveLength(96);
    expect(result?.points.every(p=>p.every(Number.isFinite))).toBe(true);
    expect(morphOutline({kind:'circle'},{kind:'line',points:[[0,0],[1,1]]},0.5)).toBeNull();
  });
  it('preserves both outlines at morph endpoints when their corner counts differ',()=> {
    const from:Vec3[]=[[-1.5,-1,0],[1.5,-1,0],[1.5,1,0],[-1.5,1,0]];
    const to:Vec3[]=[[-2,-0.7,0],[0.3,-1.8,0],[2,0,0],[0.2,1.6,0],[-1.7,0.9,0]];
    const [a,b]=matchPoints(from,to,true);
    for(const [original,matched] of [[from,a],[to,b]]) {
      for(const corner of original)expect(matched.some(p=>p.every((v,i)=>Math.abs(v-corner[i])<1e-10))).toBe(true);
      const area=(points:Vec3[])=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-p[1]*q[0];},0))/2;
      expect(area(matched)).toBeCloseTo(area(original),10);
    }
  });
  it('keeps an irregular polygon unchanged with reversed winding and a different starting corner',()=> {
    const polygon:Vec3[]=[[-2,-1,0],[1.3,-0.7,0],[2,1.5,0],[-0.4,2,0],[-1.7,0.4,0]];
    const reordered=[...polygon.slice(2),...polygon.slice(0,2)].reverse();
    const [a,b]=matchPoints(polygon,reordered,true);
    expect(a).toEqual(b);
  });
  it('preserves bends and endpoints in open paths with different point counts',()=> {
    const from:Vec3[]=[[0,0,0],[0.7,0,0],[0.7,3,0]];
    const to:Vec3[]=[[0,0,0],[0.2,1,0],[2,1,0],[2,3,0]];
    const [a,b]=matchPoints(from,to,false);
    for(const [original,matched] of [[from,a],[to,b]])for(const p of original) {
      expect(matched.some(q=>q.every((v,i)=>Math.abs(v-p[i])<1e-10))).toBe(true);
    }
    expect(a[0]).toEqual(from[0]);expect(a.at(-1)).toEqual(from.at(-1));
    expect(b[0]).toEqual(to[0]);expect(b.at(-1)).toEqual(to.at(-1));
  });
  it('does not reuse stale correspondence after a control changes an outline',()=> {
    const a:Vec3[]=[[0,0,0],[1,0,0],[0,1,0]],b:Vec3[]=[[0,0,0],[2,0,0],[0,2,0]];
    const original=matchPoints(a,b,true);
    b[1][0]=4;
    const changed=matchPoints(a,b,true);
    expect(changed[1]).toContainEqual([4,0,0]);
    expect(original[1]).not.toContainEqual([4,0,0]);
    b[1][0]=2;
    expect(matchPoints(a,b,true)).toEqual(original);
  });
});
describe('3D camera',()=> {
  const camera={yaw:0,pitch:0,target:[0,0,0] as Vec3,height:8,distance:10,perspective:1};
  it('projects depth and interpolates orthographic to perspective continuously',()=> {
    const near=project([1,0,5],camera,800,400);
    const far=project([1,0,-5],camera,800,400);
    expect(near.x).toBeGreaterThan(far.x);
    expect(project([1,0,5],{...camera,perspective:0},800,400).x).toBe(450);
    expect(project([1,0,11],camera,800,400).visible).toBe(false);
  });
  it('rotates geometry around three world axes',()=> {
    const point=rotate([1,0,0],[0,0,Math.PI/2]);
    expect(point[0]).toBeCloseTo(0);expect(point[1]).toBeCloseTo(1);
  });
});

import {CanvasRenderer,triangulateContours} from '../src/renderer.js';
import {vi,afterEach} from 'vitest';
describe('WebGPU rendering geometry',()=> {
  afterEach(()=>vi.unstubAllGlobals());
  it('triangulates compound vector contours while preserving holes',()=> {
    const triangles=triangulateContours([
      [[-2,-2,0],[2,-2,0],[2,2,0],[-2,2,0]],
      [[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]],
    ]);
    let area=0;
    for(let i=0;i<triangles.length;i+=3){const [a,b,c]=triangles.slice(i,i+3);area+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;}
    expect(area).toBeCloseTo(12);
  });
  it('reports when both rendering backends are unavailable',async()=> {
    vi.stubGlobal('ResizeObserver',class {observe(){}disconnect(){}});
    vi.stubGlobal('navigator',{});
    const canvas={width:800,height:450,style:{},getBoundingClientRect:()=>({width:800,height:450}),getContext:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as HTMLCanvasElement;
    const renderer=new CanvasRenderer(canvas);
    await expect(renderer.prepare([])).rejects.toThrow('Neither WebGPU nor WebGL2');
    expect(canvas.getContext).toHaveBeenCalledWith('webgl2',expect.objectContaining({depth:true}));renderer.dispose();
  });
});

it('locks orbit input during camera tracks while retaining viewer orientation continuously',async()=> {
  vi.stubGlobal('ResizeObserver',class {observe(){}disconnect(){}});
  vi.stubGlobal('GPUBufferUsage',{UNIFORM:1,COPY_DST:2,VERTEX:4});
  vi.stubGlobal('GPUTextureUsage',{RENDER_ATTACHMENT:1});
  const writeBuffer=vi.fn();
  const device={
    limits:{maxTextureDimension2D:8192},lost:new Promise(()=>{}),addEventListener:vi.fn(),destroy:vi.fn(),
    createShaderModule:()=>({getCompilationInfo:async()=>({messages:[]})}),
    createRenderPipelineAsync:async()=>({getBindGroupLayout:()=>({})}),
    createBuffer:()=>({destroy:vi.fn()}),createBindGroup:()=>({}),
    createTexture:({size}:{size:number[]})=>({width:size[0],height:size[1],createView:()=>({}),destroy:vi.fn()}),
    queue:{writeBuffer,submit:vi.fn()},createCommandEncoder:()=>({beginRenderPass:()=>({setPipeline:vi.fn(),setBindGroup:vi.fn(),setVertexBuffer:vi.fn(),draw:vi.fn(),end:vi.fn()}),finish:()=>({})}),
  };
  vi.stubGlobal('navigator',{gpu:{requestAdapter:async()=>({requestDevice:async()=>device}),getPreferredCanvasFormat:()=> 'bgra8unorm'}});
  const canvas={width:800,height:450,style:{},getBoundingClientRect:()=>({width:800,height:450}),getContext:()=>({configure:vi.fn(),unconfigure:vi.fn(),getCurrentTexture:()=>({createView:()=>({})})}),addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as HTMLCanvasElement;
  const renderer=new CanvasRenderer(canvas);
  try {
    await renderer.prepare([]);renderer.setOrbit({yaw:0.5,pitch:0.2});renderer.setOrbitEnabled(false);
    const camera={yaw:0.6,pitch:0.3,target:[0,0,0] as Vec3,height:8,distance:10,perspective:1};
    const options={mode:'3d' as const,end:'hold' as const,orbit:true,background:"GREY_E" as const};
    renderer.render({elements:[],camera,cameraAnimated:true},options);
    let uniform=writeBuffer.mock.calls.at(-1)![2] as Float32Array;
    expect(uniform[4]).toBeCloseTo(1.1);expect(uniform[5]).toBeCloseTo(0.5);
    renderer.render({elements:[],camera:{...camera,perspective:0.5},cameraAnimated:true},options);
    uniform=writeBuffer.mock.calls.at(-1)![2] as Float32Array;
    expect(uniform[4]).toBeCloseTo(0.85);expect(uniform[5]).toBeCloseTo(0.4);
    renderer.render({elements:[],camera:{...camera,perspective:0},cameraAnimated:false},options);
    uniform=writeBuffer.mock.calls.at(-1)![2] as Float32Array;
    expect(uniform[4]).toBeCloseTo(0.6);expect(uniform[5]).toBeCloseTo(0.3);
    expect(renderer.orbit).toEqual({yaw:0.5,pitch:0.2});
  } finally {renderer.dispose();vi.unstubAllGlobals();}
});

import {strokeTriangles,sphereTriangles} from '../src/geometry.js';
it('builds watertight shared stroke joins without overlapping corner quads',()=> {
  const triangles=strokeTriangles([[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]],0.2,true);
  let area=0;for(let i=0;i<triangles.length;i+=3){const [a,b,c]=triangles.slice(i,i+3);area+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;}
  expect(area).toBeCloseTo(1.6);expect(triangles).toHaveLength(24);
});
it('generates a closed sphere surface with unit normals and no degenerate pole faces',()=> {
  const sphere=sphereTriangles(0.42);
  expect(sphere.points.length).toBeGreaterThan(1000);
  expect(sphere.normals.every(n=>Math.abs(Math.hypot(...n)-1)<1e-8)).toBe(true);
  expect(sphere.points.every(p=>Math.abs(Math.hypot(...p)-0.42)<1e-8)).toBe(true);
  for(let i=0;i<sphere.points.length;i+=3){const [a,b,c]=sphere.points.slice(i,i+3),u=b.map((v,j)=>v-a[j]),v=c.map((v,j)=>v-a[j]);expect(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])).toBeGreaterThan(1e-8);}
});

import { tubeTriangles, coneTriangles } from '../src/geometry.js';
it.each(([[1,0,0],[0,1,0],[0,0,1],[1,2,3]] as Vec3[]).map(end=>({end})))('creates round tubes with unit normals perpendicular to direction $end',({end})=>{
  const tube=tubeTriangles([[0,0,0],end],0.2);
  const length=Math.hypot(...end),axis=end.map(v=>v/length);
  expect(tube.points).toHaveLength(tube.normals.length);
  expect(tube.points.every(p=>p.every(Number.isFinite))).toBe(true);
  for(let i=0;i<16*6;i++){
    const point=tube.points[i],normal=tube.normals[i];
    const axial=point.reduce((sum,v,j)=>sum+v*axis[j],0);
    expect(Math.hypot(...point.map((v,j)=>v-axial*axis[j]))).toBeCloseTo(0.1);
    expect(Math.hypot(...normal)).toBeCloseTo(1);
    expect(normal.reduce((sum,v,j)=>sum+v*axis[j],0)).toBeCloseTo(0);
  }
});
it('handles duplicates, bends, closed loops, and degenerate round strokes without invalid vertices',()=>{
  const path:Vec3[]=[[0,0,0],[0,0,0],[0,0,1],[1,0,1],[0,0,1],[0,0,2]];
  expect(tubeTriangles(path,0.2).points.every(p=>p.every(Number.isFinite))).toBe(true);
  const square:Vec3[]=[[0,0,0],[1,0,0],[1,1,0],[0,1,0]];
  expect(tubeTriangles([...square,square[0]],0.2,true)).toEqual(tubeTriangles(square,0.2,true));
  expect(tubeTriangles([[0,0,0],[0,0,0]],0.2).points).toEqual([]);
  expect(tubeTriangles([[0,0,0],[1,0,0]],0).points).toEqual([]);
});
it('builds nondegenerate spatial cone heads with correctly oriented unit normals',()=>{
  const cone=coneTriangles([0,0,0],[0,0,1],0.2);
  expect(cone.normals.every(n=>Math.abs(Math.hypot(...n)-1)<1e-8)).toBe(true);
  expect(cone.points.some(p=>p[0]>0.19)).toBe(true);expect(cone.points.some(p=>p[1]>0.19)).toBe(true);
  for(let i=0;i<cone.points.length;i+=3){
    const [a,b,c]=cone.points.slice(i,i+3),u=b.map((v,j)=>v-a[j]),v=c.map((v,j)=>v-a[j]);
    expect(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])).toBeGreaterThan(1e-8);
  }
  expect(coneTriangles([0,0,0],[0,0,0],0.2).points).toEqual([]);
});
