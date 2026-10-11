import { describe, expect, it } from 'vitest';
import { createMolecularEnvelope } from '../src/molecular-envelope.js';
import { compileSource } from '../src/compiler.js';
import protein from '../demo/assets/molecules/1crn-envelope.json';
import ribosome from '../demo/assets/molecules/1jj2-envelope.json';
import proteinData from '../demo/assets/molecules/1crn.json';
import ribosomeData from '../demo/assets/molecules/1jj2.json';
import type { Vec3 } from '../src/types.js';

describe('offline molecular density envelope',()=>{
  const options={positions:[0,0,0],sigma:1,isoLevel:0.25,resolution:12};
  it('produces a closed outward-wound smooth sphere from one Gaussian',()=>{
    const mesh=createMolecularEnvelope(options);
    expect(mesh.shading).toBe('smooth');
    expect(mesh.vertices!.length).toBeGreaterThan(20);
    const edges=new Map<string,number>();
    for(const [i,p] of mesh.vertices!.entries()){
      expect(Math.hypot(...p)).toBeGreaterThan(1.4);
      expect(Math.hypot(...p)).toBeLessThan(1.9);
      expect(Math.hypot(...mesh.normals![i])).toBeCloseTo(1,10);
      expect(p.reduce((n,x,j)=>n+x*mesh.normals![i][j],0)).toBeGreaterThan(0);
    }
    for(const [a,b,c] of mesh.triangles!){
      const p=mesh.vertices![a],q=mesh.vertices![b],r=mesh.vertices![c];
      const u=q.map((x,i)=>x-p[i]),v=r.map((x,i)=>x-p[i]);
      const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      expect(cross.reduce((n,x,j)=>n+x*p[j],0)).toBeGreaterThan(0);
      for(const [x,y] of [[a,b],[b,c],[c,a]]){const key=[x,y].sort((x,y)=>x-y).join(',');edges.set(key,(edges.get(key)??0)+1);}
    }
    expect([...edges.values()].every(n=>n===2)).toBe(true);
  });
  it('is deterministic, applies a common origin and joins overlapping densities',()=>{
    const joined={...options,positions:[-.5,0,0,.5,0,0]};
    const mesh=createMolecularEnvelope(joined);
    expect(createMolecularEnvelope(joined)).toEqual(mesh);
    expect(createMolecularEnvelope({...joined,positions:[9.5,20,30,10.5,20,30],origin:[10,20,30]})).toEqual(mesh);
    const reached=new Set<number>([0]);let size=0;
    while(size!==reached.size){size=reached.size;for(const t of mesh.triangles!)if(t.some(i=>reached.has(i)))t.forEach(i=>reached.add(i));}
    expect(reached.size).toBe(mesh.vertices!.length);
  });
  it('rejects invalid input, invisible surfaces and budgets before excessive work',()=>{
    for(const positions of [[],[0,0],[NaN,0,0],[0,,0],Array(300003).fill(0)])expect(()=>createMolecularEnvelope({...options,positions:positions as number[]})).toThrow();
    for(const sigma of [0,-1,Infinity])expect(()=>createMolecularEnvelope({...options,sigma})).toThrow();
    for(const resolution of [0,3,65,12.5])expect(()=>createMolecularEnvelope({...options,resolution})).toThrow();
    expect(()=>createMolecularEnvelope({...options,isoLevel:2})).toThrow();
    expect(()=>createMolecularEnvelope({...options,maxTriangles:10})).toThrow('triangle');
    expect(()=>createMolecularEnvelope({...options,positions:Array(30000).fill(0),resolution:64})).toThrow('work');
    expect(()=>createMolecularEnvelope({...options,sigma:1e-200})).toThrow('precision');
    expect(()=>createMolecularEnvelope({...options,smoothingIterations:21})).toThrow('smoothing');
  });
  it('keeps deposited example surfaces closed and consistently oriented after smoothing',()=>{
    for(const data of [protein,ribosome]){
      const edges=new Map<string,{count:number;direction:number}>();
      for(const [a,b,c] of data.geometry.triangles)for(const [x,y] of [[a,b],[b,c],[c,a]]){
        const key=[x,y].sort((a,b)=>a-b).join(','),edge=edges.get(key)??{count:0,direction:0};
        edge.count++;edge.direction+=x<y?1:-1;edges.set(key,edge);
      }
      expect([...edges.values()].every(e=>e.count===2&&e.direction===0)).toBe(true);
      expect(data.geometry.normals.every(n=>Math.abs(Math.hypot(...n)-1)<0.001)).toBe(true);
      expect(data.parameters.smoothingIterations).toBe(6);
    }
    expect(protein.provenance.inputSites).toBe(327);
    expect(ribosome.provenance.inputSites).toBe(6567);
  });
  it('fits both final models together in the unchanged production source and VM limits',async()=>{
    const source=`export default scene({mode:'3d'},s=>{s.mesh('protein',${JSON.stringify(protein.geometry)});s.mesh('ribosome',${JSON.stringify(ribosome.geometry)});s.wait(1);});`;
    expect(source.length).toBeLessThan(240000);
    await expect(compileSource(source)).resolves.toHaveProperty('duration',1);
  });
  it.each([[proteinData,protein],[ribosomeData,ribosome]])('reproduces prepared envelope geometry from all deposited input sites',(data,asset)=>{
    const geometry=createMolecularEnvelope({...asset.parameters,positions:data.chains.flatMap(c=>c.positions),origin:asset.origin as Vec3});
    const compact=JSON.parse(JSON.stringify(geometry,(_,v)=>typeof v==='number'?Math.round(v*1000)/1000:v));
    expect(compact).toEqual(asset.geometry);
  });
});
