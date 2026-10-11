import {createPlayer} from '../src/index';
import type {PlayerState} from '../src/types';
interface Run{id:string;title:string;category:string;mode:string;status:string;stage?:string;error?:string;prompt:string;evidenceAttempt?:number;review?:{attempt?:number;review?:unknown;approved?:boolean};scenes:{id:string;source:string;audio:{id:string;url:string}}[]}
interface Manifest{model:string;thinking:string;boundary:string;runs:Run[];executions?:{topics:string[]}[]}
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const choice=el<HTMLSelectElement>('run'),seek=el<HTMLInputElement>('seek'),play=el<HTMLButtonElement>('play');
const query=new URL(location.href),manifestUrl=query.searchParams.get('manifest')??'http://127.0.0.1:5211/manifest.json';
let manifest:Manifest,player:ReturnType<typeof createPlayer>|undefined,state:PlayerState|undefined,revision=0,refreshRevision=0,loadedKey='',sourceUrl='';
const fail=(e:unknown)=>{el('error').textContent=e instanceof Error?e.message:String(e);};
function update(next:PlayerState){state=next;const duration=next.scenes[0]?.duration??20;seek.max=String(duration);seek.value=String(next.time);el('clock').textContent=`${next.time.toFixed(1)} / ${duration.toFixed(0)} s`;play.textContent=next.status==='playing'?'Pause':'Play';el('playback').textContent=`${next.status} · ${manifest.model} · ${manifest.thinking}`;if(next.error)fail(next.error);}
function describe(run:Run){
  el('title').textContent=run.title;el('kicker').textContent=`${run.category} / ${run.mode.toUpperCase()}`;el('prompt').textContent=run.prompt;
  el('description').textContent='One generated scene. Geometry, timing and any repairs come from the production agents; no manual scene edits.';
  const status=el('state');status.dataset.failed=String(run.status==='failed');status.textContent=run.status==='complete'?'Approved by production visual gate':run.status==='failed'?`UNAPPROVED — ${run.error??'generation failed'}`:`${run.status} · ${run.stage??'queued'}`;
  el('review').textContent=JSON.stringify(run.review?.review??run.review??{status:'No visual verdict yet.'},null,2);
  const evidence=el('evidence');evidence.replaceChildren();
  if(run.scenes.length&&run.review){const attempt=run.evidenceAttempt??run.review?.attempt??0;for(const [name,file]of [['16:9 early','1280x720-sheet-0.png'],['16:9 late','1280x720-sheet-1.png'],['4:3 early','960x720-sheet-0.png'],['4:3 late','960x720-sheet-1.png']]){const a=document.createElement('a');a.textContent=name;a.href=new URL(`/evidence/${run.id}/${attempt}/${file}`,manifestUrl).href;a.target='_blank';a.rel='noreferrer';evidence.append(a);}}
}
async function load(id:string){
  const run=manifest.runs.find(r=>r.id===id);if(!run)return;const token=++revision;player?.dispose();player=undefined;state=undefined;el('error').textContent='';
  for(const id of ['play','restart','reset'])(el(id)as HTMLButtonElement).disabled=true;seek.disabled=true;
  describe(run);loadedKey=`${run.id}:${run.status}:${run.scenes[0]?.source.length??0}`;
  const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',run.title);canvas.tabIndex=0;el('canvas-host').replaceChildren(canvas);
  const next=new URL(location.href);next.searchParams.set('run',run.id);history.replaceState(null,'',next);
  if(sourceUrl)URL.revokeObjectURL(sourceUrl);const link=el<HTMLAnchorElement>('source');link.hidden=!run.scenes.length;
  if(!run.scenes.length){el('playback').textContent='No candidate available yet.';return;}
  sourceUrl=URL.createObjectURL(new Blob([run.scenes[0].source],{type:'text/javascript'}));link.href=sourceUrl;link.download=`${run.id}.js`;
  const assets=Object.fromEntries(run.scenes.map(s=>[s.audio.id,{kind:'audio' as const,url:s.audio.url}]));
  const active=createPlayer({canvas,assets});player=active;active.setMuted(true);active.subscribe(s=>{if(revision===token)update(s);});
  const result=await active.submit({type:'load',scenes:run.scenes.map(s=>({id:s.id,source:s.source}))});if(token!==revision)return;
  if(!result.ok)throw new Error(result.diagnostics.map(d=>d.message).join('\n'));
  for(const id of ['play','restart','reset'])(el(id)as HTMLButtonElement).disabled=false;seek.disabled=false;update(active.getState());
}
async function refresh(){
  const request=++refreshRevision;
  const response=await fetch(manifestUrl);if(request!==refreshRevision)return;if(!response.ok)throw new Error('Showcase manifest unavailable.');
  const incoming:Manifest=await response.json();if(request!==refreshRevision)return;manifest=incoming;
  if(!manifest.runs.length)throw new Error('No showcase topics in this manifest.');
  const requestedTopics=new Set(manifest.executions?.flatMap(e=>e.topics)??[]);
  const visibleRuns=requestedTopics.size?manifest.runs.filter(r=>requestedTopics.has(r.id)):manifest.runs;
  if(!visibleRuns.length)throw new Error('No requested showcase topics in this manifest.');
  const requested=choice.value||query.searchParams.get('run');
  const selected=(visibleRuns.find(r=>r.id===requested)??visibleRuns.find(r=>r.scenes.length)??visibleRuns[0]).id;
  choice.replaceChildren(...visibleRuns.map(r=>new Option(`${String(manifest.runs.indexOf(r)+1).padStart(2,'0')} · ${r.title} · ${r.status}`,r.id)));choice.value=selected;
  const counts=visibleRuns.reduce((a:Record<string,number>,r)=>(a[r.status]=(a[r.status]??0)+1,a),{});el('overall').textContent=`${visibleRuns.length} topics · `+Object.entries(counts).map(([k,n])=>`${n} ${k}`).join(' · ');el('boundary').textContent=manifest.boundary;
  const run=manifest.runs.find(r=>r.id===selected)!;if(loadedKey!==`${run.id}:${run.status}:${run.scenes[0]?.source.length??0}`)await load(selected);else describe(run);
}
choice.addEventListener('change',()=>void load(choice.value).catch(fail));el('refresh').addEventListener('click',()=>{loadedKey='';void refresh().catch(fail);});
play.addEventListener('click',()=>{if(!player||!state)return;if(state.status==='playing')player.pause();else{const p=player;void(async()=>{await p.unlockAudio();if(state?.status==='ended')await p.seek({scene:state.scene!,time:0});p.play();})().catch(fail);}});
el('restart').addEventListener('click',()=>{if(player&&state?.scene){const p=player;p.pause();void p.seek({scene:state.scene,time:0}).then(()=>p.play()).catch(fail);}});
seek.addEventListener('input',()=>{if(player&&state?.scene){player.pause();void player.seek({scene:state.scene,time:Number(seek.value)}).catch(fail);}});
el('reset').addEventListener('click',()=>player?.resetView());
const timer=setInterval(()=>void refresh().catch(fail),15000);window.addEventListener('pagehide',()=>{clearInterval(timer);player?.dispose();if(sourceUrl)URL.revokeObjectURL(sourceUrl);},{once:true});
void refresh().catch(fail);
