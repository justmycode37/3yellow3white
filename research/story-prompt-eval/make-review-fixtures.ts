import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseStoryline } from '../../backend/src/narration/markdown.ts';
const base = import.meta.dir;
const read = (p: string) => readFile(`${base}/${p}`, 'utf8');
const load = async (p: string) => JSON.parse(await read(p));
await mkdir(`${base}/review-fixtures`, {recursive:true});
await mkdir(`${base}/reviews`, {recursive:true});
const entries: {id:string;caseId:string;expected:string;reason:string;edit?:(x:any)=>void}[] = [
  {id:'amber',caseId:'uniform',expected:'pass',reason:'Correct definition-first quantifier argument, no mandatory concrete-first opening.'},
  {id:'birch',caseId:'history',expected:'pass',reason:'Qualified evidence comparison; no mandatory math, mystery, or pause.'},
  {id:'cobalt',caseId:'leaf',expected:'revise',reason:'Central mechanism removed from speech AND evidence; labels merely restate tradeoff.',edit(x){
    x.markdown = '# A leaf trades water for carbon\n\n## Beat 1 — Open\nContent needed: Label a leaf with carbon in and water out.\nNarration: A leaf has tiny pores called stomata. Opening them helps the leaf gain carbon dioxide, but it loses water.\n\n## Beat 2 — Tradeoff\nContent needed: Display the sentence Opening trades water for carbon. Do not depict paths, conditions, or mechanisms.\nNarration: This is the tradeoff. Carbon goes in and water goes out. Opening is good for carbon and bad for conserving water. The diagram makes the tradeoff clear.\n\n## Beat 3 — Close\nContent needed: Show the label Closing conserves water but restricts carbon.\nNarration: In dry conditions the pores narrow. This conserves water but restricts carbon uptake. Some water loss continues. Opening trades water for carbon; closing reverses that tradeoff.';
    x.plan.scenes.forEach((s:any,i:number)=>{s.visualDescription='2D (because this is a labeled schematic): A still leaf with a sentence stating '+['carbon in; water out','opening trades water for carbon','closing restricts both'][i]+'. Do not show gas paths, shared passage, humidity difference, or other mechanism. No controls.';s.endsWith='Same still leaf and current conclusion label.';});
  }},
  {id:'dune',caseId:'bayes',expected:'revise',reason:'False arithmetic: 9/108 called 90%.',edit(x){ x.markdown=x.markdown.replace('one in twelve, or about eight point three percent','ninety percent');}},
  {id:'elm',caseId:'uniform',expected:'revise',reason:'Plan leaks answer to maximum-error question during its pause.',edit(x){x.plan.scenes[3].visualDescription='2D (because this is a function plot): Before the prediction question, prominently label the maximum at x=a and show maximum error a^n. Keep both answer labels highlighted throughout the thinking pause. At Reveal leave those labels in place. Preserve the graph and endpoint conventions from the script.';}},
  {id:'flint',caseId:'history',expected:'revise',reason:'Unsupported definitive sole-cause claim from limited packet.',edit(x){x.markdown=x.markdown.replace('The cut may have contributed to the stoppage. Without other workers\' accounts or further evidence, we cannot establish a single cause or all workers\' motives.','The wage cut was the sole cause of the stoppage, and every worker stopped for that reason.');}},
];
for (const e of entries) {
 const draft=await load(`outputs/baseline-${e.caseId}.json`),request=await load(`${e.caseId}.request.json`);
 // Correct harness-path references for isolated reviewer tests; raw author results stay untouched.
 for(const s of draft.plan.scenes)for(const ref of s.sourceRefs)if(ref.document===`${e.caseId}.request.json`)ref.document='request';
 e.edit?.(draft);
 const story=parseStoryline(draft.markdown);
 await writeFile(`${base}/review-fixtures/${e.id}.json`,JSON.stringify({request,draft,parsedScenes:story.beats},null,2));
}
await writeFile(`${base}/review-expected.json`,JSON.stringify(entries.map(({edit,...e})=>e),null,2));
const oldSystem=await read('baseline-system.txt');
const oldGuidance=await read('baseline/guidance.md');
const capabilities=await readFile(new URL('../../shared/animlib/docs/capabilities.md',import.meta.url),'utf8');
const oldQuality=oldSystem.slice(oldSystem.indexOf('# Current animation quality policy'));
await writeFile(`${base}/baseline-review-system.txt`,`${await read('baseline/story-review.md')}\n\nExplanation guidance:\n${oldGuidance}\n\n${capabilities}\n\n${oldQuality}\n\nReturn only the editorial review JSON, not the authoring format.`);
console.log('Created six reviewer fixtures and private expectations; no media generated.');
