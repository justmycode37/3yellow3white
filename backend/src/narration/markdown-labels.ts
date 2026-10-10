import { NarrationError } from "./errors.js";
import type { SpeechRole } from "./types.js";

export type Label = { kind: "speech"; role: SpeechRole } | { kind: "context" | "pause" | "title" };
const speechAliases: Record<SpeechRole, string[]> = {
  narration: ["narration", "narrator", "narration text", "narration script", "audio narration", "speech", "voiceover", "voice over", "spoken text", "spoken script", "dialogue", "vo"],
  invitation: ["invitation", "invitation to viewer", "question spoken", "spoken question"],
  hint: ["hint", "hint ladder"],
  reveal: ["reveal", "answer spoken", "spoken answer", "confirmation"],
  credit: ["credit", "viewer credit"],
};
const contextAliases = new Set([
  "content needed", "question", "answer", "new idea", "ingredients established", "viewer task", "carries forward",
  "notes", "note", "context", "likely wrong answer", "question raised by previous", "discovery", "target duration",
  "duration", "estimated duration", "timing", "visual", "visuals", "visual notes", "visual description", "visual cue", "visual cues",
  "animation", "animation notes", "on screen", "on screen text", "screen text", "stage direction", "stage directions",
  "production notes", "scene description", "camera", "music", "sfx", "sound effects", "delivery", "delivery style", "tone", "transition",
  "action", "visual direction", "visual directions", "audio cues", "scene purpose", "learning goal", "timing notes",
]);
export function labelKey(text: string): string {
  return text.trim().toLowerCase().replace(/[()\[\]]/g, " ").replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
}
export function identifyLabel(text: string): Label | undefined {
  const key = labelKey(text).replace(/\s+\d+(?=\s+(?:spoken|aloud)$|$)/, "");
  // A field explicitly marked nonspoken can never become speech via an alias.
  if (/^[\p{L}\p{N} _-]{1,40}\s*[\[(](?:non[ -]?spoken|not spoken|unspoken)[\])]$/iu.test(text.trim())) return { kind: "context" };
  if (["title", "lesson title", "video title"].includes(key)) return { kind: "title" };
  if (["pause", "pause s", "pause seconds", "silence", "silent pause", "ponder pause", "ponder break"].includes(key)) return { kind: "pause" };
  for (const [role, aliases] of Object.entries(speechAliases)) {
    if (aliases.some(alias => key === alias || key === `${alias} spoken` || key === `${alias} aloud`)) return { kind: "speech", role: role as SpeechRole };
  }
  if (contextAliases.has(key)) return { kind: "context" };
}
export function labelled(text: string): { label: Label; text: string } | undefined {
  // Only recognized field names consume a separator. Colons in ordinary narration stay intact.
  for (const separator of text.matchAll(/[:：—–]|\s-|\-\s/g)) {
    if (separator.index! > 60) break;
    const label = identifyLabel(text.slice(0, separator.index));
    if (label) return { label, text: text.slice(separator.index! + separator[0].length).trimStart() };
  }
  const label = identifyLabel(text);
  if (label) return { label, text: "" };
}
export function formatError(line: number, message: string): never {
  throw new NarrationError("SCRIPT_FORMAT", `Line ${line}: ${message}`);
}

const numberWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "twenty one", "twenty two", "twenty three", "twenty four", "twenty five", "twenty six", "twenty seven", "twenty eight", "twenty nine", "thirty"];
export function pauseSeconds(text: string, line: number, implicitSeconds = false): number {
  const value = text.trim().toLowerCase().replace(/^for\s+/, "").replace(/[.]$/, "");
  const unit = /(milliseconds?|ms|seconds?|secs?|s)$/.exec(value);
  const quantity = value.slice(0, unit?.index ?? value.length).trim();
  let seconds = NaN;
  if (unit || implicitSeconds) {
    seconds = /^\d+(?:[.,]\d+)?$/.test(quantity) ? Number(quantity.replace(",", ".")) : numberWords.indexOf(quantity.replace("-", " "));
    if (unit?.[1].startsWith("m")) seconds /= 1000;
  }
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 30) {
    formatError(line, "Give each pause one exact duration, e.g. Pause: 3s or [pause for three seconds] (greater than zero, at most 30 seconds). Ranges and approximate durations are ambiguous.");
  }
  return seconds;
}
export function pauseDirective(text: string): string | undefined {
  const unwrapped = text.trim().replace(/^\[([\s\S]*)\]$/, "$1").replace(/^\(([\s\S]*)\)$/, "$1");
  const match = /^(?:pause|silence|silent pause|ponder pause|ponder break)(?=\s|[:：—–(]|$)\s*(?:[:：—–]|-\s+|for\b|\()?\s*([\s\S]*?)\)?$/i.exec(unwrapped);
  return match?.[1];
}
export const inlinePause = /\[(?:pause|silence|silent pause|ponder pause|ponder break)\b[^\]]*\]|\((?:pause|silence|silent pause|ponder pause|ponder break)\b[^)]*\)/gi;
