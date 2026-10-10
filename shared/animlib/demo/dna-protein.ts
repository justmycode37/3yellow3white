import { createPlayer } from '../src/index';
import type { PlayerState } from '../src/types';

interface Manifest {
  title: string;
  version: string;
  scenes: { id: string; file: string; duration: number }[];
  captions: { start: number; end: number; text: string }[];
  reference: { url: string; title: string };
}
const origin = 'http://127.0.0.1:5215';
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const play = element<HTMLButtonElement>('play');
const timeline = element<HTMLInputElement>('timeline');
const captions = element<HTMLDivElement>('captions');
const error = element<HTMLParagraphElement>('error');
const proof = new URLSearchParams(location.search).get('proof');
const player = createPlayer({ canvas: element<HTMLCanvasElement>('canvas'), controlsRoot: false });
let state = player.getState();
let manifest: Manifest;
let captionText = '';
const clock = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
function report(reason: unknown) {
  error.textContent = reason instanceof Error ? reason.message : String(reason);
  error.hidden = false;
  element('status').textContent = 'Playback unavailable';
}
function offset(next: PlayerState) {
  let time = next.time;
  for (const scene of next.scenes) { if (scene.id === next.scene) break; time += scene.duration; }
  return time;
}
function update(next: PlayerState) {
  state = next;
  const time = offset(next);
  const duration = next.scenes.reduce((sum, scene) => sum + scene.duration, 0);
  play.disabled = timeline.disabled = !next.scene || next.status === 'blocked';
  play.textContent = next.status === 'playing' ? 'Pause' : 'Play';
  timeline.max = String(duration || 1);
  timeline.value = String(time);
  timeline.setAttribute('aria-valuetext', `${clock(time)} of ${clock(duration)}`);
  element('clock').textContent = `${clock(time)} / ${clock(duration)}`;
  const text = (manifest?.captions ?? []).filter(cue => time >= cue.start && time < cue.end).map(cue => cue.text).join('\n');
  if (captionText !== text) { captions.textContent = text; captionText = text; }
  for (const button of element('chapters').querySelectorAll('button')) button.setAttribute('aria-current', String(button.dataset.scene === next.scene));
  if (next.error) report(next.error);
}
player.subscribe(update);
async function seek(time: number) {
  const resume = state.status === 'playing';
  let local = time;
  for (const scene of state.scenes) {
    if (local < scene.duration || scene === state.scenes.at(-1)) {
      await player.seek({ scene: scene.id, time: local });
      if (resume) await player.play();
      return;
    }
    local -= scene.duration;
  }
}
play.addEventListener('click', () => {
  if (state.status === 'playing') player.pause();
  else void (async () => {
    if (state.scene === state.scenes.at(-1)?.id && state.time >= state.duration) await seek(0);
    await player.play();
  })().catch(report);
});
timeline.addEventListener('input', () => void seek(Number(timeline.value)).catch(report));
document.querySelector('.screen')!.addEventListener('keydown', event => {
  if ((event as KeyboardEvent).code === 'Space') { event.preventDefault(); play.click(); }
});
async function get(path: string) {
  const response = await fetch(`${origin}${path}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status}). Start docs/demos/dna-protein/serve.ts on port 5215.`);
  return response;
}
const ready = (async () => {
  if (proof && !/^v[1-9][0-9]?$/.test(proof)) throw new Error('Invalid proof version.');
  manifest = proof ? { title: `DNA → protein · motion proof ${proof}`, version: proof, scenes: [{ id: `proof-${proof}`, file: `proof-${proof}.js`, duration: 8 }], captions: [], reference: { url: '', title: '' } } : await (await get('/manifest.json')).json();
  element('title').textContent = manifest.title;
  document.title = `${manifest.title} · animlib reconstruction`;
  if (manifest.reference?.url && /^https?:\/\//.test(manifest.reference.url)) {
    const reference = element<HTMLAnchorElement>('reference');
    reference.href = manifest.reference.url;
    reference.title = manifest.reference.title;
    reference.hidden = false;
  }
  const sources = await Promise.all(manifest.scenes.map(async scene => {
    if (!/^[\w.-]+\.js$/.test(scene.file)) throw new Error(`Invalid scene filename: ${scene.file}`);
    return { id: scene.id, source: await (await get(`/source/${encodeURIComponent(scene.file)}`)).text() };
  }));
  const result = await player.submit({ type: 'load', scenes: sources });
  if (!result.ok) throw new Error(result.diagnostics.map(d => `${d.scene ? `${d.scene}: ` : ''}${d.message}`).join('\n'));
  for (const [index, scene] of manifest.scenes.entries()) {
    const actual = player.getState().scenes[index];
    if (!actual || Math.abs(actual.duration - scene.duration) > 0.001) throw new Error(`Scene ${scene.id} duration differs from manifest.`);
    const button = document.createElement('button');
    button.textContent = scene.id.replace(/[-_]/g, ' ');
    button.dataset.scene = scene.id;
    button.addEventListener('click', () => void seek(manifest.scenes.slice(0, index).reduce((total, item) => total + item.duration, 0)).catch(report));
    element('chapters').append(button);
  }
  update(player.getState());
  element('status').textContent = `animlib ${player.backend ?? ''} · ${manifest.version} · ${proof ? '8 second motion proof' : 'continuous reconstruction'}`;
  if (!proof) {
    const subtitles = element<HTMLAnchorElement>('subtitle-download');
    subtitles.href = `${origin}/captions.vtt`; subtitles.hidden = false; subtitles.download = 'dna-protein.vtt';
    const film = await fetch(`${origin}/film.mp4`, { method: 'HEAD' });
    if (film.ok) { const download = element<HTMLAnchorElement>('download'); download.href = `${origin}/film.mp4`; download.hidden = false; download.download = 'dna-protein.mp4'; }
  }
  return result;
})();
ready.catch(report);
Object.assign(window, { dnaProteinDemo: { player, ready, get manifest() { return manifest; } } });
window.addEventListener('pagehide', () => player.dispose(), { once: true });
