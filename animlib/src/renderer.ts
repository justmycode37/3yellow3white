/// <reference types="@webgpu/types" />
import earcut from 'earcut';
import colorString from 'color-string';
import type { CompiledScene, ElementState, Frame, Geometry, Vec3 } from './types.js';
import { lerp, matchPoints, morphOutline, outline, project, rotate, vec3 } from './geometry.js';
import { layoutLatex, validateLatexMap } from './latex.js';
import type { LatexPath } from './latex.js';

const shader=`
struct Camera { focus: vec4f, angles: vec4f, viewport: vec4f };
@group(0) @binding(0) var<uniform> camera: Camera;
struct Output { @builtin(position) position: vec4f, @location(0) color: vec4f };
@vertex fn vertex(@location(0) world: vec3f, @location(1) color: vec4f, @location(2) screen: f32) -> Output {
  var p=world-camera.focus.xyz;
  let cp=cos(-camera.angles.y); let sp=sin(-camera.angles.y);
  p=vec3f(p.x,p.y*cp-p.z*sp,p.y*sp+p.z*cp);
  let cy=cos(-camera.angles.x); let sy=sin(-camera.angles.x);
  p=vec3f(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);
  let depth=camera.angles.z-p.z;
  let divisor=mix(1.,depth/camera.angles.z,camera.angles.w);
  let halfHeight=camera.viewport.z/2.;
  var output:Output;
  output.position=vec4f(p.x/halfHeight*camera.viewport.y/camera.viewport.x,p.y/halfHeight,(depth-0.01)/(camera.angles.z*100.-0.01)*divisor,divisor);
  if(screen>0.5) { output.position=vec4f(world.x*2./camera.viewport.x,world.y*2./camera.viewport.y,0.,1.); }
  output.color=color;
  return output;
}
@fragment fn fragment(input:Output) -> @location(0) vec4f { return input.color; }
`;
interface DrawItem { depth:number; vertices:number[] }
type Color=[number,number,number,number];
const colors=new Map<string,Color>();
function parseColor(source:string):Color {
  const cached=colors.get(source);if(cached)return cached;
  if(source==='none')return [0,0,0,0];
  const rgba=colorString.get.rgb(source);
  let result:Color;
  if(rgba)result=[rgba[0]/255,rgba[1]/255,rgba[2]/255,rgba[3]];
  else {
    const hsl=colorString.get.hsl(source),hwb=colorString.get.hwb(source);
    if(!hsl&&!hwb)throw new Error(`Unsupported CSS color: ${source}`);
    const hue=(hsl??hwb)![0],s=hsl?hsl[1]/100:1,l=hsl?hsl[2]/100:0.5,a=s*Math.min(l,1-l);
    const component=(n:number)=>{const k=(n+hue/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1));};
    result=[component(0),component(8),component(4),(hsl??hwb)![3]];
    if(hwb){let w=hwb[1]/100,b=hwb[2]/100;if(w+b>1){const sum=w+b;w/=sum;b/=sum;}result=[result[0]*(1-w-b)+w,result[1]*(1-w-b)+w,result[2]*(1-w-b)+w,result[3]];}
  }
  colors.set(source,result);return result;
}
function textTex(text:string):string {return String.raw`\text{`+text.replace(/[\\{}$&#%_^~]/g,c=>({'\\':String.raw`\backslash `,'{':String.raw`\{`,'}':String.raw`\}`,'$':String.raw`\$`,'&':String.raw`\&`,'#':String.raw`\#`,'%':String.raw`\%`,'_':String.raw`\_`,'^':String.raw`\textasciicircum `,'~':String.raw`\textasciitilde `}[c]!))+'}';}
function contains(contour:Vec3[],point:Vec3):boolean {
  let inside=false;
  for(let i=0,j=contour.length-1;i<contour.length;j=i++) {
    const a=contour[i],b=contour[j];
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
/** Triangulates compound contours, preserving glyph holes and nested islands. */
export function triangulateContours(contours:Vec3[][]):Vec3[] {
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
  return result;
}
export class CanvasRenderer {
  onOrbitChange:(()=>void)|undefined;
  onError:((error:Error)=>void)|undefined;
  private size={width:1,height:1};
  private observer:ResizeObserver;
  private userOrbit={yaw:0,pitch:0};
  private orbitEnabled=false;
  private drag:{id:number;x:number;y:number}|null=null;
  private lastFrame:Frame|undefined;
  private lastOptions:CompiledScene['options']|undefined;
  private device:GPUDevice|undefined;
  private context:GPUCanvasContext|undefined;
  private pipeline:GPURenderPipeline|undefined;
  private uniform:GPUBuffer|undefined;
  private bindGroup:GPUBindGroup|undefined;
  private vertices:GPUBuffer|undefined;
  private capacity=0;
  private depthTexture:GPUTexture|undefined;
  private initializing:Promise<void>|undefined;
  private disposed=false;
  constructor(private canvas:HTMLCanvasElement) {
    this.observer=new ResizeObserver(()=>{this.resize();if(this.lastFrame&&this.lastOptions)this.render(this.lastFrame,this.lastOptions);});
    this.observer.observe(canvas);this.resize();
    canvas.addEventListener('pointerdown',this.pointerDown);canvas.addEventListener('pointermove',this.pointerMove);canvas.addEventListener('pointerup',this.pointerUp);canvas.addEventListener('pointercancel',this.pointerUp);
  }
  get orbit():{yaw:number;pitch:number} {return {...this.userOrbit};}
  setOrbit(orbit:{yaw:number;pitch:number}):void {this.userOrbit={...orbit};}
  setOrbitEnabled(enabled:boolean):void {this.orbitEnabled=enabled;if(!enabled)this.drag=null;this.canvas.style.cursor=enabled?'grab':'';}
  private pointerDown=(event:PointerEvent):void=>{if(!this.orbitEnabled)return;this.drag={id:event.pointerId,x:event.clientX,y:event.clientY};this.canvas.setPointerCapture(event.pointerId);};
  private pointerMove=(event:PointerEvent):void=> {
    if(!this.orbitEnabled||!this.drag||event.pointerId!==this.drag.id)return;
    this.userOrbit.yaw+=(event.clientX-this.drag.x)*0.008;
    this.userOrbit.pitch=Math.max(-Math.PI/2+0.02,Math.min(Math.PI/2-0.02,this.userOrbit.pitch+(event.clientY-this.drag.y)*0.008));
    this.drag.x=event.clientX;this.drag.y=event.clientY;this.onOrbitChange?.();
  };
  private pointerUp=():void=>{this.drag=null;};
  private resize():void {
    const rect=this.canvas.getBoundingClientRect();this.size={width:Math.max(1,rect.width||this.canvas.width||800),height:Math.max(1,rect.height||this.canvas.height||450)};
    const ratio=globalThis.devicePixelRatio||1;
    const max=this.device?.limits.maxTextureDimension2D??8192;
    const width=Math.min(max,Math.max(1,Math.round(this.size.width*ratio))),height=Math.min(max,Math.max(1,Math.round(this.size.height*ratio)));
    if(this.canvas.width!==width)this.canvas.width=width;if(this.canvas.height!==height)this.canvas.height=height;
    if(this.device && (!this.depthTexture||this.depthTexture.width!==width||this.depthTexture.height!==height)) { this.depthTexture?.destroy();this.depthTexture=this.device.createTexture({size:[width,height],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT}); }
  }
  private async initialize():Promise<void> {
    if(this.disposed)throw new Error('Renderer is disposed.');
    if(globalThis.isSecureContext===false)throw new Error('This page is using an insecure connection. Open it over HTTPS (or localhost): browsers hide WebGPU on remote HTTP pages.');
    if(!globalThis.navigator?.gpu)throw new Error('WebGPU is required. Use a WebGPU-capable desktop browser on HTTPS or localhost; no rendering fallback is provided.');
    const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('WebGPU is required but no GPU adapter is available.');
    const device=await adapter.requestDevice();if(this.disposed){device.destroy();throw new Error('Renderer is disposed.');}
    const context=this.canvas.getContext('webgpu');if(!context){device.destroy();throw new Error('The canvas cannot create a WebGPU context.');}
    this.device=device;this.context=context;
    device.addEventListener('uncapturederror',event=>this.onError?.(new Error(event.error.message)));
    void device.lost.then(info=>{if(!this.disposed)this.onError?.(new Error(`WebGPU device lost: ${info.message||info.reason}`));});
    const module=device.createShaderModule({code:shader});
    const compilation=await module.getCompilationInfo();
    const errors=compilation.messages.filter(m=>m.type==='error');if(errors.length)throw new Error(errors.map(m=>m.message).join('\n'));
    context.configure({device,format:navigator.gpu.getPreferredCanvasFormat(),alphaMode:'opaque'});
    this.pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vertex',buffers:[{arrayStride:32,attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x4'},{shaderLocation:2,offset:28,format:'float32'}]}]},fragment:{module,entryPoint:'fragment',targets:[{format:navigator.gpu.getPreferredCanvasFormat(),blend:{color:{srcFactor:'src-alpha',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less-equal'}});
    this.uniform=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.bindGroup=device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}}]});
    this.resize();
  }
  async prepare(scenes:CompiledScene[]):Promise<void> {
    const prepareGeometry=(g:Geometry):void=>{if(g.kind==='latex')layoutLatex(g.tex??'');if(g.kind==='text')layoutLatex(textTex(g.text??''));};
    const prepareElement=(e:ElementState):void=>{prepareGeometry(e.geometry);parseColor(e.fill);parseColor(e.stroke);};
    for(const scene of scenes) {
      parseColor(scene.options.background);
      for(const element of [...scene.initial,...scene.lifecycle.flatMap(event=>event.elements??[])])prepareElement(element);
      for(const track of scene.tracks) {
        if(track.action.geometry)prepareGeometry(track.action.geometry);
        const properties=track.action.properties as Partial<ElementState>|undefined;
        if(properties?.fill)parseColor(properties.fill);if(properties?.stroke)parseColor(properties.stroke);
        for(const state of Object.values(track.from)) {
          prepareElement(state);
          if(track.action.type==='morph'&&track.action.geometry?.kind==='latex'&&state.geometry.kind==='latex')validateLatexMap(layoutLatex(state.geometry.tex??''),layoutLatex(track.action.geometry.tex??''),track.action.map);
          else if(track.action.map&&Object.keys(track.action.map).length)throw new Error('Part mappings require a LaTeX-to-LaTeX morph.');
        }
      }
    }
    if(!this.initializing)this.initializing=this.initialize().catch(error=>{this.initializing=undefined;throw error;});
    await this.initializing;
  }
  render(frame:Frame,options:CompiledScene['options']):void {
    if(!this.device||!this.context||!this.pipeline||!this.uniform||!this.bindGroup||this.disposed)return;
    this.lastFrame=frame;this.lastOptions=options;
    const {width,height}=this.size,camera={...frame.camera};
    // Authored camera tracks disable pointer input, not the saved viewer offset.
    // The offset fades with perspective so returning to 2D is continuous.
    if(options.orbit){camera.yaw+=this.userOrbit.yaw*camera.perspective;camera.pitch+=this.userOrbit.pitch*camera.perspective;}
    const parents=new Map<string,ElementState>();
    for(const e of frame.elements)if(e.geometry.kind==='group')for(const child of e.geometry.children??[])parents.set(child,e);
    const items:DrawItem[]=[];
    for(const element of frame.elements) {
      if(element.geometry.kind==='group')continue;
      const chain:ElementState[]=[element];let parent=parents.get(element.id);const seen=new Set([element.id]);
      while(parent&&!seen.has(parent.id)){chain.push(parent);seen.add(parent.id);parent=parents.get(parent.id);}
      const opacity=chain.reduce((a,e)=>a*e.opacity,1);if(opacity<=0)continue;
      const world=(point:Vec3):Vec3=>{let p=point;for(const state of chain){p=rotate(p.map(v=>v*state.scale) as Vec3,state.rotation);p=p.map((v,i)=>v+state.position[i]) as Vec3;}return p;};
      const addTriangles=(points:Vec3[],color:string,alpha=1):void=> {
        const rgba=parseColor(color);if(!points.length||rgba[3]*opacity*alpha<=0)return;
        const vertices:number[]=[];let depth=0;
        for(const point of points){const p=world(point);depth+=project(p,camera,width,height).depth;vertices.push(...p,rgba[0],rgba[1],rgba[2],rgba[3]*opacity*alpha,element.space==='screen'?1:0);}
        items.push({depth:element.space==='screen'?-1e9:depth/points.length,vertices});
      };
      const contours=(paths:Vec3[][],alpha=1,color=element.fill):void=>{addTriangles(triangulateContours(paths),color,alpha);};
      const stroke=(points:Vec3[],closed:boolean,alpha=1):void=> {
        if(element.stroke==='none'||element.strokeWidth<=0)return;
        for(let i=0;i<(closed?points.length:points.length-1);i++) {
          const a=points[i],b=points[(i+1)%points.length],delta:Vec3=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];
          const length=Math.hypot(delta[0],delta[1]);
          // Side vector in the primitive's local plane; 3D vertical segments use a stable x-axis side.
          const side:Vec3=length>1e-10?[-delta[1]/length*element.strokeWidth/2,delta[0]/length*element.strokeWidth/2,0]:[element.strokeWidth/2,0,0];
          const at=(p:Vec3,sign:number)=>p.map((v,j)=>v+side[j]*sign) as Vec3;
          addTriangles([at(a,1),at(a,-1),at(b,1),at(b,1),at(a,-1),at(b,-1)],element.stroke,alpha);
        }
      };
      const latexPaths=(paths:LatexPath[],size:number,alpha:number,offset:Vec3=[0,0,0]):void=> {
        for(const path of paths)contours(path.contours.map(c=>c.map(p=>p.map((v,i)=>v*size+offset[i]) as Vec3)),alpha,element.fill==='none'?element.stroke:element.fill);
      };
      const addMesh=(geometry:Geometry,alpha=1):void=> {
        const vertices=(geometry.vertices??[]).map(vec3);
        for(const indices of geometry.triangles??[]){const triangle=indices.map(i=>vertices[i]).filter(Boolean);if(triangle.length===3){addTriangles(triangle,element.fill,alpha);stroke(triangle,true,alpha);}}
      };
      const drawGeometry=(geometry:Geometry,alpha=1):void=> {
        if(geometry.kind==='text'||geometry.kind==='latex'){latexPaths(layoutLatex(geometry.kind==='text'?textTex(geometry.text??''):geometry.tex??'').paths,geometry.fontSize??(element.space==='screen'?(geometry.kind==='text'?16:24):(geometry.kind==='text'?0.4:0.6)),alpha);return;}
        if(geometry.kind==='mesh'){addMesh(geometry,alpha);return;}
        const shape=outline(geometry);if(!shape||!shape.points.length)return;
        if(shape.closed)contours([shape.points],alpha);stroke(shape.points,shape.closed,alpha);
        if(geometry.kind==='arrow'&&shape.points.length>1){const end=shape.points.at(-1)!,before=shape.points.at(-2)!,delta=end.map((v,i)=>v-before[i]),length=Math.hypot(...delta)||1,size=Math.max(0.15,element.strokeWidth*3),side:Vec3=[-delta[1]/length*size/2,delta[0]/length*size/2,0],base=end.map((v,i)=>v-delta[i]/length*size) as Vec3;addTriangles([end,base.map((v,i)=>v+side[i]) as Vec3,base.map((v,i)=>v-side[i]) as Vec3],element.stroke,alpha);}
      };
      const morph=element.morph;
      if(!morph){drawGeometry(element.geometry);continue;}
      const {from,to,progress:t}=morph,shape=morphOutline(from,to,t);
      if(shape){drawGeometry({kind:from.kind==='arrow'&&to.kind==='arrow'?'arrow':'path',points:shape.points,closed:shape.closed});continue;}
      if(from.kind==='mesh'&&to.kind==='mesh'&&from.vertices&&to.vertices&&from.vertices.length===to.vertices.length){const target=to.vertices!;addMesh({...to,vertices:from.vertices!.map((p,i)=>vec3(p).map((v,j)=>lerp(v,vec3(target[i])[j],t)) as Vec3)});continue;}
      if(from.kind==='latex'&&to.kind==='latex') {
        const a=layoutLatex(from.tex??''),b=layoutLatex(to.tex??''),map=morph.map??{},targets=new Set(Object.values(map));
        const sizeA=from.fontSize??(element.space==='screen'?24:0.6),sizeB=to.fontSize??(element.space==='screen'?24:0.6);
        for(const path of a.paths)if(!path.part||!map[path.part])latexPaths([path],sizeA,1-t);
        for(const path of b.paths)if(!path.part||!targets.has(path.part))latexPaths([path],sizeB,t);
        const bounds=(paths:LatexPath[],size:number):Vec3=>{const points=paths.flatMap(p=>p.contours.flat());return [0,1,2].map(i=>points.length?(Math.min(...points.map(p=>p[i]))+Math.max(...points.map(p=>p[i])))*size/2:0) as Vec3;};
        for(const [start,end] of Object.entries(map)) {
          const pathsA=a.paths.filter(p=>p.part===start),pathsB=b.paths.filter(p=>p.part===end);
          if(pathsA.length===pathsB.length&&pathsA.every((p,i)=>p.contours.length===pathsB[i].contours.length)) {
            for(let i=0;i<pathsA.length;i++)contours(pathsA[i].contours.map((c,j)=>{const [source,target]=matchPoints(c.map(p=>p.map(v=>v*sizeA) as Vec3),pathsB[i].contours[j].map(p=>p.map(v=>v*sizeB) as Vec3),true,96);return source.map((p,k)=>p.map((v,l)=>lerp(v,target[k][l],t)) as Vec3);}),1,element.fill==='none'?element.stroke:element.fill);
          } else {
            const centerA=bounds(pathsA,sizeA),centerB=bounds(pathsB,sizeB),delta=centerA.map((v,i)=>centerB[i]-v) as Vec3;
            latexPaths(pathsA,sizeA,1-t,delta.map(v=>v*t) as Vec3);latexPaths(pathsB,sizeB,t,delta.map(v=>-v*(1-t)) as Vec3);
          }
        }
        continue;
      }
      drawGeometry(from,1-t);drawGeometry(to,t);
    }
    items.sort((a,b)=>b.depth-a.depth);
    const data=new Float32Array(items.flatMap(item=>item.vertices));
    const device=this.device;
    if(data.byteLength>this.capacity){this.vertices?.destroy();this.capacity=Math.max(256,data.byteLength*2);this.vertices=device.createBuffer({size:this.capacity,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});}
    if(data.length)device.queue.writeBuffer(this.vertices!,0,data);
    device.queue.writeBuffer(this.uniform,0,new Float32Array([...camera.target,0,camera.yaw,camera.pitch,camera.distance,camera.perspective,width,height,camera.height,0]));
    const clear=parseColor(options.background),encoder=device.createCommandEncoder();
    const pass=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:clear[0],g:clear[1],b:clear[2],a:1},loadOp:'clear',storeOp:'store'}],depthStencilAttachment:{view:this.depthTexture!.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}});
    pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.bindGroup);
    if(data.length){pass.setVertexBuffer(0,this.vertices!);pass.draw(data.length/8);}
    pass.end();device.queue.submit([encoder.finish()]);
  }
  dispose():void {
    this.disposed=true;this.observer.disconnect();this.vertices?.destroy();this.uniform?.destroy();this.depthTexture?.destroy();this.context?.unconfigure();this.device?.destroy();
    this.canvas.removeEventListener('pointerdown',this.pointerDown);this.canvas.removeEventListener('pointermove',this.pointerMove);this.canvas.removeEventListener('pointerup',this.pointerUp);this.canvas.removeEventListener('pointercancel',this.pointerUp);
  }
}
