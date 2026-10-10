import type { SceneSource } from '../src/types.js';

/** All picking, drag, spring motion, attachments and compositing belong to animlib. */
export const behaviorSource: SceneSource = {
  id: 'behaviors',
  source: `export default scene({mode:'3d'},s=>{
    s.text('title',{space:'screen',viewportOffset:[0,0.43],text:'Grab an atom. Release to restore.',fontSize:22});
    s.text('hint',{space:'screen',viewportOffset:[0,-0.43],text:'Drag background to rotate. Shift-drag to pan.',fontSize:14,fill:'GREY'});
    const a=s.sphere('a',{position:[-1.1,0,0],radius:0.55,fill:'BLUE'});
    const b=s.sphere('b',{position:[1.1,0,0],radius:0.55,fill:'RED'});
    const bond=s.line3D('bond',{strokeWidth:0.12});
    const labelA=s.text('label-a',{text:'A',fontSize:0.35,billboard:true,billboardOffset:[0,0,0.6]});
    const labelB=s.text('label-b',{text:'B',fontSize:0.35,billboard:true,billboardOffset:[0,0,0.6]});
    for(const atom of [a,b]){s.behavior(atom,{type:'drag',plane:'screen'});s.behavior(atom,{type:'spring'});}
    s.attach(labelA,a);s.attach(labelB,b);s.connect(bond,a,b,{endpoints:'surface'});
    const object=s.group('object',[a,b,bond,labelA,labelB],{isolated:true});
    s.play(object.fadeIn(),{duration:2});s.wait(5);
    s.play(object.animate({opacity:0.3}),{duration:2});s.wait(3);
    s.play(object.animate({opacity:1}),{duration:2});s.wait(60);
  });`,
};
