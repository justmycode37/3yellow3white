/// <reference types="@webgpu/types" />
import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import {create,globals} from 'webgpu';
import {CanvasRenderer} from '../src/renderer.js';
import {SceneSequence} from '../src/sequence.js';
import {initialSources} from '../demo/scenes.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {join} from 'node:path';
import colorString from 'color-string';

// Uses a real native WebGPU device and render target. Only the window/canvas surface is stubbed.
// This is a development test adapter, never a browser renderer fallback.
describe('native Vulkan WebGPU rendering',()=> {
  const width=640,height=480;
  let gpu:GPU|undefined,device:GPUDevice|undefined,texture:GPUTexture|undefined;
  let renderer:CanvasRenderer,sequence:SceneSequence,canvas:HTMLCanvasElement;
  const errors:string[]=[];
  let format:GPUTextureFormat;
  beforeAll(async()=> {
    for(const [name,value] of Object.entries(globals))vi.stubGlobal(name,value);
    vi.stubGlobal('ResizeObserver',class {observe(){}disconnect(){}});
    vi.stubGlobal('devicePixelRatio',1);
    gpu=create(['backend=vulkan']);
    const adapter=await gpu.requestAdapter();
    if(!adapter)throw new Error('Native WebGPU smoke test requires a Vulkan adapter; this is not a rendering fallback.');
    device=await adapter.requestDevice();
    device.addEventListener('uncapturederror',event=>errors.push(event.error.message));
    format=gpu.getPreferredCanvasFormat();
    texture=device.createTexture({size:[width,height],format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
    const context={configure:()=>{},unconfigure:()=>{},getCurrentTexture:()=> {
      if(texture!.width!==canvas.width||texture!.height!==canvas.height){texture!.destroy();texture=device!.createTexture({size:[canvas.width,canvas.height],format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});}
      return texture;
    }};
    canvas={width,height,style:{},getBoundingClientRect:()=>({width,height}),getContext:(kind:string)=>{expect(kind).toBe('webgpu');return context;},addEventListener:()=>{},removeEventListener:()=>{}} as unknown as HTMLCanvasElement;
    // The renderer still calls its production requestAdapter/requestDevice path.
    vi.stubGlobal('navigator',{gpu:{requestAdapter:async()=>({requestDevice:async()=>device}),getPreferredCanvasFormat:()=>format}});
    renderer=new CanvasRenderer(canvas);renderer.onError=error=>errors.push(error.message);
    sequence=new SceneSequence({prepare:scenes=>renderer.prepare(scenes)});
    const result=await sequence.submit({type:'load',scenes:initialSources});
    expect(result).toEqual({ok:true,revision:1,diagnostics:[]});
  });
  afterAll(()=> {
    texture?.destroy();renderer?.dispose();device?.destroy();gpu=undefined;vi.unstubAllGlobals();
  });
  async function pixels():Promise<Uint8Array> {
    const width=texture!.width,height=texture!.height;
    const bytesPerRow=Math.ceil(width*4/256)*256;
    const buffer=device!.createBuffer({size:bytesPerRow*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    const command=device!.createCommandEncoder();
    command.copyTextureToBuffer({texture:texture!},{buffer,bytesPerRow,rowsPerImage:height},[width,height]);
    device!.queue.submit([command.finish()]);
    await buffer.mapAsync(GPUMapMode.READ);
    const rgba=new Uint8Array(width*height*4),mapped=new Uint8Array(buffer.getMappedRange());
    for(let y=0;y<height;y++)rgba.set(mapped.subarray(y*bytesPerRow,y*bytesPerRow+width*4),y*width*4);
    buffer.unmap();buffer.destroy();
    if(format==='bgra8unorm')for(let i=0;i<rgba.length;i+=4)[rgba[i],rgba[i+2]]=[rgba[i+2],rgba[i]];
    return rgba;
  }
  async function artifact(name:string,image:Uint8Array):Promise<void> {
    const width=texture!.width,height=texture!.height;
    const directory=process.env.ANIMLIB_GPU_ARTIFACTS;if(!directory)return;
    // Small dependency-free RGBA PNG encoder for optional real GPU readback artifacts.
    const crc=(data:Uint8Array)=>{let crc=0xffffffff;for(const byte of data){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
    const chunk=(kind:string,data:Buffer)=>{const type=Buffer.from(kind),size=Buffer.alloc(4),checksum=Buffer.alloc(4);size.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([size,type,data,checksum]);};
    const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
    const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)rows.set(image.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);
    await mkdir(directory,{recursive:true});await writeFile(join(directory,name+'.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
  }
  function changedPixels(image:Uint8Array,background='#000000'):number {const rgb=colorString.get.rgb(background)!;let count=0;for(let i=0;i<image.length;i+=4)if(Math.abs(image[i]-rgb[0])+Math.abs(image[i+1]-rgb[1])+Math.abs(image[i+2]-rgb[2])>12)count++;return count;}
  it('compiles the production WGSL and renders all three demonstrations',async()=> {
    const observations:number[]=[];
    for(let i=0;i<sequence.compiled.length;i++) {
      renderer.setOrbitEnabled(sequence.compiled[i].options.orbit);
      renderer.render(sequence.frame(i,sequence.compiled[i].duration),sequence.compiled[i].options);
      const image=await pixels();observations.push(changedPixels(image,sequence.compiled[i].options.background));await artifact(initialSources[i].id,image);
      for(const fraction of [0,0.25,0.5,0.999]){renderer.render(sequence.frame(i,sequence.compiled[i].duration*fraction),sequence.compiled[i].options);await artifact(initialSources[i].id+'-'+fraction,await pixels());}
    }
    expect(observations.every(count=>count>1000)).toBe(true);
    expect(errors).toEqual([]);
    console.log('Native Vulkan rendered demo foreground pixels:',observations);
  });
  it('renders intermediate geometric and named LaTeX morph frames',async()=> {
    const first=sequence.compiled[0];
    renderer.render(sequence.frame(0,2.4),first.options);
    const during=await pixels();await artifact('linear-algebra-morph',during);
    renderer.render(sequence.frame(0,first.duration),first.options);
    const end=await pixels();
    expect(changedPixels(during,first.options.background)).toBeGreaterThan(1000);
    expect(during).not.toEqual(end);expect(errors).toEqual([]);
  });
  it('depth-tests intersecting mesh faces per pixel rather than by average face depth',async()=> {
    const result=await sequence.submit({type:'load',scenes:[{id:'depth',source:String.raw`export default scene({mode:"3d",background:"#101b2c"},s=>{
      s.mesh("slanted",{vertices:[[-2,-2,2],[2,-2,-2],[0,2,0]],triangles:[[0,1,2]],fill:"#ff0000",stroke:"none"});
      s.mesh("flat",{vertices:[[-2,-2,0],[2,-2,0],[0,2,0]],triangles:[[0,1,2]],fill:"#0000ff",stroke:"none"});
      s.wait(1);
    });`}]});
    expect(result.ok).toBe(true);renderer.render(sequence.frame(0,0),sequence.compiled[0].options);
    const image=await pixels();await artifact('mesh-depth',image);
    const at=(x:number,y:number)=>Array.from(image.subarray((y*width+x)*4,(y*width+x)*4+3));
    expect(at(width/2-40,height/2)).toEqual([255,0,0]);
    expect(at(width/2+40,height/2)).toEqual([0,0,255]);expect(errors).toEqual([]);
  });
  it('uses centered CSS pixels for screen labels independently of camera projection',async()=> {
    const result=await sequence.submit({type:'load',scenes:[{id:'screen',source:String.raw`export default scene({mode:"3d",background:"#101b2c"},s=>{
      s.rectangle("marker",{space:"screen",position:[100,50],width:20,height:20,fill:"#ff0000",stroke:"none"});
      s.wait(1);
    });`}]});
    expect(result.ok).toBe(true);
    renderer.render(sequence.frame(0,0),sequence.compiled[0].options);
    const image=await pixels();
    const at=(x:number,y:number)=>Array.from(image.subarray((y*width+x)*4,(y*width+x)*4+3));
    expect(at(width/2+100,height/2-50)).toEqual([255,0,0]);
    expect(at(width/2,height/2)).toEqual([16,27,44]);expect(errors).toEqual([]);
  });  it('keeps the arrow silhouette stable through an identity morph',async()=> {
    const result=await sequence.submit({type:'load',scenes:[{id:'arrow',source:String.raw`export default scene({background:"#000000"},s=>{
      const a=s.arrow("arrow",{points:[[0,0],[2,1]],stroke:"#ffffff",strokeWidth:0.12});
      s.wait(1);s.play(a.morphTo({kind:"arrow",points:[[0,0],[2,1]]}),{duration:2});
    });`}]});expect(result.ok).toBe(true);
    renderer.render(sequence.frame(0,0),sequence.compiled[0].options);const before=await pixels();
    renderer.render(sequence.frame(0,2),sequence.compiled[0].options);const during=await pixels();await artifact('arrow-identity-morph',during);
    let differences=0;for(let i=0;i<during.length;i+=4)if(Math.abs(during[i]-before[i])>12)differences++;
    expect(differences).toBeLessThan(32);expect(changedPixels(during)).toBeGreaterThan(500);expect(errors).toEqual([]);
  });
  it('antialiases stroke boundaries without double-blending shared corner joins',async()=> {
    const result=await sequence.submit({type:'load',scenes:[{id:'stroke',source:String.raw`export default scene({background:"#000000"},s=>{
      s.rectangle("box",{width:3,height:2,position:[0.013,0.017],fill:"none",stroke:"white",strokeWidth:0.06,opacity:0.5});s.wait(1);
    });`}]});expect(result.ok).toBe(true);
    renderer.render(sequence.frame(0,0),sequence.compiled[0].options);const image=await pixels();await artifact('antialiased-border',image);
    let max=0,antialiased=0;for(let i=0;i<image.length;i+=4){max=Math.max(max,image[i]);if(image[i]>0&&image[i]<120)antialiased++;}
    expect(max).toBeLessThanOrEqual(128);expect(max).toBeGreaterThanOrEqual(127);expect(antialiased).toBeGreaterThan(100);expect(errors).toEqual([]);
  });
  it('occludes a center-to-edge bond behind a lit sphere surface',async()=> {
    const result=await sequence.submit({type:'load',scenes:[{id:'sphere',source:String.raw`export default scene({mode:"3d",background:"#000000"},s=>{
      s.sphere("atom",{radius:1,fill:"#00aaff",stroke:"none"});
      s.line("bond",{points:[[0,0,0],[2,0,0]],stroke:"white",strokeWidth:0.08});s.wait(1);
    });`}]});expect(result.ok).toBe(true);
    renderer.render(sequence.frame(0,0),sequence.compiled[0].options);const image=await pixels();await artifact('sphere-bond-occlusion',image);
    const at=(x:number,y:number)=>Array.from(image.subarray((y*width+x)*4,(y*width+x)*4+3));
    const center=at(width/2,height/2);expect(center[0]).toBe(0);expect(center[2]).toBeGreaterThan(150);
    expect(at(width/2+90,height/2)).toEqual([255,255,255]);expect(errors).toEqual([]);
  });
  it('retains rear alpha contributions when translucent mesh faces intersect',async()=> {
    const result=await sequence.submit({type:'load',scenes:[{id:'alpha',source:String.raw`export default scene({mode:"3d",background:"black"},s=>{
      s.mesh("slanted",{vertices:[[-2,-2,2],[2,-2,-2],[0,2,0]],triangles:[[0,1,2]],fill:"red",stroke:"none",opacity:0.5});
      s.mesh("flat",{vertices:[[-2,-2,0],[2,-2,0],[0,2,0]],triangles:[[0,1,2]],fill:"blue",stroke:"none",opacity:0.5});s.wait(1);
    });`}]});expect(result.ok).toBe(true);
    renderer.render(sequence.frame(0,0),sequence.compiled[0].options);const image=await pixels();await artifact('translucent-depth',image);
    for(const x of [width/2-40,width/2+40]){const at=(height/2*width+x)*4;expect(image[at]).toBeGreaterThan(40);expect(image[at+2]).toBeGreaterThan(40);}
    expect(errors).toEqual([]);
  });
  it('slides a grouped 3D element outside an ultrawide viewport under retained orbit',async()=> {
    const result=await sequence.submit({type:'load',scenes:[{id:'exit',source:String.raw`export default scene({mode:"3d",orbit:true,background:"black"},s=>{
      const sphere=s.sphere("sphere",{radius:0.42,fill:"blue",stroke:"none"});const group=s.group("exit",[sphere]);
      s.play(group.animate({viewportOffset:[-1.5,0]}),{duration:1});
    });`}]});expect(result.ok).toBe(true);
    Object.assign(canvas,{getBoundingClientRect:()=>({width:1920,height:540})});
    (renderer as unknown as {resize():void}).resize();renderer.setOrbit({yaw:Math.PI/2,pitch:0});
    try {
      renderer.render(sequence.frame(0,0),sequence.compiled[0].options);expect(changedPixels(await pixels())).toBeGreaterThan(1000);
      renderer.render(sequence.frame(0,1),sequence.compiled[0].options);const image=await pixels();await artifact('ultrawide-orbit-exit',image);
      expect(changedPixels(image)).toBe(0);expect(errors).toEqual([]);
    } finally {renderer.setOrbit({yaw:0,pitch:0});Object.assign(canvas,{getBoundingClientRect:()=>({width,height})});(renderer as unknown as {resize():void}).resize();}
  });
  it('renders full-size Latin glyph contours cleanly at device pixel ratio two',async()=> {
    vi.stubGlobal('devicePixelRatio',2);
    const result=await sequence.submit({type:'load',scenes:[{id:'text',source:String.raw`export default scene({background:"#000000"},s=>{
      s.text("word",{text:"ascending",fontSize:1.25,fill:"white",stroke:"none"});s.wait(1);
    });`}]});expect(result.ok).toBe(true);
    // Simulate the native observer after a browser moves the canvas to a high-DPR display.
    (renderer as unknown as {resize():void}).resize();
    renderer.render(sequence.frame(0,0),sequence.compiled[0].options);const image=await pixels();await artifact('ascending-dpr2',image);
    expect(texture!.width).toBe(width*2);expect(texture!.height).toBe(height*2);
    expect(changedPixels(image)).toBeGreaterThan(10000);expect(errors).toEqual([]);
  });

});
