/// <reference types="@webgpu/types" />
import earcut from 'earcut';
import { WebGLBackend } from './webgl.js';
import { GeometryCache } from './cache.js';
import { ViewInteraction } from './interaction.js';
import { paletteResolver, parseColor } from './palette.js';
import type { PaletteResolver } from './palette.js';
import type { CameraState, ColorValue, ColorPalette, CompiledScene, ElementState, Frame, Geometry, InteractionSnapshot, Vec3 } from './types.js';
import { add, sub, cameraRay, planePoint } from './spatial.js';
import { composeItems } from './composition.js';
import type { DrawItem } from './composition.js';
import { GPUCompositor } from './gpu-compositor.js';
import { lerp, matchPoints, morphOutline, outline, project, rotate, vec3, strokeTriangles, sphereTriangles, tubeTriangles, coneTriangles } from './geometry.js';
import { layoutLatex, layoutLatexGeometry, validateLatexMap } from './latex.js';
import type { LatexPath } from './latex.js';

const shader=`
struct Camera { focus: vec4f, angles: vec4f, viewport: vec4f };
@group(0) @binding(0) var<uniform> camera: Camera;
struct Output { @builtin(position) position: vec4f, @location(0) color: vec4f, @location(1) normal: vec3f, @location(2) lit: f32 };
@vertex fn vertex(@location(0) world: vec3f, @location(1) color: vec4f, @location(2) screen: f32, @location(3) normal: vec3f, @location(4) lit: f32, @location(5) layer: f32, @location(6) viewportOffset: vec2f) -> Output {
  var p=world-camera.focus.xyz;
  let cy=cos(-camera.angles.x); let sy=sin(-camera.angles.x);
  p=vec3f(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);
  let cp=cos(-camera.angles.y); let sp=sin(-camera.angles.y);
  p=vec3f(p.x,p.y*cp-p.z*sp,p.y*sp+p.z*cp);
  let depth=camera.angles.z-p.z;
  let divisor=mix(1.,depth/camera.angles.z,camera.angles.w);
  let halfHeight=camera.viewport.z/2.;
  var output:Output;
  output.position=vec4f(p.x/halfHeight*camera.viewport.y/camera.viewport.x,p.y/halfHeight,(depth-0.01)/(camera.angles.z*100.-0.01)*divisor,divisor);
  if(screen>0.5) { output.position=vec4f(world.x*2./camera.viewport.x,world.y*2./camera.viewport.y,0.0001,1.); }
  // Tiny deterministic tie bias fixes coplanar painter order while preserving 3D depth.
  output.position.z-=layer*0.00000002*output.position.w;
  output.position=vec4f(output.position.xy+viewportOffset*2.*output.position.w,output.position.zw);
  var n=normal;
  n=vec3f(n.x*cy+n.z*sy,n.y,-n.x*sy+n.z*cy);
  n=vec3f(n.x,n.y*cp-n.z*sp,n.y*sp+n.z*cp);
  output.normal=n;output.lit=lit;output.color=color;
  return output;
}
@fragment fn fragment(input:Output) -> @location(0) vec4f { var color=input.color;
  if(input.lit>0.5){let amount=0.32+0.68*max(0.,dot(normalize(input.normal),normalize(vec3f(-0.4,0.65,1.))));color=vec4f(color.rgb*amount,color.a);}
  return color; }
`;
function textTex(text:string):string {return String.raw`\text{`+text.replace(/[\\{}$&#%_^~]/g,c=>({'\\':String.raw`\backslash `,'{':String.raw`\{`,'}':String.raw`\}`,'$':String.raw`\$`,'&':String.raw`\&`,'#':String.raw`\#`,'%':String.raw`\%`,'_':String.raw`\_`,'^':String.raw`\textasciicircum `,'~':String.raw`\textasciitilde `}[c]!))+'}';}
function contains(contour:Vec3[],point:Vec3):boolean {
  let inside=false;
  for(let i=0,j=contour.length-1;i<contour.length;j=i++) {
    const a=contour[i],b=contour[j];
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
const triangulations = new GeometryCache<Vec3[]>();
/** Triangulates compound contours, preserving glyph holes and nested islands. */
export function triangulateContours(contours:Vec3[][]):Vec3[] {
  const key=JSON.stringify(contours),cached=triangulations.get(key);
  if(cached)return cached;
  const loops=contours.map(c=>c.length>1&&Math.hypot(...c[0].map((v,i)=>v-c.at(-1)![i]))<1e-8?c.slice(0,-1):c).filter(c=>c.length>=3);
  const parents=loops.map((loop,i)=>loops.map((outer,j)=>j!==i&&contains(outer,loop[0])?j:-1).filter(j=>j>=0));
  const result:Vec3[]=[];
  for(let i=0;i<loops.length;i++) {
    if(parents[i].length%2!==0)continue;
    const holes=loops.filter((_,j)=>parents[j].length===parents[i].length+1&&parents[j].includes(i));
    const rings=[loops[i],...holes],vertices=rings.flat(),indices:number[]=[];let count=loops[i].length;
    for(const hole of holes){indices.push(count);count+=hole.length;}
    const triangles=earcut(vertices.flat(),indices,3);for(const index of triangles)result.push(vertices[index]);
  }
  // The cache owns its points; later edits to an input contour must not alter
  // a triangulation retained for a previous frame or scene.
  return triangulations.set(key,result.map(p=>[...p] as Vec3),result.length*64);
}
export class CanvasRenderer {
  onCanvasChange:((canvas:HTMLCanvasElement)=>void)|undefined;
  onRecovered:(()=>void)|undefined;
  private gl:WebGLBackend|undefined;
  private contextLost=false;
  private ready=false;
  private originalCanvas:HTMLCanvasElement;
  get backend():'webgpu'|'webgl2'|undefined {return this.gl?'webgl2':this.ready?'webgpu':undefined;}
  get canvasElement():HTMLCanvasElement {return this.canvas;}
  setPalette(palette:ColorPalette):void {this.hostPalette=paletteResolver(palette).palette;}
  onOrbitChange:(()=>void)|undefined;
  onInvalidate:(()=>void)|undefined;
  onError:((error:Error)=>void)|undefined;
  private size={width:1,height:1};
  private observer:ResizeObserver;
  private interaction=new ViewInteraction();
  private interactionScene: string | undefined;
  private regions:NonNullable<Frame["views"]>=[];
  private viewResources=new Map<string,{uniform:GPUBuffer;bindGroup:GPUBindGroup;transparentBindGroup:GPUBindGroup}>();
  private orbitEnabled=false;
  private drag:{id:number;x:number;y:number;view:string;pan?:boolean}|null=null;
  private pans = new Map<string, Vec3>();
  private navigationMode: 'orbit' | 'pan' = 'orbit';
  private lastFrame:Frame|undefined;
  private lastOptions:CompiledScene['options']|undefined;
  private device:GPUDevice|undefined;
  private context:GPUCanvasContext|undefined;
  private pipeline:GPURenderPipeline|undefined;
  private transparentPipeline:GPURenderPipeline|undefined;
  private transparentBindGroup:GPUBindGroup|undefined;
  private compositor:GPUCompositor|undefined;
  private pipelineDescriptor:GPURenderPipelineDescriptor|undefined;
  private depthOnlyPipeline:GPURenderPipeline|undefined;
  private uniform:GPUBuffer|undefined;
  private bindGroup:GPUBindGroup|undefined;
  private vertices:GPUBuffer|undefined;
  private capacity=0;
  private depthTexture:GPUTexture|undefined;
  private colorTexture:GPUTexture|undefined;
  private format:GPUTextureFormat|undefined;
  private initializing:Promise<void>|undefined;
  private disposed=false;
  constructor(private canvas:HTMLCanvasElement, private hostPalette?:ColorPalette) {
    this.originalCanvas=canvas;
    if(hostPalette)this.hostPalette=paletteResolver(hostPalette).palette;
    this.observer=new ResizeObserver(()=>{this.resize();if(this.onInvalidate)this.onInvalidate();else if(this.lastFrame&&this.lastOptions)this.render(this.lastFrame,this.lastOptions);});
    this.observer.observe(canvas);this.resize();
    this.listen(true);
  }
  private listen(add:boolean):void {
    const events = {pointerdown:this.pointerDown,pointermove:this.pointerMove,pointerup:this.pointerUp,pointercancel:this.pointerUp,lostpointercapture:this.pointerUp,contextmenu:this.contextMenu};
    for(const [name,handler] of Object.entries(events)) {
      if(add)this.canvas.addEventListener(name,handler as EventListener);
      else this.canvas.removeEventListener(name,handler as EventListener);
    }
  }
  private replaceCanvas():void {
    // Context types are permanent, even after unconfigure()/device.destroy().
    // Keep attributes/layout, but give the fallback a fresh drawing surface.
    const previous=this.canvas, next=previous.cloneNode(false) as HTMLCanvasElement;
    this.pointerUp();this.listen(false);this.observer.disconnect();
    previous.replaceWith(next);this.canvas=next;this.listen(true);this.observer.observe(next);
    this.onCanvasChange?.(next);
  }
  private releaseGPU():void {
    this.compositor?.dispose();this.compositor=undefined;
    this.depthOnlyPipeline=undefined;this.pipelineDescriptor=undefined;
    for(const resource of this.viewResources.values())resource.uniform.destroy();this.viewResources.clear();
    this.vertices?.destroy();this.uniform?.destroy();this.depthTexture?.destroy();this.colorTexture?.destroy();
    const device=this.device;this.device=undefined;
    this.context?.unconfigure();this.context=undefined;device?.destroy();
    this.vertices=undefined;this.uniform=undefined;this.depthTexture=undefined;this.colorTexture=undefined;
    this.pipeline=undefined;this.transparentPipeline=undefined;this.bindGroup=undefined;this.transparentBindGroup=undefined;this.capacity=0;
  }
  private initializeGL():void {
    if(this.disposed)throw new Error('Renderer is disposed.');
    const acquire=()=>this.canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,premultipliedAlpha:false});
    let gl=acquire();
    // The caller may reuse a canvas locked by an earlier renderer/context type.
    if(!gl&&this.canvas===this.originalCanvas&&typeof this.canvas.cloneNode==='function'){this.replaceCanvas();gl=acquire();}
    if(!gl)throw new Error('No WebGL2 context is available.');
    this.gl=new WebGLBackend(gl);
    this.canvas.addEventListener('webglcontextlost',this.glLost);
    this.canvas.addEventListener('webglcontextrestored',this.glRestored);
    this.contextLost=false;this.ready=true;this.resize();
  }
  private glLost=(event:Event):void=>{
    event.preventDefault();
    if(this.disposed)return;
    this.contextLost=true;
    this.onError?.(new Error('WebGL2 context lost. Playback is paused while the graphics context recovers; retry if it does not recover.'));
  };
  private glRestored=():void=>{
    if(this.disposed||!this.gl)return;
    try {
      // Restored contexts have already invalidated every old GL handle.
      const gl=this.gl.gl;this.gl=new WebGLBackend(gl);this.contextLost=false;this.ready=true;this.resize();
      if(this.lastFrame&&this.lastOptions)this.render(this.lastFrame,this.lastOptions);
      if(this.ready)this.onRecovered?.();
    } catch(error){this.onError?.(error instanceof Error?error:new Error(String(error)));}
  };
  private fallback(reason:unknown):void {
    const locked=Boolean(this.context);
    this.ready=false;this.releaseGPU();
    try {
      if(locked)this.replaceCanvas();
      this.initializeGL();
    } catch(error) {
      throw new Error(`Neither WebGPU nor WebGL2 could initialize. WebGPU: ${reason instanceof Error?reason.message:String(reason)} WebGL2: ${error instanceof Error?error.message:String(error)}`);
    }
  }
  get orbit():{yaw:number;pitch:number} {return this.interaction.get();}
  setOrbit(orbit:{yaw:number;pitch:number},view=''):void {this.interaction.set(orbit,view);}
  getOrbit(view=''):{yaw:number;pitch:number} {return this.interaction.get(view);}
  getPan(view=''):Vec3 { return [...(this.pans.get(JSON.stringify([this.interactionScene,view])) ?? [0,0,0])] as Vec3; }
  setPan(value:Vec3,view=''):void {
    if(value.length!==3||!value.every(Number.isFinite))throw new Error('Pan requires three finite coordinates');
    this.pans.set(JSON.stringify([this.interactionScene,view]),[...value]);
  }
  setNavigationMode(mode:'orbit'|'pan'):void { if(mode!=='orbit'&&mode!=='pan')throw new Error('Invalid navigation mode');this.pointerUp();this.navigationMode=mode; }
  private effectiveCamera(camera:CameraState,enabled:boolean,view=''):CameraState {
    const orbit=this.interaction.get(view);
    return {...camera,target:add(camera.target,this.getPan(view)),yaw:camera.yaw+(enabled?orbit.yaw*camera.perspective:0),pitch:camera.pitch+(enabled?orbit.pitch*camera.perspective:0)};
  }
  interactionSnapshot(view=''):InteractionSnapshot|undefined {
    if(!this.lastFrame||!this.lastOptions)return;
    const region=view?this.lastFrame.views?.find(v=>v.id===view):undefined;
    if(view&&!region)return;
    const rect=region?.rect??[0,0,1,1];
    const width=region?this.size.width*(Math.round((rect[0]+rect[2])*this.canvas.width)-Math.round(rect[0]*this.canvas.width))/this.canvas.width:this.size.width;
    const height=region?this.size.height*(Math.round((rect[1]+rect[3])*this.canvas.height)-Math.round(rect[1]*this.canvas.height))/this.canvas.height:this.size.height;
    return {frame:structuredClone(this.lastFrame),camera:structuredClone(this.effectiveCamera(region?.camera??this.lastFrame.camera,region?.orbit??this.lastOptions.orbit,view)),width,height,rect:[...rect] as [number,number,number,number]};
  }
  syncInteraction(scene:string,time:number,compiled:CompiledScene,frame:Frame):void {
    if(this.interactionScene!==scene)this.pointerUp();
    this.interactionScene=scene;
    this.interaction.sync(scene,time,compiled);
    this.regions=frame.views??[];
    if(this.drag&&!this.drag.pan&&!this.canOrbit(this.drag.view))this.pointerUp();
  }
  resetInteraction():void {this.pointerUp();this.interaction.reset();this.pans.clear();this.interactionScene=undefined;}
  setOrbitEnabled(enabled:boolean):void {this.orbitEnabled=enabled;if(this.drag&&!this.drag.pan&&!this.canOrbit(this.drag.view))this.pointerUp();this.canvas.style.cursor=enabled||this.regions.some(v=>this.canOrbit(v.id))?'grab':'';}
  private canOrbit(view:string):boolean {
    if(!view)return this.orbitEnabled;
    const region=this.regions.find(v=>v.id===view);
    return Boolean(region?.orbit&&region.camera.perspective>0&&!region.cameraAnimated);
  }
  private hitView(event:PointerEvent,pan=false):string|undefined {
    const bounds=this.canvas.getBoundingClientRect();
    const x=(event.clientX-bounds.left)/bounds.width,y=(event.clientY-bounds.top)/bounds.height;
    for(const region of [...this.regions].reverse()) {
      const [left,top,width,height]=region.rect;
      if(x>=left&&x<left+width&&y>=top&&y<top+height)return pan||this.canOrbit(region.id)?region.id:undefined;
    }
    return pan||this.canOrbit('')?'':undefined;
  }
  private pointerDown=(event:PointerEvent):void=>{
    if(event.defaultPrevented||event.button>2||this.drag)return;
    const pan=event.shiftKey||event.button===1||event.button===2||this.navigationMode==='pan';
    const view=this.hitView(event,pan);if(view===undefined)return;
    event.preventDefault();
    this.drag={id:event.pointerId,x:event.clientX,y:event.clientY,view,pan};this.canvas.setPointerCapture(event.pointerId);
    this.canvas.style.cursor='grabbing';
  };
  private pointerMove=(event:PointerEvent):void=> {
    if(!this.drag){this.canvas.style.cursor=this.hitView(event)!==undefined?'grab':'';return;}
    if(event.pointerId!==this.drag.id||!this.drag.pan&&!this.canOrbit(this.drag.view))return;
    if(this.drag.pan) {
      const snapshot=this.interactionSnapshot(this.drag.view);if(!snapshot)return;
      const bounds=this.canvas.getBoundingClientRect(),[left,top,w,h]=snapshot.rect;
      const point=(x:number,y:number)=>planePoint(cameraRay(((x-bounds.left)/bounds.width-left)/w*snapshot.width,((y-bounds.top)/bounds.height-top)/h*snapshot.height,snapshot.camera,snapshot.width,snapshot.height),snapshot.camera.target,rotate([0,0,1],[snapshot.camera.pitch,snapshot.camera.yaw,0]));
      const before=point(this.drag.x,this.drag.y),after=point(event.clientX,event.clientY);
      if(before&&after)this.setPan(add(this.getPan(this.drag.view),sub(before,after)),this.drag.view);
      this.drag.x=event.clientX;this.drag.y=event.clientY;this.onOrbitChange?.();return;
    }
    const orbit=this.interaction.get(this.drag.view);
    const region=this.regions.find(v=>v.id===this.drag!.view);
    const bounds=this.canvas.getBoundingClientRect();
    // Half a turn across the shorter view dimension, independent of CSS size/DPR.
    const sensitivity=Math.PI/Math.max(1,Math.min(bounds.width*(region?.rect[2]??1),bounds.height*(region?.rect[3]??1)));
    orbit.yaw-=(event.clientX-this.drag.x)*sensitivity;
    const camera=region?.camera??this.lastFrame?.camera;
    const authoredPitch=camera?.pitch??0;
    orbit.pitch=Math.max(-Math.PI/2+0.02-authoredPitch,Math.min(Math.PI/2-0.02-authoredPitch,orbit.pitch-(event.clientY-this.drag.y)*sensitivity));
    this.interaction.set(orbit,this.drag.view);
    this.drag.x=event.clientX;this.drag.y=event.clientY;this.onOrbitChange?.();
  };
  private pointerUp=(event?:PointerEvent):void=>{
    if(!this.drag||event&&event.pointerId!==this.drag.id)return;
    const id=this.drag.id;this.drag=null;
    if(this.canvas.hasPointerCapture?.(id))this.canvas.releasePointerCapture(id);
    this.canvas.style.cursor=this.orbitEnabled||this.regions.some(v=>this.canOrbit(v.id))?'grab':'';
  };
  private contextMenu=(event:Event):void=>{event.preventDefault();};
  private resize():void {
    const rect=this.canvas.getBoundingClientRect();this.size={width:Math.max(1,rect.width||this.canvas.width||800),height:Math.max(1,rect.height||this.canvas.height||450)};
    const ratio=globalThis.devicePixelRatio||1;
    const max=this.gl?.maxSize??this.device?.limits.maxTextureDimension2D??8192;
    const width=Math.min(max,Math.max(1,Math.round(this.size.width*ratio))),height=Math.min(max,Math.max(1,Math.round(this.size.height*ratio)));
    if(this.canvas.width!==width)this.canvas.width=width;if(this.canvas.height!==height)this.canvas.height=height;
    if(this.device && this.context && (!this.depthTexture||this.depthTexture.width!==width||this.depthTexture.height!==height)) { this.depthTexture?.destroy();this.depthTexture=this.device.createTexture({size:[width,height],format:'depth24plus',sampleCount:4,usage:GPUTextureUsage.RENDER_ATTACHMENT});this.colorTexture?.destroy();this.colorTexture=this.device.createTexture({size:[width,height],format:this.format!,sampleCount:4,usage:GPUTextureUsage.RENDER_ATTACHMENT}); }
  }
  private async initialize():Promise<void> {
    try {await this.initializeGPU();}
    catch(error) {if(this.disposed)throw error;this.fallback(error);}
  }
  private async initializeGPU():Promise<void> {
    if(this.disposed)throw new Error('Renderer is disposed.');
    if(globalThis.isSecureContext===false)throw new Error('This page is using an insecure connection. Open it over HTTPS (or localhost): browsers hide WebGPU on remote HTTP pages.');
    if(!globalThis.navigator?.gpu)throw new Error('WebGPU is unavailable.');
    const adapter=await navigator.gpu.requestAdapter();
    if(this.disposed)throw new Error('Renderer is disposed.');
    if(!adapter)throw new Error('No WebGPU adapter is available.');
    const device=await adapter.requestDevice();if(this.disposed){device.destroy();throw new Error('Renderer is disposed.');}
    this.device=device;
    let lost:string|undefined;
    device.addEventListener('uncapturederror',event=>{if(!this.disposed&&this.device===device)this.onError?.(new Error(event.error.message));});
    void device.lost.then(info=>{
      lost=`WebGPU device lost: ${info.message||info.reason}`;
      if(this.disposed||this.device!==device||!this.ready)return;
      try {this.fallback(new Error(lost));if(this.lastFrame&&this.lastOptions)this.render(this.lastFrame,this.lastOptions);if(this.ready)this.onRecovered?.();}
      catch(error){this.onError?.(error instanceof Error?error:new Error(String(error)));}
    });
    const module=device.createShaderModule({code:shader});
    const compilation=await module.getCompilationInfo();
    // Navigation/retry can dispose this renderer during any GPU initialization
    // await. Never let a stale renderer reconfigure a replacement's canvas.
    if(this.disposed)throw new Error('Renderer is disposed.');
    const errors=compilation.messages.filter(m=>m.type==='error');if(errors.length)throw new Error(errors.map(m=>m.message).join('\n'));
    this.format=navigator.gpu.getPreferredCanvasFormat();
    const descriptor:GPURenderPipelineDescriptor={layout:'auto',vertex:{module,entryPoint:'vertex',buffers:[{arrayStride:60,attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x4'},{shaderLocation:2,offset:28,format:'float32'},{shaderLocation:3,offset:32,format:'float32x3'},{shaderLocation:4,offset:44,format:'float32'},{shaderLocation:5,offset:48,format:'float32'},{shaderLocation:6,offset:52,format:'float32x2'}]}]},fragment:{module,entryPoint:'fragment',targets:[{format:navigator.gpu.getPreferredCanvasFormat(),blend:{color:{srcFactor:'src-alpha',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less-equal'},multisample:{count:4}};
    this.pipelineDescriptor=descriptor;
    const pipeline=await device.createRenderPipelineAsync(descriptor);
    if(this.disposed)throw new Error('Renderer is disposed.');
    this.pipeline=pipeline;
    const transparentPipeline=await device.createRenderPipelineAsync({...descriptor,depthStencil:{...descriptor.depthStencil!,depthWriteEnabled:false}});
    if(this.disposed)throw new Error('Renderer is disposed.');
    this.transparentPipeline=transparentPipeline;
    this.uniform=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.bindGroup=device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}}]});
    this.transparentBindGroup=device.createBindGroup({layout:this.transparentPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}}]});
    if(lost)throw new Error(lost);
    // Complete fallible async device/pipeline setup before locking the host canvas.
    const context=this.canvas.getContext('webgpu');
    if(!context)throw new Error('The canvas cannot create a WebGPU context.');
    this.context=context;
    context.configure({device,format:this.format,alphaMode:'opaque'});
    this.resize();this.ready=true;
  }
  async prepare(scenes:CompiledScene[]):Promise<void> {
    if(this.disposed)throw new Error('Renderer is disposed.');
    const prepareGeometry=(g:Geometry):void=>{if(g.kind==='latex')layoutLatexGeometry(g);if(g.kind==='text')layoutLatex(textTex(g.text??''));};
    for(const scene of scenes) {
      const palette=paletteResolver(this.hostPalette??scene.options.palette);
      const prepareElement=(e:ElementState):void=>{prepareGeometry(e.geometry);palette.resolve(e.fill);palette.resolve(e.stroke);};
      palette.resolve(scene.options.background);
      for(const element of [...scene.initial,...scene.lifecycle.flatMap(event=>event.elements??[])])prepareElement(element);
      for(const track of scene.tracks) {
        if(track.action.geometry)prepareGeometry(track.action.geometry);
        const properties=track.action.properties as Partial<ElementState>|undefined;
        if(properties?.fill)palette.resolve(properties.fill);if(properties?.stroke)palette.resolve(properties.stroke);
        for(const state of Object.values(track.from)) {
          prepareElement(state);
          if(track.action.type==='morph'&&track.action.geometry?.kind==='latex'&&state.geometry.kind==='latex')validateLatexMap(layoutLatexGeometry(state.geometry),layoutLatexGeometry(track.action.geometry),track.action.map);
          else if(track.action.map&&Object.keys(track.action.map).length)throw new Error('Part mappings require a LaTeX-to-LaTeX morph.');
        }
      }
    }
    if(!this.initializing)this.initializing=this.initialize().catch(error=>{this.initializing=undefined;throw error;});
    await this.initializing;
  }
  private drawItems(frame:Frame,camera:CameraState,width:number,height:number,palette:PaletteResolver,view?:string):DrawItem[] {
    const parents=new Map<string,ElementState>();
    for(const e of frame.elements)if(e.geometry.kind==='group')for(const child of e.geometry.children??[])parents.set(child,e);
    const items:DrawItem[]=[];
    for(const [elementIndex,element] of frame.elements.entries()) {
      if(element.geometry.kind==='group'||element.view!==view)continue;
      const chain:ElementState[]=[element];let parent=parents.get(element.id);const seen=new Set([element.id]);
      while(parent&&!seen.has(parent.id)){chain.push(parent);seen.add(parent.id);parent=parents.get(parent.id);}
      const viewportOffset=[0,1].map(axis=>chain.reduce((sum,e)=>sum+(e.viewportOffset?.[axis]??0),0));
      const groups:{id:string;opacity:number}[]=[];
      let opacity=1;
      for(const e of [...chain].reverse()) {
        opacity*=e.opacity;
        if(e.geometry.kind==='group'&&e.geometry.isolated){groups.push({id:e.id,opacity});opacity=1;}
      }
      if(opacity<=0||groups.some(g=>g.opacity<=0))continue;
      const applyTransforms=(point:Vec3):Vec3=>{let p=point;for(const state of chain){p=rotate(p.map(v=>v*state.scale) as Vec3,state.rotation);p=p.map((v,i)=>v+state.position[i]) as Vec3;}return p;};
      const world=(point:Vec3):Vec3=> {
        if(!element.billboard||element.space==='screen')return applyTransforms(point);
        const center=applyTransforms([0,0,0]),scale=chain.reduce((product,state)=>product*state.scale,1);
        let local=rotate(point.map(v=>v*scale) as Vec3,[0,0,element.rotation[2]]);
        const offset=element.billboardOffset??[0,0,0];local=local.map((v,i)=>v+(offset[i]??0)) as Vec3;
        local=rotate(local,[camera.pitch,camera.yaw,0]);
        return local.map((v,i)=>v+center[i]) as Vec3;
      };
      // Each element's transform is affine. Evaluate it once, rather than
      // allocating vectors and recomputing trigonometry for every vertex.
      const origin=world([0,0,0]);
      const axes:Vec3[]=[[1,0,0],[0,1,0],[0,0,1]];
      const normalBasis=axes.map(axis=>{let normal=axis;for(const state of chain)normal=rotate(normal,state.rotation);return normal;});
      const scale=chain.reduce((product,state)=>product*state.scale,1);
      // Transform directions separately to avoid subtracting nearly equal
      // translated points when a small object is far from the world origin.
      const basis=element.billboard&&element.space!=='screen'
        ?axes.map(axis=>rotate(rotate(axis.map(v=>v*scale) as Vec3,[0,0,element.rotation[2]]),[camera.pitch,camera.yaw,0]))
        :normalBasis.map(axis=>axis.map(v=>v*scale) as Vec3);
      const addTriangles=(points:Vec3[],color:ColorValue,alpha=1,normals?:Vec3[]):void=> {
        const rgba=parseColor(palette.resolve(color));if(!points.length||rgba[3]*opacity*alpha<=0)return;
        const vertices=new Float32Array(points.length*15),screen=element.space==='screen',a=rgba[3]*opacity*alpha;
        let sumX=0,sumY=0,sumZ=0;
        for(let i=0;i<points.length;i++) {
          const p=points[i],j=i*15;
          const x=origin[0]+p[0]*basis[0][0]+p[1]*basis[1][0]+p[2]*basis[2][0];
          const y=origin[1]+p[0]*basis[0][1]+p[1]*basis[1][1]+p[2]*basis[2][1];
          const z=origin[2]+p[0]*basis[0][2]+p[1]*basis[1][2]+p[2]*basis[2][2];
          sumX+=x;sumY+=y;sumZ+=z;
          vertices[j]=x;vertices[j+1]=y;vertices[j+2]=z;
          vertices[j+3]=rgba[0];vertices[j+4]=rgba[1];vertices[j+5]=rgba[2];vertices[j+6]=a;vertices[j+7]=screen?1:0;
          if(normals) {
            const n=normals[i];
            for(let axis=0;axis<3;axis++)vertices[j+8+axis]=n[0]*normalBasis[0][axis]+n[1]*normalBasis[1][axis]+n[2]*normalBasis[2][axis];
          } else {vertices[j+8]=normalBasis[2][0];vertices[j+9]=normalBasis[2][1];vertices[j+10]=normalBasis[2][2];}
          vertices[j+11]=normals?1:0;vertices[j+12]=elementIndex;vertices[j+13]=viewportOffset[0];vertices[j+14]=viewportOffset[1];
        }
        // Camera depth is linear in world position, so the centroid gives the
        // same sorting depth without projecting every vertex.
        const depth=screen?-1e9:project([sumX/points.length,sumY/points.length,sumZ/points.length],camera,width,height).depth;
        items.push({depth,vertices,transparent:a<0.999999,screen,groups});
      };
      const contours=(paths:Vec3[][],alpha=1,color=element.fill):void=>{if(color!=='none')addTriangles(triangulateContours(paths),color,alpha);};
      const stroke=(points:Vec3[],closed:boolean,alpha=1,capEnd=true):void=> {
        if(element.stroke==='none'||element.strokeWidth<=0)return;
        if(element.strokeProfile==='round') {
          const tube=tubeTriangles(points,element.strokeWidth,closed,capEnd);
          addTriangles(tube.points,element.stroke,alpha,tube.normals);
        } else addTriangles(strokeTriangles(points,element.strokeWidth,closed),element.stroke,alpha);
      };
      const latexPaths=(paths:LatexPath[],size:number,alpha:number,offset:Vec3=[0,0,0]):void=> {
        const color=element.fill==='none'?element.stroke:element.fill;
        if(color==='none')return;
        for(const path of paths)addTriangles(triangulateContours(path.contours).map(p=>p.map((v,i)=>v*size+offset[i]) as Vec3),color,alpha);
      };
      const addMesh=(geometry:Geometry,alpha=1):void=> {
        const vertices=(geometry.vertices??[]).map(vec3);
        for(const indices of geometry.triangles??[]){const triangle=indices.map(i=>vertices[i]).filter(Boolean);if(triangle.length===3){addTriangles(triangle,element.fill,alpha);stroke(triangle,true,alpha);}}
      };
      const drawGeometry=(geometry:Geometry,alpha=1):void=> {
        if(geometry.kind==='text'||geometry.kind==='latex'){latexPaths((geometry.kind==='text'?layoutLatex(textTex(geometry.text??'')):layoutLatexGeometry(geometry)).paths,geometry.fontSize??(element.space==='screen'?(geometry.kind==='text'?16:24):(geometry.kind==='text'?0.4:0.6)),alpha);return;}
        if(geometry.kind==='mesh'){addMesh(geometry,alpha);return;}
        if(geometry.kind==='sphere'){const sphere=sphereTriangles(geometry.radius??1);addTriangles(sphere.points,element.fill,alpha,sphere.normals);return;}
        const shape=outline(geometry);if(!shape||!shape.points.length)return;
        if(geometry.kind==='arrow'&&shape.points.length>1) {
          const points=shape.points.filter((p,i)=>!i||Math.hypot(...p.map((v,j)=>v-shape.points[i-1][j]))>1e-10),end=points.at(-1)!;
          const lengths=points.slice(1).map((p,i)=>Math.hypot(...p.map((v,j)=>v-points[i][j]))),length=lengths.reduce((a,b)=>a+b,0);
          if(length>1e-10) {
            const headLength=Math.min(length*0.45,Math.max(element.space==='screen'?6:0.16,element.strokeWidth*4));
            let remaining=headLength,index=points.length-2;
            while(index>0&&remaining>lengths[index]){remaining-=lengths[index];index--;}
            const a=points[index],b=points[index+1],ratio=1-remaining/lengths[index];
            const base=a.map((v,i)=>lerp(v,b[i],ratio)) as Vec3;
            const delta=end.map((v,i)=>v-base[i]),xy=Math.hypot(delta[0],delta[1]),headWidth=Math.max(element.strokeWidth*2.6,headLength*0.7);
            const side:Vec3=xy>1e-10?[-delta[1]/xy*headWidth/2,delta[0]/xy*headWidth/2,0]:[headWidth/2,0,0];
            stroke([...points.slice(0,index+1),base],false,alpha,element.strokeProfile!=='round');
            if(element.strokeProfile==='round') {
              const head=coneTriangles(base,end,headWidth/2);
              addTriangles(head.points,element.stroke,alpha,head.normals);
            } else addTriangles([end,base.map((v,i)=>v+side[i]) as Vec3,base.map((v,i)=>v-side[i]) as Vec3],element.stroke,alpha);
          }
        } else {if(shape.closed)contours([shape.points],alpha);stroke(shape.points,shape.closed,alpha);}

      };
      const morph=element.morph;
      if(!morph){drawGeometry(element.geometry);continue;}
      const {from,to,progress:t}=morph;
      if(t<=0){drawGeometry(from);continue;}if(t>=1){drawGeometry(to);continue;}
      if(from.kind==='text'&&to.kind==='text'&&(from.text??'')===(to.text??'')) {
        const defaultSize=element.space==='screen'?16:0.4;
        drawGeometry({...from,fontSize:lerp(from.fontSize??defaultSize,to.fontSize??defaultSize,t)});
        continue;
      }
      const shape=morphOutline(from,to,t);
      if(shape){drawGeometry({kind:from.kind==='arrow'&&to.kind==='arrow'?'arrow':'path',points:shape.points,closed:shape.closed});continue;}
      if(from.kind==='sphere'&&to.kind==='sphere'){drawGeometry({kind:'sphere',radius:lerp(from.radius??1,to.radius??1,t)});continue;}
      if(from.kind==='mesh'&&to.kind==='mesh'&&from.vertices&&to.vertices&&from.vertices.length===to.vertices.length){const target=to.vertices!;addMesh({...to,vertices:from.vertices!.map((p,i)=>vec3(p).map((v,j)=>lerp(v,vec3(target[i])[j],t)) as Vec3)});continue;}
      if(from.kind==='latex'&&to.kind==='latex') {
        const a=layoutLatexGeometry(from),b=layoutLatexGeometry(to),map=morph.map??{},targets=new Set(Object.values(map));
        const sizeA=from.fontSize??(element.space==='screen'?24:0.6),sizeB=to.fontSize??(element.space==='screen'?24:0.6);
        for(const path of a.paths)if(!path.part||!map[path.part])latexPaths([path],sizeA,1-t);
        for(const path of b.paths)if(!path.part||!targets.has(path.part))latexPaths([path],sizeB,t);
        const bounds=(paths:LatexPath[],size:number):Vec3=>{const points=paths.flatMap(p=>p.contours.flat());return [0,1,2].map(i=>points.length?(Math.min(...points.map(p=>p[i]))+Math.max(...points.map(p=>p[i])))*size/2:0) as Vec3;};
        for(const [start,end] of Object.entries(map)) {
          const pathsA=a.paths.filter(p=>p.part===start),pathsB=b.paths.filter(p=>p.part===end);
          if(pathsA.length===pathsB.length&&pathsA.every((p,i)=>p.contours.length===pathsB[i].contours.length)) {
            for(let i=0;i<pathsA.length;i++)contours(pathsA[i].contours.map((c,j)=>{
              const a=c.map(p=>p.map(v=>v*sizeA) as Vec3),b=pathsB[i].contours[j].map(p=>p.map(v=>v*sizeB) as Vec3);
              // Preserve all exact corners when a glyph merely translates/scales. Sampling even
              // an unchanged contour changes its silhouette and makes symbols pop at endpoints.
              let equivalent=a.length===b.length;
              if(equivalent) {
                const center=(points:Vec3[])=>[0,1,2].map(axis=>points.reduce((sum,p)=>sum+p[axis],0)/points.length) as Vec3;
                const ca=center(a),cb=center(b);let dot=0,length=0;
                for(let k=0;k<a.length;k++)for(let axis=0;axis<3;axis++){dot+=(a[k][axis]-ca[axis])*(b[k][axis]-cb[axis]);length+=(a[k][axis]-ca[axis])**2;}
                const scale=length>1e-12?dot/length:1;
                equivalent=scale>0&&a.every((p,k)=>p.every((v,axis)=>Math.abs((v-ca[axis])*scale+cb[axis]-b[k][axis])<1e-7));
              }
              const [source,target]=equivalent?[a,b]:matchPoints(a,b,true,96);
              return source.map((p,k)=>p.map((v,l)=>lerp(v,target[k][l],t)) as Vec3);
            }),1,element.fill==='none'?element.stroke:element.fill);
          } else {
            const centerA=bounds(pathsA,sizeA),centerB=bounds(pathsB,sizeB),delta=centerA.map((v,i)=>centerB[i]-v) as Vec3;
            latexPaths(pathsA,sizeA,1-t,delta.map(v=>v*t) as Vec3);latexPaths(pathsB,sizeB,t,delta.map(v=>-v*(1-t)) as Vec3);
          }
        }
        continue;
      }
      drawGeometry(from,1-t);drawGeometry(to,t);
    }
    return items;
  }
  render(frame:Frame,options:CompiledScene['options']):void {
    if(!this.ready||this.contextLost||this.disposed)return;
    this.lastFrame=frame;this.lastOptions=options;this.regions=frame.views??[];
    const {width,height}=this.size;
    const camera=this.effectiveCamera(frame.camera,options.orbit);
    const palette=paletteResolver(this.hostPalette??options.palette);
    const mainItems=this.drawItems(frame,camera,width,height,palette);
    const batches=[{camera,width,height,rect:undefined as number[]|undefined,items:mainItems.filter(i=>!i.screen),id:''}];
    for(const region of this.regions) {
      const [left,top,w,h]=region.rect;
      // Round shared edges once: adjacent regions neither overlap nor leave gaps at fractional DPR.
      const x=Math.round(left*this.canvas.width),y=Math.round(top*this.canvas.height);
      const pixelWidth=Math.round((left+w)*this.canvas.width)-x,pixelHeight=Math.round((top+h)*this.canvas.height)-y;
      if(pixelWidth<1||pixelHeight<1)continue;
      const viewWidth=width*pixelWidth/this.canvas.width,viewHeight=height*pixelHeight/this.canvas.height;
      const viewCamera=this.effectiveCamera(region.camera,region.orbit,region.id);
      batches.push({camera:viewCamera,width:viewWidth,height:viewHeight,rect:[x,y,pixelWidth,pixelHeight],items:this.drawItems(frame,viewCamera,viewWidth,viewHeight,palette,region.id),id:region.id});
    }
    // Scene-wide screen labels stay above every regional 3D view.
    if(mainItems.some(i=>i.screen))batches.push({camera,width,height,rect:undefined,items:mainItems.filter(i=>i.screen),id:''});
    let vertexOffset=0;
    const ordered=batches.map(batch=>{
      const composition=composeItems(batch.items,vertexOffset);
      const floatCount=batch.items.reduce((n,i)=>n+i.vertices.length,0);vertexOffset+=floatCount/15;
      return {...batch,...composition,floatCount,opaqueVertices:composition.commands.filter(c=>'first' in c&&c.opaque).reduce((n,c)=>n+('count' in c?c.count:0),0)};
    });
    const data=new Float32Array(ordered.reduce((n,batch)=>n+batch.floatCount,0));
    let offset=0;
    for(const batch of ordered)for(const item of batch.items){data.set(item.vertices,offset);offset+=item.vertices.length;}
    const clear=parseColor(palette.resolve(options.background));
    try {
    if(this.gl){this.gl.render(data,ordered,clear,this.canvas.width,this.canvas.height);return;}
    const device=this.device!;
    const viewIds=new Set(this.regions.map(v=>v.id));
    for(const [id,resource] of this.viewResources)if(!viewIds.has(id)){resource.uniform.destroy();this.viewResources.delete(id);}
    if(data.byteLength>this.capacity){this.vertices?.destroy();this.capacity=Math.max(256,data.byteLength*2);this.vertices=device.createBuffer({size:this.capacity,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});}
    if(data.length)device.queue.writeBuffer(this.vertices!,0,data);
    const encoder=device.createCommandEncoder();
    const colorView=this.colorTexture!.createView(),target=this.context!.getCurrentTexture().createView(),depthView=this.depthTexture!.createView();
    this.compositor?.beginFrame();
    for(const [index,batch] of ordered.entries()) {
      let resources=batch.id?this.viewResources.get(batch.id):{uniform:this.uniform!,bindGroup:this.bindGroup!,transparentBindGroup:this.transparentBindGroup!};
      if(!resources){
        const uniform=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
        resources={uniform,bindGroup:device.createBindGroup({layout:this.pipeline!.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]}),transparentBindGroup:device.createBindGroup({layout:this.transparentPipeline!.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]})};
        this.viewResources.set(batch.id,resources);
      }
      const c=batch.camera;
      device.queue.writeBuffer(resources.uniform,0,new Float32Array([...c.target,0,c.yaw,c.pitch,c.distance,c.perspective,batch.width,batch.height,c.height,0]));
      const descriptor:GPURenderPassDescriptor={colorAttachments:[{view:colorView,resolveTarget:target,clearValue:{r:clear[0],g:clear[1],b:clear[2],a:1},loadOp:index===0?'clear':'load',storeOp:'store'}],depthStencilAttachment:{view:depthView,depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}};
      if(batch.commands.some(command=>'children' in command)) {
        this.compositor??=new GPUCompositor(device,this.format!);
        this.depthOnlyPipeline??=device.createRenderPipeline({...this.pipelineDescriptor!,fragment:{...this.pipelineDescriptor!.fragment!,targets:[{format:this.format!,writeMask:0}]}});
        const depthBindGroup=device.createBindGroup({layout:this.depthOnlyPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:resources.uniform}}]});
        this.compositor.render(encoder,batch.commands,descriptor,batch.rect,this.canvas.width,this.canvas.height,(pass,command,depthOnly)=>{
          pass.setPipeline(depthOnly?this.depthOnlyPipeline!:command.opaque?this.pipeline!:this.transparentPipeline!);pass.setBindGroup(0,depthOnly?depthBindGroup:command.opaque?resources!.bindGroup:resources!.transparentBindGroup);
          pass.setVertexBuffer(0,this.vertices!);pass.draw(command.count,1,command.first);
        });
      } else {
        const pass=encoder.beginRenderPass(descriptor);
        if(batch.rect){const [x,y,w,h]=batch.rect;pass.setViewport(x,y,w,h,0,1);pass.setScissorRect(x,y,w,h);}
        for(const command of batch.commands)if('first' in command){pass.setPipeline(command.opaque?this.pipeline!:this.transparentPipeline!);pass.setBindGroup(0,command.opaque?resources.bindGroup:resources.transparentBindGroup);pass.setVertexBuffer(0,this.vertices!);pass.draw(command.count,1,command.first);}
        pass.end();
      }
    }
    device.queue.submit([encoder.finish()]);
    } catch(error) {
      // Frame acquisition can fail before device.lost reaches the playback loop.
      if(this.device&&!this.disposed) {
        try {this.fallback(error);this.render(frame,options);if(this.ready)this.onRecovered?.();return;}
        catch(fallbackError){error=fallbackError;}
      }
      this.ready=false;
      this.onError?.(error instanceof Error?error:new Error(String(error)));
    }
  }
  dispose():void {
    if(this.disposed)return;
    this.pointerUp();this.disposed=true;this.ready=false;this.observer.disconnect();this.listen(false);
    if(this.gl){this.canvas.removeEventListener('webglcontextlost',this.glLost);this.canvas.removeEventListener('webglcontextrestored',this.glRestored);}
    if(!this.contextLost)this.gl?.dispose();this.gl=undefined;this.releaseGPU();
    // Restore caller ownership, including hosts that reuse the original canvas on retry.
    if(this.canvas!==this.originalCanvas)this.canvas.replaceWith(this.originalCanvas);
  }
}
