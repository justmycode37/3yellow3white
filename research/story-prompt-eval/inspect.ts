import { readFile, readdir, writeFile } from 'node:fs/promises';
import { parsePlannedLesson } from '../../backend/src/agents/planning.ts';
import { parseStoryline } from '../../backend/src/narration/markdown.ts';
const base=import.meta.dir;
const result=[];
for(const name of (await readdir(`${base}/outputs`)).filter(n=>n.endsWith('.json')).sort()) {
  const id=name.replace(/^(baseline|control|candidate|final)-/,'').replace(/\.json$/,'');
  if(!await Bun.file(`${base}/${id}.request.json`).exists())continue;
  const request=JSON.parse(await readFile(`${base}/${id}.request.json`,'utf8'));
  const output=await readFile(`${base}/outputs/${name}`,'utf8');
  try {
    const lesson=JSON.parse(output),story=parseStoryline(lesson.markdown);
    const words=story.beats.map(b=>b.blocks.reduce((sum,x)=>sum+(x.kind==='speech'?(x.text.match(/\S+/g)?.length??0):0),0));
    const pauses=story.beats.flatMap(b=>b.blocks.filter(x=>x.kind==='pause'));
    const pauseSeconds=pauses.reduce((s,x)=>s+x.durationSec,0),totalWords=words.reduce((a,b)=>a+b,0);
    let error:string|undefined;
    try {parsePlannedLesson(output,request);}catch(e){error=e instanceof Error?e.message:String(e);}
    result.push({file:name,valid:!error,...(error?{error}:{}),scenes:story.beats.length,words:totalWords,wordsPerScene:words,pauseCount:pauses.length,pauseSeconds,estimateSecondsAt140:Math.round((60*totalWords/140+pauseSeconds)*1.1),estimateSecondsRange:[150,125].map(wpm=>Math.round((60*totalWords/wpm+pauseSeconds)*1.1))});
    await writeFile(`${base}/outputs/${name.replace('.json','.script.md')}`,lesson.markdown);
  }catch(e){result.push({file:name,valid:false,error:e instanceof Error?e.message:String(e)})}
}
await writeFile(`${base}/mechanical-results.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
