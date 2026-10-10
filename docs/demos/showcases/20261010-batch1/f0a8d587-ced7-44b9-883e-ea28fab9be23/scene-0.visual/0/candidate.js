const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-capsid\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '3d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const play = (actions, duration) => { s.play(actions, { duration, ease: 'smooth' }); cursor += duration; };
  const holdTo = t => { if (t > cursor) { s.wait(t - cursor); cursor = t; } };
  const add = (a,b) => a.map((x,i)=>x+b[i]);
  const sub = (a,b) => a.map((x,i)=>x-b[i]);
  const mul = (a,k) => a.map(x=>x*k);
  const dot = (a,b) => a.reduce((v,x,i)=>v+x*b[i],0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const unit = a => mul(a,1/Math.sqrt(dot(a,a)));
  const phi = (1+Math.sqrt(5))/2;
  const raw = [];
  for (const a of [-1,1]) for (const b of [-1,1]) {
    raw.push([0,a,b*phi], [a,b*phi,0], [b*phi,0,a]);
  }
  // Exact regular icosahedron: hull faces, not a triangulated sphere approximation.
  const faces = [];
  for (let i=0;i<12;i++) for (let j=i+1;j<12;j++) for (let k=j+1;k<12;k++) {
    if ([sub(raw[i],raw[j]),sub(raw[j],raw[k]),sub(raw[k],raw[i])].every(e=>Math.abs(dot(e,e)-4)<1e-8)) {
      let f=[i,j,k];
      if(dot(cross(sub(raw[j],raw[i]),sub(raw[k],raw[i])),raw[i])<0) f=[i,k,j];
      faces.push(f);
    }
  }
  const faceCenter = f => mul(f.reduce((v,i)=>add(v,raw[i]),[0,0,0]),1/3);
  const adjacent = faces.map((f,i)=>faces.map((g,j)=>j!==i && f.filter(x=>g.includes(x)).length===2 ? j : -1).filter(j=>j>=0));
  const patchIds = [0, adjacent[0][0], adjacent[0][1]];
  const normal = unit(patchIds.reduce((v,i)=>add(v,faceCenter(faces[i])),[0,0,0]));
  const ex = unit(cross([0,1,0],normal));
  const ey = cross(normal,ex);
  const radius = 2.05;
  // Tilt the opening slightly upward/right, so its depth and cut edges read clearly.
  const orient = p => {
    const x=dot(p,ex), y=dot(p,ey), z=dot(p,normal);
    const a=0.20, b=-0.14;
    const x1=x*Math.cos(a)+z*Math.sin(a), z1=-x*Math.sin(a)+z*Math.cos(a);
    return [x1,y*Math.cos(b)-z1*Math.sin(b),y*Math.sin(b)+z1*Math.cos(b)];
  };
  const vertices = raw.map(p=>orient(mul(unit(p),radius)));
  let root, panel, geometryLabel, genomeLabel, leader;
  s.view('capsid-view', { rect: [0,0,1,1], orbit: true, orbitHitTest: 'geometry', camera: { yaw: 0, pitch: 0, height: 7.7, distance: 16, perspective: 0.65, target: [0,0,0] } }, v => {
    const shellParts=[], panelParts=[];
    faces.forEach((face,fi)=>{
      const corners=face.map(i=>vertices[i]);
      const point=(i,j)=>add(corners[0],add(mul(sub(corners[1],corners[0]),i/3),mul(sub(corners[2],corners[0]),j/3)));
      const parts=patchIds.includes(fi)?panelParts:shellParts;
      let n=0;
      const tile = pts => {
        const id='face-'+fi+'-subunit-'+n++;
        const inner=pts.map(p=>mul(p,0.945));
        parts.push(v.mesh(id, {
          vertices: [...pts,...inner],
          triangles: [[0,1,2],[5,4,3],[0,3,4],[0,4,1],[1,4,5],[1,5,2],[2,5,3],[2,3,0]],
          shading: 'flat', fill: [Color.BLUE_D,Color.BLUE_C,Color.BLUE_D][(n+fi)%3], stroke: Color.NONE,
          material: { roughness: 0.8, specular: 0.12 }
        }));
        parts.push(v.path(id+'-seam', { points: pts, closed: true, fill: Color.NONE, stroke: {color:Color.BLUE_A,opacity:0.6}, strokeWidth: 0.012, strokeProfile:'round' }));
      };
      for(let i=0;i<3;i++) for(let j=0;j<3-i;j++) {
        tile([point(i,j),point(i+1,j),point(i,j+1)]);
        if(i+j<2) tile([point(i+1,j),point(i+1,j+1),point(i,j+1)]);
      }
      parts.push(v.path('face-'+fi+'-boundary', { points: corners, closed: true, fill: Color.NONE, stroke: {color:Color.WHITE,opacity:0.6}, strokeWidth: 0.02, strokeProfile: 'round' }));
    });
    panel=v.group('contiguous-three-face-section',panelParts);
    const shell=v.group('remaining-seventeen-faces',shellParts);
    // A continuous coarse polymer curve, deliberately not an atomistic model.
    const polymer=[];
    for(let i=0;i<480;i++) {
      const t=2*Math.PI*i/480, r=0.86+0.34*Math.cos(5*t);
      polymer.push(orient([r*Math.cos(3*t),0.34*Math.sin(5*t),r*Math.sin(3*t)]));
    }
    const genome=v.tube('nucleic-acid-schematic', { points:polymer, closed:true, radius:0.045, radialSegments:8, fill:Color.GOLD, material:{roughness:0.7,specular:0.18} });
    root=v.group('capsid-model',[shell,panel,genome], {position:[-0.85,-0.25,0]});
    geometryLabel=v.text('idealized-geometry-label', {text:'Idealized capsid geometry', position:[-1.05,-2.75,0], fontSize:0.28, fill:Color.WHITE, billboard:true});
    genomeLabel=v.text('genome-label', {text:'Nucleic acid (schematic)',position:[2.15,-2.1,0],fontSize:0.26,fill:Color.GOLD,billboard:true,opacity:0});
    const labelAnchor=v.circle('annotation-anchor',{radius:0.001,position:[1.2,-1.86,0],opacity:0});
    const coreAnchor=v.circle('core-anchor',{radius:0.001,position:[-0.45,-0.15,1.1],opacity:0});
    leader=v.line3D('genome-leader',{stroke:{color:Color.GOLD,opacity:0.65},strokeWidth:0.013,opacity:0});
    v.connect(leader,labelAnchor,coreAnchor);
  });
  play([root.fadeIn(),geometryLabel.fadeIn()],D*0.065);
  holdTo(D*0.30);
  // Remove one rigid, edge-connected patch; every triangular subunit retains its shape.
  play(panel.moveTo([2.4,1.05,0.8]),D*0.40);
  play([genomeLabel.fadeIn(),leader.fadeIn()],D*0.05);
  holdTo(D);
});