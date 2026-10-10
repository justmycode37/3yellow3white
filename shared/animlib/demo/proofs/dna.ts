import deposited from './data/dna.json';
const selectedIndices=deposited.atoms.map((a,i)=>({a,i})).filter(({a})=>a.chain==='A'?a.seq>=4&&a.seq<=9:a.seq>=16&&a.seq<=21).map(({i})=>i);
const remap=new Map(selectedIndices.map((old,i)=>[old,i]));
const data={...deposited,atoms:selectedIndices.map(i=>deposited.atoms[i]),bonds:deposited.bonds.filter(([a,b])=>remap.has(a)&&remap.has(b)).map(([a,b,order])=>[remap.get(a)!,remap.get(b)!,order]),hydrogenBonds:deposited.hydrogenBonds.filter(([a,b])=>remap.has(a)&&remap.has(b)).map(([a,b])=>[remap.get(a)!,remap.get(b)!])};


// Reusable directions: 12/20 for small atoms, 42/80 for space-filling atoms.
function atomTemplate(){
  const t=(1+Math.sqrt(5))/2;
  const vertices=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(p=>{const r=Math.hypot(...p);return p.map(x=>x/r);});
  const faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  const cache=new Map<string,number>();
  const midpoint=(a:number,b:number)=>{const key=[Math.min(a,b),Math.max(a,b)].join(':');if(cache.has(key))return cache.get(key)!;const p=vertices[a].map((x,i)=>(x+vertices[b][i])/2),r=Math.hypot(...p);const index=vertices.push(p.map(x=>x/r))-1;cache.set(key,index);return index;};
  const triangles:number[][]=[];
  for(const [a,b,c]of faces){const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);triangles.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);}
  return {vertices,triangles,coarseVertices:vertices.slice(0,12),coarseTriangles:faces};
}
const atomMesh=atomTemplate();

