import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {dnaProof} from './dna.ts';
import {compileSource,evaluateScene} from '../../dist/core.js';
const root='shared/animlib/demo/proofs/data/';
const data=JSON.parse(readFileSync(root+'dna.json','utf8'));
const pdb=readFileSync(root+'1BNA.pdb','utf8');
const atoms=pdb.split(/\r?\n/).filter(l=>l.startsWith('ATOM  ')).map(l=>({serial:+l.slice(6,11),name:l.slice(12,16).trim(),res:l.slice(17,20).trim(),chain:l[21],seq:+l.slice(22,26),p:[+l.slice(30,38),+l.slice(38,46),+l.slice(46,54)],element:l.slice(76,78).trim()}));
assert.deepEqual(data.atoms,atoms);
assert.equal(atoms.length,486);
const residues=new Map();for(const a of atoms)residues.set(a.chain+':'+a.seq,a.res.slice(1));
const complement={A:'T',T:'A',C:'G',G:'C'};
for(let i=1;i<=12;i++)assert.equal(residues.get('B:'+(25-i)),complement[residues.get('A:'+i)]);
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const lengths=items=>items.map(([a,b])=>distance(atoms[a].p,atoms[b].p));
const range=xs=>[Math.min(...xs),Math.max(...xs)];
const c=atoms.reduce((v,a)=>v.map((x,i)=>x+a.p[i]/atoms.length),[0,0,0]);
const colors={C:'GREY_B',N:'BLUE_D',O:'RED_E',P:'GOLD'};
const radii={C:1.7,N:1.55,O:1.52,P:1.8};
const variants=[];
for(const region of ['Twelve base pairs','Central two pairs'])for(const display of ['Clearer atoms (75%)','Full molecular volume (100%)']){
 const compiled=await compileSource(dnaProof.source,{controls:{region,display}}),frame=evaluateScene(compiled,0);
 const expected=atoms.filter(a=>region==='Twelve base pairs'||(a.chain==='A'?a.seq>=6&&a.seq<=7:a.seq>=18&&a.seq<=19));
 const remaining=new Set(expected);let maxCenterError=0,maxRadiusError=0,meshes=0;
 for(const el of frame.elements){
  assert.equal(el.geometry.kind,'mesh');assert.equal(el.stroke,'none');meshes++;
  const vertices=el.geometry.vertices;assert.equal(vertices.length%42,0);
  for(let start=0;start<vertices.length;start+=42){
   const vs=vertices.slice(start,start+42),mid=vs.reduce((v,p)=>v.map((x,i)=>x+p[i]/42),[0,0,0]);
   const angstrom=[mid[0]/.22+c[0],-mid[2]/.22+c[1],mid[1]/.22+c[2]];
   const nearest=[...remaining].sort((a,b)=>distance(a.p,angstrom)-distance(b.p,angstrom))[0];
   assert.ok(nearest);const err=distance(nearest.p,angstrom);assert.ok(err<1e-10);maxCenterError=Math.max(maxCenterError,err);
   assert.equal(el.fill,colors[nearest.element]);
   const radius=radii[nearest.element]*.22*(display.startsWith('Clearer')?.75:1);
   for(const p of vs)maxRadiusError=Math.max(maxRadiusError,Math.abs(distance(p,mid)-radius));
   remaining.delete(nearest);
  }
 }
 assert.equal(remaining.size,0);assert.ok(maxRadiusError<1e-10);assert.equal(compiled.duration,14);
 for(const t of dnaProof.sampleTimes){const sampled=evaluateScene(compiled,t);assert.deepEqual(sampled.elements,frame.elements);}
 variants.push({region,display,atoms:expected.length,meshes,maxCenterErrorAngstrom:maxCenterError,maxRadiusErrorSceneUnits:maxRadiusError,duration:compiled.duration});
}
const report={source:data.source,coordinateIdentity:'All 486 atom records exactly match vendored PDB ATOM records; fresh official RCSB ATOM records independently matched on 2026-10-10.',sequenceA:[...residues].filter(([k])=>k.startsWith('A:')).map(([,v])=>v).join(''),sequenceB:[...residues].filter(([k])=>k.startsWith('B:')).map(([,v])=>v).join(''),complementaryAntiparallelPairs:12,covalentBonds:data.bonds.length,covalentDistanceAngstrom:range(lengths(data.bonds)),watsonCrickHeavyAtomContacts:data.hydrogenBonds.length,contactDistanceAngstrom:range(lengths(data.hydrogenBonds)),displayTransform:'[x,z,-y] rotation has determinant +1; uniform scale .22 preserves chirality and relative distances. No atom motion at seven sampled times.',limitations:'1.90 A experimental structure; no hydrogens, solvent or dynamics. 75% radii are display scaling, not physical volume. Contact distances alone do not establish hydrogen-bond energies.',variants};
writeFileSync('docs/demos/spatial-proofs/dna-accuracy-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
