import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { gfmTable } from "micromark-extension-gfm-table";
import type { Nodes, Table } from "mdast";
import { NarrationError } from "./errors.js";
import { formatError as bad, identifyLabel, inlinePause, labelled, pauseDirective, pauseSeconds } from "./markdown-labels.js";
import type { Label } from "./markdown-labels.js";
import type { ScriptBeat, SourceRange, SpeechRole, Storyline } from "./types.js";

const parse = (text: string) => fromMarkdown(text, { extensions: [gfmTable()], mdastExtensions: [gfmTableFromMarkdown()] });
function plain(node: Nodes): string {
  if (node.type === "break") return "\n";
  if (node.type === "html" && /^<br\s*\/?\s*>$/i.test(node.value)) return "\n";
  if (node.type === "image" || node.type === "imageReference") return "[image]";
  if ("value" in node) return node.value;
  if ("children" in node) return node.children.map(child => plain(child)).join("");
  return "";
}
function source(node: Nodes): SourceRange {
  return { start: node.position!.start.offset!, end: node.position!.end.offset!, line: node.position!.start.line };
}
const blank = (text: string) => text.replace(/[^\r\n]/g, " ");
const preamble = /^(?:(?:sure|certainly)[!.]?\s*)?(?:here(?:'s| is) (?:the |your |a )?(?:final |revised |updated |complete )?(?:storyline|narration|script|markdown)(?: script| in markdown)?)[.!:]?$/i;
const wrapperBoilerplate = /^(?:(?:sure|certainly)[!.]?|let me know if you(?:'d| would) like (?:any )?(?:changes|adjustments|revisions)[.!]?)$/i;
function prepared(markdown: string): string {
  // Mask presentation wrappers instead of deleting them: every offset still indexes the original document.
  let text = markdown.replace(/^\uFEFF/, " ").replace(/<!--[\s\S]*?-->/g, blank);
  const nodes = parse(text).children;
  const wrappers = nodes.filter(n => n.type === "paragraph" && (preamble.test(plain(n).trim()) || wrapperBoilerplate.test(plain(n).trim())));
  const significant = nodes.filter(n => !wrappers.includes(n));
  if (significant.length === 1 && significant[0].type === "code") {
    const code = significant[0];
    if (!code.lang || /^(?:md|markdown|text|plaintext)$/i.test(code.lang)) {
      const range = source(code), raw = text.slice(range.start, range.end);
      const lines = raw.split(/(?<=\n)/);
      if (/^\s*(?:`{3,}|~{3,})/.test(lines[0]) && lines.length > 1) {
        const opening = lines[0].trim().match(/^(`{3,}|~{3,})/)![1];
        const closing = lines.at(-1)!.trim();
        if (!new RegExp(`^${opening[0]}{${opening.length},}$`).test(closing)) bad(range.line, "Close the Markdown code fence before submitting the script.");
        lines[0] = blank(lines[0]); lines[lines.length - 1] = blank(lines.at(-1)!);
        text = text.slice(0, range.start) + lines.join("") + text.slice(range.end);
        for (const wrapper of wrappers) {
          const at = source(wrapper);
          text = text.slice(0, at.start) + blank(text.slice(at.start, at.end)) + text.slice(at.end);
        }
      }
    }
  }
  return text;
}
function beatHeading(text: string): { id: string; title: string } | undefined {
  const match = /^(beat|ponder|scene)\s+([\w-]+)(?:(?:\s*[.:)\]—–-]\s*|\s+)(.*))?$/i.exec(text);
  if (match) return { id: `${match[1]}-${match[2]}`.toLowerCase(), title: match[3]?.trim() || text };
}
function cleanSpeech(text: string, line: number): string {
  const cleaned = text.trim().replace(/^["“]([\s\S]*)["”]$/, "$1").trim();
  if (/[\[\]<>]|\$|\\(?:frac|sqrt|sum)|[=∑√]/u.test(cleaned)) {
    bad(line, "Spoken text contains an ambiguous direction or equation. Put production notes under Notes: and write math as spoken words. Explicit [pause 3s] directives are supported.");
  }
  return cleaned.replace(/\s+/g, " ");
}

/** Normalize Markdown presentation, never invent narration, pause lengths, or acoustic timings. */
export function parseStoryline(markdown: string): Storyline {
  if (typeof markdown !== "string" || !markdown.trim() || markdown.length > 50_000) {
    throw new NarrationError("SCRIPT_SIZE", "Provide a nonempty Markdown script of at most 50,000 characters.");
  }
  const text = prepared(markdown), ast = parse(text);
  const beats: ScriptBeat[] = [], ids = new Set<string>();
  let title = "Narration", globalContext = "", beat: ScriptBeat | undefined, beatDepth = 2;
  let role: SpeechRole | undefined, inContext = false, pendingLabel: number | undefined, lastSpeech = false;
  // Bare prose is supported only for a prose-only document. Mixing unlabeled prose with fields is ambiguous.
  function hasFields(node: Nodes): boolean {
    if (node.type === "table") return true;
    if (node.type === "paragraph" || node.type === "heading") {
      if (plain(node).split(/\r?\n/).some(line => {
        const field = labelled(line.trim());
        return field && field.label.kind !== "pause" && field.label.kind !== "title";
      })) return true;
    }
    return "children" in node && node.children.some(child => hasFields(child));
  }
  const proseOnly = !hasFields(ast);
  function endLabel() {
    if (pendingLabel !== undefined) bad(pendingLabel, "The spoken label has no narration.");
    role = undefined; lastSpeech = false;
  }
  function newBeat(id: string | undefined, name: string, line: number, depth = 2) {
    endLabel(); inContext = false;
    if (!id) { let n = 1; while (ids.has(`beat-${n}`)) n++; id = `beat-${n}`; }
    if (ids.has(id)) bad(line, `Duplicate beat ID ${id}; use a unique scene number.`);
    ids.add(id); beat = { id, title: name, context: globalContext, blocks: [] }; beats.push(beat); beatDepth = depth;
  }
  function current(): ScriptBeat {
    if (!beat) {
      // Creating the default scene must not reset a just-selected speech role.
      beat = { id: "beat-1", title, context: globalContext, blocks: [] }; beats.push(beat); ids.add(beat.id);
    }
    return beat;
  }
  function context(value: string) {
    if (beat) beat.context += value + "\n"; else globalContext += value + "\n";
  }
  function appendSpeech(value: string, range: SourceRange) {
    const cleaned = cleanSpeech(value, range.line); if (!cleaned) return;
    const b = current(), last = b.blocks.at(-1);
    if (lastSpeech && last?.kind === "speech" && last.role === role) {
      last.text += " " + cleaned; last.source.end = range.end;
    } else b.blocks.push({ kind: "speech", id: `${b.id}.u${b.blocks.length + 1}`, role: role!, text: cleaned, source: range });
    pendingLabel = undefined; lastSpeech = true;
  }
  function pause(value: string, range: SourceRange, implicitSeconds = false) {
    if (pendingLabel !== undefined) bad(pendingLabel, "The spoken label has no narration before the pause.");
    const durationSec = pauseSeconds(value, range.line, implicitSeconds), b = current();
    b.blocks.push({ kind: "pause", id: `${b.id}.p${b.blocks.length + 1}`, durationSec, source: range });
    lastSpeech = false; // Keep the role so ordinary prose can continue after the silence.
  }
  function speech(value: string, range: SourceRange) {
    let cursor = 0;
    for (const match of value.matchAll(inlinePause)) {
      appendSpeech(value.slice(cursor, match.index), range);
      pause(pauseDirective(match[0])!, range);
      cursor = match.index! + match[0].length;
    }
    appendSpeech(value.slice(cursor), range);
  }
  function field(label: Label, value: string, range: SourceRange, original: string) {
    if (label.kind === "speech") {
      if (role !== label.role || pendingLabel === undefined) endLabel();
      role = label.role; inContext = false; pendingLabel ??= range.line;
      speech(value, range); return;
    }
    if (label.kind === "pause") {
      inContext = false; pause(value, range, /^pause(?:_s\b|\s*\((?:s|seconds)\))/i.test(original)); return;
    }
    endLabel();
    if (label.kind === "title") {
      if (beat) bad(range.line, "Place the lesson title before its scenes.");
      if (!value.trim()) bad(range.line, "Give the lesson a title.");
      title = value.trim(); inContext = false;
    } else { inContext = true; context(original); }
  }
  function line(value: string, range: SourceRange, marked = false) {
    value = value.trim(); if (!value) return;
    if (!beat && !role && preamble.test(value)) return;
    const directive = pauseDirective(value);
    if (directive !== undefined) { inContext = false; pause(directive, range); return; }
    const label = labelled(value);
    if (label) { field(label.label, label.text, range, value); return; }
    const heading = beatHeading(value);
    if (heading && (marked || !role || /^(?:beat|ponder|scene)-\d+$/.test(heading.id))) { newBeat(heading.id, heading.title, range.line); return; }
    if (inContext) { context(value); return; }
    if ((marked || !role || value.endsWith(":")) && /^[\p{L}][\p{L}\p{N} _()/-]{0,50}[:：]/u.test(value)) {
      bad(range.line, "Unrecognized field label. Use Narration: for speech or Notes: for nonspoken material.");
    }
    if (!role && proseOnly) role = "narration";
    if (role) { speech(value, range); return; }
    bad(range.line, "This document mixes speech and production fields. Label this passage Narration: or Notes: so production notes are not read aloud.");
  }
  function table(node: Table) {
    const headers = node.children[0].children.map(cell => plain(cell).trim());
    if (headers.length === 2 && /^(field|type|label|section)$/i.test(headers[0]) && /^(text|content|value|script)$/i.test(headers[1])) {
      for (const row of node.children.slice(1)) {
        const [key, value] = row.children.map(cell => plain(cell).trim());
        const label = identifyLabel(key ?? "");
        if (!label) bad(source(row).line, `Unknown table field ${key}; use an explicit speech or context label.`);
        field(label, value ?? "", source(row), `${key}: ${value ?? ""}`);
      }
      return;
    }
    const labels = headers.map(identifyLabel);
    if (!labels.some(label => label?.kind === "speech")) bad(source(node).line, "A storyboard table needs a Narration or Voiceover column; put reference tables under Notes:.");
    const sceneColumn = headers.findIndex(h => /^(scene|beat|ponder)(?: id)?$/i.test(h));
    const titleColumn = headers.findIndex(h => /^(?:scene |beat )?title$/i.test(h));
    for (const row of node.children.slice(1)) {
      const cells = row.children.map(cell => plain(cell).trim());
      const sceneText = sceneColumn < 0 ? "" : cells[sceneColumn];
      if (sceneText) {
        const parsed = beatHeading(sceneText) ?? beatHeading(`${headers[sceneColumn].replace(/ id$/i, "")} ${sceneText}`);
        if (!parsed) bad(source(row).line, "Use a scene number or Scene 1 — Title in the scene column.");
        if (beat?.id !== parsed.id) newBeat(parsed.id, cells[titleColumn] || parsed.title, source(row).line);
      } else if (sceneColumn < 0) newBeat(undefined, cells[titleColumn] || `Scene ${beats.length + 1}`, source(row).line);
      else if (!beat) bad(source(row).line, "The first storyboard row needs a scene number.");
      // Nonspoken cells remain context; only explicitly spoken columns and pauses enter the audio sequence.
      row.children.forEach((cell, i) => {
        if (!cells[i] || i === sceneColumn || i === titleColumn) return;
        const label = labels[i];
        if (label?.kind === "speech" || label?.kind === "pause") field(label, cells[i], source(cell), `${headers[i]}: ${cells[i]}`);
        else context(`${headers[i] ?? "Notes"}: ${cells[i]}`);
      });
      endLabel(); inContext = false;
    }
  }
  function walk(node: Nodes, contextOnly = false) {
    const range = source(node);
    if (contextOnly) { context(markdown.slice(range.start, range.end)); return; }
    if (node.type === "list" || node.type === "listItem" || node.type === "blockquote") {
      for (const child of node.children) walk(child, node.type === "listItem" && inContext && (child.type === "list" || child.type === "blockquote"));
      return;
    }
    if (node.type === "definition") return;
    if (node.type === "thematicBreak") { endLabel(); inContext = false; return; }
    if (node.type === "heading") {
      const value = plain(node).trim(), label = labelled(value);
      const directive = pauseDirective(value);
      if (directive !== undefined) { inContext = false; pause(directive, range); return; }
      // A top-level "Narration" heading can name the whole response or introduce its prose.
      if (node.depth === 1 && !beat && label?.label.kind === "speech" && !label.text) {
        title = value; role = label.label.role; inContext = false; return;
      }
      if (label && !(label.label.kind === "title" && !label.text)) { field(label.label, label.text, range, value); return; }
      const named = beatHeading(value);
      if (named) { newBeat(named.id, named.title, range.line, node.depth); return; }
      if (node.depth === 1 && !beat) { title = value; return; }
      if (proseOnly && beat && !beat.blocks.length) { beat.title = value; beatDepth = node.depth; }
      else if (!beat || node.depth <= beatDepth || proseOnly) newBeat(undefined, value, range.line, node.depth);
      else { endLabel(); inContext = true; context(markdown.slice(range.start, range.end)); }
      return;
    }
    if (node.type === "table") {
      if (inContext) context(markdown.slice(range.start, range.end)); else table(node);
      return;
    }
    if (node.type === "paragraph") {
      const values = plain(node).split(/\r\n?|\n/), raw = text.slice(range.start, range.end).split(/\r\n?|\n/);
      let offset = range.start;
      values.forEach((value, i) => {
        // Multiline links/HTML may have fewer rendered lines: use the enclosing source range in that case.
        const location = raw.length === values.length ? { start: offset, end: offset + raw[i].length, line: range.line + i } : range;
        line(value, location, /^\s*(?:\*{1,2}|_{1,2})/.test(raw[i] ?? ""));
        offset += (raw[i]?.length ?? 0) + (text.slice(location.end, location.end + 2) === "\r\n" ? 2 : 1);
      });
      return;
    }
    if (inContext) { context(markdown.slice(range.start, range.end)); return; }
    bad(range.line, "Code, HTML, and reference material belong under Notes:. Submit prose or a Markdown script with spoken labels.");
  }
  ast.children.forEach(node => walk(node)); endLabel();
  if (!beats.length || beats.length > 100) throw new NarrationError("SCRIPT_BEATS", "Use between 1 and 100 beats.");
  for (const b of beats) if (!b.blocks.length) throw new NarrationError("SCRIPT_BEATS", `Beat ${b.id} has no speech or pause.`);
  const blocks = beats.flatMap(b => b.blocks);
  if (blocks.length > 500 || blocks.reduce((total, b) => total + (b.kind === "pause" ? b.durationSec : 0), 0) > 600) {
    throw new NarrationError("SCRIPT_SIZE", "Use at most 500 blocks and 600 seconds of explicit pauses per lesson.");
  }
  const count = blocks.reduce((n, b) => n + (b.kind === "speech" ? b.text.length : 0), 0);
  if (!count || count > 20_000) throw new NarrationError("SCRIPT_SIZE", "Use between 1 and 20,000 spoken characters per lesson.");
  return { title, markdown, beats };
}
