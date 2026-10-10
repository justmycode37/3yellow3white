import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { compileSource } from 'animlib/core';
import type { CompiledScene } from 'animlib/core';
import type { AgentRunner, AgentTask } from './runtime.js';
import { renderSceneFrames } from './frame-renderer.js';
import type { FrameRenderer } from './frame-renderer.js';
import { validateReview } from './review.js';
import type { ReviewInput } from './review.js';
import { animationQualityPolicy } from './quality-policy.js';
import { atomicWrite } from '../narration/service.js';
import { logStage } from '../logging.js';

/** Bound image cost while sampling actual action interiors, holds and camera transitions. */
export function sampleReviewTimes(scene: CompiledScene): number[] {
  const duration=scene.duration, times=new Set([0,Math.min(0.5,duration/4),duration]);
  const candidates=new Set<number>();
  for(let i=1;i<12;i++)candidates.add(duration*i/12);
  const cameraMids=scene.tracks.filter(t=>t.action.type==='camera').map(t=>t.start+t.duration/2);
  for(const t of cameraMids.slice(0,4))times.add(t);
  for(const track of scene.tracks)for(const t of [track.start,track.start+track.duration/2,track.start+track.duration])candidates.add(t);
  for(const event of scene.lifecycle)candidates.add(event.time);
  while(times.size<12) {
    let best:number|undefined,gap=1e-6;
    for(const t of candidates){if(t<0||t>duration)continue;const distance=Math.min(...[...times].map(other=>Math.abs(other-t)));if(distance>gap){best=t;gap=distance;}}
    if(best===undefined)break;times.add(best);
  }
  return [...times].sort((a,b)=>a-b);
}

export interface VisualGateInput {
  runner: AgentRunner; source: string; input: ReviewInput;
  task: Pick<AgentTask,'systemPrompt'|'prompt'>;
  directory: string; index: number; videoId: string; signal: AbortSignal;
  validate: (source: string) => Promise<unknown>;
  renderFrames?: FrameRenderer;
}

/** Mandatory pre-publication gate: every repair is validated, rendered and independently reviewed. */
export async function reviewGeneratedScene(options: VisualGateInput): Promise<string> {
  const {runner,input,directory,index,videoId,signal}=options;
  signal.throwIfAborted();
  const guidance=await readFile(new URL('../../prompts/scene-review.md',import.meta.url),'utf8');
  const quality=await animationQualityPolicy();
  const style=await readFile(new URL('../../prompts/visual-style-reference.jpg',import.meta.url));
  let source=options.source;
  const parse=async(output:string)=>{const result=await validateReview(output,input);if(result.source)await options.validate(result.source);return result;};
  for(let attempt=0;attempt<3;attempt++) {
    signal.throwIfAborted();
    await options.validate(source);
    const sourceSha256=createHash('sha256').update(source).digest('hex');
    const attemptDirectory=join(directory,`scene-${index}.visual`,String(attempt));
    await mkdir(attemptDirectory,{recursive:true});
    await atomicWrite(join(attemptDirectory,'candidate.js'),source);
    const compiled=await compileSource(source,{previous:input.previousFrame});
    const evidence=await (options.renderFrames??renderSceneFrames)({source,previousFrame:input.previousFrame,times:sampleReviewTimes(compiled),directory:attemptDirectory,signal});
    signal.throwIfAborted();
    const images=await Promise.all(evidence.sheets.map(async sheet=>({type:'image' as const,mimeType:'image/png',data:(await readFile(sheet.path)).toString('base64')})));
    images.push({type:'image',mimeType:'image/jpeg',data:style.toString('base64')});
    const sampleMap=evidence.sheets.map((sheet,i)=>({image:i+1,width:sheet.width,height:sheet.height,columns:sheet.columns,times:sheet.times}));
    const task:AgentTask={
      systemPrompt:`${options.task.systemPrompt}\n\n${guidance}\n\n${quality}\n\nAUTOMATIC VISUAL PUBLICATION GATE\nYou are reviewing newly generated source before it can be published. Review each image, then source. The JSON review format above replaces the author's JavaScript output format. Every repair will be rendered and reviewed again. The last image is an approved style reference only: preserve its black background, serif/vector math, sparse explanatory geometry and stable color roles; do not copy its RNA topic or layout into unrelated lessons. Inspect both aspects for clipping, text/shape occlusion and control clearance. The host reserves the top 12% and bottom 12% for controls; no controls are painted into these native renders. Check transition interiors and purposeful motion. New orbitable model views must use orbitHitTest:"geometry", and explanatory text must remain upright. Approve only if the supplied evidence shows no substantive problem; do not invent missing frames or demand decorative changes.`,
      prompt:`Review these actual native WebGPU frames. Contact sheets read left-to-right, then top-to-bottom; each cell is one whole viewport. Sampling map: ${JSON.stringify(sampleMap)}. Last image is style reference.\nAuthoritative request and narration:\n${options.task.prompt}\nCurrent candidate source (SHA-256 ${sourceSha256}):\n${source}`,
      images,signal,outputMode:'validated-reference',logContext:{videoId,sceneIndex:index,stage:'review'},
      validate:async output=>{await parse(output);},
    };
    await atomicWrite(join(attemptDirectory,'review.prompt.md'),`${task.systemPrompt}\n\n${task.prompt}`);
    const output=await logStage({videoId,sceneIndex:index,stage:'review',attempt},()=>runner.run(task));
    const review=await parse(output);signal.throwIfAborted();
    await atomicWrite(join(attemptDirectory,'review.json'),JSON.stringify({sourceSha256,sampleMap,...review},null,2));
    if(review.approved){
      await atomicWrite(join(directory,`scene-${index}.visual-review.json`),JSON.stringify({approved:true,sourceSha256,attempt,evidence,review},null,2));
      return source;
    }
    source=review.source!;
  }
  throw new Error('Automatic visual review rejected the scene after three rendered candidates; no scene was published. See saved frame evidence and findings.');
}
