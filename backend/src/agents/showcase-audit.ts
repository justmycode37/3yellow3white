/** Verify exported evidence against raw generation, without compiling or editing scenes. */
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const repo=fileURLToPath(new URL('../../..',import.meta.url));
const batch=process.env.SHOWCASE_BATCH??'20261010-batch1';
assert.match(batch,/^[a-z0-9-]+$/);
const raw=join(repo,'data/showcases',batch),archive=join(repo,'docs/demos/showcases',batch);
const hash=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(await readFile(join(archive,'manifest.json'),'utf8'));
const original=JSON.parse(await readFile(join(raw,'manifest.json'),'utf8'));
for(const artifact of manifest.artifacts){
  const bytes=await readFile(join(archive,artifact.path));
  assert.equal(hash(bytes),artifact.sha256,`Archive digest: ${artifact.path}`);
  assert.equal(hash(bytes),hash(await readFile(join(raw,artifact.path))),`Raw identity: ${artifact.path}`);
}
let sources=0,approvedSources=0;
for(const run of manifest.runs){
  const sourceRun=original.runs.find((r:{id:string})=>r.id===run.id);
  assert.equal(run.prompt,sourceRun.prompt,`Prompt identity: ${run.id}`);
  assert.equal(hash(run.prompt),run.promptSha256,`Prompt digest: ${run.id}`);
  assert.equal(run.status,sourceRun.status,`Status identity: ${run.id}`);
  assert.deepEqual(run.scenes,sourceRun.scenes,`Scene identity: ${run.id}`);
  if(!run.scenes.length)continue;
  sources++;
  if(run.status==='complete'){
    assert.equal(hash(run.scenes[0].source),run.review.sourceSha256,`Approved source: ${run.id}`);
    assert.equal(await readFile(join(archive,run.videoId,'scene-0.js'),'utf8'),run.scenes[0].source);
    approvedSources++;
  }
}
const wav=await readFile(join(archive,'silence.wav'));
assert.equal(hash(wav),hash(await readFile(join(raw,'silence.wav'))));
assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
assert.equal(wav.readUInt32LE(4),wav.length-8);assert.equal(wav.readUInt16LE(20),1);
assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt32LE(24),24000);
assert.equal(wav.readUInt16LE(34),16);assert.equal(wav.readUInt32LE(40),24000*20*2);
assert.equal(wav.length,44+24000*20*2);assert.ok(wav.subarray(44).every(byte=>byte===0));
console.log(JSON.stringify({batch,artifacts:manifest.artifacts.length,sources,approvedSources,silentAudio:{seconds:20,sampleRate:24000,channels:1,bits:16,nonzeroSamples:0}}));
