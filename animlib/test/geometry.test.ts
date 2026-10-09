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
  it('rejects unavailable WebGPU without requesting another canvas context',async()=> {
    vi.stubGlobal('ResizeObserver',class {observe(){}disconnect(){}});
    vi.stubGlobal('navigator',{});
    const canvas={width:800,height:450,style:{},getBoundingClientRect:()=>({width:800,height:450}),getContext:vi.fn(),addEventListener:vi.fn(),removeEventListener:vi.fn()} as unknown as HTMLCanvasElement;
    const renderer=new CanvasRenderer(canvas);
    await expect(renderer.prepare([])).rejects.toThrow('WebGPU is required');
    expect(canvas.getContext).not.toHaveBeenCalled();renderer.dispose();
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
    const options={mode:'3d' as const,end:'hold' as const,orbit:true,background:'#101b2c'};
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
