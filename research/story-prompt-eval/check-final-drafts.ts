import {readFile,readdir,writeFile} from 'node:fs/promises';
import {parseEditorialReview} from '../../backend/src/agents/editorial.ts';
const base=import.meta.dir,results=[];
for(const id of ['bayes','history','interactive']){
 const lesson=JSON.parse(await readFile(`${base}/outputs/final-${id}.json`,'utf8'));
 const review=parseEditorialReview(await readFile(`${base}/final-draft-reviews/${id}.json`,'utf8'),lesson);
 results.push({case:id,valid:true,...review});
}
await writeFile(`${base}/final-draft-results.json`,JSON.stringify(results,null,2));
console.log(results.map(({case:id,verdict,issues})=>({case:id,verdict,issues})));
