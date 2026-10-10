const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-interference\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const play = (actions, duration) => { s.play(actions, { duration, ease: 'linear' }); cursor += duration; };
  s.play(s.camera.to2D({ height: 8.8, target: [0,0,0] }), { duration: 0 });
  // Equal-amplitude idealization: u/2 = cos(k(r1-r2)/2) cos(k(r1+r2)/2 - omega*t).
  const a = 1.5, wavelength = 1.6;
  const k = 2*Math.PI/wavelength, period = D*0.3, omega = 2*Math.PI/period;
  const xmax = 4.8, ymax = 2.6;
  const nx = 80, ny = 44, phases = 16, levels = 4;
  const buckets = Array.from({ length: phases*levels }, () => ({ vertices: [], triangles: [] }));
  const dx = 2*xmax/nx, dy = 2*ymax/ny;
  for (let j=0; j<ny; j++) for (let i=0; i<nx; i++) {
    const x = -xmax+(i+0.5)*dx, y = -ymax+(j+0.5)*dy;
    const r1 = Math.hypot(x+a,y), r2 = Math.hypot(x-a,y);
    const envelope = Math.cos(k*(r1-r2)/2);
    if (Math.abs(envelope)<0.035) continue;
    const phase = k*(r1+r2)/2+(envelope<0 ? Math.PI : 0);
    const p = ((Math.round(phase*phases/(2*Math.PI))%phases)+phases)%phases;
    const level = Math.min(levels-1,Math.floor(Math.abs(envelope)*levels));
    const b = buckets[p*levels+level], n = b.vertices.length;
    b.vertices.push([x-dx/2,y-dy/2,0],[x+dx/2,y-dy/2,0],[x+dx/2,y+dy/2,0],[x-dx/2,y+dy/2,0]);
    b.triangles.push([n,n+1,n+2],[n,n+2,n+3]);
  }
  // Sampled scalar field: amplitude bins are static children of shared phase
  // groups. Both signs use the same clock; zero amplitude remains black.
  const layers = [], parts = [];
  for (let p=0; p<phases; p++) for (const sign of [1,-1]) {
    const children = [];
    for (let level=0; level<levels; level++) {
      const b = buckets[p*levels+level];
      if (!b.vertices.length) continue;
      children.push(s.mesh(`field-${p}-${level}-${sign}`,{
        vertices:b.vertices,triangles:b.triangles,shading:'unlit',
        fill:sign===1 ? Color.BLUE : Color.PURPLE,stroke:Color.NONE,
        opacity:0.88*(level+0.5)/levels
      }));
    }
    const phase = 2*Math.PI*p/phases;
    const opacityAt = t => Math.max(0,sign*Math.cos(phase-omega*t));
    const mesh = s.group(`phase-${p}-${sign}`,children,{opacity:opacityAt(0)});
    layers.push({mesh,opacityAt}); parts.push(mesh);
  }
  const field = s.group('superposed-field',parts,{opacity:0});
  const sources = [];
  for (let index=0; index<2; index++) {
    const x = index===0 ? -a : a;
    s.circle(`source-${index+1}-backing`,{position:[x,0,0.1],radius:0.23,fill:Color.BLACK,stroke:Color.NONE});
    const ring = s.circle(`source-${index+1}-oscillator`,{position:[x,0,0.2],radius:0.17,fill:Color.NONE,stroke:Color.WHITE,strokeWidth:0.025});
    const point = s.circle(`source-${index+1}`,{position:[x,0,0.3],radius:0.065,fill:Color.WHITE,stroke:Color.NONE});
    const label = s.latex(`source-${index+1}-label`,{tex:`S_${index+1}`,fontSize:0.25,fill:Color.WHITE});
    s.attach(label,point,{offset:[0,-0.39,0.1]});
    sources.push(ring);
  }
  s.text('model-note',{text:'Equal-amplitude model',position:[-2.65,3.1],fontSize:0.25,fill:Color.GREY_A});
  const nodeLabel = s.text('node-label',{text:'Fixed nodes',position:[2.75,3.1],fontSize:0.28,fill:Color.YELLOW,opacity:0});
  s.latex('shared-wave-formula',{
    tex:String.raw`u=\cos(kr_1-\omega t)+\cos(kr_2-\omega t)`,
    position:[0,-3.16],fontSize:0.31,fill:Color.WHITE
  });
  const nodes = [];
  for (let m=0; (m+0.5)*wavelength<2*a; m++) {
    const h = (m+0.5)*wavelength/2, b = Math.sqrt(a*a-h*h);
    for (const sign of [-1,1]) {
      const points = [];
      for (let j=0; j<=80; j++) {
        const y = -ymax+2*ymax*j/80;
        points.push([sign*h*Math.sqrt(1+y*y/(b*b)),y,0.08]);
      }
      nodes.push(s.path(`node-${m}-${sign}`,{points,stroke:Color.YELLOW,strokeWidth:0.014,fill:Color.NONE,opacity:0}));
    }
  }
  const ly = 2.52, lh = 1.5*wavelength/2;
  const lx = lh*Math.sqrt(1+ly*ly/(a*a-lh*lh));
  const leader = s.line('node-leader',{points:[[2.75,2.9,0.1],[lx,ly,0.1]],stroke:Color.YELLOW,strokeWidth:0.014,opacity:0});
  // Reveal stationary cancellation after one cycle, continue through two more,
  // and retain the final field for a short frozen inspection.
  const motionEnd = D*0.9, steps = 36;
  for (let step=1; step<=steps; step++) {
    const t = motionEnd*step/steps;
    const actions = layers.map(({mesh,opacityAt}) => mesh.animate({opacity:opacityAt(t)}));
    for (const ring of sources) actions.push(ring.scaleTo(0.76+0.24*Math.cos(omega*t)));
    if (step===1) actions.push(field.fadeIn());
    if (step===13) {
      for (const node of nodes) actions.push(node.fadeIn());
      actions.push(nodeLabel.fadeIn(),leader.fadeIn());
    }
    play(actions,t-cursor);
  }
  s.wait(D-cursor);
});