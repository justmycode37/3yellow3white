import {createPlayer} from '../../src/index';
import type {PlayerState} from '../../src/types';
import {dnaProof} from './dna';
import {engineProof} from './engine';
import {gradientProof} from './gradient';
import {minecraftProof} from './minecraft';

const proofs=[dnaProof,engineProof,gradientProof,minecraftProof];
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const buttons=[...document.querySelectorAll<HTMLButtonElement>('[data-proof]')];
const play=el<HTMLButtonElement>('play'),seek=el<HTMLInputElement>('seek');
let player:ReturnType<typeof createPlayer>|undefined,state:PlayerState|undefined,revision=0;
function fail(error:unknown){el('error').textContent=error instanceof Error?error.message:String(error);el('error').hidden=false;el('status').textContent='Could not load scene';}
function update(next:PlayerState){
 state=next;const duration=next.scenes[0]?.duration??0;
 seek.max=String(duration);seek.value=String(next.time);
 el('clock').textContent=`${next.time.toFixed(1)} / ${duration.toFixed(1)} s`;
 play.textContent=next.status==='playing'?'Pause':'Play';
 el('status').textContent=duration?`${next.status==='playing'?'Playing':next.status==='ended'?'Complete':'Ready'} · ${duration.toFixed(0)} seconds`:'Loading scene…';
 if(next.error)fail(next.error);
}
async function load(id:string){
 const proof=proofs.find(p=>p.id===id)??proofs[0],token=++revision;
 document.body.dataset.ready='false';
 player?.dispose();state=undefined;el('error').hidden=true;
 for(const name of ['play','restart','reset'])(el(name) as HTMLButtonElement).disabled=true;seek.disabled=true;
 for(const name of ['kicker','title','description'] as const)el(name).textContent=proof[name];
 el('notes').replaceChildren(...proof.notes.map(note=>{const li=document.createElement('li');li.textContent=note;return li;}));
 el('source-link').hidden=proof.id!=='dna';el('controls').replaceChildren();
 for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.proof===proof.id));
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',proof.title);canvas.tabIndex=0;el('canvas-host').replaceChildren(canvas);
 const active=createPlayer({canvas,controlsRoot:el('controls')});player=active;
 active.subscribe(next=>{if(revision===token)update(next);});
 const result=await active.submit({type:'load',scenes:[{id:proof.id,source:proof.source}]});
 if(token!==revision)return;
 if(!result.ok)throw new Error(result.diagnostics.map(d=>d.message).join('\n'));
 for(const name of ['play','restart','reset'])(el(name) as HTMLButtonElement).disabled=false;seek.disabled=false;
 const url=new URL(location.href);url.searchParams.set('proof',proof.id);history.replaceState(null,'',url);
 document.body.dataset.ready='true';document.body.dataset.proof=proof.id;update(active.getState());
}
for(const button of buttons)button.addEventListener('click',()=>void load(button.dataset.proof!).catch(fail));
play.addEventListener('click',()=>{
 if(!player||!state)return;
 if(state.status==='playing')player.pause();
 else if(state.status==='ended'){const p=player;void p.seek({scene:state.scene!,time:0}).then(()=>p.play()).catch(fail);}
 else player.play();
});
el('restart').addEventListener('click',()=>{if(!player||!state?.scene)return;const p=player;p.pause();void p.seek({scene:state.scene,time:0}).then(()=>p.play()).catch(fail);});
seek.addEventListener('input',()=>{if(!player||!state?.scene)return;player.pause();void player.seek({scene:state.scene,time:Number(seek.value)}).catch(fail);});
el('reset').addEventListener('click',()=>player?.resetView());
window.addEventListener('pagehide',()=>player?.dispose(),{once:true});
void load(new URL(location.href).searchParams.get('proof')??'dna').catch(fail);
