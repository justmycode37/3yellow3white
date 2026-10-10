import { mkdir, readFile, writeFile, copyFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fixtures } from './fixtures.js';
import { NarrationService } from '../src/narration/service.js';
import { parsePlannedLesson, scenePlanningContext } from '../src/agents/planning.js';
import { parseStoryline } from '../src/narration/markdown.js';
import { buildSceneAgentInput, validateSceneAgainstNarration } from '../src/narration/handoff.js';
import { validateScenePlan } from '../src/agents/scene-plan.js';
import { sceneSource } from '../src/agents/generator.js';
import { agentConfig } from '../src/agents/config.js';
import { createModelRuntime } from '../src/agents/auth.js';
import { PiAgentRunner, AGENT_COMPLETION_INSTRUCTIONS } from '../src/agents/runtime.js';
import type { AgentTask, AgentRunMetrics } from '../src/agents/runtime.js';
import type { NarrationPackageV1 } from '../src/narration/types.js';
import type { Frame } from 'animlib/core';

const root = resolve(import.meta.dir, '../../data/scene-speed');
const owner = 'scene-speed-benchmark';
const json = async (path:string) => JSON.parse(await readFile(path,'utf8'));
const save = async (path:string, value:unknown) => writeFile(path,JSON.stringify(value,null,2));
const hash = (value:string|Uint8Array) => createHash('sha256').update(value).digest('hex');
const topics = Object.keys(fixtures) as (keyof typeof fixtures)[];
const command = process.argv[2];
await mkdir(root,{recursive:true});

