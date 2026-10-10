import { describe, expect, it } from 'vitest';
import { SceneSequence } from '../src/sequence.js';
import { evaluateScene } from '../src/timeline.js';
import { reactiveCases } from './reactive-cases.js';

// Randomized but reproducible control histories, including repeated values and bounds.
function changes() {
  let seed=12345;
  return Array.from({length:32},(_,i)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return {id:i%3?'x':'y',value:i%7===0?4:i%11===0?-1:0.1+(seed/2**32)*2.9};});
}
describe('reactive/rebuilt scene equivalence',()=>{
  for(const fixture of reactiveCases) it(fixture.name,async()=>{
    const legacy=new SceneSequence(),reactive=new SceneSequence();
    try {
      for(const [sequence,source] of [[legacy,fixture.legacy],[reactive,fixture.reactive]] as const) {
        const result=await sequence.submit({type:'load',scenes:[{id:'a',source}]});
        expect(result,JSON.stringify(result)).toMatchObject({ok:true});
      }
      const original=reactive.compiled[0];
      for(const change of changes()) {
        await legacy.setControl('a',change.id,change.value);
        await reactive.setControl('a',change.id,change.value);
        expect(reactive.compiled[0]).toBe(original);
        for(const time of [0,0.5,1,1.999,2,3,0.5]) {
          expect(reactive.frame(0,time),`${fixture.name}: ${JSON.stringify(change)} @ ${time}`).toEqual(legacy.frame(0,time));
          const snapshot=JSON.parse(JSON.stringify(reactive.compiled[0]));
          expect(evaluateScene(snapshot,time)).toEqual(legacy.frame(0,time));
        }
      }
    } finally {legacy.dispose();reactive.dispose();}
  });
});
