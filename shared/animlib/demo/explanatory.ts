import type { SceneSource } from '../src/types.js';

// Keep sampled meshes modest: controls rebuild these scenes inside the same
// 200 ms sandbox budget as generated scenes, including both section views.
export const explanatorySources: SceneSource[] = [{
  id:'section-lab',
  source:`export default scene({mode:'3d',orbit:true,end:'hold'},s=>{
    const cut=s.slider('cut',{label:'Section height',min:-0.65,max:0.65,default:0.12,step:0.02});
    const caps=s.toggle('caps',{label:'Fill the section',default:true});
    const camera={height:6.5,distance:12,yaw:0.5,pitch:-0.7};
    function shape(v,id){
      v.torus(id,{radius:1.65,tubeRadius:0.65,radialSegments:24,tubularSegments:12,
        fill:'BLUE_D',clipPlanes:[{normal:[0,1,0],offset:cut,section:{color:'YELLOW',width:0.045,...(caps?{cap:'GOLD'}:{})}}],
        outline:{color:'BLUE_A',creaseAngle:Math.PI,width:0.018}});
      v.text(id+'-label',{text:'Inside the ring',fontSize:0.25,position:[0,-0.5,0],billboard:true,labelOcclusion:'fade',fill:'WHITE'});
    }
    s.view('perspective',{rect:[0,0,0.6,1],orbit:true,camera},v=>shape(v,'ring'));
    s.view('section',{rect:[0.6,0,0.4,1],orbit:true,camera:{...camera,height:8.5,yaw:0,pitch:-Math.PI/2,perspective:0}},v=>shape(v,'section-ring'));
    s.text('heading',{space:'screen',text:'CUTAWAY / SECTION',position:[0,180],fontSize:16,fill:'WHITE'});
    s.wait(4);
  });`,
},{
  id:'scalar-lab',
  source:`export default scene({mode:'3d',orbit:true,end:'hold'},s=>{
    const amplitude=s.slider('amplitude',{label:'Wave amplitude',min:0.25,max:1.5,default:1,step:0.05});
    const cut=s.slider('cut',{label:'Slice X',min:-2,max:2,default:0.8,step:0.05});
    s.play(s.camera.to3D({height:7.5,distance:13,yaw:0.45,pitch:-0.5}),{duration:0});
    s.surface('field',{fn:(x,y)=>amplitude*Math.cos(x*1.7)*Math.sin(y*1.7),
      xSegments:24,ySegments:24,rotation:[-Math.PI/2,0,0],
      scalar:{fn:(x,y,z)=>z,domain:[-1.5,1.5],colors:['BLUE_E','BLUE','WHITE','GOLD','RED']},
      clipPlanes:[{normal:[1,0,0],offset:cut,section:{color:'YELLOW',width:0.04}}],
      outline:{color:'GREY_A',creaseAngle:Math.PI,width:0.015}});
    s.text('zero',{text:'z = 0',position:[0,0,-0.5],billboard:true,labelOcclusion:'fade',fill:'WHITE',fontSize:0.3});
    s.text('title',{space:'screen',text:'HEIGHT AS COLOR',position:[0,180],fontSize:16});
    const colors=['BLUE_E','BLUE','WHITE','GOLD','RED'];
    for(let i=0;i<5;i++)s.rectangle('key-'+i,{space:'screen',position:[(i-2)*35,-175],width:35,height:12,fill:colors[i]});
    s.text('low',{space:'screen',position:[-92,-198],text:'-1.5',fontSize:12});
    s.text('high',{space:'screen',position:[92,-198],text:'+1.5',fontSize:12});
    s.wait(4);
  });`,
},{
  id:'outline-lab',
  source:`export default scene({mode:'3d',orbit:true,end:'hold'},s=>{
    const angle=s.slider('angle',{label:'Crease angle (degrees)',min:0,max:180,default:35,step:1});
    const mode=s.select('mode',{label:'Label visibility',default:'fade',options:['depth','hide','fade','overlay']});
    s.play(s.camera.to3D({height:7,distance:12,yaw:0.45,pitch:-0.25}),{duration:0});
    s.box('box',{position:[-1.5,0,0],width:1.7,height:1.7,depth:1.7,fill:'TEAL_D',outline:{color:'WHITE',creaseAngle:angle*Math.PI/180,width:0.035}});
    s.sphere('sphere',{position:[1.5,0,0],radius:1.15,fill:'PURPLE_D',outline:{color:'PURPLE_A',creaseAngle:angle*Math.PI/180,width:0.025}});
    s.text('a',{text:'Behind box',position:[-1.5,0,-1.5],billboard:true,labelOcclusion:mode,fontSize:0.35,fill:'YELLOW'});
    s.text('b',{text:'Behind sphere',position:[1.5,0,-1.5],billboard:true,labelOcclusion:mode,fontSize:0.35,fill:'YELLOW'});
    s.text('title',{space:'screen',text:'EDGES / DEPTH CUES',position:[0,180],fontSize:16});
    s.wait(4);
  });`,
}];
