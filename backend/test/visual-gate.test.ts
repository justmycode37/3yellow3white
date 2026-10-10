import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileSource } from 'animlib/core';
import { reviewGeneratedScene, sampleReviewTimes } from '../src/agents/visual-gate.js';
import type { AgentTask } from '../src/agents/runtime.js';
const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const source=`export default scene({audio:'voice',end:'hold'},s=>{s.text('label',{text:'DNA',position:[5,0]});s.wait(4);});`;
const repair=source.replace('[5,0]','[0,0]');
async function fixture(){const directory=await mkdtemp(join(tmpdir(),'visual-gate-'));roots.push(directory);return {
  source,directory,index:0,videoId:crypto.randomUUID(),signal:new AbortController().signal,
  task:{systemPrompt:'Same style and complete API.',prompt:'Authoritative narration and request.'},
  input:{audioAssetId:'voice',endMode:'hold' as const,scene:{id:'beat-1',durationSec:4},planning:{}},
  validate:async(value:string)=>{await compileSource(value);},
};}
test('image rejection produces an automatically repaired candidate that must be rendered and approved again',async()=>{
  const input=await fixture(),rendered:string[]=[],tasks:AgentTask[]=[];
  const renderFrames=async({source,directory}: {source:string;directory:string})=>{
    rendered.push(source);const path=join(input.directory,`image-${rendered.length}.png`);await writeFile(path,'PNG proof fixture');
    return {backend:'test',frames:[{path,time:4,width:1280,height:720}],sheets:[{path,width:1280,height:720,times:[4],columns:2}]};
  };
  const runner={async run(task:AgentTask){tasks.push(task);expect(task.images).toHaveLength(2);
    const output=tasks.length===1?JSON.stringify({approved:false,findings:[{timeSec:4,objectIds:['label'],problem:'Clipped label',fix:'Move inside frame'}],source:repair}):JSON.stringify({approved:true,findings:[]});
    await task.validate!(output);return output;
  }};
  const result=await reviewGeneratedScene({...input,runner,renderFrames});
  expect(result).toBe(repair);expect(rendered).toEqual([source,repair]);
  expect(tasks[1].prompt).toContain(repair);expect(tasks[0].systemPrompt).toContain('Current animation quality policy');
  const receipt=JSON.parse(await readFile(join(input.directory,'scene-0.visual-review.json'),'utf8'));
  expect(receipt.approved).toBe(true);expect(receipt.attempt).toBe(1);expect(receipt.sourceSha256).toHaveLength(64);
});
test('repeated visual rejection fails closed instead of accepting final unreviewed repair',async()=>{
  const input=await fixture();let renders=0;
  const renderFrames=async()=>{renders++;const path=join(input.directory,'frame.png');await writeFile(path,'test');return {backend:'test',frames:[{path,time:4,width:960,height:720}],sheets:[{path,width:960,height:720,times:[4],columns:2}]};};
  await expect(reviewGeneratedScene({...input,renderFrames,runner:{async run(){return JSON.stringify({approved:false,findings:[{timeSec:4,objectIds:['label'],problem:'Unreadable',fix:'Reframe'}],source:repair});}}})).rejects.toThrow('visual review');
  expect(renders).toBe(3);
  await expect(readFile(join(input.directory,'scene-0.visual-review.json'))).rejects.toThrow();
});
test('render failures and cancellation never invoke approving reviewer',async()=>{
  const input=await fixture();let calls=0;const runner={async run(){calls++;return JSON.stringify({approved:true,findings:[]});}};
  await expect(reviewGeneratedScene({...input,runner,renderFrames:async()=>{throw new Error('GPU unavailable');}})).rejects.toThrow('GPU unavailable');
  const controller=new AbortController();controller.abort(new Error('cancelled'));
  await expect(reviewGeneratedScene({...input,runner,signal:controller.signal})).rejects.toThrow('cancelled');expect(calls).toBe(0);
});
test('sampling includes camera transition interior, end points and a nonzero opening frame',async()=>{
  const compiled=await compileSource(`export default scene({mode:'3d'},s=>{s.wait(1);s.play(s.camera.to2D(),{duration:2});s.wait(5);});`);
  const times=sampleReviewTimes(compiled);expect(times).toContain(0);expect(times).toContain(8);expect(times).toContain(2);expect(times.some(t=>t>0&&t<1)).toBe(true);expect(times.length).toBeLessThanOrEqual(12);
});
