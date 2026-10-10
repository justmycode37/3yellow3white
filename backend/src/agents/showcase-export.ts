/** Export immutable generated artifacts and both review attempts; never rewrite scene source. */
import {mkdir,readFile,readdir,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {atomicWrite} from '../narration/service.js';
const repo=fileURLToPath(new URL('../../..',import.meta.url));
const batch=process.env.SHOWCASE_BATCH??'20261010-batch1';
if(!/^[a-z0-9-]+$/.test(batch))throw new Error('Invalid batch name.');
const root=resolve(repo,'data/showcases',batch),out=resolve(repo,'docs/demos/showcases',batch);
const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));
const port=manifest.port??5211;
const galleryUrl=`http://127.0.0.1:5207/showcases.html${port===5211?'':`?manifest=${encodeURIComponent(`http://127.0.0.1:${port}/manifest.json`)}`}`;
await mkdir(out,{recursive:true});
await copyFile(join(root,'silence.wav'),join(out,'silence.wav'));
const artifacts:{path:string;sha256:string}[]=[];
async function copy(relative:string){
  const source=join(root,relative),target=join(out,relative);
  try{const bytes=await readFile(source);await mkdir(join(target,'..'),{recursive:true});await copyFile(source,target);artifacts.push({path:relative.replaceAll('\\','/'),sha256:createHash('sha256').update(bytes).digest('hex')});}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
}
const rows=['| Topic | Mode | Production result | Seconds | Repairs |','| --- | --- | --- | ---: | ---: |'];
for(const run of manifest.runs){
  const dir=run.videoId;
  for(const name of ['lesson.json','silent-fixture.json','scene-0.input.json','scene-0.js','scene-0.diagnostics.json'])await copy(join(dir,name));
  const metrics=(await readdir(join(root,dir)).catch(()=>[])).filter(n=>/^task-\d+-[a-z]+\.metrics\.json$/.test(n));
  const totals={providerCalls:0,inputTokens:0,outputTokens:0,cacheReadTokens:0,failedValidations:0};
  for(const name of metrics){await copy(join(dir,name));const m=JSON.parse(await readFile(join(root,dir,name),'utf8'));totals.providerCalls+=m.providerCalls??0;totals.failedValidations+=(m.validations??[]).filter((v:{valid:boolean})=>!v.valid).length;for(const t of m.turns??[]){totals.inputTokens+=t.inputTokens??0;totals.outputTokens+=t.outputTokens??0;totals.cacheReadTokens+=t.cacheReadTokens??0;}}
  run.metrics=totals;
  for(const attempt of ['0','1'])for(const name of ['candidate.js','review.json','repair.json','review.metrics.json','repair.metrics.json','1280x720-sheet-0.png','1280x720-sheet-1.png','960x720-sheet-0.png','960x720-sheet-1.png','1280x720-11.png'])await copy(join(dir,'scene-0.visual',attempt,name));
  if(run.review?.evidence){const {evidence,...review}=run.review;run.review=review;}
  rows.push(`| ${run.title} | ${run.mode} | ${run.status}${run.error?' — '+run.error.replaceAll('|','/').replaceAll('\n',' '):''} | ${((run.elapsedMs??0)/1000).toFixed(1)} | ${run.evidenceAttempt??run.review?.attempt??0} |`);
}
manifest.exportedAt=new Date().toISOString();manifest.artifacts=artifacts;
manifest.summary={
  topics:manifest.runs.length,
  attempted:manifest.runs.filter((r:any)=>r.status!=='pending').length,
  counts:manifest.runs.reduce((a:Record<string,number>,r:{status:string})=>(a[r.status]=(a[r.status]??0)+1,a),{}),
  firstReviewApprovals:manifest.runs.filter((r:any)=>r.status==='complete'&&(r.evidenceAttempt??r.review?.attempt??0)===0).length,
  repairedApprovals:manifest.runs.filter((r:any)=>r.status==='complete'&&(r.evidenceAttempt??r.review?.attempt)===1).length,
  summedSceneSeconds:manifest.runs.reduce((s:number,r:any)=>s+(r.elapsedMs??0)/1000,0),
  metrics:manifest.runs.reduce((a:Record<string,number>,r:any)=>{for(const [key,value]of Object.entries(r.metrics))a[key]=(a[key]??0)+Number(value);return a;},{}),
};
await atomicWrite(join(out,'manifest.json'),JSON.stringify(manifest,null,2));
await atomicWrite(join(out,'README.md'),`# ${batch}: production scene-stage benchmark\n\n${manifest.boundary}\n\nModel: ${manifest.model}; thinking: ${manifest.thinking}; production source commit: ${manifest.commit}. Each fixed topic requests one 20-second scene. Automatic visual approval is not independent scientific/style certification. Review findings are preserved for failed and repaired runs. No generated JavaScript was manually edited.\n\n${rows.join('\n')}\n\n## Replay\n\nFrom backend, set SHOWCASE_BATCH=${batch} and SHOWCASE_PORT=${port}, then run \`bun src/agents/showcase-trial.ts serve-archive\`. Start animlib demo server on port5207, then open \`${galleryUrl}\`. The manifest server binds only 127.0.0.1:${port}. Select unapproved candidates only for inspection. Their label does not change on replay.\n\nFull raw prompt transcripts, native individual frames and generation logs remain in \`data/showcases/${batch}\`. This portable archive retains unmodified source, inputs, both review/repair attempts, contact sheets, timing metrics and SHA-256 digests. Repeated authoring system prompts are identified by hashes and the production source commit; exact per-run combined prompts remain in raw data.\n`);
console.log(JSON.stringify({out,artifacts:artifacts.length,counts:manifest.runs.reduce((a:Record<string,number>,r:{status:string})=>(a[r.status]=(a[r.status]??0)+1,a),{})}));
