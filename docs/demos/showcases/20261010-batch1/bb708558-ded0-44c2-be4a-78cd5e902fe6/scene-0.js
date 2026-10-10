const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-protein\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const waitTo = t => { if (t > cursor) s.wait(t - cursor); cursor = t; };
  const playTo = (t, actions) => { s.play(actions, { duration: t - cursor, ease: 'smooth' }); cursor = t; };
  const add = (a,b) => a.map((x,i)=>x+b[i]);
  const sub = (a,b) => a.map((x,i)=>x-b[i]);
  const mul = (a,k) => a.map(x=>x*k);
  const dot = (a,b) => a.reduce((r,x,i)=>r+x*b[i],0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit = a => mul(a,1/Math.sqrt(dot(a,a)));
  const rad = a => a*Math.PI/180;
  // Ideal peptide internal coordinates, in angstrom-like model units.
  // Solve the repeat twist, rather than drawing an arbitrary helical spring.
  const place = (a,b,c,length,angle,torsion) => {
    const e = unit(sub(c,b));
    const n = unit(cross(sub(b,a),e));
    const m = cross(n,e);
    return add(c,mul(add(mul(e,-Math.cos(rad(angle))),mul(add(mul(m,Math.cos(rad(torsion))),mul(n,Math.sin(rad(torsion)))),Math.sin(rad(angle)))),length));
  };
  const N = [0,0,0], CA = [1.458,0,0];
  const C = add(CA,[1.525*Math.cos(rad(68.8)),1.525*Math.sin(rad(68.8)),0]);
  const frame = (n,a,c) => {
    const x = unit(sub(c,a));
    const y = unit(sub(sub(n,a),mul(x,dot(sub(n,a),x))));
    return [x,y,cross(x,y)];
  };
  const f0 = frame(N,CA,C);
  const repeat = phi => {
    const n = place(N,CA,C,1.329,116.2,-47);
    const a = place(CA,C,n,1.458,121.7,180);
    const c = place(C,n,a,1.525,111.2,phi);
    const f1 = frame(n,a,c);
    const R = [0,1,2].map(i=>[0,1,2].map(j=>f1.reduce((v,e,k)=>v+e[i]*f0[k][j],0)));
    const apply = p => R.map(row=>dot(row,p));
    const theta = Math.acos(Math.max(-1,Math.min(1,(R[0][0]+R[1][1]+R[2][2]-1)/2)));
    return { R, apply, theta, t: sub(a,apply(CA)) };
  };
  let phi = -57;
  for (let k=0;k<8;k++) {
    const r = repeat(phi), derivative = (repeat(phi+0.001).theta-r.theta)/0.001;
    phi -= (r.theta-rad(100))/derivative;
  }
  const step = repeat(phi);
  const R = step.R;
  const axis = unit([R[2][1]-R[1][2],R[0][2]-R[2][0],R[1][0]-R[0][1]]);
  const rise = dot(step.t,axis);
  const transverse = sub(step.t,mul(axis,rise));
  const origin = mul(add(transverse,mul(cross(axis,transverse),1/Math.tan(step.theta/2))),0.5);
  const radial = unit(sub(sub(CA,origin),mul(axis,dot(sub(CA,origin),axis))));
  const zaxis = cross(radial,axis);
  const count = 13;
  const centerY = dot(sub(CA,origin),axis)+(count-1)*rise/2;
  const project = p => { const q = sub(p,origin); return [dot(q,radial),dot(q,axis)-centerY,dot(q,zaxis)]; };
  const prevC = [0,1,2].map(j=>R.reduce((v,row,i)=>v+row[j]*(C[i]-step.t[i]),0));
  const O = place(N,CA,C,1.229,120.8,133);
  const H = add(N,mul(unit(add(unit(sub(prevC,N)),unit(sub(CA,N)))),-1.01));
  const u = unit(sub(N,CA)), w = unit(sub(C,CA));
  const a = (-1/3)/(1+dot(u,w));
  const b = Math.sqrt(1-a*a*dot(add(u,w),add(u,w)));
  const CB = add(CA,mul(add(mul(add(u,w),a),mul(unit(cross(u,w)),b)),1.53));
  const template = { N, CA, C, O, H, CB };
  const coords = [];
  let current = template;
  for (let i=0;i<count;i++) {
    const row = {}; for (const key of Object.keys(current)) row[key]=project(current[key]);
    coords.push(row);
    const next = {}; for (const key of Object.keys(current)) next[key]=add(step.apply(current[key]),step.t);
    current=next;
  }
  let core, assembly, focusBond, secondaryBonds, oxygenLabel, nitrogenLabel, oxygenLeader, nitrogenLeader;
  s.view('helix-view', { rect: [0.04,0.15,0.92,0.68], orbit: true, orbitHitTest: 'geometry', camera: { yaw: 0.12, pitch: 0.08, height: 17.5, distance: 60, perspective: 0 } }, v => {
    const parts = [], atoms = [];
    const colors = { N: Color.BLUE, CA: Color.GREY_B, C: Color.GREY_B, O: Color.RED, H: Color.WHITE, CB: Color.TEAL };
    const radii = { N: 0.28, CA: 0.30, C: 0.27, O: 0.29, H: 0.15, CB: 0.26 };
    for (let i=0;i<count;i++) {
      const row = {};
      for (const key of Object.keys(template)) {
        row[key] = v.sphere('residue-'+i+'-'+key, { position: coords[i][key], radius: radii[key], fill: colors[key] });
        parts.push(row[key]);
      }
      atoms.push(row);
    }
    const covalent = (id,from,to,color=Color.GREY_B,width=0.11,offset=0) => {
      const line=v.line3D(id,{stroke:color,strokeWidth:width});
      v.connect(line,from,to,{endpoints:'surface',offset}); parts.push(line); return line;
    };
    for (let i=0;i<count;i++) {
      const r=atoms[i];
      covalent('N-CA-'+i,r.N,r.CA);
      covalent('CA-C-'+i,r.CA,r.C);
      covalent('C-O-a-'+i,r.C,r.O,Color.GREY_A,0.065,0.10);
      covalent('C-O-b-'+i,r.C,r.O,Color.GREY_A,0.065,-0.10);
      covalent('N-H-'+i,r.N,r.H,Color.GREY_A,0.075);
      covalent('CA-CB-'+i,r.CA,r.CB,Color.TEAL,0.085);
      if(i<count-1) covalent('peptide-'+i,r.C,atoms[i+1].N);
    }
    const bonds=[];
    for (const i of [2,3,4,5,6,7,8]) {
      const link=v.line3D('hydrogen-bond-'+i+'-'+(i+4),{stroke:Color.GOLD,strokeWidth:i===4?0.065:0.045,opacity:0});
      v.connect(link,atoms[i].O,atoms[i+4].H,{endpoints:'surface'});
      parts.push(link); bonds.push(link);
      if(i===4) focusBond=link;
    }
    secondaryBonds=bonds.filter(x=>x!==focusBond);
    core=v.group('helical-backbone',parts,{rotation:[0,-0.85,0]});
    assembly=v.group('peptide-model',[core],{rotation:[0,0,-1.16],opacity:0});
    oxygenLabel=v.latex('acceptor-label',{tex:'O_i',fontSize:0.64,fill:Color.RED,billboard:true,opacity:0});
    nitrogenLabel=v.latex('donor-label',{tex:'N_{i+4}',fontSize:0.64,fill:Color.BLUE,billboard:true,opacity:0});
    v.attach(oxygenLabel,atoms[4].O,{offset:[2,-2.4,1]});
    v.attach(nitrogenLabel,atoms[8].N,{offset:[-2.8,3.4,1]});
    const oxygenTip=v.sphere('acceptor-leader-tip',{radius:0.001,opacity:0});
    const nitrogenTip=v.sphere('donor-leader-tip',{radius:0.001,opacity:0});
    v.attach(oxygenTip,atoms[4].O,{offset:[1.7,-1.9,1]});
    v.attach(nitrogenTip,atoms[8].N,{offset:[-2.5,2.8,1]});
    oxygenLeader=v.line3D('acceptor-leader',{stroke:Color.RED,strokeWidth:0.035,opacity:0});
    nitrogenLeader=v.line3D('donor-leader',{stroke:Color.BLUE,strokeWidth:0.035,opacity:0});
    v.connect(oxygenLeader,atoms[4].O,oxygenTip,{endpoints:'surface'});
    v.connect(nitrogenLeader,atoms[8].N,nitrogenTip,{endpoints:'surface'});
  });
  const geometry=s.text('repeat-geometry',{text:'3.6 residues / turn',position:[0,2.75],fontSize:0.30,fill:Color.WHITE,opacity:0});
  const provenance=s.text('idealized-caption',{text:'Idealized backbone — not measured coordinates',position:[0,-2.95],fontSize:0.23,fill:Color.GREY_B,opacity:0});
  const sideCue=s.latex('sidechain-caption',{tex:'C_{\\beta}\\text{ direction}',position:[0,-2.12],fontSize:0.29,fill:Color.TEAL,opacity:0});
  const relationship=s.latex('hydrogen-relationship',{tex:'\\mathrm{C{=}O}_{i}\\;\\cdots\\;\\mathrm{H{-}N}_{i+4}',position:[0,-2.06],fontSize:0.34,fill:Color.GOLD,opacity:0});
  const hCaption=s.text('hydrogen-caption',{text:'Selected hydrogen bonds',position:[0,-2.54],fontSize:0.24,fill:Color.GOLD,opacity:0});
  playTo(D*0.07,[assembly.fadeIn(),geometry.fadeIn(),provenance.fadeIn(),sideCue.fadeIn()]);
  waitTo(D*0.18);
  // A single axial inspection turn preserves all peptide and side-chain geometry.
  playTo(D*0.53,[core.rotateTo([0,0.40,0])]);
  playTo(D*0.57,[sideCue.fadeOut()]);
  s.remove(sideCue);
  playTo(D*0.65,[focusBond.fadeIn(),oxygenLabel.fadeIn(),nitrogenLabel.fadeIn(),oxygenLeader.fadeIn(),nitrogenLeader.fadeIn(),relationship.fadeIn(),hCaption.fadeIn()]);
  waitTo(D*0.70);
  playTo(D*0.80,secondaryBonds.map(x=>x.fadeIn()));
  waitTo(D);
});