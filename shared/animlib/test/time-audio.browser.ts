import type { createPlayer } from '../src/player.js';
import type { SceneSequence } from '../src/sequence.js';

/** Real WAV decoding + retained worker regression, reusable with the production Player. */
export async function audioDurationRegression(makePlayer: typeof createPlayer) {
  const wav = new ArrayBuffer(44 + 6 * 8000 * 2), data = new DataView(wav);
  const text = (offset: number, value: string) => { for (let i=0;i<value.length;i++) data.setUint8(offset+i,value.charCodeAt(i)); };
  text(0,'RIFF');data.setUint32(4,wav.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');
  data.setUint32(16,16,true);data.setUint16(20,1,true);data.setUint16(22,1,true);
  data.setUint32(24,8000,true);data.setUint32(28,16000,true);data.setUint16(32,2,true);data.setUint16(34,16,true);
  text(36,'data');data.setUint32(40,wav.byteLength-44,true);
  const url = URL.createObjectURL(new Blob([wav],{type:'audio/wav'}));
  const a = {id:'a',source:`export default scene({mode:'3d',audio:'voice'},s=>{
    const amplitude=s.slider('amplitude',{reactive:true,default:1,min:0,max:2});
    const m=s.surface('m',{fn:()=>0,xSegments:2,ySegments:2,fill:'TEAL'});
    s.deform(m,[s.time,amplitude],([x,y],i,t,a)=>[x,y,t*a]);s.keep(m);s.wait(4);
  });`};
  const b = {id:'b',source:`export default scene({},s=>{s.previous.get('m');s.wait(1);});`};
  const rows: {load: string; preparedDuration: number; sampleTime: number | undefined; sampledZ: number; renderedZ: number; handoffZ: number; changedHandoffZ: number}[]=[];
  try {
    for (const batch of [true,false]) {
      const canvas=document.createElement('canvas');canvas.style.cssText='width:640px;height:480px';document.body.append(canvas);
      const player=makePlayer({canvas,controlsRoot:false,assets:{voice:{kind:'audio',url}}});
      const check=(value:unknown,message:string)=>{if(!value)throw Error(message);};
      const z=()=>player.getInteractionSnapshot()!.frame.elements.find(e=>e.id==='m')!.geometry.vertices![0][2]!;
      try {
        check((await player.submit({type:'load',scenes:batch?[a,b]:[a]})).ok,'Audio scene failed');
        if(!batch)check((await player.submit({type:'insert',after:'a',scenes:[b]})).ok,'Append failed');
        await player.seek({scene:'a',time:5});
        const state=player.getState(),renderedZ=z();
        check(state.duration===6 && state.time===5 && renderedZ===5,'Rendered geometry did not follow prepared audio duration');
        const sequence=(player as unknown as {sequence:SceneSequence}).sequence;
        const snapshot=await sequence.sample(0,5),sampledZ=snapshot.reactiveBindings![0].properties.vertices![0][2]!;
        check(snapshot.reactiveTime===5 && sampledZ===5,'Snapshot timestamp disagrees with geometry');
        await player.seek({scene:'b',time:0});const handoffZ=z();check(handoffZ===6,'Handoff did not use the audio endpoint');
        await player.setControl({scene:'a',id:'amplitude',value:2});const changedHandoffZ=z();
        check(changedHandoffZ===12,'Input reconstruction lost the prepared handoff duration');
        rows.push({load:batch?'batch':'append',preparedDuration:state.duration,sampleTime:snapshot.reactiveTime,sampledZ,renderedZ,handoffZ,changedHandoffZ});
      } finally {player.dispose();canvas.remove();}
    }
    return rows;
  } finally {URL.revokeObjectURL(url);}
}
