import { createPlayer } from '../src/index.js';
import { molecularSources, molecularDescriptions } from './molecular-scenes.js';

const canvas=document.querySelector<HTMLCanvasElement>('canvas')!;
const description=document.querySelector<HTMLParagraphElement>('#description')!;
const status=document.querySelector<HTMLParagraphElement>('#status')!;
const player=createPlayer({canvas,controlsRoot:false});
async function show(index:number) {
  description.textContent=molecularDescriptions[index];
  status.textContent='Loading deposited coordinates…';
  const result=await player.submit({type:'load',scenes:[molecularSources[index]]});
  status.textContent=result.ok?'Drag to orbit. The chosen display scale is independent for each structure.':JSON.stringify(result.diagnostics);
}
document.querySelectorAll<HTMLButtonElement>('button[data-index]').forEach(b=>b.addEventListener('click',()=>void show(Number(b.dataset.index))));
void show(0);
window.addEventListener('pagehide',()=>player.dispose(),{once:true});
