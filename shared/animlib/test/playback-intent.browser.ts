import type { createPlayer } from '../src/player.js';
import type { SourceCompiler } from '../src/compiler-client.js';

/** Delay delivery of an actual worker sample; reusable with the built production Player. */
export async function pauseDuringRefreshRegression(makePlayer: typeof createPlayer) {
  const oldRAF=window.requestAnimationFrame,oldCancel=window.cancelAnimationFrame;
  const oldNow=Object.getOwnPropertyDescriptor(performance,'now');
  const frames=new Map<number,FrameRequestCallback>();let nextId=0;
  window.requestAnimationFrame=callback=>{const id=++nextId;frames.set(id,callback);return id;};
  window.cancelAnimationFrame=id=>{frames.delete(id);};
  Object.defineProperty(performance,'now',{value:()=>0,configurable:true});
  const check=(value:unknown,message:string)=>{if(!value)throw Error(message);};
  const rows: {operation:string;status:string;scheduledFrames:number;renderedZ:number;pixelMatch:boolean}[]=[];
  try {
    for(const operation of ['control reconstruction','source replacement']) {
      const canvas=document.createElement('canvas');canvas.style.cssText='width:640px;height:480px';document.body.append(canvas);
      const player=makePlayer({canvas,controlsRoot:false});let release:(()=>void)|undefined;
      try {
        const source=`export default scene({},s=>{
          const a=s.slider('a',{default:1,min:0,max:3});
          const m=s.mesh('m',{vertices:[[0,0,0],[1,0,0],[0,1,0]],triangles:[[0,1,2]],fill:'TEAL',shading:'smooth'});
          s.deform(m,[s.time],([x,y],i,t)=>[x,y,t*a*y]);s.wait(4);
        });`;
        check((await player.submit({type:'load',scenes:[{id:'a',source},{id:'b',source:'export default scene({},s=>s.wait(1));'}]})).ok,'Scene load failed');
        await player.seek({scene:'a',time:1});await player.play();
        const compiler=(player as unknown as {sequence:{compiler:SourceCompiler}}).sequence.compiler;
        const update=compiler.update.bind(compiler);
        let entered!:()=>void;const ready=new Promise<void>(resolve=>{entered=resolve;});
        compiler.update=async(...args)=>{
          const result=await update(...args);
          if(args[4]===1 && !release)await new Promise<void>(resolve=>{release=resolve;entered();});
          return result;
        };
        const changing=operation==='control reconstruction'
          ?player.setControl({scene:'a',id:'a',value:2})
          :player.submit({type:'replace',scene:'b',source:'export default scene({},s=>s.wait(2));'});
        let timeout:ReturnType<typeof setTimeout>|undefined;
        try {await Promise.race([ready,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Worker sample never arrived')),8000);})]);}
        finally {clearTimeout(timeout);}
        player.pause();release!();await changing;
        const state=player.getState();
        check(state.status==='paused' && frames.size===0,`${operation} overrode Pause: ${state.status}, ${frames.size} RAFs`);
        const renderedZ=player.getInteractionSnapshot()!.frame.elements[0].geometry.vertices![2][2]!;
        check(renderedZ===(operation==='control reconstruction'?2:1),'Wrong refreshed geometry');
        const gl=canvas.getContext('webgl2')!;check(gl,'WebGL2 renderer required');
        const pixels=()=>{const data=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);check(gl.getError()===gl.NO_ERROR,'Pixel readback failed');return data;};
        const paused=pixels();check(paused.some((value,i)=>i%4!==3 && value>20),'Mesh did not render');
        await player.seek({scene:'a',time:1});const reference=pixels();
        const pixelMatch=paused.every((value,i)=>value===reference[i]);check(pixelMatch,'Paused frame differs from deterministic seek');
        rows.push({operation,status:state.status,scheduledFrames:frames.size,renderedZ,pixelMatch});
      } finally {release?.();player.dispose();canvas.remove();}
    }
    return rows;
  } finally {
    window.requestAnimationFrame=oldRAF;window.cancelAnimationFrame=oldCancel;
    if(oldNow)Object.defineProperty(performance,'now',oldNow);else Reflect.deleteProperty(performance,'now');
  }
}
