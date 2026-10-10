import type { SceneSource } from '../src/types.js';

/** ?surfaces: retained deformation and independently bound material parameters. */
export const dynamicSurfaceSource: SceneSource = {
  id: 'dynamic-surfaces',
  source: `export default scene({mode:'3d',end:'hold'}, s => {
    const amplitude=s.slider('amplitude',{reactive:true,default:0.6,min:0,max:1.2,step:0.05,label:'Wave amplitude'});
    const roughness=s.slider('roughness',{reactive:true,default:0.45,min:0.05,max:1,step:0.05,label:'Roughness'});
    function sheet(v,id) {
      const mesh=v.surface(id,{fn:()=>0,xRange:[-2,2],yRange:[-2,2],xSegments:24,ySegments:24,
        fill:'TEAL',texture:{pattern:'checker',color:'BLUE',scale:1.5},stroke:Color.NONE});
      v.deform(mesh,[v.time,amplitude],([x,y],index,t,a)=>[x,y,a*Math.sin(2*x-t)*Math.cos(2*y-t/2)]);
      v.bind(mesh,[roughness],r=>({material:{metalness:0.35,roughness:r}}));
      const group=v.group(id+'-group',[mesh],{isolated:true});
      v.play(group.fadeIn(),{duration:1});
    }
    s.view('left',{rect:[0.02,0.13,0.47,0.72],camera:{height:6,yaw:0.5,pitch:0.7}},v=>sheet(v,'wave-left'));
    s.view('right',{rect:[0.51,0.13,0.47,0.72],camera:{height:6,yaw:-0.6,pitch:0.25}},v=>sheet(v,'wave-right'));
    s.text('title',{text:'One wave, two views',space:'screen',viewportOffset:[0,0.43],fontSize:22});
    s.text('hint',{text:'Play or seek the wave. Adjust amplitude and roughness while paused.',space:'screen',viewportOffset:[0,-0.39],fontSize:12,fill:'GREY'});
    s.wait(10);
  });`,
};
