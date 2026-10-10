/** Same authored scene expressed with rebuilt values or retained pure callbacks. */
export interface ReactiveCase { name: string; legacy: string; reactive: string }
function pair(name: string, setup: string, expression: string, after = 's.wait(3);', options = '{}'): ReactiveCase {
  const source = (reactive: boolean) => `export default scene(${options},s=>{
    const x=s.slider('x',{${reactive ? 'reactive:true,' : ''}default:1,min:0.1,max:3});
    const y=s.slider('y',{${reactive ? 'reactive:true,' : ''}default:1,min:0.1,max:3});
    ${reactive ? '' : `const props=(${expression});`}
    ${setup.replace('PROPS', reactive ? '{}' : 'props')}
    ${reactive ? `s.bind(target,[x,y],(x,y)=>(${expression}));` : ''}
    ${after}
  });`;
  return { name, legacy: source(false), reactive: source(true) };
}
export const reactiveCases: ReactiveCase[] = [
  pair('sphere radius with animated position', "const target=s.sphere('target',{...PROPS});", '{radius:0.3*x+y/10}', "s.play(target.moveTo([2,1]),{duration:3,ease:'linear'});s.keep(target);", "{mode:'3d'}"),
  pair('circle radius with fade', "const target=s.circle('target',{...PROPS});", '{radius:x/2}', "s.play(target.fadeIn(),{duration:1});s.wait(2);"),
  pair('position and attached billboard', "const target=s.sphere('target',{...PROPS});const label=s.text('label',{text:'Atom',billboard:true});s.attach(label,target,{offset:[0,0.8,0]});", '{position:[x-1,y-1,0.2*x]}', undefined, "{mode:'3d'}"),
  pair('scalar rotation', "const target=s.rectangle('target',{...PROPS});", '{rotation:x-y}'),
  pair('3D rotation', "const target=s.mesh('target',{vertices:[[0,0,0],[1,0,0],[0,1,1]],triangles:[[0,1,2]],...PROPS});", '{rotation:[x/3,y/4,(x-y)/5]}', undefined, "{mode:'3d'}"),
  pair('scale and surface connector', "const target=s.sphere('target',{...PROPS});const b=s.sphere('b',{position:[4,0,0]});const line=s.line3D('line');s.connect(line,target,b,{endpoints:'surface'});", '{scale:x}', undefined, "{mode:'3d'}"),
  pair('opacity and palette alpha', "const target=s.rectangle('target',{...PROPS});", "{opacity:x/3,fill:{color:y>1.5?'RED':'BLUE',opacity:y/3}}"),
  pair('isolated group opacity', "const a=s.circle('a'),b=s.circle('b',{position:[0.4,0]});const target=s.group('target',[a,b],{isolated:true,...PROPS});", '{opacity:x/3}'),
  pair('late creation then removal', "s.wait(1);const target=s.sphere('target',{...PROPS});", '{radius:x/2}', 's.wait(1);s.remove(target);s.wait(1);'),
  pair('view-local sphere', "let target;s.view('view',{rect:[0.1,0.1,0.8,0.8]},v=>{target=v.sphere('target',{...PROPS});});", '{radius:x/2,fill:y>1.5?"RED":"BLUE"}'),
  pair('static properties through shape morph', "const target=s.circle('target',{...PROPS});", '{scale:x,fill:y>1.5?"RED":"BLUE"}', "s.play(target.morphTo({kind:'rectangle',width:2,height:1}),{duration:2});s.wait(1);"),
  pair('group transform with child animation', "const a=s.circle('a');const target=s.group('target',[a],{...PROPS});", '{position:[x-1,y-1],rotation:x/3,scale:y}', "s.play(a.moveTo([2,0]),{duration:3});"),
];

/** Controls whose general authoring power must remain available through the existing API. */
export const generalControlSources = [
  `export default scene({},s=>{const n=s.slider('n',{default:2,min:1,max:5});for(let i=0;i<n;i++)s.circle('dot-'+i,{position:[i,0]});s.wait(2);});`,
  `export default scene({},s=>{const x=s.slider('x',{default:1,min:0.5,max:3});s.arrow('vector',{points:[[0,0],[x,1]]});s.text('readout',{text:'x = '+x});s.latex('formula',{tex:'x = '+x});s.wait(2);});`,
  `export default scene({},s=>{const x=s.slider('x',{default:1,min:0.5,max:3});const a=s.circle('a');s.play(a.moveTo([x,0]),{duration:x});s.play(a.morphTo({kind:'rectangle',width:x,height:1}),{duration:1});});`,
  `export default scene({},s=>{const visible=s.toggle('visible',{default:true});const shape=s.select('shape',{default:'circle',options:['circle','rectangle']});if(visible)s[shape]('shape');s.wait(2);});`,
  `export default scene({},s=>{const x=s.slider('x',{default:1,min:0.5,max:3});s.mesh('mesh',{vertices:[[0,0,0],[x,0,0],[0,x,1]],triangles:[[0,1,2]]});s.path('path',{points:[[0,0],[x,x],[2,0]]});s.wait(2);});`,
];
