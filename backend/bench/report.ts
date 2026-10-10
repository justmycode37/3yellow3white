import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const root=resolve(import.meta.dir,'../../data/scene-speed');
const rows=[];
for(const id of await readdir(join(root,'runs'))){
  const run=JSON.parse(await readFile(join(root,'runs',id,'result.json'),'utf8'));
  const scenes=run.scenes;
  const metrics:any[]=[];
  const files=await readdir(join(root,'runs',id));
  const metricFiles=files.filter(file=>/^scene-\d+\.metrics\.json$/.test(file));
  for(const file of metricFiles){const record=JSON.parse(await readFile(join(root,'runs',id,file),'utf8'));if(record.metrics)metrics.push(record.metrics);}
  const expectedMetrics=Math.max(scenes.length,metricFiles.length,files.filter(file=>/^scene-\d+\.input\.json$/.test(file)).length);
  const metricsKnown=metrics.length>0&&metrics.length===expectedMetrics;
  const turns=metrics.flatMap(m=>m.turns??[]);
  const sum=(list:any[],fn:(v:any)=>unknown):number|null=>{
    let total=0;
    for(const item of list){const value=fn(item);if(typeof value!=='number'||!Number.isFinite(value))return null;total+=value;}
    return total;
  };
  const measured=(list:any[],fn:(v:any)=>unknown)=>metricsKnown?sum(list,fn):null;
  const turnSum=(fn:(v:any)=>unknown)=>metrics.every(m=>Array.isArray(m.turns))?measured(turns,fn):null;
  const seconds=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?Math.round(value/100)/10:null;
  const rounded=(value:number|null)=>value===null?null:Math.round(value);
  rows.push({id,status:run.status,model:run.model,mode:run.outputMode,reference:run.referenceMode,topic:run.topic,
    sceneCount:scenes.length,wallSeconds:seconds(run.elapsedMs),
    runnerSeconds:seconds(measured(metrics,m=>m.elapsedMs)),
    providerSeconds:seconds(turnSum(t=>t.providerMs)),
    calls:measured(metrics,m=>m.providerCalls),
    inputTokens:turnSum(t=>t.inputTokens),cacheReadTokens:turnSum(t=>t.cacheReadTokens),
    outputTokens:turnSum(t=>t.outputTokens),reasoningTokens:turnSum(t=>t.reasoningTokens),
    finalTextChars:turnSum(t=>t.textChars),toolArgumentChars:turnSum(t=>t.toolArgumentChars),
    failedValidations:measured(metrics,m=>Array.isArray(m.validations)?m.validations.filter((v:any)=>!v.valid).length:null),
    validationMs:rounded(measured(metrics,m=>Array.isArray(m.validations)?sum(m.validations,v=>v.elapsedMs):null)),
    sourceBytes:sum(scenes,s=>s.sourceBytes),errorCode:run.errorCode??''});
}
await writeFile(join(root,'summary.json'),JSON.stringify(rows,null,2));
const columns=Object.keys(rows[0]??{});
await writeFile(join(root,'summary.csv'),[columns.join(','),...rows.map(r=>columns.map(c=>JSON.stringify((r as any)[c])).join(','))].join('\n'));
console.table(rows.map(({id,status,sceneCount,runnerSeconds,calls,outputTokens,failedValidations})=>({id,status,sceneCount,runnerSeconds,calls,outputTokens,failedValidations})));
