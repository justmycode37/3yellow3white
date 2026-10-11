// Schematic transcription active site. Coordinates are illustrative, not atomistic.
// XY holds the separated strands; Z gives the chamber, rods and backbone depth.
export default scene({ mode: '3d', orbit: false, end: 'hold', background: Color.PURPLE_E }, s => {
  const PI = Math.PI;
  const satin = { roughness: 0.68, specular: 0.28, metalness: 0.08 };
  const backboneFinish = {
    fill: Color.BLUE_E,
    texture: { pattern: 'noise', color: Color.GREY_D, scale: 1.9, seed: 12, bumpStrength: 0.001 },
    material: { roughness: 0.62, specular: 0.32 },
  };
  const colors = { A: Color.GREEN, T: Color.RED, C: Color.BLUE_A, G: Color.YELLOW_D, U: Color.ORANGE };
  const complement = { A: 'U', T: 'A', C: 'G', G: 'C' };
  s.play(s.camera.to3D({ yaw: 0.13, pitch: 0.20, height: 8.4, distance: 24, target: [0, 0, 0] }), { duration: 0 });

  // Broad, very low frequency palette variation behind the cutaway chamber.
  s.mesh('violet-depth', {
    vertices: [[-40,-30,-7],[40,-30,-7],[40,30,-7],[-40,30,-7]],
    triangles: [[0,1,2],[0,2,3]], shading: 'unlit', fill: Color.PURPLE_D,
    texture: { pattern: 'noise', color: Color.PURPLE_E, scale: 0.105, seed: 29 },
  });
  s.mesh('blue-depth-wash', {
    vertices: [[-40,-30,-6.95],[40,-30,-6.95],[40,30,-6.95],[-40,30,-6.95]],
    triangles: [[0,1,2],[0,2,3]], shading: 'unlit', fill: { color: Color.PURE_BLUE, opacity: 0.14 },
  });
  // Thin, nested translucent palette layers make a broad soft illumination pool.
  // No bitmap backgrounds or unsupported custom colors are required.
  for(let i=0;i<22;i++) s.circle('soft-depth-layer-'+i, {
    position:[-3.2,2.8,-6.80+i*0.001], radius:2.4+i*0.43,
    fill:{color:Color.PURPLE_A,opacity:0.012},stroke:Color.NONE,
  });

  // One continuous closed surface: asymmetric lobes belong to the same shell.
  // The central opening is an authored cutaway, revealing the template and RNA.
  s.parametricSurface('polymerase-continuous-envelope', {
    uRange: [0, 2*PI], vRange: [0, 2*PI], closedU: true, closedV: true,
    uSegments: 112, vSegments: 48,
    fn: (u,v) => {
      const lobe = 0.30*Math.sin(3*u+0.8) + 0.20*Math.cos(5*u-0.3) + 0.10*Math.sin(9*u);
      const tube = 2.12 + 0.26*Math.sin(4*u+0.5) + 0.12*Math.cos(7*u);
      const ripple = 0.09*Math.sin(5*u+3*v) + 0.06*Math.cos(8*u-2*v);
      return [
        (8.25 + lobe + (tube+ripple)*Math.cos(v))*Math.cos(u),
        (4.86 + lobe*0.7 + (tube+ripple)*Math.cos(v))*Math.sin(u),
        -1.7 + 0.30*Math.sin(3*u-0.4) + (2.05+0.25*Math.cos(3*u))*Math.sin(v),
      ];
    },
    fill: Color.GOLD_E,
    texture: { pattern: 'noise', color: Color.GOLD_D, scale: 2.8, seed: 41, bumpStrength: 0.003 },
    material: { roughness: 0.76, specular: 0.20, metalness: 0.06 },
  });

  const sample = (fn,a,b,n) => Array.from({ length:n+1 }, (_,i) => fn(a+(b-a)*i/n));
  const bubble = x => Math.exp(-Math.pow(x/5.7, 6));
  const template = x => [x, -0.70 - 1.03*bubble(x) + 0.12*Math.sin(0.63*x), 0.32 + 0.33*Math.sin(0.49*x)];
  const displaced = x => [x, 0.70 + 1.30*bubble(x) + 0.10*Math.sin(0.58*x+0.5), -0.28 - 0.34*Math.sin(0.49*x)];
  s.tube('template-backbone', { points: sample(template,-10.5,10.5,150), radius: 0.22, radialSegments: 16, ...backboneFinish });
  s.tube('displaced-backbone', { points: sample(displaced,-10.5,10.5,150), radius: 0.22, radialSegments: 16, ...backboneFinish });

  function rod(id, a, b, base, radius=0.145) {
    return s.tube(id, { points:[a,b], radius, radialSegments:16, capped:true, fill: colors[base], material:satin });
  }
  const bases = ['G','A','C','T','G','A','C','A','G','T','C','G','A','T','G','C','A'];
  const dx=0.95;
  for(let i=0;i<bases.length;i++) {
    const x=-7.6+i*dx;
    const a=template(x), b=displaced(x);
    const length=0.76;
    rod('template-base-'+i, a, [a[0],a[1]+length,a[2]],bases[i]);
    const dnaComplement={A:'T',T:'A',G:'C',C:'G'}[bases[i]];
    rod('displaced-base-'+i,b,[b[0],b[1]-length,b[2]],dnaComplement);
  }

  // RNA fragments are rigid covalent units. The already synthesized backbone
  // never deforms; each new stub arrives at its final adjoining position.
  const rnaPoint=x => {const t=template(x);return [x,t[1]+1.65,t[2]];};
  s.tube('existing-RNA-backbone', { points:sample(rnaPoint,-5.25,-1.425,44), radius:0.17, radialSegments:16, ...backboneFinish });
  for(let i=3;i<=6;i++) {
    const x=-7.6+i*dx, p=rnaPoint(x);
    rod('existing-RNA-base-'+i,p,[p[0],p[1]-0.76,p[2]],complement[bases[i]]);
  }
  // The RNA exit bends gently into the depth of the enzyme, with no loose ends
  // between the pre-existing covalent backbone and its active-site segment.
  const exitEnd=rnaPoint(-5.25);
  s.tube('RNA-exit', {
    points:sample(t=>[-5.25-3.8*t,exitEnd[1]+0.55*t+1.4*t*t,exitEnd[2]-1.8*t*t],0,1,40),
    radius:0.17,radialSegments:16,...backboneFinish,
  });

  function nucleotide(index, start, rotation) {
    const x=-7.6+index*dx, target=rnaPoint(x), base=complement[bases[index]];
    const stem=rod('incoming-'+base+'-'+index,[0,0,0],[0,-0.76,0],base);
    const stub=s.tube('incoming-covalent-stub-'+index, {
      points:sample(q=>{const p=rnaPoint(x+q);return [q,p[1]-target[1],p[2]-target[2]];},-dx/2,dx/2,10),
      radius:0.17,radialSegments:16,...backboneFinish,
    });
    const label=s.text('incoming-base-letter-'+index, {
      text:base, position:[0,-0.40,0], billboard:true, billboardOffset:[0,0,0.20],
      fontSize:0.24, fill:Color.GREY_E,
    });
    const unit=s.group('incoming-nucleotide-'+index,[stem,stub,label]);
    s.play([unit.moveTo(start),unit.rotateTo(rotation)],{duration:0});
    return {unit,target,index};
  }
  // Only the three selected template bases and their incoming partners are named.
  for(const i of [7,8,9]) {
    const p=template(-7.6+i*dx);
    s.text('template-letter-'+i, { text:bases[i], position:[p[0],p[1]+0.42,p[2]],
      billboard:true,billboardOffset:[0,0,0.20],fontSize:0.24,fill:Color.GREY_E });
  }
  s.wait(0.55);
  const events=[
    {i:7,start:[-0.1,1.02,2.0],rot:[0.25,0.10,-0.5]},
    {i:8,start:[1.35,1.0,2.25],rot:[-0.18,0.18,0.40]},
    {i:9,start:[2.9,0.9,2.0],rot:[0.20,-0.14,-0.35]},
  ];
  for(const e of events) {
    const n=nucleotide(e.i,e.start,e.rot);
    s.play(n.unit.fadeIn(),{duration:0.20});
    const staging=[n.target[0]+0.22,n.target[1]+0.48,n.target[2]+0.70];
    s.play([n.unit.moveTo(staging),n.unit.rotateTo([0,0,-0.09])],{duration:0.85,ease:'smooth'});
    s.play([n.unit.moveTo(n.target),n.unit.rotateTo([0,0,0])],{duration:0.55,ease:'smooth'});
    s.wait(0.55);
  }
  s.wait(1.0);
});
