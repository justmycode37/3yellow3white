/// <reference types="@webgpu/types" />
import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import {create,globals} from 'webgpu';
import {CanvasRenderer} from '../src/renderer.js';
import {SceneSequence} from '../src/sequence.js';
import {initialSources} from '../demo/scenes.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {join} from 'node:path';

// Uses a real native WebGPU device and render target. Only the window/canvas surface is stubbed.
// This is a development test adapter, never a browser renderer fallback.
describe('native Vulkan WebGPU rendering',()=> {
  const width=640,height=480;
  let gpu:GPU|undefined,device:GPUDevice|undefined,texture:GPUTexture|undefined;
  let renderer:CanvasRenderer,sequence:SceneSequence;
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
    const context={configure:()=>{},unconfigure:()=>{},getCurrentTexture:()=>texture};
    const canvas={width,height,style:{},getBoundingClientRect:()=>({width,height}),getContext:(kind:string)=>{expect(kind).toBe('webgpu');return context;},addEventListener:()=>{},removeEventListener:()=>{}} as unknown as HTMLCanvasElement;
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
    const directory=process.env.ANIMLIB_GPU_ARTIFACTS;if(!directory)return;
    // Small dependency-free RGBA PNG encoder for optional real GPU readback artifacts.
    const crc=(data:Uint8Array)=>{let crc=0xffffffff;for(const byte of data){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
    const chunk=(kind:string,data:Buffer)=>{const type=Buffer.from(kind),size=Buffer.alloc(4),checksum=Buffer.alloc(4);size.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([size,type,data,checksum]);};
    const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
    const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)rows.set(image.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);
    await mkdir(directory,{recursive:true});await writeFile(join(directory,name+'.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
  }
  function changedPixels(image:Uint8Array):number {let count=0;for(let i=0;i<image.length;i+=4)if(Math.abs(image[i]-16)+Math.abs(image[i+1]-27)+Math.abs(image[i+2]-44)>12)count++;return count;}
  it('compiles the production WGSL and renders all three demonstrations',async()=> {
    const observations:number[]=[];
    for(let i=0;i<sequence.compiled.length;i++) {
      renderer.setOrbitEnabled(sequence.compiled[i].options.orbit);
      renderer.render(sequence.frame(i,sequence.compiled[i].duration),sequence.compiled[i].options);
      const image=await pixels();observations.push(changedPixels(image));await artifact(initialSources[i].id,image);
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
    expect(changedPixels(during)).toBeGreaterThan(1000);
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
  });
});
