import { hash, silence } from './audio.js';
import type { NarrationScenePackage, Storyline, UtteranceTiming, WordTiming } from './types.js';

/** Reading-time estimates, never presented as speech-provider alignment. */
export function buildSubtitlePackage(story: Storyline): NarrationScenePackage {
  const scriptHash = hash(story.markdown);
  let offset = 0;
  const scenes = story.beats.map(beat => {
    let cursor = 0.4;
    const utterances: UtteranceTiming[] = [], pauses: { id: string; startSec: number; endSec: number }[] = [];
    for (const block of beat.blocks) {
      if (block.kind === 'pause') {
        pauses.push({ id: block.id, startSec: cursor, endSec: cursor + block.durationSec });
        cursor += block.durationSec;
        continue;
      }
      const startSec = cursor, words: WordTiming[] = [], sentences: UtteranceTiming['sentences'] = [];
      const tokens = block.text.match(/\S+/gu) ?? [];
      let character = 0;
      for (let first = 0; first < tokens.length;) {
        const chunk: string[] = [];
        while (first < tokens.length && chunk.length < 14) {
          if (chunk.length && [...chunk, tokens[first]].join(' ').length > 84) break;
          const token = tokens[first++]; chunk.push(token);
          if (/[.!?]["'”’)]?$/.test(token)) break;
        }
        const text = chunk.join(' '), duration = Math.max(1.5, chunk.length / 2.5, text.length / 15);
        const selected: WordTiming[] = [];
        chunk.forEach((text, index) => {
          const word: WordTiming = { id: `${block.id}.w${words.length + 1}`, utteranceId: block.id, text,
            startSec: cursor + duration * index / chunk.length, endSec: cursor + duration * (index + 1) / chunk.length,
            characterRange: [character, character + Array.from(text).length] };
          character = word.characterRange[1] + 1; words.push(word); selected.push(word);
        });
        sentences.push({ id: `${block.id}.s${sentences.length + 1}`, wordIds: selected.map(w => w.id), text, startSec: cursor, endSec: cursor + duration });
        cursor += duration;
      }
      utterances.push({ id: block.id, role: block.role, text: block.text, spokenText: block.text, source: block.source,
        startSec, endSec: cursor, words, sentences });
    }
    const durationSec = Math.ceil((cursor + 0.8) * 1000) / 1000, pcm = silence(durationSec);
    const scene = { id: beat.id, title: beat.title, context: beat.context, startSec: offset, durationSec,
      audio: { id: `subtitle-clock-${beat.id}`, url: '', sha256: hash(pcm), sampleCount: pcm.length / 2 }, utterances, pauses };
    offset += durationSec;
    return scene;
  });
  return { id: `subtitles-${scriptHash}`, scriptHash, timingBasis: 'subtitle-reading', totalScenes: scenes.length, scenes };
}
