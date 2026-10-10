interface TimingPacket {
  audioAssetId: string;
  endMode: 'hold' | 'advance';
  scene: { durationSec: number; utterances: { words: { id: string; startSec: number; endSec: number }[] }[] };
}

export const TIMING_PRELUDE_INSTRUCTIONS = `The host supplies a read-only __narration constant before your source. Do not declare it or copy its timing table into your output. Its API is:
__narration.audioAssetId (exact assigned audio ID), __narration.endMode, __narration.durationSec,
__narration.start(fullWordId) and __narration.end(fullWordId) (exact local startSec/endSec; unknown IDs throw).
Use these supplied values directly when writing scene options and timing expressions; you may alias the accessors inside your scene. All word IDs and timings remain in the authoritative packet below. Keep your usual sequential cursor and timing helpers. This removes copied data only; preserve all explanatory operations, composition, labels, pauses and timing. Return a complete default-exported scene as usual. Validation and playback prepend the same one-line host constant automatically; diagnostics include that extra source line.`;

/** Deterministic source assembly: no scene behavior or timing is inferred. */
export function attachTimingPrelude(source: string, input: TimingPacket): string {
  const { durationSec } = input.scene;
  if (!Number.isFinite(durationSec) || durationSec < 0) throw new Error('Invalid narration duration');
  const words: Record<string, [number, number]> = Object.create(null);
  for (const utterance of input.scene.utterances) for (const word of utterance.words) {
    if (Object.hasOwn(words, word.id)) throw new Error(`Duplicate narration word ID: ${word.id}`);
    // Sample-derived offsets can exceed the total by floating-point rounding.
    // Match scene validation's tolerance without clamping the authoritative values.
    if (![word.startSec,word.endSec].every(Number.isFinite) || word.startSec < 0 || word.endSec < word.startSec || word.endSec > durationSec + 1e-6) throw new Error('Invalid narration word timing');
    words[word.id] = [word.startSec,word.endSec];
  }
  const data = JSON.stringify({audioAssetId:input.audioAssetId,endMode:input.endMode,durationSec,words});
  // Parse a JSON string to avoid object-literal special handling of keys such as __proto__.
  const prelude = `const __narration=(()=>{const data=JSON.parse(${JSON.stringify(data)});const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();`;
  return `${prelude}\n${source}`;
}
