/** Pixel oracles shared by real WebGPU and real WebGL2 tests (640 x 480). */
const rectangles = `const a=s.rectangle('a',{width:2,height:2,position:[-0.5,0],fill:'WHITE',stroke:'none'});
const b=s.rectangle('b',{width:2,height:2,position:[0.5,0],fill:'WHITE',stroke:'none'});`;
export const compositionCases: { name: string; source: string; time: number; samples: [number, number, number[]][] }[] = [
  { name: 'translucent children preserve foreground layer depth', source: `export default scene({},s=>{s.rectangle('back',{width:4,height:4,position:[0,0,-1],fill:'PURE_RED'});const a=s.rectangle('a',{width:2,height:2,opacity:0.5});const g=s.group('g',[a],{isolated:true});s.play(g.fadeOut(),{duration:2,ease:'linear'});});`, time: 1, samples: [[320,240,[255,64,64]]] },
  { name: 'isolated group applies fade once in overlaps', source: `export default scene({},s=>{${rectangles}const g=s.group('object',[a,b],{isolated:true});s.play(g.fadeIn(),{duration:2,ease:'linear'});});`, time: 1, samples: [[260,240,[128,128,128]],[320,240,[128,128,128]],[380,240,[128,128,128]]] },
  { name: 'ordinary group preserves child alpha multiplication', source: `export default scene({},s=>{${rectangles}const g=s.group('object',[a,b]);s.play(g.fadeIn(),{duration:2,ease:'linear'});});`, time: 1, samples: [[260,240,[128,128,128]],[320,240,[192,192,192]]] },
  { name: 'nested isolated fades multiply once at each boundary', source: `export default scene({},s=>{${rectangles}const inner=s.group('inner',[a,b],{isolated:true});const outer=s.group('outer',[inner],{isolated:true});s.play([inner.fadeIn(),outer.fadeIn()],{duration:2,ease:'linear'});});`, time: 1, samples: [[260,240,[64,64,64]],[320,240,[64,64,64]]] },
  { name: 'pass-through parent opacity applies once to isolated child', source: `export default scene({},s=>{${rectangles}const inner=s.group('inner',[a,b],{isolated:true});const outer=s.group('outer',[inner]);s.play(outer.fadeIn(),{duration:2,ease:'linear'});});`, time: 1, samples: [[260,240,[128,128,128]],[320,240,[128,128,128]]] },
  { name: 'intentional child transparency is preserved inside isolation', source: `export default scene({},s=>{const a=s.rectangle('a',{width:2,height:2,position:[-0.5,0],opacity:0.5});const b=s.rectangle('b',{width:2,height:2,position:[0.5,0],opacity:0.5});const g=s.group('g',[a,b],{isolated:true});s.play(g.fadeOut(),{duration:2,ease:'linear'});});`, time: 1, samples: [[260,240,[64,64,64]],[320,240,[96,96,96]]] },
  { name: 'isolated group respects opaque external occlusion', source: `export default scene({},s=>{${rectangles}const g=s.group('g',[a,b],{isolated:true});s.rectangle('front',{width:1,height:2,position:[1,0,1],fill:'PURE_RED'});s.play(g.fadeOut(),{duration:2,ease:'linear'});});`, time: 1, samples: [[260,240,[128,128,128]],[380,240,[255,0,0]]] },
  { name: 'screen-space isolated group', source: `export default scene({},s=>{const a=s.rectangle('a',{space:'screen',width:120,height:120,position:[-30,0]});const b=s.rectangle('b',{space:'screen',width:120,height:120,position:[30,0]});const g=s.group('g',[a,b],{isolated:true});s.play(g.fadeIn(),{duration:2,ease:'linear'});});`, time: 1, samples: [[260,240,[128,128,128]],[320,240,[128,128,128]]] },
  { name: 'regional isolation respects scissor and view placement', source: `export default scene({},s=>{s.view('v',{rect:[0.5,0,0.5,1],camera:{perspective:0,yaw:0,pitch:0}},s=>{${rectangles}const g=s.group('g',[a,b],{isolated:true});s.play(g.fadeIn(),{duration:2,ease:'linear'});});});`, time: 1, samples: [[320,240,[0,0,0]],[480,240,[128,128,128]]] },
  { name: 'isolated fade completes fully opaque', source: `export default scene({},s=>{${rectangles}const g=s.group('g',[a,b],{isolated:true});s.play(g.fadeIn(),{duration:2});});`, time: 2, samples: [[260,240,[255,255,255]],[320,240,[255,255,255]]] },
  { name: 'isolated fade completes fully hidden', source: `export default scene({},s=>{${rectangles}const g=s.group('g',[a,b],{isolated:true});s.play(g.fadeOut(),{duration:2});});`, time: 2, samples: [[260,240,[0,0,0]],[320,240,[0,0,0]]] },
];

for (const isolated of [false, true]) compositionCases.push({
  name: `procedural secondary alpha${isolated ? ' with isolated fade' : ''}`,
  source: `export default scene({},s=>{
    s.rectangle('back',{width:5,height:5,position:[0,0,-1],fill:'PURE_GREEN'});
    const sheet=s.mesh('sheet',{vertices:[[-2,-2,0],[2,-2,0],[2,2,0],[-2,2,0]],
      triangles:[[0,1,2],[0,2,3]],fill:'PURE_RED',
      texture:{pattern:'stripes',color:{color:'PURE_BLUE',opacity:0.5},scale:2,offset:[0.25,0.25,0.5]}});
    ${isolated ? "s.group('fade',[sheet],{isolated:true,opacity:0.5});" : ''}
    s.wait(1);
  });`,
  time: 1,
  samples: [[335,225,isolated ? [128,128,0] : [255,0,0]], [365,225,isolated ? [0,191,64] : [0,128,128]]],
});
