import {afterEach,describe,expect,it,vi} from 'vitest';
import {CanvasRenderer} from '../src/renderer.js';
import {project,strokeTriangles} from '../src/geometry.js';
import type {ColorPalette,CompiledScene,ElementState,Frame,Geometry,Vec3} from '../src/types.js';
import {THREE_BLUE_ONE_BROWN_PALETTE,parseColor} from '../src/palette.js';

const camera={yaw:0,pitch:0,target:[0,0,0] as Vec3,height:8,distance:10,perspective:0};
const options={mode:'2d' as const,end:'hold' as const,orbit:false,background:'BLACK' as const};
const element=(geometry:Geometry,extra:Partial<ElementState>={}):ElementState=>({id:'shape',geometry,position:[0,0,0],rotation:[0,0,0],scale:1,opacity:1,fill:'none',stroke:'WHITE',strokeWidth:0.065,space:'world',persistent:false,...extra});

// Capture the production renderer's submitted geometry; no GPU or DOM is required.
async function captureRenderer(palette?:ColorPalette) {
  vi.stubGlobal('ResizeObserver',class {observe(){}disconnect(){}});
  vi.stubGlobal('GPUBufferUsage',{UNIFORM:1,COPY_DST:2,VERTEX:4});
  vi.stubGlobal('GPUTextureUsage',{RENDER_ATTACHMENT:1});
  const writes:Float32Array[]=[];
  let stride=0;
  let clear:Record<string,number>={};
  const device={limits:{maxTextureDimension2D:8192},lost:new Promise(()=>{}),addEventListener:()=>{},destroy:()=>{},
    createShaderModule:()=>({getCompilationInfo:async()=>({messages:[]})}),
    createRenderPipelineAsync:async(descriptor:{vertex:{buffers:{arrayStride:number}[]}})=>{stride=descriptor.vertex.buffers[0].arrayStride/4;return {getBindGroupLayout:()=>({})};},
    createBuffer:()=>({destroy:()=>{}}),createBindGroup:()=>({}),
    createTexture:({size}:{size:number[]})=>({width:size[0],height:size[1],createView:()=>({}),destroy:()=>{}}),
    queue:{writeBuffer:(_buffer:unknown,_offset:number,data:Float32Array)=>writes.push(data.slice()),submit:()=>{}},
    createCommandEncoder:()=>({beginRenderPass:(descriptor:{colorAttachments:{clearValue:Record<string,number>}[]})=>{clear=descriptor.colorAttachments[0].clearValue;return {setPipeline:()=>{},setBindGroup:()=>{},setVertexBuffer:()=>{},setViewport:()=>{},setScissorRect:()=>{},draw:()=>{},end:()=>{}};},finish:()=>({})}),
  };
  vi.stubGlobal('navigator',{gpu:{requestAdapter:async()=>({requestDevice:async()=>device}),getPreferredCanvasFormat:()=> 'bgra8unorm'}});
  const canvas={width:800,height:450,style:{},getBoundingClientRect:()=>({width:800,height:450}),getContext:()=>({configure:()=>{},unconfigure:()=>{},getCurrentTexture:()=>({createView:()=>({})})}),addEventListener:()=>{},removeEventListener:()=>{}} as unknown as HTMLCanvasElement;
  const renderer=new CanvasRenderer(canvas,palette);
  await renderer.prepare([]);
  return {renderer,
    renderColors(frame:Frame,display:CompiledScene['options']=options){
      writes.length=0;renderer.render(frame,display);
      const data=writes[0];
      return {clear,colors:Array.from({length:data.length/stride},(_,i)=>Array.from(data.subarray(i*stride+3,i*stride+7)))};
    },
    draw(state:ElementState,view=camera){writes.length=0;renderer.render({elements:[state],camera:view,cameraAnimated:false},options);const data=writes[0];return Array.from({length:data.length/stride},(_,i)=>Array.from(data.subarray(i*stride,i*stride+3)) as Vec3);}};
}

describe('render review regressions',()=> {
  afterEach(()=>vi.unstubAllGlobals());

  it('enforces palette colors in direct GPU submissions for shapes, strokes, text, and regional views',async()=>{
    const {renderer,renderColors}=await captureRenderer();
    try {
      const geometry:Geometry[]=[
        {kind:'rectangle',width:1,height:1},{kind:'sphere',radius:0.5},
        {kind:'text',text:'x',fontSize:0.5},{kind:'latex',tex:'x',fontSize:0.5},
        {kind:'line',points:[[0,0],[1,1]]},{kind:'arrow',points:[[0,0],[1,1]]},
        {kind:'mesh',vertices:[[0,0],[1,0],[0,1]],triangles:[[0,1,2]]},
      ];
      const elements=geometry.map((g,i)=>element(g,{id:String(i),fill:{color:'BLUE',opacity:0.4},stroke:'BLUE',...(i===4||i===5?{strokeProfile:'round' as const}:{}),...(i===1?{view:'region'}:{})}));
      const result=renderColors({elements,camera,cameraAnimated:false,views:[{id:'region',rect:[0,0,0.5,0.5],camera,orbit:false,cameraAnimated:false}]},{...options,background:'GREY_E'});
      expect(result.colors.length).toBeGreaterThan(100);
      for(const rgba of result.colors){
        expect(rgba[0]).toBeCloseTo(88/255);expect(rgba[1]).toBeCloseTo(196/255);expect(rgba[2]).toBeCloseTo(221/255);
        expect(rgba[3]===1||Math.abs(rgba[3]-0.4)<1e-6).toBe(true);
      }
      const allowed=Object.values(THREE_BLUE_ONE_BROWN_PALETTE.colors).map(c=>parseColor(c).slice(0,3));
      expect(allowed).toContainEqual([result.clear.r,result.clear.g,result.clear.b]);
    }finally{renderer.dispose();}
  });

  it('rejects raw CSS supplied by untyped direct frame callers',async()=>{
    const {renderer,renderColors}=await captureRenderer();
    try {
      const bad=JSON.parse(JSON.stringify(element({kind:'rectangle',width:1,height:1})));
      bad.fill='#58c4dd';
      expect(()=>renderColors({elements:[bad],camera,cameraAnimated:false})).toThrow('Color token');
    }finally{renderer.dispose();}
  });

  it('honors a host palette even if a direct frame supplies a different palette',async()=>{
    const palette:ColorPalette={colors:{WHITE:'#dddddd',BLACK:'#222222'},background:'WHITE',foreground:'BLACK'};
    const {renderer,renderColors}=await captureRenderer(palette);
    try {
      const result=renderColors({elements:[element({kind:'rectangle',width:1,height:1},{fill:'WHITE',stroke:'none'})],camera,cameraAnimated:false},
        {...options,palette:THREE_BLUE_ONE_BROWN_PALETTE,background:'WHITE'});
      expect(result.colors.length).toBeGreaterThan(0);
      for(const rgba of result.colors)expect(rgba.slice(0,3)).toEqual([expect.closeTo(221/255),expect.closeTo(221/255),expect.closeTo(221/255)]);
      expect(result.clear).toEqual({r:221/255,g:221/255,b:221/255,a:1});
    }finally{renderer.dispose();}
  });

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
      const points=draw(element({kind:'rectangle',width:2,height:1},{fill:'WHITE',stroke:'none',billboard:true}),view).map(p=>project(p,view,800,450));
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
