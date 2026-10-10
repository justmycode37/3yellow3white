import protein from './assets/molecules/1crn.json';
import ribosome from './assets/molecules/1jj2.json';
import proteinEnvelope from './assets/molecules/1crn-envelope.json';
import ribosomeEnvelope from './assets/molecules/1jj2-envelope.json';
import type { SceneSource } from '../src/types.js';

/** Data preparation is host-side; source contains only compact selected coordinates. */
export const molecularBeadSources: SceneSource[] = [protein,ribosome].map((data,index) => {
  const stride=index===0?1:4;
  const chains=data.chains.map(c=>({kind:c.kind,positions:c.positions.filter((_,i)=>Math.floor(i/3)%stride===0)}));
  return {id:index===0?'crambin':'ribosomal-subunit',source:`export default scene({mode:'3d',end:'hold',orbit:true,background:'BLACK'},s=>{
    s.play(s.camera.to3D({height:8,distance:16,yaw:0.35,pitch:-0.18}),{duration:0});
    const chains=${JSON.stringify(chains)};
    for(let i=0;i<chains.length;i++)s.molecule('chain-'+i,{positions:chains[i].positions,
      origin:${JSON.stringify(data.center)},scale:${index===0?0.2:0.028},radius:${index===0?1.5:3.8},detail:${index===0?1:0},
      fill:chains[i].kind==='nucleic'?'BLUE':'GOLD',material:{roughness:0.7,specular:0.2}});
    s.wait(1);
  });`};
});

export const molecularSources: SceneSource[] = [proteinEnvelope,ribosomeEnvelope].map((data,index)=>{
  const {kind: _kind,...geometry}=data.geometry;
  return {id:index===0?'crambin':'ribosomal-subunit',source:`export default scene({mode:'3d',end:'hold',orbit:true,background:'BLACK'},s=>{
    s.play(s.camera.to3D({height:8,distance:16,yaw:0.35,pitch:-0.18}),{duration:0});
    s.mesh('envelope',{...${JSON.stringify(geometry)},scale:${index===0?0.16:0.024},fill:'GOLD',material:{roughness:0.7,specular:0.2}});
    s.wait(1);
  });`};
});

export const molecularDescriptions = [
  'Crambin · PDB 1CRN · smooth envelope from all 327 deposited heavy-atom positions. Gaussian smoothing σ = 2.5 Å. Gold is the joint schematic envelope, not an atomic solvent surface.',
  'Large ribosomal subunit · PDB 1JJ2 · smooth envelope from all 6,567 selected CA/P positions. Gaussian smoothing σ = 9 Å. Gold combines RNA and proteins; no site subsampling. This is not a complete ribosome or an atomic solvent surface.',
];
