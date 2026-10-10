/** Shared real-rendering regressions: optimized draws versus CPU world vertices. */
export const retainedCases = [
  { name:'sphere instances and nested transforms', source:`export default scene({mode:'3d'},s=>{
    const spheres=[];for(let i=0;i<5;i++)spheres.push(s.sphere('s'+i,{radius:0.2+i*0.08,position:[i-2,0,0],fill:'BLUE'}));
    const g=s.group('g',spheres);s.play(g.rotateTo([0.3,0.4,0.2]),{duration:1});s.wait(1);
  });` },
  { name:'canonical bonds and arrows with rotated endpoints', source:`export default scene({mode:'3d'},s=>{
    s.line('a',{points:[[-2,-1,0],[-2,1,0]],stroke:'BLUE',strokeWidth:0.15,strokeProfile:'round'});
    s.line('b',{points:[[0,0,-1],[0,0,1]],stroke:'BLUE',strokeWidth:0.15,strokeProfile:'round'});
    s.arrow('c',{points:[[1,-1,0],[2,0,1]],stroke:'YELLOW',strokeWidth:0.12,strokeProfile:'round'});
    s.arrow('d',{points:[[1,1,0],[2,0,-1]],stroke:'YELLOW',strokeWidth:0.12,strokeProfile:'round'});s.wait(2);
  });` },
  { name:'billboards, textured transforms and isolated opacity', source:`export default scene({mode:'3d'},s=>{
    const a=s.sphere('a',{fill:'BLUE',texture:{pattern:'checker',color:'WHITE',scale:3},material:{roughness:0.4}});
    const b=s.text('b',{text:'billboard',billboard:true,billboardOffset:[0,1.2,0],fill:'YELLOW'});
    s.group('g',[a,b],{isolated:true,opacity:0.6,rotation:[0.2,0.1,0],scale:0.8});s.wait(2);
  });` },
];

export const occlusionGateSource = `export default scene({mode:'3d'},s=>{
  s.sphere('a',{position:[-0.6,0,0.3],scale:0.6,rotation:[0.2,0.4,0.3],fill:'BLUE'});
  s.sphere('b',{position:[0.8,0,0.3],scale:0.6,fill:'BLUE'});
  s.text('label',{text:'label',position:[0,0,-0.5],billboard:true});s.wait(2);
});`;

// Forward integration gate only: this branch does not implement hide/fade.
// Item 5's actual visibility assertions must also run after the branches merge.
export function occlusionGateFrames(frame: import('../src/types.js').Frame) {
  const frames: typeof frame[] = [];
  for (const mode of ['hide','fade']) for (const endpoint of ['geometry','from','to']) {
    const next=structuredClone(frame),label=next.elements.find(e=>e.id==='label')!;
    const geometry={...label.geometry,labelOcclusion:mode};
    if (endpoint==='geometry') label.geometry=geometry;
    else label.morph={from:endpoint==='from'?geometry:label.geometry,to:endpoint==='to'?geometry:label.geometry,progress:endpoint==='from'?1:0};
    next.camera.yaw=frames.length*0.2;frames.push(next);
  }
  return frames;
}
