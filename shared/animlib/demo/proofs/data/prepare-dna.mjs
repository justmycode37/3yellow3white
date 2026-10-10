import {readFileSync,writeFileSync} from 'node:fs';
// Rebuild from the adjacent deposited PDB and RCSB CCD nucleotide dictionaries.
const pdb=readFileSync(new URL('./1BNA.pdb',import.meta.url),'utf8');
const atoms=pdb.split(/\r?\n/).filter(l=>l.startsWith('ATOM  ')).map(l=>({serial:+l.slice(6,11),name:l.slice(12,16).trim(),res:l.slice(17,20).trim(),chain:l[21],seq:+l.slice(22,26),p:[+l.slice(30,38),+l.slice(38,46),+l.slice(46,54)],element:l.slice(76,78).trim()}));
const dict={};
for(const residue of ['DA','DC','DG','DT']){
 const cif=readFileSync(new URL(`./${residue}.cif`,import.meta.url),'utf8');
 const section=cif.slice(cif.indexOf('_chem_comp_bond.comp_id')).split('#')[0];
 dict[residue]=section.split(/\r?\n/).filter(l=>l.startsWith(residue+' ')).map(l=>{
  const t=[...l.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map(m=>m[1]??m[2]??m[3]);return [t[1],t[2],t[3]];
 });
}
const residues=new Map();atoms.forEach((a,i)=>{const key=a.chain+':'+a.seq; if(!residues.has(key))residues.set(key,new Map());residues.get(key).set(a.name,i);});
const bonds=[];
for(const atomMap of residues.values()){
 const a=atoms[atomMap.values().next().value];
 for(const [first,second,order]of dict[a.res])if(atomMap.has(first)&&atomMap.has(second))bonds.push([atomMap.get(first),atomMap.get(second),order==='DOUB'?2:1]);
 const next=residues.get(a.chain+':'+(a.seq+1));
 if(next?.has('P')&&atomMap.has("O3'"))bonds.push([atomMap.get("O3'"),next.get('P'),1]);
}
const hydrogenBonds=[];
for(let seq=1;seq<=12;seq++){
 const a=residues.get('A:'+seq),b=residues.get('B:'+(25-seq));
 const res=atoms[a.values().next().value].res;
 const pairs=res==='DA'?[["N6","O4"],["N1","N3"]]:res==='DT'?[["O4","N6"],["N3","N1"]]:res==='DG'?[["O6","N4"],["N1","N3"],["N2","O2"]]:[["N4","O6"],["N3","N1"],["O2","N2"]];
 for(const [an,bn]of pairs) if(a.has(an)&&b.has(bn))hydrogenBonds.push([a.get(an),b.get(bn)]);
}
const dist=(a,b)=>Math.hypot(...a.p.map((x,k)=>x-b.p[k]));
const lengths=bonds.map(([a,b])=>dist(atoms[a],atoms[b]));
const hlengths=hydrogenBonds.map(([a,b])=>dist(atoms[a],atoms[b]));
const center=atoms.reduce((c,a)=>c.map((x,k)=>x+a.p[k]/atoms.length),[0,0,0]);
console.log(JSON.stringify({atoms:atoms.length,bonds:bonds.length,residues:residues.size,elements:[...new Set(atoms.map(a=>a.element))],center,ranges:[0,1,2].map(k=>[Math.min(...atoms.map(a=>a.p[k])),Math.max(...atoms.map(a=>a.p[k]))]),bondRange:[Math.min(...lengths),Math.max(...lengths)],hydrogenBondRange:[Math.min(...hlengths),Math.max(...hlengths)]}));
writeFileSync(new URL('./dna.json',import.meta.url),JSON.stringify({source:'https://www.rcsb.org/structure/1BNA',coordinateUrl:'https://files.rcsb.org/download/1BNA.pdb',resolutionAngstrom:1.9,atoms,bonds,hydrogenBonds}));
