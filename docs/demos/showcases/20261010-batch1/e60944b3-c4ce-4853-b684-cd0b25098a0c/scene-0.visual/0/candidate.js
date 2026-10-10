const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-voxel\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '3d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  // Idealized, original voxel construction; coordinates are scene units, not measurements.
  const D = __narration.durationSec;
  let cursor = 0;
  function holdTo(t) { if (t > cursor) s.wait(t - cursor); cursor = t; }
  const rad = d => d * Math.PI / 180;
  const pivot = [-1.2, 1.75, 0];
  const L1 = 2.8, L2 = 2.3;
  const initial = [60, -45, 0], contact = [38, -54, 0], curled = [38, -54, 65], raised = [70, -40, 48];
  function turn(p, a) { const c = Math.cos(rad(a)), q = Math.sin(rad(a)); return [c*p[0]-q*p[1], q*p[0]+c*p[1], p[2] || 0]; }
  function plus(a,b) { return a.map((x,i) => x+b[i]); }
  function frames(q) { const elbow = plus(pivot, turn([L1,0,0],q[0])); return { elbow, wrist: plus(elbow,turn([L2,0,0],q[1])) }; }
  let boom, stick, bucket, load, stationarySoil = [], cylinders = [];
  s.view('worksite', { rect: [0,0.025,1,0.92], orbit: true, orbitHitTest: 'geometry', camera: { yaw: 0.48, pitch: 0.29, target: [0.45,2.0,0], height: 8.15, distance: 18, perspective: 0.35 } }, v => {
    const steel = { roughness: 0.72, metalness: 0.75 };
    const paint = { roughness: 0.72, metalness: 0.28, specular: 0.22 };
    function block(id, p, size, color, finish = 'paint') {
      return v.box(id, { position:p, width:size[0], height:size[1], depth:size[2], fill:color,
        texture: finish === 'soil' ? { pattern:'noise', color:Color.DARK_BROWN, scale:7, seed:31, bumpStrength:0.002 } : { pattern:'noise', color:color, scale:9, seed:11, bumpStrength:0.001 },
        material: finish === 'soil' ? {roughness:0.96,specular:0.05} : finish === 'steel' ? steel : paint });
    }
    // A finite, block-built patch leaves the rest of the canvas open and black.
    for (let i=0;i<19;i++) for(let j=0;j<9;j++) {
      block('ground-'+i+'-'+j, [-4.25+i*0.5,-0.16,-2+j*0.5], [0.498,0.32,0.498], (i+j)%4===0 ? Color.LIGHT_BROWN : Color.DARK_BROWN, 'soil');
    }
    for(let i=0;i<8;i++) for(let j=0;j<5;j++) {
      const layers = i===7 || j===0 || j===4 ? 2 : 3;
      for(let k=0;k<layers;k++) block('bank-'+i+'-'+j+'-'+k, [2.35+i*0.32,0.16+k*0.32,-0.64+j*0.32], [0.316,0.316,0.316], (i+2*j+k)%3===0 ? Color.LIGHT_BROWN : Color.DARK_BROWN, 'soil');
    }
    const chassis=[];
    chassis.push(block('undercarriage',[-2,0.67,0],[2.72,0.4,1.65],Color.GREY_D,'steel'));
    // Two stationary continuous tread loops, each with independent cleats and faceted road wheels.
    [-1,1].forEach(side => {
      const z=side*0.96, tag=side<0?'far':'near';
      chassis.push(block(tag+'-track-core',[-2,0.45,z],[2.6,0.48,0.43],Color.GREY_E,'steel'));
      [-1.25,-0.63,0,0.63,1.25].forEach((dx,k) => {
        chassis.push(v.cylinder(tag+'-wheel-'+k,{position:[-2+dx,0.45,z],radius:k===0||k===4?0.32:0.27,height:0.46,radialSegments:8,rotation:[Math.PI/2,0,0],fill:Color.GREY_C,shading:'flat',material:steel}));
        chassis.push(block(tag+'-hub-'+k,[-2+dx,0.45,z+side*0.25],[0.17,0.17,0.045],Color.GREY_A,'steel'));
      });
      let n=0;
      function shoe(x,y,a) {
        const p=block(tag+'-shoe-'+n,[x,y,z],[0.2,0.115,0.58],Color.GREY_C,'steel');
        const rib=block(tag+'-cleat-'+n,[0,0.077,0],[0.065,0.06,0.6],Color.GREY_B,'steel');
        // The cleat and shoe share a tangent frame.
        const body=block(tag+'-shoe-body-'+n,[0,0,0],[0.2,0.115,0.58],Color.GREY_C,'steel');
        v.remove(p);
        chassis.push(v.group(tag+'-tread-'+n,[body,rib],{position:[x,y,z],rotation:[0,0,a]})); n++;
      }
      for(let k=0;k<12;k++) {
        const x=-3.25+(k+0.5)*2.5/12;
        shoe(x,0.83,0); shoe(x,0.07,Math.PI);
      }
      for(let k=0;k<6;k++) {
        const a=-Math.PI/2+(k+0.5)*Math.PI/6;
        shoe(-0.75+0.38*Math.cos(a),0.45+0.38*Math.sin(a),a-Math.PI/2);
        const b=Math.PI/2+(k+0.5)*Math.PI/6;
        shoe(-3.25+0.38*Math.cos(b),0.45+0.38*Math.sin(b),b-Math.PI/2);
      }
    });
    chassis.push(v.cylinder('slew-bearing',{position:[-2,1.0,0],radius:0.68,height:0.24,radialSegments:12,fill:Color.GREY_B,shading:'flat',material:steel}));
    chassis.push(block('upper-deck',[-2,1.22,0],[2.72,0.3,1.7],Color.GOLD));
    chassis.push(block('counterweight',[-3.1,1.65,-0.08],[0.78,0.68,1.7],Color.GOLD_E));
    chassis.push(block('counterweight-cap',[-3.08,2.02,-0.08],[0.7,0.12,1.64],Color.GOLD));
    chassis.push(block('engine-hood',[-2.22,1.66,-0.57],[1.12,0.57,0.7],Color.GOLD));
    for(let i=0;i<7;i++) chassis.push(block('engine-louver-'+i,[-2.66+i*0.135,1.73,-0.93],[0.055,0.31,0.045],Color.GREY_E,'steel'));
    chassis.push(block('exhaust',[-2.76,2.16,-0.52],[0.12,0.53,0.12],Color.GREY_D,'steel'));
    chassis.push(block('exhaust-cap',[-2.72,2.44,-0.52],[0.2,0.06,0.15],Color.GREY_C,'steel'));
    // Cab: opaque blue glazing, thick square posts, roof, door and access steps.
    chassis.push(block('cab-base',[-2.03,1.5,0.59],[1.35,0.23,1.02],Color.GOLD));
    chassis.push(block('cab-glazing',[-2.03,2.2,0.59],[1.18,1.17,0.88],Color.BLUE_E,'steel'));
    chassis.push(block('cab-near-window',[-2.02,2.26,1.042],[1.04,0.9,0.03],Color.BLUE_D,'steel'));
    chassis.push(block('cab-windscreen',[-1.428,2.28,0.59],[0.025,0.93,0.73],Color.BLUE_C,'steel'));
    for(const x of [-2.67,-1.39]) for(const z of [0.08,1.1]) chassis.push(block('cab-post-'+x+'-'+z,[x,2.22,z],[0.10,1.35,0.10],Color.GREY_D,'steel'));
    chassis.push(block('cab-roof',[-2.03,2.92,0.59],[1.48,0.18,1.2],Color.GOLD));
    chassis.push(block('door-divider',[-2.11,2.19,1.11],[0.065,1.22,0.05],Color.GREY_D,'steel'));
    chassis.push(block('door-handle',[-1.92,1.91,1.155],[0.21,0.055,0.06],Color.GREY_A,'steel'));
    chassis.push(block('cab-sill',[-2.03,1.7,1.1],[1.35,0.12,0.1],Color.GOLD));
    chassis.push(block('step-upper',[-1.6,1.25,1.22],[0.65,0.09,0.34],Color.GREY_C,'steel'));
    chassis.push(block('step-lower',[-1.6,1.03,1.27],[0.65,0.09,0.38],Color.GREY_C,'steel'));
    chassis.push(block('work-lamp',[-1.31,2.86,0.96],[0.13,0.14,0.21],Color.GREY_A,'steel'));
    chassis.push(block('boom-pedestal',[-1.2,1.52,0],[0.42,0.58,0.64],Color.GOLD_E));
    v.group('planted-machine-body',chassis);
    function eye(id,p) { return block(id,p,[0.19,0.19,0.19],Color.GREY_B,'steel'); }
    function hub(id,x) {
      return [block(id+'-cheek',[x,0,0],[0.42,0.42,0.61],Color.GOLD_E),block(id+'-pin',[x,0,0],[0.19,0.19,0.71],Color.GREY_A,'steel')];
    }
    function beam(id,length) {
      const a=[]; const count=Math.ceil(length/0.23);
      for(let i=0;i<count;i++) {
        const x=(i+0.5)*length/count, h=0.46-0.17*i/count;
        for(const z of [-0.19,0.19]) a.push(block(id+'-plate-'+i+'-'+z,[x,0,z],[length/count+0.008,h,0.17],Color.GOLD));
        if(i%3===0) a.push(block(id+'-web-'+i,[x,0,0],[0.12,h*0.8,0.3],Color.GOLD_E));
      }
      a.push(...hub(id+'-root',0),...hub(id+'-end',length)); return a;
    }
    const bucketParts=[];
    bucketParts.push(block('bucket-floor',[0.5,-0.7,0],[1.16,0.13,1.04],Color.GREY_C,'steel'));
    bucketParts.push(block('bucket-back',[-0.05,-0.39,0],[0.16,0.6,1.04],Color.GREY_D,'steel'));
    [0.1,0.36,0.62,0.88].forEach((x,i) => {
      const h=[0.68,0.55,0.41,0.26][i];
      for(const z of [-0.53,0.53]) bucketParts.push(block('bucket-cheek-'+i+'-'+z,[x,-0.635+h/2,z],[0.27,h,0.13],Color.GREY_C,'steel'));
    });
    for(let i=0;i<5;i++) bucketParts.push(block('bucket-tooth-'+i,[1.16,-0.69,-0.4+i*0.2],[0.39,0.14,0.13],Color.GREY_A,'steel'));
    bucketParts.push(block('bucket-lug',[-0.07,0.07,0],[0.24,0.48,0.56],Color.GREY_C,'steel'));
    bucketParts.push(block('bucket-pin',[0,0,0],[0.18,0.18,0.72],Color.GREY_A,'steel'));
    const bucketEye=eye('bucket-actuator-eye',[-0.12,0.3,0.39]); bucketParts.push(bucketEye);
    const cargo=[];
    const cw=frames(contact).wrist;
    for(let i=0;i<3;i++) for(let j=0;j<2;j++) {
      const p=[0.24+0.32*i,-0.49,-0.21+0.42*j];
      const id=i+'-'+j;
      stationarySoil.push(block('cut-soil-'+id,plus(cw,p),[0.30,0.28,0.37],Color.LIGHT_BROWN,'soil'));
      cargo.push(block('bucket-soil-'+id,p,[0.30,0.28,0.37],Color.LIGHT_BROWN,'soil'));
    }
    load=v.group('retained-bucket-load',cargo,{opacity:0}); bucketParts.push(load);
    bucket=v.group('bucket-joint',bucketParts,{position:[L2,0,0],rotation:[0,0,rad(initial[2]-initial[1])]});
    const stickParts=beam('stick',L2);
    const stickEye=eye('stick-cylinder-eye',[0.60,0.15,0.39]);
    const bucketBase=eye('bucket-cylinder-base',[1.25,0.22,0.39]);
    stickParts.push(stickEye,bucketBase,bucket);
    stick=v.group('stick-joint',stickParts,{position:[L1,0,0],rotation:[0,0,rad(initial[1]-initial[0])]});
    const boomParts=beam('boom',L1);
    const boomEye=eye('boom-cylinder-eye',[1.55,-0.18,0.39]);
    const stickBase=eye('stick-cylinder-base',[1.65,0.25,0.39]);
    boomParts.push(boomEye,stickBase,stick);
    boom=v.group('boom-joint',boomParts,{position:pivot,rotation:[0,0,rad(initial[0])]});
    const boomBase=eye('boom-cylinder-base',[-1.65,1.46,0.39]);
    function hydraulic(id,from,to,length,ends) {
      const ab=ends(initial), a=Math.atan2(ab[1][1]-ab[0][1],ab[1][0]-ab[0][0]);
      const shell=block(id+'-barrel',[length/2,0,0],[length,0.17,0.17],Color.GOLD_E,'steel');
      const collar=block(id+'-collar',[length-0.035,0,0],[0.09,0.215,0.215],Color.GREY_C,'steel');
      const tip=v.sphere(id+'-rod-guide',{position:[length,0,0],radius:0.035,opacity:0});
      const assembly=v.group(id+'-housing',[shell,collar,tip],{position:ab[0],rotation:[0,0,a]});
      v.attach(assembly,from,{offset:[0,0,0]});
      const rod=v.line3D(id+'-piston',{stroke:Color.GREY_A,strokeWidth:0.085});
      v.connect(rod,tip,to);
      cylinders.push({assembly,ends});
    }
    hydraulic('boom-hydraulic',boomBase,boomEye,0.93,q=>[[-1.65,1.46,0.39],plus(pivot,turn([1.55,-0.18,0.39],q[0]))]);
    hydraulic('stick-hydraulic',stickBase,stickEye,0.75,q=>[plus(pivot,turn([1.65,0.25,0.39],q[0])),plus(frames(q).elbow,turn([0.60,0.15,0.39],q[1]))]);
    hydraulic('bucket-hydraulic',bucketBase,bucketEye,0.48,q=>[plus(frames(q).elbow,turn([1.25,0.22,0.39],q[1])),plus(frames(q).wrist,turn([-0.12,0.3,0.39],q[2]))]);
  });
  s.text('model-note',{text:'Idealized voxel model',space:'screen',position:[0,0],viewportOffset:[0,-0.365],fontSize:16,fill:Color.GREY_B});
  // Each authored step changes joint ANGLES, never independent link endpoints.
  // Cylinder housings retain their own length; their polished rods telescope.
  function motion(from,to,finish) {
    const start=cursor, span=finish-start, steps=Math.ceil(span/0.1);
    for(let k=1;k<=steps;k++) {
      const u=k/steps, e=u*u*(3-2*u), q=from.map((x,i)=>x+(to[i]-x)*e);
      const actions=[boom.rotateTo([0,0,rad(q[0])]),stick.rotateTo([0,0,rad(q[1]-q[0])]),bucket.rotateTo([0,0,rad(q[2]-q[1])])];
      for(const c of cylinders) { const p=c.ends(q); actions.push(c.assembly.rotateTo([0,0,Math.atan2(p[1][1]-p[0][1],p[1][0]-p[0][0])])); }
      const next=start+span*k/steps;
      s.play(actions,{duration:next-cursor,ease:'linear'}); cursor=next;
    }
  }
  holdTo(D*0.12);
  motion(initial,contact,D*0.34);
  // Teeth and bucket floor contact the bank BEFORE any earth is removed.
  holdTo(D*0.37);
  // Ownership handoff at the identical world pose: these six clods now ride in the bucket.
  stationarySoil.forEach(x=>s.remove(x));
  s.play(load.fadeIn(),{duration:0});
  motion(contact,curled,D*0.53);
  holdTo(D*0.58);
  motion(curled,raised,D*0.82);
  holdTo(D);
});