if (command === 'models') {
  const config=agentConfig(); const runtime=await createModelRuntime(config);
  console.log(JSON.stringify(runtime.getModels(config.provider).map(m=>({id:m.id,name:m.name})),null,2));
} else if (command === 'prepare') {
  const narration=new NarrationService({root:join(root,'narration')});
  for (const topic of topics) {
    const directory=join(root,'fixtures',topic); await mkdir(directory,{recursive:true});
    const lesson=fixtures[topic]; parsePlannedLesson(JSON.stringify(lesson),{prompt:lesson.plan.runningExample,documents:[]} as any);
    const fixtureHash=hash(JSON.stringify(lesson));
    try { const frozen=await json(join(directory,'frozen.json')); if(frozen.fixtureHash!==fixtureHash)throw new Error('Frozen fixture changed. Use a new benchmark directory.'); console.log(`fixture.reused ${topic}`); continue; }
    catch(e) {if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    const job=await narration.submit(owner,lesson.markdown); if(job.status==='interrupted')throw new Error('Narration interrupted; inspect before retrying.');
    await narration.idle(); const pkg=await narration.package(owner,job.id);
    await save(join(directory,'lesson.json'),lesson); await save(join(directory,'narration.json'),pkg);
    await writeFile(join(directory,'script.md'),lesson.markdown);
    const audioHashes:Record<string,string>={};
    for (const scene of pkg.scenes) {const path=await narration.audio(owner,job.id,scene.audio.id); await copyFile(path,join(directory,`${scene.id}.wav`)); audioHashes[scene.id]=hash(await readFile(path));}
    await save(join(directory,'frozen.json'),{fixtureHash,packageHash:hash(JSON.stringify(pkg)),audioHashes,voice:narration.provider.settings,createdAt:new Date().toISOString()});
    console.log(`fixture.prepared ${topic} ${pkg.scenes.map(s=>s.durationSec.toFixed(2)).join(',')} seconds`);
  }
} else if(command==='run') {
  const variant=process.argv[3]??'baseline',model=process.argv[4]??'gpt-6-astra';
  const mode=(process.argv[5]??'text') as AgentTask['outputMode'];
  const referenceMode=process.argv[6]??'full';
  const codeProfile=process.argv[8]??'standard';
  if(!/^[a-z0-9-]+$/.test(variant)||!['text','validated-reference','submit','submit-only'].includes(mode!))throw new Error('Invalid variant/mode');
  if(!['standard','concise'].includes(codeProfile))throw new Error('Invalid code profile');
  const selected=process.argv[7] && process.argv[7]!=='all' ? [process.argv[7] as keyof typeof fixtures] : topics;
  if(!['full','author'].includes(referenceMode)||selected.some(topic=>!topics.includes(topic)))throw new Error('Invalid reference or topic');
  const reference=await readFile(resolve(import.meta.dir,'../../shared/animlib/docs/reference.md'),'utf8');
  const craft=await readFile(resolve(import.meta.dir,'../prompts/scene-craft.md'),'utf8');
  const docs=referenceMode==='author'?(await import('../src/agents/authoring-reference.js')).buildAuthoringReference(reference):reference;
  const runner=new PiAgentRunner({...agentConfig(),model});
  for(const topic of selected) {
    const directory=join(root,'runs',`${variant}-${topic}`); await mkdir(directory,{recursive:true});
    const fixtureDir=join(root,'fixtures',topic),lesson=await json(join(fixtureDir,'lesson.json'));
    const pkg=await json(join(fixtureDir,'narration.json')) as NarrationPackageV1;
    const frozen=await json(join(fixtureDir,'frozen.json'));
    if(hash(JSON.stringify(pkg))!==frozen.packageHash||hash(JSON.stringify(lesson))!==frozen.fixtureHash)throw new Error('Frozen inputs changed');
    for(const scene of pkg.scenes)if(hash(await readFile(join(fixtureDir,`${scene.id}.wav`)))!==frozen.audioHashes[scene.id])throw new Error('Frozen audio changed');
    try {const done=await json(join(directory,'result.json'));
      if(done.model!==model||done.thinking!==runner.config.thinking||done.outputMode!==mode||done.referenceMode!==referenceMode||(done.codeProfile??'standard')!==codeProfile||done.fixtureHash!==frozen.fixtureHash)throw new Error('Run identity changed; choose a new variant name.');
      if(done.status==='complete'){console.log(`run.reused ${variant} ${topic}`);continue;}
      throw new Error('Incomplete run retained. Choose a new variant name for another attempt.');
    }catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    const result:any={id:`${variant}-${topic}`,variant,topic,title:pkg.title,model,thinking:runner.config.thinking,outputMode:mode,referenceMode,codeProfile,fixtureHash:frozen.fixtureHash,startedAt:new Date().toISOString(),status:'running',scenes:[]};
    const started=performance.now(); let previousFrame:Frame|undefined;
    await save(join(directory,'result.json'),result);
    try {
      for(let index=0;index<pkg.scenes.length;index++) {
        const scene=pkg.scenes[index]; const {instructions,...input}=buildSceneAgentInput(pkg,scene.id,previousFrame);
        const planning=scenePlanningContext(parseStoryline(lesson.markdown),index,lesson.plan);
        let metrics:AgentRunMetrics|undefined; const diagnostics:string[]=[];
        const validate=async(output:string)=>{try {const {compiled,finalFrame}=await validateSceneAgainstNarration(sceneSource(output),pkg,scene.id,previousFrame);
          if(Math.abs(compiled.duration-scene.durationSec)>1e-6)throw new Error(`Scene must last exactly ${scene.durationSec} seconds; currently ${compiled.duration}. Add final s.wait for remaining time.`);
          validateScenePlan(compiled,finalFrame,lesson.plan.scenes[index]);
        } catch(e) {diagnostics.push(e instanceof Error?e.message:'Validation failed');throw e;}};
        const systemPrompt=`${instructions.replace('Return animlib SceneSource { id, source }.','Return only JavaScript with one default-exported scene, without a JSON wrapper.')}\nFor video delivery, end your timeline at exactly durationSec using a final s.wait() as needed. Use validate_output before finishing.\n\n${craft}\n\n${docs}`;
        const compact=codeProfile==='concise'?'\nSource efficiency: express repeated geometry with loops and small helpers; include only word-ID timings you actually use. Avoid prose comments and copying narration or planning text into code. Prefer compact data tables to repeated statements. This changes code expression only: preserve every teaching step, visible relationship, readable label, timing cue, pause, transition, and carried identity. Do not simplify the explanation to shorten code.\n':'';
        const prompt=`Generate this scene using the authoritative narration packet and lesson plan:${compact}\n${JSON.stringify({...input,planning})}`;
        await save(join(directory,`scene-${index}.input.json`),{...input,planning}); await writeFile(join(directory,`scene-${index}.prompt.md`),systemPrompt+AGENT_COMPLETION_INSTRUCTIONS[mode!]+'\n\n'+prompt);
        const at=performance.now(); console.log(`scene.started ${variant} ${topic} ${index}`);
        let source:string, failed=false;
        try {
          source=sceneSource(await runner.run({systemPrompt,prompt,validate,outputMode:mode,onMetrics:m=>{metrics=m;},signal:AbortSignal.timeout(15*60*1000)}));
          await validate(source); const compiled=await validateSceneAgainstNarration(source,pkg,scene.id,previousFrame); previousFrame=compiled.finalFrame;
        } catch(e) {failed=true;throw e;}
        finally {
          try {await save(join(directory,`scene-${index}.metrics.json`),{metrics,diagnostics});}
          catch(e) {
            if(!failed)throw e;
            // Preserve the generation/validation failure when its diagnostics cannot be saved.
            console.error(`metrics.write_failed ${variant} ${topic} ${index}`);
          }
        }
        await writeFile(join(directory,`scene-${index}.js`),source);
        result.scenes.push({id:scene.id,source,duration:scene.durationSec,audio:{id:scene.audio.id,url:`http://127.0.0.1:8082/fixtures/${topic}/${scene.id}.wav`},elapsedMs:performance.now()-at,metrics,diagnostics,basePromptBytes:Buffer.byteLength(systemPrompt+prompt),completionInstructionBytes:Buffer.byteLength(AGENT_COMPLETION_INSTRUCTIONS[mode!]),sourceBytes:Buffer.byteLength(source)});
        result.elapsedMs=performance.now()-started; await save(join(directory,'result.json'),result);
        console.log(`scene.completed ${variant} ${topic} ${index} ${Math.round(result.scenes.at(-1).elapsedMs)}ms`);
      }
      result.status='complete';
    }catch(e){result.status='failed';result.errorCode=(e as any).code??'BENCHMARK';process.exitCode=1;console.log(`run.failed ${variant} ${topic} ${result.errorCode}`);}
    result.elapsedMs=performance.now()-started; result.finishedAt=new Date().toISOString(); await save(join(directory,'result.json'),result);
    await manifest();
  }
} else if(command==='serve') {
  const server=Bun.serve({hostname:'127.0.0.1',port:8082,async fetch(request){
    const path=decodeURIComponent(new URL(request.url).pathname); const headers={'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
    if(path==='/manifest.json')return Response.json(await manifest(),{headers});
    if(!/^\/fixtures\/(rna|binary|derivative)\/beat-[12]\.wav$/.test(path))return new Response('Not found',{status:404,headers});
    return new Response(Bun.file(join(root,path)),{headers});
  }}); console.log(`Benchmark assets http://${server.hostname}:${server.port}`);
} else throw new Error('Use models, prepare, run VARIANT MODEL MODE [full|author] [TOPIC], or serve');

async function manifest(){const runs=[],trials=[];for(const entry of await readdir(join(root,'runs')).catch(()=>[])){try{const run=await json(join(root,'runs',entry,'result.json'));trials.push({id:run.id,variant:run.variant,topic:run.topic,status:run.status,errorCode:run.errorCode});if(run.status==='complete')runs.push(run);}catch{}}return {runs,trials,reviews:await json(join(root,'reviews.json')).catch(()=>({}))};}
