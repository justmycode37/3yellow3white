import {readFile,readdir,writeFile} from 'node:fs/promises';
import {parseEditorialReview} from '../../backend/src/agents/editorial.ts';
const base=import.meta.dir;
const expected=JSON.parse(await readFile(`${base}/review-expected.json`,'utf8'));
const results=[];
for(const file of (await readdir(`${base}/reviews`)).filter(x=>/^(baseline|candidate|final)-/.test(x)&&x.endsWith('.json')).sort()){
 const id=file.replace(/^(baseline|candidate|final)-/,'').replace('.json','');
 const fixture=JSON.parse(await readFile(`${base}/review-fixtures/${id}.json`,'utf8'));
 const e=expected.find((x:any)=>x.id===id);
 try{
  const review=parseEditorialReview(await readFile(`${base}/reviews/${file}`,'utf8'),fixture.draft);
  results.push({file,valid:true,verdict:review.verdict,expected:e.expected,matches:review.verdict===e.expected,issues:review.issues});
 }catch(error){results.push({file,valid:false,error:String(error)});}
}
await writeFile(`${base}/review-results.json`,JSON.stringify(results,null,2));
console.log(results.map(({issues,...x}:any)=>x));
