import { createPlayer } from '../src/index';
import type { Asset, PlayerState } from '../src/types';

interface Run { id: string; variant: string; status?: string; model?: string; scenes: {id: string; source: string; audio: {id: string; url: string}}[] }
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const select = el<HTMLSelectElement>('run'), scenes = el<HTMLSelectElement>('scene');
const seek = el<HTMLInputElement>('seek'), local = el<HTMLInputElement>('time');
const play = el<HTMLButtonElement>('play'), mute = el<HTMLInputElement>('mute');
const url = new URL(location.href);
const manifest = url.searchParams.get('manifest') ?? 'http://127.0.0.1:5208/manifest.json';
let runs: Run[] = [], player: ReturnType<typeof createPlayer> | undefined, state: PlayerState | undefined, revision = 0;
let timeEdited = false;
const fail = (error: unknown) => { el('error').textContent = error instanceof Error ? error.message : String(error); };
function update(s: PlayerState) {
  state = s;
  const index = s.scenes.findIndex(scene => scene.id === s.scene);
  const total = s.scenes.reduce((n, scene) => n + scene.duration, 0);
  const time = s.scenes.slice(0, Math.max(index, 0)).reduce((n, scene) => n + scene.duration, 0) + s.time;
  seek.max = String(total); seek.value = String(time);
  el('clock').textContent = `${time.toFixed(1)} / ${total.toFixed(1)} s`;
  play.textContent = s.status === 'playing' ? 'Pause' : 'Play';
  if (s.scene) scenes.value = s.scene;
  if (!timeEdited && document.activeElement !== local) local.value = s.time.toFixed(3);
  const run = runs.find(run => run.id === select.value);
  el('status').textContent = `${run?.model ?? 'saved reference'} · ${player?.backend ?? 'loading'} · ${s.status} · ${s.scene ?? ''} · ${s.time.toFixed(3)} s${run?.status === 'running' ? ' · partial generation' : ''}`;
  if (s.error) fail(s.error);
}
async function load(id: string) {
  const run = runs.find(run => run.id === id); if (!run) return;
  const token = ++revision;
  player?.dispose(); state = undefined; el('error').textContent = '';
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'RNA transcription model');
  el('stage').replaceChildren(canvas);
  scenes.replaceChildren(...run.scenes.map((scene, i) => new Option(`${i + 1}. ${scene.id}`, scene.id)));
  const assets: Record<string, Asset> = {};
  for (const scene of run.scenes) assets[scene.audio.id] = {kind:'audio',url:scene.audio.url};
  const active = createPlayer({canvas,assets});
  player = active;
  active.subscribe(s=>{if(token===revision)update(s);});
  const result = await active.submit({type:'load',scenes:run.scenes.map(({id,source})=>({id,source}))});
  if (token !== revision) return;
  if (!result.ok) throw new Error(result.diagnostics.map(d=>d.message).join('\n'));
  active.setMuted(mute.checked);
  const next = new URL(location.href); next.searchParams.set('run', id); history.replaceState(null, '', next);
  update(active.getState());
}
async function refresh() {
  const response = await fetch(manifest); if (!response.ok) throw new Error('Demo manifest unavailable.');
  runs = (await response.json()).runs;
  const selected = select.value || url.searchParams.get('run') || runs.at(-1)?.id;
  select.replaceChildren(...runs.map(run=>new Option(run.variant,run.id)));
  select.value = runs.some(run=>run.id===selected) ? selected! : runs[0]?.id ?? '';
  await load(select.value);
}
async function globalSeek(t: number) {
  if (!state || !player) return;
  player.pause();
  for (const scene of state.scenes) {
    if (t <= scene.duration || scene === state.scenes.at(-1)) { await player.seek({scene:scene.id,time:Math.min(t,scene.duration)}); return; }
    t -= scene.duration;
  }
}
select.addEventListener('change',()=>{const next=new URL(location.href);next.searchParams.set('run',select.value);location.assign(next);});
el('reload').addEventListener('click',()=>location.reload());
seek.addEventListener('input',()=>void globalSeek(Number(seek.value)).catch(fail));
scenes.addEventListener('change',()=>{const scene=scenes.value;player?.pause();void player?.seek({scene,time:0}).catch(fail);});
local.addEventListener('input',()=>{timeEdited=true;});
el('go').addEventListener('click',()=>{
  const time=Number(local.value); timeEdited=false;
  player?.pause();void player?.seek({scene:scenes.value,time}).catch(fail);
});
el('restart').addEventListener('click',()=>void globalSeek(0).catch(fail));
el('reset').addEventListener('click',()=>player?.resetView());
mute.addEventListener('change',()=>player?.setMuted(mute.checked));
play.addEventListener('click',()=>{
  if (!player || !state) return;
  if(state.status==='playing')player.pause();
  else void player.unlockAudio().then(()=>player?.play()).catch(fail);
});
window.addEventListener('pagehide',()=>player?.dispose(),{once:true});
void refresh().catch(fail);
