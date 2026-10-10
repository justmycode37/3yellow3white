/** A sandbox-authored, silent cutaway engine study. No external renderer/assets. */
export const engineProof = {
  id: 'engine',
  title: 'Motion inside the machine',
  kicker: 'Single-cylinder engine · kinematic cutaway',
  description: 'A sectioned cylinder reveals the piston, connecting rod and crank. Two slow four-stroke cycles expose how rotation and reciprocation remain coupled.',
  notes: [
    'Blue housing, silver piston, gold connecting rod, teal crank and flywheel. Drag the geometry to inspect the assembly.',
    'One crank angle drives all joints. The rod is a rigid 2.8-unit body with a 0.9-unit crank radius; nested pivots preserve its length throughout playback.',
    'Valve lift is an idealized four-stroke timing profile. Dimensions, port geometry, lubrication and combustion are illustrative, not a manufactured engine or thermodynamic simulation.',
    'The front half of the cylinder and crankcase is intentionally removed. Smooth sampled kinematics approximate the piston guide to less than 0.001 scene unit between keyframes.',
  ],
  sampleTimes: [0, 2.75, 3.5, 5, 7.25, 9.5, 12.5, 16],
  source: `export default scene({mode:'3d',orbit:false,end:'hold',background:'BLACK'},s=>{
  const PI=Math.PI, R=.9, L=2.8;
  s.view('engine-model',{rect:[.04,.025,.92,.95],orbit:true,orbitHitTest:'geometry',
    camera:{height:8.7,distance:15,yaw:.42,pitch:-.18,target:[0,1.65,0],perspective:.65}},v=>{
    function cyl(id,r,h,p,color,axisZ=false){return v.cylinder(id,{radius:r,height:h,radialSegments:40,position:p,rotation:axisZ?[PI/2,0,0]:[0,0,0],fill:color,stroke:'none'});}
    function box(id,w,h,d,p,color){return v.box(id,{width:w,height:h,depth:d,position:p,fill:color,stroke:'none'});}
    function ring(id,r,t,p,color,axisZ=false){return v.torus(id,{radius:r,tubeRadius:t,radialSegments:48,tubularSegments:8,position:p,rotation:axisZ?[PI/2,0,0]:[0,0,0],fill:color,stroke:'none'});}
    // A solid annular sector with explicit inner/outer faces and cut faces.
    function shell(id,ri,ro,y0,y1,a0,a1,color){
      const vertices=[],triangles=[],N=48;
      for(let i=0;i<=N;i++){const a=a0+(a1-a0)*i/N,c=Math.cos(a),q=Math.sin(a);
        vertices.push([ri*c,y0,ri*q],[ro*c,y0,ro*q],[ri*c,y1,ri*q],[ro*c,y1,ro*q]);}
      function quad(a,b,c,d){triangles.push([a,b,c],[a,c,d]);}
      for(let i=0;i<N;i++){const k=i*4,j=k+4;quad(k,j,j+2,k+2);quad(k+1,k+3,j+3,j+1);quad(k,k+1,j+1,j);quad(k+2,j+2,j+3,k+3);}
      quad(0,2,3,1);const k=N*4;quad(k,k+1,k+3,k+2);
      return v.mesh(id,{vertices,triangles,fill:color,shading:'flat',stroke:'none'});
    }
    box('mounting-bed',4.2,.26,2.5,[0,-1.75,-.25],'GREY_D');
    for(const x of [-1.63,1.63]){
      box('foot-'+x,.65,.24,1.85,[x,-1.51,-.25],'BLUE_D');
      box('case-leg-'+x,.28,1.33,.62,[x,-.78,-.7],'BLUE_D');
      for(const z of [-.85,.32])cyl('foot-bolt-'+x+'-'+z,.10,.13,[x,-1.32,z],'GREY_B');
    }
    // Rear case preserves the silhouette while the open front reveals the crank.
    const caseBack=shell('case-half',1.25,1.43,-.35,.35,PI,2*PI,'BLUE_D');
    s.play(caseBack.rotateTo([PI/2,0,0]),{duration:0});
    box('left-cylinder-support',.35,2.45,.65,[-1.11,1.95,-.52],'BLUE_D');
    box('right-cylinder-support',.35,2.45,.65,[1.11,1.95,-.52],'BLUE_D');
    shell('sectioned-cylinder',.905,1.08,1.75,4.65,PI,2*PI,'BLUE_C');
    // Narrow ribs are physical cooling fins, not a dense wireframe.
    for(let i=0;i<9;i++)shell('cooling-fin-'+i,1.065,1.20,2.04+i*.275,2.10+i*.275,PI,2*PI,'BLUE_D');
    box('head-back',2.48,.25,.80,[0,4.77,-.68],'BLUE_C');
    for(const x of [-1.07,1.07]){
      box('head-side-'+x,.28,.27,1.66,[x,4.77,0],'BLUE_C');
      for(const z of [-.65,.55])cyl('head-bolt-'+x+'-'+z,.105,.16,[x,4.98,z],'GREY_A');
      cyl('tie-rod-'+x,.055,2.64,[x,3.30,-.45],'GREY_B');
    }
    // Rear main bearing and shaft remain fixed to the housing.
    cyl('main-bearing',.44,.32,[0,0,-.73],'GREY_B',true);
    ring('bearing-lip',.39,.045,[0,0,-.53],'GREY_A',true);
    cyl('shaft-front',.17,.84,[0,0,.31],'GREY_B',true);
    cyl('shaft-rear',.18,1.15,[0,0,-1.0],'GREY_B',true);
    const crankParts=[];
    crankParts.push(cyl('crank-hub',.31,.43,[0,0,0],'TEAL_D',true));
    crankParts.push(box('crank-web',.48,1.05,.24,[0,.42,-.08],'TEAL_C'));
    crankParts.push(cyl('crank-pin',.21,.55,[0,R,.11],'GREY_A',true));
    // Counterweight is a broad sector, in the plane of crank rotation.
    const cw=shell('counterweight',.32,1.12,-.17,.17,PI*.13,PI*.87,'TEAL_D');
    s.play(cw.rotateTo([PI/2,0,0]),{duration:0});
    crankParts.push(cw);
    crankParts.push(ring('flywheel-rim',1.43,.16,[0,0,-1.16],'TEAL_C',true));
    crankParts.push(cyl('flywheel-hub',.32,.33,[0,0,-1.16],'TEAL_D',true));
    for(let i=0;i<6;i++){
      const a=2*PI*i/6;
      const spoke=box('flywheel-spoke-'+i,.15,1.18,.18,[-.78*Math.sin(a),.78*Math.cos(a),-1.16],'TEAL_D');
      s.play(spoke.rotateTo([0,0,a]),{duration:0});crankParts.push(spoke);
    }
    // Piston components are local to the wrist-pin pivot.
    const pistonParts=[
      cyl('piston-crown',.845,.45,[0,.36,0],'GREY_A'),
      shell('piston-skirt',.73,.84,-.40,.16,PI,2*PI,'GREY_B'),
      cyl('wrist-pin',.14,1.65,[0,0,0],'GREY_A',true),
    ];
    for(let i=0;i<3;i++)pistonParts.push(ring('piston-ring-'+i,.842,.026,[0,.18+i*.135,0],'GREY_D'));
    for(const x of [-.53,.53])pistonParts.push(box('pin-boss-'+x,.23,.40,.52,[x,-.05,-.12],'GREY_B'));
    const piston=v.group('piston',pistonParts,{position:[0,L,0]});
    // A rigid I-section rod: silver bores and a recessed dark central web.
    const rodParts=[
      box('rod-web',.24,L-.36,.14,[0,L/2,.10],'GOLD_D'),
      box('rod-flange-left',.08,L-.42,.25,[-.15,L/2,.10],'GOLD'),
      box('rod-flange-right',.08,L-.42,.25,[.15,L/2,.10],'GOLD'),
      ring('big-end',.29,.095,[0,0,.10],'GOLD',true),
      ring('small-end',.17,.065,[0,L,.10],'GOLD',true),
      cyl('big-end-bearing',.195,.10,[0,0,.30],'GREY_B',true),
      cyl('pin-end',.115,.08,[0,L,.36],'GREY_B',true),piston,
    ];
    for(const x of [-.25,.25])rodParts.push(cyl('rod-cap-bolt-'+x,.052,.12,[x,-.11,.29],'GREY_A',true));
    const rod=v.group('connecting-rod',rodParts,{position:[0,R,0]});
    crankParts.push(rod);
    const crank=v.group('crank-assembly',crankParts);
    // Intake/exhaust poppet valves. Lift is illustrative, phase-locked at half crank frequency.
    const valves=[];
    for(let i=0;i<2;i++){
      const x=i===0?-.48:.48,color=i===0?'BLUE_A':'RED_C';
      const parts=[cyl('valve-head-'+i,.27,.075,[x,4.60,.06],color),
        cyl('valve-stem-'+i,.055,.92,[x,5.06,.06],'GREY_A'),
        cyl('valve-retainer-'+i,.17,.065,[x,5.40,.06],'GREY_B')];
      valves.push(v.group('valve-'+i,parts));
      cyl('valve-guide-'+i,.105,.20,[x,5.0,.06],'GREY_D');
      // Port sections remain behind their valve and do not obscure the piston.
      v.tube('port-'+i,{points:[[x,4.61,-.22],[x,4.7,-.62],[x+(i===0?-.72:.72),4.89,-.87]],radius:.17,radialSegments:16,fill:color});
    }
    // Spark plug: the electrical/thermal process is deliberately not simulated.
    cyl('plug-ceramic',.095,.45,[0,5.03,-.25],'WHITE');
    cyl('plug-hex',.13,.11,[0,4.86,-.25],'GREY_B');
    cyl('plug-electrode',.035,.22,[0,4.65,-.25],'GREY_A');
    s.wait(2);
    // 120 angular samples per revolution. Hierarchy preserves all rigid rod distances
    // even during interpolation; the guide's tiny lateral deviation is bounded in notes.
    for(let i=1;i<=480;i++){
      const theta=i*2*PI/120,alpha=Math.asin(R*Math.sin(theta)/L),phase=theta%(4*PI);
      const intake=phase<PI?.19*Math.pow(Math.sin(phase),2):0;
      const exhaust=phase>3*PI?.19*Math.pow(Math.sin(phase-3*PI),2):0;
      s.play([crank.rotateTo([0,0,-theta]),rod.rotateTo([0,0,theta+alpha]),
        piston.rotateTo([0,0,-alpha]),valves[0].moveTo([0,-intake,0]),valves[1].moveTo([0,-exhaust,0])],
        {duration:.025,ease:'linear'});
    }
    s.wait(2);
  });
});`,
};
