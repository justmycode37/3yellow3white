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

// Precision regressions must compare every channel, not a whole-image error
// percentage that could hide a missing thin primitive. These also run cold/warm
// and after orbit/seek on both real backends. Clipping fixtures disable orbit
// to keep their authored boundary alignment while still exercising seeks.
export const retainedPrecisionCases = [
  { name:'fine mesh at a large authored origin', retained:false, source:`export default scene({},s=>{
    s.mesh('m',{vertices:[[999999.98,-1,0],[1000000,-1,0],[1000000,1,0],[999999.98,1,0]],triangles:[[0,1,2],[0,2,3]],position:[-1000000,0,0],fill:'PURE_RED'});
    s.play(s.camera.animate({height:.5}),{duration:0});s.wait(2);
  });` },
  { name:'flat line at a large authored origin', retained:false, source:`export default scene({},s=>{
    s.line('l',{points:[[999999,-.1,0],[1000000,.1,0]],position:[-999999.5,0,0],stroke:'BLUE',strokeWidth:.02});
    s.play(s.camera.animate({height:1.5}),{duration:0});s.wait(2);
  });` },
  { name:'textured mesh with nested compensating transforms', retained:false, source:`export default scene({},s=>{
    const m=s.mesh('m',{vertices:[[999999.98,-1,0],[1000000,-1,0],[1000000,1,0],[999999.98,1,0]],triangles:[[0,1,2],[0,2,3]],position:[-500000,0,0],fill:'PURE_RED',texture:{pattern:'checker',color:'PURE_BLUE',scale:[1,4,1],offset:[-1000000,0,0]}});
    const g=s.group('g',[m],{position:[-250000,0,0],scale:.5});
    s.group('h',[g],{rotation:[0,0,.15],scale:2});
    s.play(s.camera.animate({height:.5}),{duration:0});s.wait(2);
  });` },
  { name:'flat line with nested compensating transforms', retained:false, source:`export default scene({},s=>{
    const l=s.line('l',{points:[[999999,-.1,0],[1000000,.1,0]],position:[-500000,0,0],stroke:'BLUE',strokeWidth:.02});
    const g=s.group('g',[l],{position:[-249999.75,0,0],scale:.5});
    s.group('h',[g],{rotation:[0,0,.15],scale:2});
    s.play(s.camera.animate({height:1.5}),{duration:0});s.wait(2);
  });` },
  { name:'small local mesh with large canceling group translations', retained:true, source:`export default scene({},s=>{
    const m=s.mesh('m',{vertices:[[-.02,-1,0],[0,-1,0],[0,1,0],[-.02,1,0]],triangles:[[0,1,2],[0,2,3]],position:[1000000,0,0],fill:'PURE_RED'});
    const g=s.group('g',[m],{position:[-250000,0,0],scale:.5});
    s.group('h',[g],{position:[-499999.98,0,0],scale:2});
    s.play(s.camera.animate({height:.5}),{duration:0});s.wait(2);
  });` },
  { name:'orthographic near clipping uncertainty', retained:false, orbit:false, source:`export default scene({},s=>{
    s.mesh('m',{vertices:[[-1,-1,.001],[1,-1,.001],[1,1,.001],[-1,1,.001]],triangles:[[0,1,2],[0,2,3]],position:[0,0,9.989],fill:'PURE_RED'});
    s.play(s.camera.animate({height:4,distance:10,perspective:0,yaw:0,pitch:0}),{duration:0});s.wait(2);
  });` },
  { name:'perspective near clipping with tiny divisor', retained:false, orbit:false, source:`export default scene({},s=>{
    s.mesh('m',{vertices:[[-.5,-.5,.001008],[.5,-.5,.001008],[.5,.5,.001008],[-.5,.5,.001008]],triangles:[[0,1,2],[0,2,3]],position:[0,0,999.988992],fill:'PURE_RED'});
    s.play(s.camera.animate({height:200000,distance:1000,perspective:1,yaw:0,pitch:0}),{duration:0});s.wait(2);
  });` },
  { name:'nested scales overflow float32 instance matrix', retained:false, orbit:false, source:`export default scene({},s=>{
    let g=s.mesh('m',{vertices:[[-1e-40,-1e-40,0],[1e-40,-1e-40,0],[1e-40,1e-40,0],[-1e-40,1e-40,0]],triangles:[[0,1,2],[0,2,3]],scale:1e4,fill:'PURE_RED'});
    for(let j=0;j<6;j++)g=s.group('g'+j,[g],{scale:1e6});
    s.play(s.camera.animate({height:4}),{duration:0});s.wait(2);
  });` },

  { name:'perspective tiny divisor away from clipping planes', retained:false, orbit:false, source:`export default scene({},s=>{
    s.mesh('m',{vertices:[[-1,-1,.001008],[1,-1,.001008],[1,1,.001008],[-1,1,.001008]],triangles:[[0,1,2],[0,2,3]],position:[0,0,999.798992],fill:'PURE_RED'});
    s.play(s.camera.animate({height:200000,distance:1000,perspective:1,yaw:0,pitch:0}),{duration:0});s.wait(2);
  });` },
  { name:'orthographic far clipping uncertainty', retained:false, orbit:false, source:`export default scene({},s=>{
    s.mesh('m',{vertices:[[-1,-1,.001],[1,-1,.001],[1,1,.001],[-1,1,.001]],triangles:[[0,1,2],[0,2,3]],position:[0,0,-990.001],fill:'PURE_RED'});
    s.play(s.camera.animate({height:4,distance:10,perspective:0,yaw:0,pitch:0}),{duration:0});s.wait(2);
  });` },
  { name:'layer-biased near clipping uncertainty', retained:false, orbit:false, source:`export default scene({},s=>{
    s.sphere('hidden',{opacity:0});
    s.mesh('m',{vertices:[[-1,-1,.001],[1,-1,.001],[1,1,.001],[-1,1,.001]],triangles:[[0,1,2],[0,2,3]],position:[0,0,9.98898],fill:'PURE_RED'});
    s.play(s.camera.animate({height:4,distance:10,perspective:0,yaw:0,pitch:0}),{duration:0});s.wait(2);
  });` },

  { name:'subnormal local coordinates with finite normal scale', retained:false, orbit:false, source:`export default scene({},s=>{
    let g=s.mesh('m',{vertices:[[-1e-38,-1e-38,0],[1e-38,-1e-38,0],[1e-38,1e-38,0],[-1e-38,1e-38,0]],triangles:[[0,1,2],[0,2,3]],scale:100,fill:'PURE_RED'});
    for(let j=0;j<6;j++)g=s.group('g'+j,[g],{scale:1e6});
    s.play(s.camera.animate({height:4}),{duration:0});s.wait(2);
  });` },
  { name:'normal local coordinates positive control', retained:true, orbit:false, source:`export default scene({},s=>{
    let g=s.mesh('m',{vertices:[[-2e-38,-2e-38,0],[2e-38,-2e-38,0],[2e-38,2e-38,0],[-2e-38,2e-38,0]],triangles:[[0,1,2],[0,2,3]],scale:50,fill:'PURE_RED'});
    for(let j=0;j<6;j++)g=s.group('g'+j,[g],{scale:1e6});
    s.play(s.camera.animate({height:4}),{duration:0});s.wait(2);
  });` },

  { name:'local coordinates underflow to zero before packing', retained:false, orbit:false, source:`export default scene({},s=>{
    let g=s.mesh('m',{vertices:[[-1e-50,-1e-50,0],[1e-50,-1e-50,0],[1e-50,1e-50,0],[-1e-50,1e-50,0]],triangles:[[0,1,2],[0,2,3]],scale:100,fill:'PURE_RED'});
    for(let j=0;j<6;j++)g=s.group('g'+j,[g],{scale:1e6});
    s.play(s.camera.animate({height:4e-12}),{duration:0});s.wait(2);
  });` },
  { name:'subnormal transform and normal divisor', retained:false, orbit:false, source:`export default scene({},s=>{
    s.mesh('m',{vertices:[[-1e6,-1e6,0],[1e6,-1e6,0],[1e6,1e6,0],[-1e6,1e6,0]],triangles:[[0,1,2],[0,2,3]],scale:1e-38,fill:'PURE_RED'});
    s.play(s.camera.animate({height:4e-32}),{duration:0});s.wait(2);
  });` },
  { name:'normal inputs with subnormal normal dot products', retained:false, orbit:false, source:`export default scene({},s=>{
    s.mesh('m',{vertices:[[-1e6,-1e6,0],[1e6,-1e6,0],[1e6,1e6,0],[-1e6,1e6,0]],triangles:[[0,1,2],[0,2,3]],normals:[[1,1,1],[1,1,1],[1,1,1],[1,1,1]],shading:'smooth',scale:2e-38,fill:'PURE_RED'});
    s.play(s.camera.animate({height:8e-32}),{duration:0});s.wait(2);
  });` },

  // The 100 entry is the unchanged R4 lit repro; height scales with geometry
  // so every boundary/positive control has the same visible footprint.
  ...[
    {scale:50,retained:true}, {scale:80,retained:true}, {scale:85,retained:true},
    {scale:86,retained:false}, {scale:100,retained:false}, {scale:200,retained:false},
    {scale:2**126/1e36/(1+16*2**-24),retained:true},
    {scale:2**126/1e36,retained:false},
    {scale:2**126/1e36*(1+16*2**-24),retained:false},
  ].map(({scale,retained})=>({name:'lit divisor '+scale+'e36',retained,orbit:false,source:`export default scene({},s=>{
    let g=s.mesh('m',{vertices:[[-2e-38,-2e-38,0],[2e-38,-2e-38,0],[2e-38,2e-38,0],[-2e-38,2e-38,0]],triangles:[[0,1,2],[0,2,3]],normals:[[0,0,1],[0,0,1],[0,0,1],[0,0,1]],shading:'smooth',scale:${scale},fill:'PURE_RED'});
    for(let j=0;j<6;j++)g=s.group('g'+j,[g],{scale:1e6});
    s.play(s.camera.animate({height:${scale*.08}}),{duration:0});s.wait(2);
  });`})),

];
