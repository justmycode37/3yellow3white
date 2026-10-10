import { NarrationError } from "./errors.js";
import type { Alignment, SentenceTiming, WordTiming } from "./types.js";

export function validateAlignment(value: unknown, duration: number): asserts value is Alignment {
  const a = value as Alignment | undefined;
  const fail = () => { throw new NarrationError("ALIGNMENT_INVALID", "Speech returned missing or invalid character alignment; timestamps were not estimated.", 502); };
  if (!a || !Array.isArray(a.characters) || !a.characters.length || a.characters.length > 100_000 ||
    !Array.isArray(a.character_start_times_seconds) || !Array.isArray(a.character_end_times_seconds) ||
    a.characters.length !== a.character_start_times_seconds.length || a.characters.length !== a.character_end_times_seconds.length) return fail();
  let start = 0, end = 0;
  a.characters.forEach((char, i) => {
    const s = a.character_start_times_seconds[i], e = a.character_end_times_seconds[i];
    // Provider timestamps are rounded to milliseconds; the sample-accurate PCM duration is not.
    if (typeof char !== "string" || !char.length || !Number.isFinite(s) || !Number.isFinite(e) || s < start || e < end || e < s || e > duration + 0.001) fail();
    start = s; end = e;
  });
  if (!a.characters.join("").trim()) fail();
}

/** Every range refers to the provider's character array; Unicode code-unit lengths can differ. */
export function alignWords(a: Alignment, utteranceId: string, offsetSec: number, durationSec = Infinity): { text: string; words: WordTiming[]; sentences: SentenceTiming[] } {
  const text = a.characters.join("");
  const charOffsets: number[] = [];
  let n = 0;
  a.characters.forEach(c => { charOffsets.push(n); n += c.length; });
  const words: WordTiming[] = [];
  const spans: { start: number; end: number }[] = [];
  // Punctuation is retained in spokenText and sentence text, not mistaken for a spoken word.
  const token = /[\p{L}\p{N}\p{M}]+(?:['’\-][\p{L}\p{N}\p{M}]+)*/gu;
  let charCursor = 0;
  for (const match of text.matchAll(token)) {
    const start = match.index!, end = start + match[0].length;
    while (charCursor + 1 < charOffsets.length && charOffsets[charCursor + 1] <= start) charCursor++;
    const first = charCursor;
    while (charCursor + 1 < charOffsets.length && charOffsets[charCursor + 1] < end) charCursor++;
    words.push({ id: `${utteranceId}.w${words.length + 1}`, utteranceId, text: match[0],
      startSec: offsetSec + Math.min(durationSec, a.character_start_times_seconds[first]), endSec: offsetSec + Math.min(durationSec, a.character_end_times_seconds[charCursor]), characterRange: [first, charCursor + 1] });
    spans.push({ start, end });
  }
  if (!words.length) throw new NarrationError("ALIGNMENT_INVALID", "Speech alignment contains no spoken words.", 502);
  const sentences: SentenceTiming[] = [];
  for (const segment of new Intl.Segmenter(undefined, { granularity: "sentence" }).segment(text)) {
    const selected = words.filter((_, i) => spans[i].start >= segment.index && spans[i].start < segment.index + segment.segment.length);
    if (selected.length) sentences.push({ id: `${utteranceId}.s${sentences.length + 1}`, wordIds: selected.map(w => w.id), text: segment.segment.trim(), startSec: selected[0].startSec, endSec: selected.at(-1)!.endSec });
  }
  return { text, words, sentences };
}
