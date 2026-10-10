import type {createPlayer} from '../src/player.js';

/** Run with either the source Player or the minified production module + worker. */
export async function integrationPlayerRegression(makePlayer:typeof createPlayer) {
 const canvas=document.createElement('canvas');canvas.style.cssText='width:640px;height:480px';document.body.append(canvas);
 const player=makePlayer({canvas,controlsRoot:false});
 const check=(v:unknown,m:string)=>{if(!v)throw Error(m);};
 const source=`export default scene({mode:'3d',end:'hold',lighting:{ambient:0.6,
  directional:{direction:[1,2,1],space:'world',shadow:{quality:'medium'}},receiver:{size:[8,8],position:[0,-2,0]}}},s=>{
  const a=s.slider('a',{reactive:true,default:0.3,min:0,max:1});
  const m=s.box('m',{width:2,height:2,depth:2,fill:'WHITE',clipPlanes:[{normal:[1,0,0],offset:0,section:{color:'YELLOW',cap:'GOLD'}}],outline:{color:'BLACK'}});
  s.deform(m,[s.time,a],([x,y,z],i,t,a)=>[x+Math.min(t,2)*a*y,y,z]);
  s.bind(m,[a],a=>({scalarColors:{values:Array.from({length:24},()=>a),domain:[0,1],colors:['BLUE','RED']},material:{roughness:0.1+a/2}}));
  s.keep(m);s.play(s.camera.to3D({yaw:0.5,pitch:-0.4,height:6,perspective:0}),{duration:0});s.wait(2);
 });`;
 const next={id:'b',source:"export default scene({},s=>{s.previous.get('m');s.wait(1);});"};
 const geometry=()=>player.getInteractionSnapshot()!.frame.elements.find(e=>e.id==='m')!.geometry;
 const pixels=()=>{
  const gl=canvas.getContext('webgl2')!;
  const p=new Uint8Array(canvas.width*canvas.height*4);
  gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,p);check(gl.getError()===0,'GL readback failed');return p;
 };
 try {
  check((await player.submit({type:'load',scenes:[{id:'a',source}]})).ok,'Combined production scene failed');
  await player.seek({scene:'a',time:1.25});const before=pixels();
  await player.seek({scene:'a',time:0});await player.seek({scene:'a',time:1.25});
  const repeated=pixels();check(before.every((v,i)=>v===repeated[i]),'Production backwards seek changed pixels');
  await player.setControl({scene:'a',id:'a',value:0.8});const changed=pixels();
  check(changed.some((v,i)=>Math.abs(v-before[i])>10),'Production paused input did not change pixels');
  check(geometry().clipPlanes?.length===1 && geometry().outline && geometry().scalarColors?.values[0]===0.8,'Production overlay dropped geometry fields');
  await player.seek({scene:'a',time:2});const end=JSON.stringify(geometry());
  check((await player.submit({type:'insert',after:'a',scenes:[next]})).ok,'Production append failed');
  await player.seek({scene:'b',time:0});check(JSON.stringify(geometry())===end,'Append did not inherit final effective geometry');
  await player.setControl({scene:'a',id:'a',value:0.4});const changedEnd=JSON.stringify(geometry());
  check(changedEnd!==end && geometry().scalarColors?.values[0]===0.4,'Changed upstream input did not rebuild effective handoff');
  await player.seek({scene:'a',time:2});check(JSON.stringify(geometry())===changedEnd,'End and successor handoff disagree');
  check((await player.submit({type:'load',scenes:[{id:'a',source},next]})).ok,'Production batch failed');
  await player.seek({scene:'a',time:2});const batchEnd=JSON.stringify(geometry());
  await player.seek({scene:'b',time:0});check(JSON.stringify(geometry())===batchEnd,'Batch and endpoint geometry disagree');
  check(!player.getState().error,'Production player reported an error');
  return {backend:player.backend,repeatPixels:true,pausedInput:true,clippingAndScalars:true,exactEnd:true,append:true,changedControlHandoff:true,batch:true};
 }finally{player.dispose();canvas.remove();}
}
