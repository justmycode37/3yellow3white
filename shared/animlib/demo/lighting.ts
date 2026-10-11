import type { SceneSource } from '../src/types.js';
/** Mutable scene options are read after the builder; ordinary controls recompile. */
export const lightingSource: SceneSource = {
  id: 'lighting',
  source: `const lighting={ambient:1,directional:{direction:[-0.7,1,0.5],space:'world',intensity:1,
    shadow:{softness:0.08,quality:'medium',opacity:0.75}},receiver:{position:[0,-1,0],size:[9,7],fill:'GREY_C'}};
  export default scene({mode:'3d',lighting},s=>{
    lighting.directional.space=s.select('space',{label:'Light direction space',default:'world',options:['world','camera']});
    lighting.ambient=s.slider('ambient',{label:'Ambient',default:1,min:0,max:2,step:0.1});
    lighting.directional.intensity=s.slider('intensity',{label:'Directional',default:1,min:0,max:2,step:0.1});
    lighting.directional.shadow.softness=s.slider('softness',{label:'Softness (radians)',default:0.08,min:0,max:0.25,step:0.01});
    lighting.directional.shadow.quality=s.select('quality',{label:'Shadow quality',default:'medium',options:['low','medium','high']});
    const lift=s.slider('lift',{label:'Lift above floor',default:0,min:0,max:2,step:0.1});
    s.play(s.camera.to3D({yaw:0.5,pitch:-0.55,height:7.5,target:[0,0,0],distance:12}),{duration:0});
    s.sphere('sphere',{position:[-1.5,lift,0],radius:1,fill:'GOLD',material:{metalness:0.65,roughness:0.32}});
    s.box('box',{position:[1.25,lift-0.25,0],width:1.5,height:1.5,depth:1.5,rotation:[0,0.3,0],fill:'BLUE_B'});
    s.text('note',{text:'Drag to orbit · Lift to separate the shadows',space:'screen',position:[0,-210],fontSize:16,fill:'WHITE'});
    s.wait(1);
  });`,
};
