const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-crank\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({mode:'3d', orbit:false, background:Color.BLACK, audio:__narration.audioAssetId, end:__narration.endMode}, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const play = (actions, duration, ease='linear') => { s.play(actions,{duration,ease}); cursor += duration; };
  const waitTo = t => { if(t > cursor) { s.wait(t-cursor); cursor=t; } };
  const metal = {metalness:0.85, roughness:0.48, specular:0.4};
  const darkMetal = {metalness:0.7, roughness:0.62};
  const r=1.15, L=4, theta0=Math.PI/3;
  const phi = a => -Math.asin(r*Math.sin(a)/L);
  let crank, rod, piston, labels;
  s.view('mechanism-view', {rect:[0,0,1,1], orbit:true, orbitHitTest:'geometry', camera:{yaw:0.30,pitch:0.25,height:7.6,distance:17,target:[-0.65,0,-0.35]}}, v => {
    const cylinderZ = (id, radius, length, position, fill=Color.GREY_B) => v.cylinder(id,{radius,height:length,radialSegments:32,position,rotation:[Math.PI/2,0,0],fill,material:metal});
    const ringZ = (id, radius, tubeRadius, position, fill=Color.GREY_B) => v.torus(id,{radius,tubeRadius,radialSegments:48,tubularSegments:10,position,rotation:[Math.PI/2,0,0],fill,material:metal});
    // An actual thick, open cylindrical section along X; cut faces are explicit.
    const sleeve = (id,x0,x1,inner,outer,fill,position=[0,0,0.2],a0=0.85*Math.PI,a1=2.05*Math.PI) => {
      const vertices=[],triangles=[],N=48;
      const quad=(a,b,c,d)=>{const k=vertices.length;vertices.push(a,b,c,d);triangles.push([k,k+1,k+2],[k,k+2,k+3]);};
      const p=(x,rho,a)=>[x,rho*Math.cos(a),rho*Math.sin(a)];
      for(let i=0;i<N;i++){
        const a=a0+(a1-a0)*i/N,b=a0+(a1-a0)*(i+1)/N;
        quad(p(x0,outer,a),p(x1,outer,a),p(x1,outer,b),p(x0,outer,b));
        quad(p(x0,inner,b),p(x1,inner,b),p(x1,inner,a),p(x0,inner,a));
        quad(p(x0,inner,a),p(x0,outer,a),p(x0,outer,b),p(x0,inner,b));
        quad(p(x1,inner,b),p(x1,outer,b),p(x1,outer,a),p(x1,inner,a));
      }
      quad(p(x0,inner,a0),p(x1,inner,a0),p(x1,outer,a0),p(x0,outer,a0));
      quad(p(x0,outer,a1),p(x1,outer,a1),p(x1,inner,a1),p(x0,inner,a1));
      return v.mesh(id,{vertices,triangles,shading:'flat',fill,stroke:Color.NONE,position,material:metal});
    };
    const slab = (id, outline, depth, z, fill) => {
      const vertices=[],triangles=[],n=outline.length;
      for(const zz of [z-depth/2,z+depth/2]) for(const p of outline) vertices.push([p[0],p[1],zz]);
      for(let i=1;i<n-1;i++){triangles.push([0,i+1,i],[n,n+i,n+i+1]);}
      for(let i=0;i<n;i++){const j=(i+1)%n;triangles.push([i,j,n+j],[i,n+j,n+i]);}
      return v.mesh(id,{vertices,triangles,shading:'flat',fill,stroke:Color.NONE,material:metal});
    };
    v.box('machine-bed',{width:8.45,height:0.22,depth:3.4,position:[-0.65,-1.78,-0.7],fill:Color.GREY_E,material:darkMetal});
    // Two stationary main bearings support the rotating shaft behind the wheel.
    for(let i=0;i<2;i++){
      const z=-1.65-i*0.65;
      v.box('bearing-foot-'+i,{width:1.22,height:0.18,depth:0.5,position:[-3,-1.56,z],fill:Color.GREY_D,material:darkMetal});
      v.box('bearing-pedestal-'+i,{width:0.75,height:1.28,depth:0.35,position:[-3,-0.88,z],fill:Color.GREY_D,material:darkMetal});
      ringZ('bearing-housing-'+i,0.36,0.17,[-3,0,z],Color.GREY_C);
      for(const dx of [-0.46,0.46]) v.cylinder('bearing-bolt-'+i+'-'+dx,{radius:0.075,height:0.09,radialSegments:6,position:[-3+dx,-1.43,z],fill:Color.GREY_B,material:metal});
    }
    const rotating=[];
    rotating.push(cylinderZ('crankshaft',0.2,2.8,[0,0,-1.0],Color.GREY_B));
    rotating.push(ringZ('flywheel-rim',1.39,0.17,[0,0,-0.95],Color.GREY_C));
    rotating.push(cylinderZ('flywheel-hub',0.34,0.5,[0,0,-0.95],Color.GREY_B));
    for(let j=0;j<6;j++){
      const a=j*Math.PI/3;
      rotating.push(v.box('flywheel-spoke-'+j,{width:1.06,height:0.16,depth:0.16,position:[0.8*Math.cos(a),0.8*Math.sin(a),-0.95],rotation:[0,0,a],fill:Color.GREY_C,material:metal}));
    }
    rotating.push(slab('crank-cheek',[[-0.22,-0.27],[r,-0.25],[r+0.25,-0.12],[r+0.25,0.12],[r,0.25],[-0.22,0.27]],0.24,-0.22,Color.BLUE_D));
    const counterOutline=[];
    for(let i=0;i<=24;i++){const a=Math.PI*0.62+Math.PI*0.76*i/24;counterOutline.push([0.88*Math.cos(a),0.88*Math.sin(a)]);}
    counterOutline.push([-0.18,-0.18],[-0.18,0.18]);
    rotating.push(slab('counterweight',counterOutline,0.32,-0.22,Color.BLUE_D));
    const crankpin=cylinderZ('crank-pin',0.17,0.72,[r,0,0.1],Color.GREY_A);
    rotating.push(crankpin,cylinderZ('crank-pin-end',0.21,0.06,[r,0,0.49],Color.GREY_B));
    crank=v.group('crank-assembly',rotating,{position:[-3,0,0],rotation:[0,0,theta0]});
    // Rigid rod: its two eyes and wrist center retain fixed local separation L.
    const rodParts=[];
    rodParts.push(ringZ('rod-big-end',0.25,0.08,[0,0,0.1],Color.GOLD_D));
    rodParts.push(ringZ('rod-small-end',0.20,0.065,[L,0,0.1],Color.GOLD_D));
    rodParts.push(slab('rod-web',[[0.22,-0.13],[L-0.17,-0.085],[L-0.17,0.085],[0.22,0.13]],0.1,0.1,Color.GOLD_E));
    for(const sign of [-1,1]){
      const y0=sign*0.14,y1=sign*0.10;
      rodParts.push(slab('rod-flange-'+sign,[[0.22,y0-0.035],[L-0.17,y1-0.035],[L-0.17,y1+0.035],[0.22,y0+0.035]],0.19,0.1,Color.GOLD_D));
    }
    const wrist=cylinderZ('wrist-pin',0.132,1.35,[L,0,0.1],Color.GREY_A);
    rodParts.push(wrist);
    rod=v.group('connecting-rod',rodParts,{rotation:[0,0,phi(theta0)]});
    v.attach(rod,crankpin,{offset:[0,0,0]});
    const pistonParts=[];
    pistonParts.push(sleeve('piston-skirt',-0.59,0.54,0.66,0.79,Color.GREY_B,[0,0,0]));
    pistonParts.push(v.cylinder('piston-crown',{radius:0.79,height:0.16,radialSegments:48,rotation:[0,0,Math.PI/2],position:[0.61,0,0],fill:Color.GREY_A,material:metal}));
    for(let j=0;j<3;j++) pistonParts.push(sleeve('piston-ring-'+j,0.22+j*0.10,0.255+j*0.10,0.786,0.805,Color.GREY_E,[0,0,0]));
    for(const z of [-0.52,0.52]) pistonParts.push(ringZ('wrist-boss-'+z,0.19,0.06,[0,0,z],Color.GREY_B));
    piston=v.group('piston',pistonParts);
    v.attach(piston,wrist,{offset:[0,0,0]});
    sleeve('cutaway-cylinder',-0.97,3.16,0.835,0.98,Color.BLUE_E);
    for(const x of [-0.97,3.08]) sleeve('cylinder-flange-'+x,x,x+0.13,0.835,1.09,Color.BLUE_D);
    for(const x of [-0.5,2.7]){
      v.box('cylinder-saddle-'+x,{width:0.45,height:0.75,depth:1.25,position:[x,-1.24,0.05],fill:Color.GREY_D,material:darkMetal});
      v.box('saddle-foot-'+x,{width:0.85,height:0.13,depth:1.75,position:[x,-1.6,0.05],fill:Color.GREY_C,material:metal});
    }
    const labelList=[
      v.text('flywheel-label',{text:'Flywheel',position:[-3.8,2.08,-0.95],fontSize:0.25,billboard:true,fill:Color.WHITE}),
      v.text('rod-label',{text:'Connecting rod',position:[-0.75,1.62,0.6],fontSize:0.25,billboard:true,fill:Color.GOLD_C}),
      v.text('piston-label',{text:'Piston',position:[2.15,1.52,0.6],fontSize:0.25,billboard:true,fill:Color.WHITE})
    ];
    labels=v.group('inspection-labels',labelList);
  });
  s.text('model-note',{text:'Idealized cutaway',position:[0,-2.9],fontSize:0.23,fill:Color.GREY_B});
  waitTo(D*0.10);
  play(labels.fadeOut(),D*0.05,'smooth');
  // Sample the exact slider-crank angular solution. The hierarchy, not endpoint
  // tweening, enforces rod length and both pin connections at every frame.
  // 720 angular substeps limit the lateral guide residual below 0.00002 units.
  // At sample poses: x = -3 + r*cos(theta) + sqrt(L*L-r*r*sin(theta)^2).
  const N=720, operationEnd=D*0.85, operationStart=cursor;
  for(let i=1;i<=N;i++){
    const a=theta0+2*Math.PI*i/N;
    const end=operationStart+(operationEnd-operationStart)*i/N;
    play([crank.rotateTo([0,0,a]),rod.rotateTo([0,0,phi(a)])],end-cursor);
  }
  play(labels.fadeIn(),D*0.025,'smooth');
  waitTo(D);
});