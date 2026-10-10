/** The same pixel assertions run against native WebGPU and browser WebGL2. */
export interface ExplanatoryCase {
  name: string; source: string;
  check: (at:(x:number,y:number)=>number[])=>string[];
}
const scene=(body:string)=>`export default scene({},s=>{${body};s.wait(1)});`;
const red=(p:number[])=>p[0]>150&&p[1]<30&&p[2]<30;
const blue=(p:number[])=>p[2]>100&&p[0]<30&&p[1]<30;
const black=(p:number[])=>p.every(v=>v<10);
const label=(mode:string)=>scene(`s.box('occluder',{width:3,height:2,depth:1,fill:'PURE_BLUE',shading:'unlit'});s.text('label',{text:'MMMM',fontSize:1,position:[0,0,-2],fill:'PURE_RED',billboard:true,labelOcclusion:'${mode}'})`);
const labelRedCount=(at:(x:number,y:number)=>number[])=>{let n=0;for(let y=210;y<270;y++)for(let x=240;x<400;x++)if(red(at(x,y)))n++;return n;};
type PixelReader=(x:number,y:number)=>number[];
export const capClippingCases=[0,0.3].flatMap(offset=>[false,true].map(laterCut=>({
  name:`repeated oblique cap at offset ${offset}${laterCut?' followed by another cut':''}`,
  laterCut,
  sources:['p','p,p','p,equivalent'].map(planes=>scene(`
    s.play(s.camera.to3D({yaw:Math.atan2(2,-1),pitch:Math.asin(1/Math.sqrt(6)),height:5,perspective:0}),{duration:0});
    const p={normal:[2,-1,-1],offset:${offset},section:{color:'none',cap:'PURE_RED'}};
    const equivalent={...p,normal:[0.2,-0.1,-0.1],offset:${offset*0.1}};
    const q={normal:[2,2,-2],offset:0,section:{color:'none',cap:'PURE_GREEN'}};
    s.box('b',{width:2,height:2,depth:2,fill:'PURE_BLUE',shading:'unlit',clipPlanes:[${planes}${laterCut?',q':''}]});
  `)),
})));
export function capClippingIssues(images:PixelReader[],laterCut:boolean):string[] {
  let redPixels=0,greenPixels=0;const changed=images.slice(1).map(()=>0),issues:string[]=[];
  for(let y=0;y<480;y++)for(let x=0;x<640;x++) {
    const reference=images[0](x,y);
    if(red(reference))redPixels++;
    if(reference[1]>150&&reference[0]<30&&reference[2]<30)greenPixels++;
    images.slice(1).forEach((at,i)=>{if(at(x,y).some((v,j)=>Math.abs(v-reference[j])>20))changed[i]++;});
  }
  if(redPixels<5000)issues.push('reference must visibly render the first cap');
  if(laterCut&&greenPixels<1000)issues.push('reference must visibly render the subsequent cap');
  changed.forEach((n,i)=>{if(n>8)issues.push(`${i===0?'repeated':'equivalent'} plane changed ${n} pixels`);});
  return issues;
}
const labelModes=['depth','overlay','hide','fade'];
// Compare each anchor mode to actual shader-projected text, including clipped
// triangles. These fixtures are shared by the two real graphics backends.
export const labelProjectionCases=[
  {name:'off-center near-camera text',props:"text:'MMMM',fontSize:0.005,position:[0.006,0.002,9.95]"},
  {name:'text just inside near plane',props:"text:'MMMM',fontSize:0.0011,position:[0,0,9.989]"},
  {name:'tilted text crossing near plane',props:"text:'MMMM',fontSize:0.01,position:[0,0,9.985],rotation:[0,1,0]"},
  {name:'tilted text crossing far plane',props:"text:'MMMM',fontSize:50,position:[0,0,-989.9],rotation:[0,1,0]"},
  {name:'blended perspective near-camera text',props:"text:'MMMM',fontSize:0.005,position:[0.006,0.002,9.95]",perspective:0.995},
  {name:'regional near-camera text',props:"text:'MMMM',fontSize:0.003,position:[0,0,9.95]",view:true},
  {name:'near-camera LaTeX',props:"tex:'x^2',fontSize:0.005,position:[0.003,0,9.95]",kind:'latex'},
].map(({name,props,perspective=1,view=false,kind='text'})=>({name,sources:labelModes.map(mode=>{
  const camera=`{yaw:0,pitch:0,distance:10,height:8,perspective:${perspective}}`;
  const label=`s.${kind}('label',{${props},fill:'PURE_RED',labelOcclusion:'${mode}'})`;
  return scene(view?`s.view('region',{rect:[0.5,0,0.5,1],camera:${camera}},s=>{${label}})`:`s.play(s.camera.to3D(${camera}),{duration:0});${label}`);
})}));
export function labelProjectionIssues(images:PixelReader[]):string[] {
  const mask=(at:PixelReader)=>{const pixels=new Set<number>();let minX=640,maxX=-1,minY=480,maxY=-1;
    for(let y=0;y<480;y++)for(let x=0;x<640;x++)if(at(x,y)[0]>30){pixels.add(y*640+x);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    return {pixels,bounds:[minX,maxX,minY,maxY]};};
  const reference=mask(images[0]),issues:string[]=[];
  if(reference.pixels.size<10)issues.push('depth reference must be visibly rendered');
  images.slice(1).forEach((image,i)=>{const actual=mask(image);
    if(actual.bounds.some((v,j)=>Math.abs(v-reference.bounds[j])>1))issues.push(`${labelModes[i+1]} bounds ${actual.bounds} differ from depth projection ${reference.bounds}`);
    let delta=0;for(const p of actual.pixels)if(!reference.pixels.has(p))delta++;for(const p of reference.pixels)if(!actual.pixels.has(p))delta++;
    if(delta>Math.max(8,reference.pixels.size*0.02))issues.push(`${labelModes[i+1]} glyph mask differs from depth projection (${delta} pixels)`);
  });return issues;
}
export const explanatoryMorphSource=scene("const g={kind:'mesh',vertices:[[-2,-1,0],[2,-1,0],[2,1,0],[-2,1,0]],triangles:[[0,1,2],[0,2,3]],scalarColors:{values:[0,0,0,0],domain:[0,1],colors:['PURE_BLUE','PURE_RED']},clipPlanes:[{normal:[1,0,0],offset:0,section:{color:'WHITE'}}]};const m=s.mesh('m',g);s.play(m.morphTo({...g,scalarColors:{...g.scalarColors,values:[1,1,1,1]},clipPlanes:[{normal:[1,0,0],offset:1,section:{color:'WHITE'}}]}),{duration:2,ease:'linear'})");
export const explanatoryCases:ExplanatoryCase[]=[
  {name:'cap survives a cut through existing box edges',source:scene("s.play(s.camera.to3D({yaw:Math.PI/4,pitch:0,height:8,perspective:0}),{duration:0});s.box('b',{width:2,height:2,depth:2,fill:'PURE_BLUE',clipPlanes:[{normal:[1,0,1],offset:0,section:{color:'none',cap:'PURE_RED'}}]})"),check:at=>red(at(320,240))?[]:['edge-aligned cut must still have a cap']},
  {name:'cap survives a cut through existing box vertices',source:scene("s.play(s.camera.to3D({yaw:Math.PI/4,pitch:-Math.asin(1/Math.sqrt(3)),target:[1/3,1/3,1/3],height:8,perspective:0}),{duration:0});s.box('b',{width:2,height:2,depth:2,fill:'PURE_BLUE',clipPlanes:[{normal:[1,1,1],offset:1,section:{color:'none',cap:'PURE_RED'}}]})"),check:at=>red(at(320,240))?[]:['vertex-aligned cut must still have a cap']},
  {name:'tangent torus cut has no phantom disk',source:scene("s.play(s.camera.to3D({yaw:0,pitch:-Math.PI/2,height:8,perspective:0}),{duration:0});s.torus('t',{radius:2,tubeRadius:0.5,clipPlanes:[{normal:[0,1,0],offset:-0.5,section:{color:'none',cap:'PURE_RED'}}]})"),check:at=>{for(let y=0;y<480;y++)for(let x=0;x<640;x++)if(!black(at(x,y)))return ['tangent cut must leave background only'];return [];}},
  {name:'anchor modes suppress labels outside the near plane',source:scene("s.play(s.camera.to3D({yaw:0,pitch:0,distance:10,height:8,perspective:1}),{duration:0});['overlay','hide','fade'].forEach((mode,i)=>s.text('label'+i,{text:'MMMM',fontSize:0.001,position:[(i-1)*0.004,0,9.995],fill:'PURE_RED',labelOcclusion:mode}))"),check:at=>{for(let y=0;y<480;y++)for(let x=0;x<640;x++)if(!black(at(x,y)))return ['anchors outside near plane must not be screen-projected'];return [];}},
  {name:'near-camera anchor rays respect independent viewport offsets',source:scene("s.play(s.camera.to3D({yaw:0,pitch:0,distance:10,height:8,perspective:1}),{duration:0});s.rectangle('occluder',{width:0.001,height:0.03,position:[0.01,0,9.975],viewportOffset:[-0.05,0],fill:'PURE_BLUE'});s.text('label',{text:'MMMM',fontSize:0.005,position:[0.012,0,9.95],viewportOffset:[0.1,0],fill:'PURE_RED',labelOcclusion:'hide'})"),check:at=>{for(let y=0;y<480;y++)for(let x=0;x<640;x++)if(red(at(x,y)))return ['offset anchor ray must hit the independently offset occluder'];return [];}},
  ...['hide','fade'].map(mode=>({name:`off-center near-camera ${mode} anchor ray hits narrow occluder`,source:scene(`s.play(s.camera.to3D({yaw:0,pitch:0,distance:10,height:8,perspective:1}),{duration:0});s.rectangle('occluder',{width:0.001,height:0.03,position:[0.006,0,9.975],fill:'PURE_BLUE'});s.text('label',{text:'MMMM',fontSize:0.005,position:[0.012,0,9.95],fill:'PURE_RED',labelOcclusion:'${mode}'})`),check:(at:PixelReader)=>{
    let bright=0,dim=0;for(let y=0;y<480;y++)for(let x=0;x<640;x++){const p=at(x,y);if(p[0]>100)bright++;if(p[0]>30&&p[0]<65)dim++;}
    return bright===0&&(mode==='hide'?dim===0:dim>300)?[]:[`${mode} must use the actual projected anchor ray`];
  }})),
  {name:'transformed opaque group occludes world label anchor',source:scene("const b=s.box('b',{width:3,height:2,depth:1,fill:'PURE_BLUE',shading:'unlit'});s.group('g',[b],{position:[1,0,0],scale:1.4,rotation:[0,0,0.4]});s.text('label',{text:'MMMM',fontSize:1,position:[1,0,-2],billboard:true,fill:'PURE_RED',labelOcclusion:'hide'})"),check:at=>labelRedCount(at)===0?[]:['transformed fill must hide label anchor']},
  {name:'sphere outlines preserve original interior lighting',source:scene("s.sphere('plain',{radius:1,position:[-2,0,0],fill:'PURPLE'});s.sphere('outlined',{radius:1,position:[2,0,0],fill:'PURPLE',outline:{color:'WHITE',creaseAngle:Math.PI}})"),check:at=>{const a=at(200,220),b=at(440,220);return a.every((v,i)=>Math.abs(v-b[i])<2)?[]:['outline must preserve sphere normals and lighting'];}},
  {name:'annular cap preserves the central hole',source:scene("s.play(s.camera.to3D({yaw:0,pitch:-Math.PI/2,height:8,perspective:0}),{duration:0});s.torus('t',{radius:2,tubeRadius:0.5,fill:'PURE_BLUE',clipPlanes:[{normal:[0,1,0],offset:0,section:{color:'WHITE',cap:'PURE_RED'}}]})"),check:at=>black(at(320,240))&&red(at(440,240))?[]:['annular cap must leave a black center and red ring']},
  {name:'independent view clipping and scissor',source:scene("s.view('left',{rect:[0,0,0.5,1]},v=>v.box('l',{width:4,height:3,depth:2,fill:'PURE_BLUE',shading:'unlit',clipPlanes:[{normal:[1,0,0],offset:0}]}));s.view('right',{rect:[0.5,0,0.5,1]},v=>v.box('r',{width:4,height:3,depth:2,fill:'PURE_RED',shading:'unlit',clipPlanes:[{normal:[-1,0,0],offset:0}]}))"),check:at=>blue(at(100,240))&&black(at(220,240))&&black(at(420,240))&&red(at(540,240))?[]:['each half-view must retain its own half-space']},
  {name:'scalar colors preserve fill alpha',source:scene("s.mesh('field',{vertices:[[-2,-1,0],[2,-1,0],[2,1,0],[-2,1,0]],triangles:[[0,1,2],[0,2,3]],fill:{color:'WHITE',opacity:0.4},scalarColors:{values:[0,1,1,0],domain:[0,1],colors:['PURE_BLUE','PURE_RED']}})"),check:at=>{const p=at(320,240);return Math.abs(p[0]-51)<3&&Math.abs(p[2]-51)<3?[]:['scalar alpha must blend over background'];}},
  {name:'overlay labels preserve isolated group opacity',source:scene("const b=s.box('occluder',{width:3,height:2,depth:1,fill:'PURE_BLUE',shading:'unlit'});const l=s.text('label',{text:'MMMM',fontSize:1,position:[0,0,-2],fill:'PURE_RED',billboard:true,labelOcclusion:'overlay'});s.group('g',[b,l],{isolated:true,opacity:0.5})"),check:at=>{let n=0;for(let y=210;y<270;y++)for(let x=240;x<400;x++){const p=at(x,y);if(p[0]>120&&p[0]<135&&p[2]<8)n++;}return n>300?[]:['isolated label must fade once with group'];}},
  {name:'clip removes right half and draws red section contour',source:scene("s.box('cut',{width:4,height:3,depth:2,fill:'PURE_BLUE',shading:'unlit',clipPlanes:[{normal:[1,0,0],offset:0,section:{color:'PURE_RED',width:0.12}}]})"),check:at=>[
    ...(!blue(at(260,240))?['retained half must be blue']:[]),...(!black(at(380,240))?['removed half must be background']:[]),...(!red(at(320,240))?['cut contour must be red']:[])]},
  {name:'cap fills cut plane facing viewer',source:scene("s.box('cut',{width:4,height:3,depth:2,fill:'PURE_BLUE',shading:'unlit',clipPlanes:[{normal:[0,0,1],offset:0,section:{color:'WHITE',width:0.08,cap:'PURE_RED'}}]})"),check:at=>red(at(320,240))?[]:['visible cap center must be red']},
  {name:'scalar values interpolate through triangle interiors',source:scene("s.mesh('field',{vertices:[[-2,-1,0],[2,-1,0],[2,1,0],[-2,1,0]],triangles:[[0,1,2],[0,2,3]],scalarColors:{values:[0,1,1,0],domain:[0,1],colors:['PURE_BLUE','PURE_RED']}})"),check:at=>{
    const left=at(230,240),middle=at(320,240),right=at(410,240);return left[2]>left[0]*3&&right[0]>right[2]*3&&Math.abs(middle[0]-middle[2])<5&&middle[0]>110?[]:['expected smooth blue-purple-red gradient'];}},
  {name:'crease outlines exclude coplanar triangulation diagonal',source:scene("s.box('box',{width:4,height:3,depth:2,fill:'PURE_BLUE',shading:'unlit',outline:{color:'PURE_RED',width:0.12,silhouette:false}})"),check:at=>blue(at(320,240))&&red(at(440,240))?[]:['expected red box edge, blue face center']},
  {name:'hidden anchor suppresses entire label',source:label('hide'),check:at=>labelRedCount(at)===0?[]:['occluded label must disappear']},
  {name:'overlay label remains visible behind object',source:label('overlay'),check:at=>labelRedCount(at)>300?[]:['overlay label must remain red']},
  {name:'default depth labels retain glyph occlusion',source:label('depth'),check:at=>labelRedCount(at)===0?[]:['default label must depth-test']},
  {name:'fade mode shows dim red label through blue occluder',source:label('fade'),check:at=>{let count=0;for(let y=210;y<270;y++)for(let x=240;x<400;x++){const p=at(x,y);if(p[0]>40&&p[0]<65&&p[2]>180)count++;}return count>300?[]:['faded label must blend at 20%'];}},
];
