import { fromMarkdown } from "mdast-util-from-markdown";
import type { RootContent, Nodes } from "mdast";
import { NarrationError } from "./errors.js";
import type { ScriptBeat, SourceRange, SpeechRole, Storyline } from "./types.js";

const speechLabel = /^(narration|invitation\s*\(spoken\)|hint\s*\(spoken\)|reveal\s*\(spoken\)|credit\s*\(spoken\))\s*:\s*/i;
const contextLabel = /^(content[ _]needed|question|new[ _]idea|ingredients[ _]established|viewer[ _]task|carries[ _]forward|notes|context|likely[ _]wrong[ _]answer|question[ _]raised[ _]by[ _]previous|discovery|target[ _]duration)\s*:/i;
function plain(node: Nodes): string {
  if (node.type === "image" || node.type === "imageReference") return "";
  if ("value" in node) return node.value;
  if ("children" in node) return node.children.map(child => plain(child as Nodes)).join(node.type === "blockquote" ? "\n" : "");
  return "";
}
function source(node: Nodes): SourceRange {
  return { start: node.position!.start.offset!, end: node.position!.end.offset!, line: node.position!.start.line };
}
function bad(line: number, message: string): never {
  throw new NarrationError("SCRIPT_FORMAT", `Line ${line}: ${message}`);
}
function cleanSpeech(text: string, line: number): string {
  const cleaned = text.trim().replace(/^(["“])([\s\S]*)["”]$/, "$2").trim();
  if (/[\[\]<>]|\$|\\(?:frac|sqrt|sum)|[=∑√]/u.test(cleaned)) {
    bad(line, "Spoken text must contain only words to read aloud. Put pauses on separate labelled lines and write math as spoken language.");
  }
  return cleaned.replace(/\s+/g, " ");
}

/** Labels select speech; all ordering comes from the document, never from estimated timings. */
export function parseStoryline(markdown: string): Storyline {
  if (typeof markdown !== "string" || !markdown.trim() || markdown.length > 50_000) {
    throw new NarrationError("SCRIPT_SIZE", "Provide a nonempty Markdown script of at most 50,000 characters.");
  }
  const ast = fromMarkdown(markdown);
  let title = "Narration";
  const beats: ScriptBeat[] = [];
  let beat: ScriptBeat | undefined;
  let role: SpeechRole | undefined;
  let inContext = false;
  let pendingLabel: number | undefined;
  let lastSpeech = false;
  const ids = new Set<string>();
  const current = () => beat ?? (beat = { id: "beat-1", title, context: "", blocks: [] }, beats.push(beat), ids.add(beat.id), beat);
  function endLabel() {
    if (pendingLabel !== undefined) bad(pendingLabel, "The spoken label has no narration.");
    role = undefined; lastSpeech = false;
  }
  function appendSpeech(text: string, range: SourceRange) {
    const value = cleanSpeech(text, range.line);
    if (!value) return;
    const b = current();
    const last = b.blocks.at(-1);
    if (lastSpeech && last?.kind === "speech" && last.role === role) {
      last.text += " " + value; last.source.end = range.end;
    } else b.blocks.push({ kind: "speech", id: `${b.id}.u${b.blocks.length + 1}`, role: role!, text: value, source: range });
    pendingLabel = undefined; lastSpeech = true;
  }
  function handle(node: RootContent) {
    const range = source(node);
    const text = plain(node).trim();
    if (node.type === "thematicBreak") { endLabel(); inContext = false; return; }
    if (node.type === "definition") return;
    if (node.type === "heading") {
      const match = /^(beat|ponder)\s+([\w-]+)(?:\s*[—–:\-]\s*(.*))?$/i.exec(text);
      if (match) {
        endLabel(); inContext = false;
        const id = `${match[1]}-${match[2]}`.toLowerCase();
        if (ids.has(id)) bad(range.line, `Duplicate beat ID ${id}.`);
        ids.add(id); beat = { id, title: match[3] || text, context: "", blocks: [] }; beats.push(beat);
        return;
      }
      if (node.depth === 1 && !beats.length) { title = text; return; }
      const label = speechLabel.exec(text.endsWith(":") ? text : text + ":");
      if (label) { endLabel(); role = label[1].split(/\s/)[0].toLowerCase() as SpeechRole; inContext = false; pendingLabel = range.line; return; }
      endLabel(); inContext = true; current().context += markdown.slice(range.start, range.end) + "\n"; return;
    }
    // Markdown soft line breaks may put multiple labels in one paragraph.
    if (node.type === "paragraph" && text.includes("\n")) {
      const raw = markdown.slice(range.start, range.end);
      if (raw.split("\n").some(l => /^(?:\*\*)?(?:Pause:|pause_s:|\[pause:|Narration:|(?:Invitation|Hint|Reveal|Credit)\s*\(spoken\):)/i.test(l.trim()))) {
        let offset = range.start;
        for (const [index, line] of raw.split("\n").entries()) {
          const part = fromMarkdown(line).children[0];
          if (part) { part.position = { start: { line: range.line + index, column: 1, offset }, end: { line: range.line + index, column: line.length + 1, offset: offset + line.length } }; handle(part); }
          offset += line.length + 1;
        }
        return;
      }
    }
    if (/^(?:\[?pause\s*:|pause_s\s*:)/i.test(text)) {
      endLabel(); inContext = false;
      const pause = /^(?:pause\s*:\s*(\d+(?:\.\d+)?)\s*s|\[pause\s*:\s*(\d+(?:\.\d+)?)\s*s\]|pause_s\s*:\s*(\d+(?:\.\d+)?))$/i.exec(text);
      const durationSec = pause ? Number(pause[1] ?? pause[2] ?? pause[3]) : NaN;
      if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 30) bad(range.line, "Use Pause: 5s (greater than zero, at most 30 seconds), with an exact duration.");
      const b = current(); b.blocks.push({ kind: "pause", id: `${b.id}.p${b.blocks.length + 1}`, durationSec, source: range }); return;
    }
    const label = speechLabel.exec(text);
    if (label) {
      endLabel(); inContext = false; role = label[1].split(/\s/)[0].toLowerCase() as SpeechRole;
      pendingLabel = range.line; appendSpeech(text.slice(label[0].length), range); return;
    }
    if (contextLabel.test(text)) { endLabel(); inContext = true; }
    if (inContext) { current().context += markdown.slice(range.start, range.end) + "\n"; return; }
    if (role && (node.type === "paragraph" || node.type === "blockquote")) { appendSpeech(text, range); return; }
    bad(range.line, "Label spoken text with Narration: and nonspoken material with Notes: or Content needed:.");
  }
  ast.children.forEach(handle); endLabel();
  if (!beats.length || beats.length > 100) throw new NarrationError("SCRIPT_BEATS", "Use between 1 and 100 beats.");
  for (const b of beats) if (!b.blocks.length) throw new NarrationError("SCRIPT_BEATS", `Beat ${b.id} has no speech or pause.`);
  const blocks = beats.flatMap(b => b.blocks);
  if (blocks.length > 500 || blocks.reduce((total, b) => total + (b.kind === "pause" ? b.durationSec : 0), 0) > 600) {
    throw new NarrationError("SCRIPT_SIZE", "Use at most 500 blocks and 600 seconds of explicit pauses per lesson.");
  }
  const count = beats.flatMap(b => b.blocks).reduce((n, b) => n + (b.kind === "speech" ? b.text.length : 0), 0);
  if (!count || count > 20_000) throw new NarrationError("SCRIPT_SIZE", "Use between 1 and 20,000 spoken characters per lesson.");
  return { title, markdown, beats };
}
