/** Identical smooth waves sampled statically or via retained time/control callbacks. */
export function waveSource(time?: number, amplitude = 0.6, roughness = 0.45): string {
  return `export default scene({mode:'3d',end:'hold'},s=>{
    const a=s.slider('amplitude',{reactive:true,default:${amplitude},min:0,max:1.2});
    const r=s.slider('roughness',{reactive:true,default:${roughness},min:0.05,max:1});
    const wave=(x,y,t,a)=>a*Math.sin(2*x-t)*Math.cos(2*y-t/2);
    function sheet(v,id) {
      const mesh=v.surface(id,{fn:(x,y)=>${time === undefined ? '0' : `wave(x,y,${time},${amplitude})`},xSegments:8,ySegments:8,
        fill:'TEAL',stroke:Color.NONE,texture:{pattern:'checker',color:'BLUE',scale:1.5},material:{roughness:${roughness}}});
      ${time === undefined ? `v.deform(mesh,[s.time,a],([x,y],i,t,a)=>[x,y,wave(x,y,t,a)]);
      v.bind(mesh,[r],r=>({material:{roughness:r}}));` : ''}
      const group=v.group(id+'-group',[mesh],{isolated:true});s.keep(group);
      s.play(group.fadeIn(),{duration:1});
    }
    s.view('left',{rect:[0.02,0.05,0.46,0.9],camera:{height:6,yaw:0.5,pitch:0.7}},v=>sheet(v,'left'));
    s.view('right',{rect:[0.52,0.05,0.46,0.9],camera:{height:6,yaw:-0.6,pitch:0.25}},v=>sheet(v,'right'));
    s.wait(2);
  });`;
}
