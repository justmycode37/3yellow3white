import {afterEach,describe,expect,it,vi} from 'vitest';
import {CanvasRenderer} from '../src/renderer.js';
import {project,strokeTriangles} from '../src/geometry.js';
import type {ElementState,Geometry,Vec3} from '../src/types.js';

const camera={yaw:0,pitch:0,target:[0,0,0] as Vec3,height:8,distance:10,perspective:0};
const options={mode:'2d' as const,end:'hold' as const,orbit:false,background:'#000000'};
const element=(geometry:Geometry,extra:Partial<ElementState>={}):ElementState=>({id:'shape',geometry,position:[0,0,0],rotation:[0,0,0],scale:1,opacity:1,fill:'none',stroke:'#ffffff',strokeWidth:0.065,space:'world',persistent:false,...extra});

// Capture the production renderer's submitted geometry; no GPU or DOM is required.
async function captureRenderer() {
  vi.stubGlobal('ResizeObserver',class {observe(){}disconnect(){}});
  vi.stubGlobal('GPUBufferUsage',{UNIFORM:1,COPY_DST:2,VERTEX:4});
  vi.stubGlobal('GPUTextureUsage',{RENDER_ATTACHMENT:1});
  const writes:Float32Array[]=[];
  let stride=0;
  const device={limits:{maxTextureDimension2D:8192},lost:new Promise(()=>{}),addEventListener:()=>{},destroy:()=>{},
    createShaderModule:()=>({getCompilationInfo:async()=>({messages:[]})}),
    createRenderPipelineAsync:async(descriptor:{vertex:{buffers:{arrayStride:number}[]}})=>{stride=descriptor.vertex.buffers[0].arrayStride/4;return {getBindGroupLayout:()=>({})};},
    createBuffer:()=>({destroy:()=>{}}),createBindGroup:()=>({}),
    createTexture:({size}:{size:number[]})=>({width:size[0],height:size[1],createView:()=>({}),destroy:()=>{}}),
    queue:{writeBuffer:(_buffer:unknown,_offset:number,data:Float32Array)=>writes.push(data.slice()),submit:()=>{}},
    createCommandEncoder:()=>({beginRenderPass:()=>({setPipeline:()=>{},setBindGroup:()=>{},setVertexBuffer:()=>{},draw:()=>{},end:()=>{}}),finish:()=>({})}),
  };
  vi.stubGlobal('navigator',{gpu:{requestAdapter:async()=>({requestDevice:async()=>device}),getPreferredCanvasFormat:()=> 'bgra8unorm'}});
  const canvas={width:800,height:450,style:{},getBoundingClientRect:()=>({width:800,height:450}),getContext:()=>({configure:()=>{},unconfigure:()=>{},getCurrentTexture:()=>({createView:()=>({})})}),addEventListener:()=>{},removeEventListener:()=>{}} as unknown as HTMLCanvasElement;
  const renderer=new CanvasRenderer(canvas);
  await renderer.prepare([]);
  return {renderer,draw(state:ElementState,view=camera){writes.length=0;renderer.render({elements:[state],camera:view,cameraAnimated:false},options);const data=writes[0];return Array.from({length:data.length/stride},(_,i)=>Array.from(data.subarray(i*stride,i*stride+3)) as Vec3);}};
}

describe('render review regressions',()=> {
  afterEach(()=>vi.unstubAllGlobals());

  it('retains arrowhead size when a morph subdivides an unchanged arrow',async()=> {
    const {renderer,draw}=await captureRenderer();
    try {
      const geometry:Geometry={kind:'arrow',points:[[0,0],[1.5,1]]};
      const headLength=(vertices:Vec3[])=>{const [tip,left,right]=vertices.slice(-3);return Math.hypot(...tip.map((value,i)=>value-(left[i]+right[i])/2));};
      const normal=headLength(draw(element(geometry)));
      const morphed=headLength(draw(element(geometry,{morph:{from:geometry,to:geometry,progress:0.5}})));
      expect(morphed).toBeCloseTo(normal,6);
    } finally {renderer.dispose();}
  });

  it('keeps billboard geometry facing an orbiting camera',async()=> {
    const {renderer,draw}=await captureRenderer();
    try {
      const view={...camera,yaw:0.65,pitch:0.38,perspective:1};
      const points=draw(element({kind:'rectangle',width:2,height:1},{fill:'#ffffff',stroke:'none',billboard:true}),view).map(p=>project(p,view,800,450));
      expect(Math.max(...points.map(p=>p.depth))-Math.min(...points.map(p=>p.depth))).toBeLessThan(1e-6);
      expect(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))).toBeCloseTo(112.5,4);
      expect(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))).toBeCloseTo(56.25,4);
    } finally {renderer.dispose();}
  });

  it('uses the same closed border when the author repeats the first vertex',()=> {
    const square:Vec3[]=[[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]];
    const area=(points:Vec3[])=>{let sum=0;for(let i=0;i<points.length;i+=3){const [a,b,c]=points.slice(i,i+3);sum+=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;}return sum;};
    expect(area(strokeTriangles([...square,square[0]],0.2,true))).toBeCloseTo(area(strokeTriangles(square,0.2,true)),8);
  });
});
