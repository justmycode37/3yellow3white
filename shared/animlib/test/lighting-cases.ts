import type { SceneLighting } from '../src/types.js';
/** Shared real GPU checks. Images are RGBA, top row first, 640×480. */
type Render = (source: string, yaw?: number, time?: number) => Promise<Uint8Array>;
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const pixel = (image: Uint8Array, x: number, y: number) => image[(Math.round(y)*640+Math.round(x))*4];
const changed = (a: Uint8Array, b: Uint8Array, threshold=3) => a.filter((v,i)=>i%4!==3&&Math.abs(v-b[i])>threshold).length;
const ball = (lighting?: SceneLighting | 'studio', material=false) => `export default scene({mode:'3d',${lighting===undefined?'':'lighting:'+JSON.stringify(lighting)}},s=>{
 s.play(s.camera.to3D({yaw:0,pitch:0,height:6}),{duration:0});
 s.sphere('b',{radius:1.3,fill:'WHITE',${material?'material:{metalness:0.7,roughness:0.3}':''}});s.wait(1);
});`;
export const shadowScene = (options: {shadow?:boolean;soft?:boolean;duplicate?:boolean;caster?:boolean;size?:number;move?:boolean;views?:boolean;elevation?:number;opacity?:number;group?:boolean} = {}) => {
 const settings:SceneLighting={ambient:1,directional:{direction:[1,1,0],space:'world',...(options.shadow===false?{}:{shadow:{softness:options.soft?0.18:0,quality:'high',opacity:0.8,bias:0.001}})},receiver:{position:[0,0,0],size:[options.size??8,6],fill:'WHITE'}};
 // Orthographic top view: x=-1 maps to 260px, z=0 maps to 240px.
 const body=`const b=s.box('b',{position:[0,${options.elevation??1},0],width:0.8,height:1,depth:0.8,fill:'PURE_RED',opacity:${options.opacity??1},castShadow:${options.caster!==false}});
 ${options.group?"const group=s.group('g',[b],{isolated:true});s.play(group.animate({opacity:0.5}),{duration:0});":''}
 ${options.duplicate?"s.box('duplicate',{position:[0,1,0],width:0.8,height:1,depth:0.8,fill:'PURE_RED'});":''}
 ${options.move?"s.play(b.moveTo([1,1,0]),{duration:1});":"s.wait(1);"}`;
 return `export default scene({mode:'3d',lighting:${JSON.stringify(settings)}},s=>{
 s.play(s.camera.to3D({yaw:0,pitch:-Math.PI/2,height:8,perspective:0}),{duration:0});
 ${options.views?`s.view('left',{rect:[0,0,0.5,1],camera:{yaw:0,pitch:-Math.PI/2,height:8,perspective:0}},s=>{${body}});
 s.view('right',{rect:[0.5,0,0.5,1],camera:{yaw:0,pitch:-Math.PI/2,height:8,perspective:0}},s=>{s.wait(1);});`:body}
 });`;
};
export const lightingCases: {name:string;run:(render:Render)=>Promise<void>}[] = [
 {name:'studio default and explicit defaults preserve pixels',run:async render=>{
  for(const material of [false,true]){
   const old=await render(ball(undefined,material));
   for(const settings of ['studio',{}, {ambient:1,directional:{direction:[-0.4,0.65,1],space:'camera',intensity:1}}] as const)
    check(changed(old,await render(ball(settings as SceneLighting|'studio',material)),0)===0,'Explicit studio differs from omitted lighting');
  }
 }},
 {name:'ambient and directional intensity affect diffuse and material shading',run:async render=>{
  for(const material of [false,true]){
   const dark=await render(ball({ambient:0,directional:{intensity:0}},material));
   check(pixel(dark,320,240)===0,'Zero lights must leave a nonemissive surface black');
   const ambient=await render(ball({ambient:1,directional:{intensity:0}},material));
   const full=await render(ball({},material));
   check(pixel(ambient,320,240)>20&&changed(ambient,full)>1000,'Light intensities did not change material');
  }
 }},
 {name:'world light stays fixed under orbit; camera light follows the view',run:async render=>{
  for(const material of [false,true]){
   const world=ball({directional:{direction:[1,0,1],space:'world'}},material);
   const a=await render(world,-0.7),b=await render(world,0.7);
   check(Math.abs(pixel(a,320,240)-pixel(b,320,240))>35,'World direction failed to change front illumination under orbit');
   const relative=ball({directional:{direction:[1,0,1],space:'camera'}},material);
   const c=await render(relative,-0.7),d=await render(relative,0.7);
   check(Math.abs(pixel(c,320,240)-pixel(d,320,240))<8,'Camera relative front illumination moved under orbit');
  }
 }},
 {name:'shadow occlusion, finite clipping, contact and overlapping caster union',run:async render=>{
  const bare=await render(shadowScene({shadow:false})),hard=await render(shadowScene());
  check(pixel(bare,260,240)-pixel(hard,260,240)>50,'Projected occlusion missing at x=-1');
  check(Math.abs(pixel(bare,380,240)-pixel(hard,380,240))<2,'Shadow appeared on wrong side of light');
  check(changed(hard,await render(shadowScene({duplicate:true})))===0,'Overlapping casters darkened the union');
  check(changed(bare,await render(shadowScene({caster:false})))===0,'castShadow:false changed receiver');
  const clipped=await render(shadowScene({size:1}));
  check(pixel(clipped,260,240)===0,'Shadow leaked beyond the finite receiver');
  // The box bottom is y=0.5: its leftmost shadow is x=-1.9, right edge x=-0.1.
  check(pixel(bare,216,240)-pixel(hard,216,240)>50,'Caster height/direction projection is not aligned');
  check(Math.abs(pixel(bare,200,240)-pixel(hard,200,240))<2,'Shadow detached from expected bounds');
  const contact=await render(shadowScene({elevation:0.5}));
  check(pixel(bare,291,240)-pixel(contact,291,240)>50,'Grounded box shadow has a contact gap');
  for(const policy of [{opacity:0.5},{group:true}]){
   const noShadow=await render(shadowScene({...policy,shadow:false}));
   check(changed(noShadow,await render(shadowScene(policy)))===0,'Translucent geometry or isolated group cast a shadow');
  }
 }},
 {name:'soft penumbra is deterministic and expands with caster height',run:async render=>{
  const hard=await render(shadowScene()),soft=await render(shadowScene({soft:true}));
  check(changed(hard,soft)>100,'Soft quality produced no penumbra');
  // More distinct floor intensities along a scanline than the hard silhouette.
  const levels=(p:Uint8Array)=>new Set(Array.from({length:100},(_,i)=>pixel(p,200+i,240))).size;
  check(levels(soft)>levels(hard)+2,'Soft shadow lacks intermediate coverage');
  check(changed(soft,await render(shadowScene({soft:true})),0)===0,'Shadow sampling is not deterministic');
  const high=await render(shadowScene({soft:true,elevation:3}));
  const low=pixel(hard,260,240),full=pixel(hard,400,240);
  const partial=(image:Uint8Array)=>Array.from({length:380},(_,i)=>pixel(image,20+i,240)).filter(v=>v>low+10&&v<full-10).length;
  check(partial(high)>partial(soft)+5,'Penumbra failed to grow as caster moved away from receiver');
 }},
 {name:'seek restores shadows and independent views do not share casters',run:async render=>{
  const a=await render(shadowScene({move:true}),0,0),b=await render(shadowScene({move:true}),0,1),c=await render(shadowScene({move:true}),0,0);
  check(changed(a,b)>1000&&changed(a,c,0)===0,'Seek did not reproduce caster projection');
  const views=await render(shadowScene({views:true}));
  check(pixel(views,100,240)+50<pixel(views,420,240),'Regional shadow missing or leaked into independent view');
 }},
];
