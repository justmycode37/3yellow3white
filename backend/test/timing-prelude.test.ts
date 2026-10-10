import { expect, test } from 'bun:test';
import { compileSource, evaluateScene } from 'animlib/core';
import { attachTimingPrelude } from '../src/agents/timing-prelude.js';

const packet = { audioAssetId: 'test-audio', endMode: 'hold' as const, scene: {
  durationSec: 1.23456789, utterances: [{ words: [{ id: 'beat-1.u1.w1', startSec: 0.123456789, endSec: 0.456789123 }] }],
} };

test('host cue data yields exactly the same compiled scene and frames as copied literals', async () => {
  const candidate = attachTimingPrelude(`export default scene({audio:__narration.audioAssetId,end:__narration.endMode},s=>{
    s.wait(__narration.start('beat-1.u1.w1'));
    const dot=s.circle('dot',{radius:0.2});
    s.play(dot.moveTo([1,0]),{duration:__narration.end('beat-1.u1.w1')-__narration.start('beat-1.u1.w1')});
    s.wait(__narration.durationSec-__narration.end('beat-1.u1.w1'));
  });`,packet);
  const control = `export default scene({audio:'test-audio',end:'hold'},s=>{
    s.wait(0.123456789);const dot=s.circle('dot',{radius:0.2});
    s.play(dot.moveTo([1,0]),{duration:0.456789123-0.123456789});s.wait(1.23456789-0.456789123);
  });`;
  const [a,b]=await Promise.all([compileSource(candidate),compileSource(control)]);
  expect(a).toEqual(b);
  for(const t of [0,0.123456789,0.3,0.456789123,1.23456789])expect(evaluateScene(a,t)).toEqual(evaluateScene(b,t));
});

test('missing word IDs fail instead of silently choosing another spoken occurrence', async () => {
  await expect(compileSource(attachTimingPrelude(`export default scene({},s=>{s.wait(__narration.start('absent'));});`,packet))).rejects.toThrow('Unknown narration word ID');
});

test('duplicate IDs and invalid durations are rejected before assembling source', () => {
  const duplicate=structuredClone(packet);duplicate.scene.utterances[0].words.push({...duplicate.scene.utterances[0].words[0]});
  expect(()=>attachTimingPrelude('source',duplicate)).toThrow('Duplicate');
  expect(()=>attachTimingPrelude('source',{...packet,scene:{...packet.scene,durationSec:NaN}})).toThrow('duration');
});

test('narration constants cannot be changed by generated source', async () => {
  const compiled=await compileSource(attachTimingPrelude(`export default scene({},s=>{__narration.durationSec=8;s.wait(__narration.durationSec);});`,packet));
  expect(compiled.duration).toBe(packet.scene.durationSec);
});

test('sample-derived floating-point rounding at the final word preserves its exact time', async () => {
  const boundary = structuredClone(packet);
  boundary.scene.durationSec = 7200 / 24000;
  boundary.scene.utterances[0].words[0] = {
    id: 'beat-1.u1.w1', startSec: 2400 / 24000, endSec: 2400 / 24000 + 4800 / 24000,
  };
  const compiled = await compileSource(attachTimingPrelude(`export default scene({},s=>{s.wait(__narration.end('beat-1.u1.w1'));});`, boundary));
  expect(compiled.duration).toBe(0.30000000000000004);
  boundary.scene.utterances[0].words[0].endSec = 0.31;
  expect(() => attachTimingPrelude('source', boundary)).toThrow('Invalid narration word timing');
});
