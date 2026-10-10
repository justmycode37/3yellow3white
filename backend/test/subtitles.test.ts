import {test,expect} from 'bun:test';
import {buildSubtitlePackage} from '../src/narration/subtitles.js';
import {parseStoryline} from '../src/narration/markdown.js';
import {buildSceneAgentInput} from '../src/narration/handoff.js';

test('subtitle timing preserves text and explicit pauses with readable bounded cues',()=>{
 const story=parseStoryline('# Example\n\n## Beat 1\n\nContent needed: Show a dot.\n\nNarration: Read these words carefully. [pause 3s] Then reveal another dot.');
 const pkg=buildSubtitlePackage(story);
 expect(pkg).toEqual(buildSubtitlePackage(story));
 expect(pkg.timingBasis).toBe('subtitle-reading');
 const scene=pkg.scenes[0];
 expect(scene.pauses[0].endSec-scene.pauses[0].startSec).toBeCloseTo(3);
 expect(scene.utterances[1].startSec).toBeGreaterThanOrEqual(scene.pauses[0].endSec);
 expect(scene.utterances.flatMap(u=>u.sentences).map(c=>c.text).join(' ')).toBe('Read these words carefully. Then reveal another dot.');
 for(const u of scene.utterances)for(const cue of u.sentences){expect(cue.endSec-cue.startSec).toBeGreaterThanOrEqual(1.5);expect(cue.endSec).toBeLessThanOrEqual(scene.durationSec);}
 const input=buildSceneAgentInput(pkg,scene.id);
 expect(input.instructions).toContain('No speech');
 expect(input.instructions).not.toContain('provider-derived alignment');
});
