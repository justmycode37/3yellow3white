import deposited from './data/dna.json';
const data={atoms:deposited.atoms};


// Reusable 42-vertex, 80-face space-filling atom directions.
function atomTemplate(){
  const t=(1+Math.sqrt(5))/2;
  const vertices=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(p=>{const r=Math.hypot(...p);return p.map(x=>x/r);});
  const faces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  const cache=new Map<string,number>();
  const midpoint=(a:number,b:number)=>{const key=[Math.min(a,b),Math.max(a,b)].join(':');if(cache.has(key))return cache.get(key)!;const p=vertices[a].map((x,i)=>(x+vertices[b][i])/2),r=Math.hypot(...p);const index=vertices.push(p.map(x=>x/r))-1;cache.set(key,index);return index;};
  const triangles:number[][]=[];
  for(const [a,b,c]of faces){const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);triangles.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);}
  return {vertices,triangles};
}
const atomMesh=atomTemplate();

/** Deposited heavy-atom coordinates; model construction stays inside the scene VM. */
export const dnaProof = {
  id: 'dna',
  title: 'DNA, atom by atom.',
  kicker: '01 / Molecular structure',
  description: 'A full twelve-base-pair B-DNA double helix: 486 deposited atoms packed together at their van der Waals radii. Inspect the grooves of the longer strand, or isolate its central pairs.',
  notes: [
    'RCSB PDB 1BNA · X-ray structure · 1.90 Å resolution. Coordinates remain rigid; this is structural inspection, not molecular dynamics.',
    'Carbon grey · nitrogen blue · oxygen red · phosphorus gold. Only space-filling atoms are drawn: no covalent sticks, bond lines or dashed contacts.',
    'All 486 DNA heavy atoms from the deposited twelve-base-pair structure are included. Hydrogens are not resolved in this coordinate set; deposited solvent is omitted. Touching and overlapping van der Waals spheres show molecular volume without moving atoms or inventing extra repeats.',
    'Orbit by dragging the molecule during a hold. Choose the central two pairs for an uncluttered atomic close-up. Play performs one groove inspection and a measured zoom.',
    'Same-color procedural relief gives the atom glyphs a restrained satin finish. It is a display treatment, not measured atomic surface roughness; coordinates, radii and element colors are unchanged.',
  ],
  sampleTimes: [0,2,4.5,6,8.5,10.5,13.9],
  source: `export default scene({mode:'3d',background:Color.BLACK,orbit:false,end:'hold'},s=>{
    const data=${JSON.stringify(data)};
    const region=s.select('region',{label:'Region',default:'Twelve base pairs',options:['Twelve base pairs','Central two pairs']});
    const atomicColors={C:Color.GREY_B,N:Color.BLUE_D,O:Color.RED_E,P:Color.GOLD};
    const vdW={C:1.7,N:1.55,O:1.52,P:1.8};
    const center=[14.71856995884775,20.979413580246902,8.82369958847737],scale=.22;
    const selected=a=>region==='Twelve base pairs'||(a.chain==='A'?a.seq>=6&&a.seq<=7:a.seq>=18&&a.seq<=19);
    const position=a=>[(a.p[0]-center[0])*scale,(a.p[2]-center[2])*scale,-(a.p[1]-center[1])*scale];
    const viewHeight=region==='Twelve base pairs'?12.6:5.64;
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
      function flush(color,b){if(b.vertices.length)v.mesh('atomic-batch-'+serial++,{...b,fill:color,stroke:Color.NONE,shading:'smooth',texture:{pattern:'noise',color,scale:12,seed:19,bumpStrength:.004},material:{roughness:.62,specular:.28}});}
      const atomNormals=${JSON.stringify(atomMesh.vertices)},atomTriangles=${JSON.stringify(atomMesh.triangles)};
      function atom(p,r,color){
        const b=bucket(color,atomNormals.length,atomTriangles.length),start=b.vertices.length;
        for(const n of atomNormals){b.vertices.push([p[0]+n[0]*r,p[1]+n[1]*r,p[2]+n[2]*r]);b.normals.push(n);}
        for(const t of atomTriangles)b.triangles.push([start+t[0],start+t[1],start+t[2]]);
      }
      for(const a of data.atoms)if(selected(a))atom(position(a),vdW[a.element]*scale,atomicColors[a.element]);
      for(const color of Object.keys(buckets))flush(color,buckets[color]);
    });
    s.wait(2);
    s.play(camera.animate({yaw:.95,pitch:.06}),{duration:3,ease:'smooth'});
    s.wait(2);
    s.play(camera.animate({height:region==='Twelve base pairs'?11.3:4.588,target:[0,.1,0]}),{duration:3,ease:'smooth'});
    s.wait(4);
  });`
};
