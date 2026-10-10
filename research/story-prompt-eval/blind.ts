import { readFile, writeFile, mkdir } from 'node:fs/promises';
const base = import.meta.dir;
const cases=JSON.parse(await readFile(`${base}/cases.json`,'utf8')) as string[];
const orders=[['control','candidate','baseline'],['baseline','control','candidate'],['candidate','baseline','control'],['control','baseline','candidate'],['candidate','control','baseline']];
const metrics=JSON.parse(await readFile(`${base}/mechanical-results.json`,'utf8'));
await mkdir(`${base}/blind`,{recursive:true});
const map:any[]=[];
for(const [i,id] of cases.entries()) {
 const request=JSON.parse(await readFile(`${base}/${id}.request.json`,'utf8'));
 const samples=[];
 for(const [j,variant] of orders[i].entries()){
  const file=`${variant}-${id}.json`,label=String.fromCharCode(65+j);
  const draft=JSON.parse(await readFile(`${base}/outputs/${file}`,'utf8'));
  const m=metrics.find((m:any)=>m.file===file),{file:_,...measurements}=m;
  samples.push({label,draft,measurements});map.push({case:id,label,file});
 }
 await writeFile(`${base}/blind/${id}.json`,JSON.stringify({request,samples},null,2));
}
await writeFile(`${base}/blind-map.json`,JSON.stringify(map,null,2));
console.log('Created blind comparison packets; prompt variants omitted.');