/** Deposited heavy-atom coordinates; model construction stays inside the scene VM. */
export const dnaProof = {
  id: 'dna',
  title: 'DNA, atom by atom.',
  kicker: '01 / Molecular structure',
  description: 'A six-base-pair B-DNA segment, built from 246 deposited atoms. Inspect its major and minor grooves, then move into the central base pairs.',
  notes: [
    'RCSB PDB 1BNA · X-ray structure · 1.90 Å resolution. Coordinates remain rigid; this is structural inspection, not molecular dynamics.',
    'Carbon grey · nitrogen blue · oxygen red · phosphorus gold. Covalent connectivity comes from the RCSB nucleotide dictionaries; dashed gold contacts indicate base-pair hydrogen bonds.',
    'Hydrogens are not resolved in this coordinate set. Deposited solvent is omitted for clarity. The segment cuts the two backbones at its boundaries; no artificial capping atoms are added. Ball sizes aid visibility; space filling uses conventional van der Waals radii.',
    'Orbit by dragging the molecule during a hold. Choose the central two pairs for an uncluttered atomic close-up. Play performs one groove inspection and a measured zoom.'
  ],
  sampleTimes: [0,2,4.5,6,8.5,10.5,13.9],
  source: `export default scene({mode:'3d',background:Color.BLACK,orbit:false,end:'hold'},s=>{
    const data=${JSON.stringify(data)};
    const representation=s.select('representation',{label:'Representation',default:'Ball & stick',options:['Ball & stick','Space filling']});
    const region=s.select('region',{label:'Region',default:'Six base pairs',options:['Six base pairs','Central two pairs']});
    const contacts=s.select('contacts',{label:'Base-pair contacts',default:'Show',options:['Show','Hide']});
    const atomicColors={C:Color.GREY_B,N:Color.BLUE_D,O:Color.RED_E,P:Color.GOLD};
    const vdW={C:1.7,N:1.55,O:1.52,P:1.8};
    const visualR={C:0.36,N:0.40,O:0.39,P:0.53};
    const center=[14.71856995884775,20.979413580246902,8.82369958847737],scale=.22;
    const selected=a=>region==='Six base pairs'||(a.chain==='A'?a.seq>=6&&a.seq<=7:a.seq>=18&&a.seq<=19);
    const position=a=>[(a.p[0]-center[0])*scale,(a.p[2]-center[2])*scale,-(a.p[1]-center[1])*scale];
    const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],mul=(a,n)=>[a[0]*n,a[1]*n,a[2]*n];
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const unit=a=>mul(a,1/Math.hypot(...a));
    const viewHeight=(region==='Six base pairs'?7.6:4.7)*(representation==='Space filling'?1.2:1);
    let camera;
    s.view('molecule',{rect:[0,0,1,1],orbit:true,orbitHitTest:'geometry',camera:{yaw:.22,pitch:-.12,height:viewHeight,distance:24,target:[0,0,0]}},v=>{
      camera=v.camera;
      const buckets={};let serial=0;
      function bucket(color,needV,needT){
        let b=buckets[color];
        if(!b||b.vertices.length+needV>7500||b.triangles.length+needT>14000){
          if(b)flush(color,b);
          b={vertices:[],normals:[],triangles:[]};buckets[color]=b;
        }
        return b;
      }
      function flush(color,b){if(b.vertices.length)v.mesh('atomic-batch-'+serial++,{...b,fill:color,stroke:Color.NONE,shading:'smooth'});}
      const atomNormals=representation==='Space filling'?${JSON.stringify(atomMesh.vertices)}:${JSON.stringify(atomMesh.coarseVertices)},atomTriangles=representation==='Space filling'?${JSON.stringify(atomMesh.triangles)}:${JSON.stringify(atomMesh.coarseTriangles)};
      function atom(p,r,color){
        const b=bucket(color,atomNormals.length,atomTriangles.length),start=b.vertices.length;
        for(const n of atomNormals){b.vertices.push([p[0]+n[0]*r,p[1]+n[1]*r,p[2]+n[2]*r]);b.normals.push(n);}
        for(const t of atomTriangles)b.triangles.push([start+t[0],start+t[1],start+t[2]]);
      }
      function stick(a,z,r,color){
        const axis=unit(sub(z,a)),u=unit(cross(axis,Math.abs(axis[1])<.9?[0,1,0]:[1,0,0])),w=cross(axis,u),segs=8;
        const b=bucket(color,segs*2,segs*2),start=b.vertices.length;
        for(const p of [a,z])for(let i=0;i<segs;i++){
          const theta=2*Math.PI*i/segs,n=add(mul(u,Math.cos(theta)),mul(w,Math.sin(theta)));
          b.vertices.push(add(p,mul(n,r)));b.normals.push(n);
        }
        for(let i=0;i<segs;i++){const j=(i+1)%segs;b.triangles.push([start+i,start+j,start+segs+i],[start+j,start+segs+j,start+segs+i]);}
      }
      for(const a of data.atoms)if(selected(a))atom(position(a),(representation==='Space filling'?vdW[a.element]:visualR[a.element])*scale,atomicColors[a.element]);
      if(representation==='Ball & stick')for(const [ia,ib,order]of data.bonds){
        const a=data.atoms[ia],b=data.atoms[ib];if(!selected(a)||!selected(b))continue;
        const p=position(a),q=position(b),direction=unit(sub(q,p));
        const shift=mul(unit(cross(direction,Math.abs(direction[1])<.9?[0,1,0]:[1,0,0])),.022);
        for(const sign of order===2?[-1,1]:[0]){
          const pa=add(p,mul(shift,sign)),pb=add(q,mul(shift,sign)),mid=mul(add(pa,pb),.5);
          const r=order===2?.014:.023;
          stick(pa,pb,r,Color.GREY_B);
        }
      }
      if(contacts==='Show'&&representation==='Ball & stick')for(const [ia,ib]of data.hydrogenBonds){
        const a=data.atoms[ia],b=data.atoms[ib];if(!selected(a)||!selected(b))continue;
        const p=position(a),q=position(b),d=sub(q,p);
        for(let k=1;k<4;k++)stick(add(p,mul(d,k/5)),add(p,mul(d,(k+.35)/5)),.012,Color.GOLD_D);
      }
      for(const color of Object.keys(buckets))flush(color,buckets[color]);
    });
    s.wait(2);
    s.play(camera.animate({yaw:.95,pitch:.06}),{duration:3,ease:'smooth'});
    s.wait(2);
    s.play(camera.animate({height:(region==='Six base pairs'?5.4:3.7)*(representation==='Space filling'?1.24:1),target:[0,.1,0]}),{duration:3,ease:'smooth'});
    s.wait(4);
  });`
};
