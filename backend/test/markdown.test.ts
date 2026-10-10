import { expect, test } from "bun:test";
import { parseStoryline } from "../src/narration/markdown.js";

const canonical = `# Counting

## Beat 1 — Question

Content needed: Two dots.

Narration: One, two.

Invitation (spoken): How many?

Pause: 3s

Hint (spoken): Count them.

Pause: 1.5s

Reveal (spoken): Two dots.

## Beat 2 — Check

Narration: Two again.`;
const outline = (markdown: string) => parseStoryline(markdown).beats.map(beat => ({
  title: beat.title,
  blocks: beat.blocks.map(block => block.kind === "speech" ? { role: block.role, text: block.text } : { pause: block.durationSec }),
}));
const variants: Record<string, string> = {
  "bold labels, full-width colons and case": canonical.replaceAll("Narration:", "**VOICE-OVER**：").replace("Invitation (spoken):", "**Question (spoken):**").replace("Hint (spoken):", "**Hint 1 (spoken)** —").replace("Reveal (spoken):", "**Confirmation**:").replace("Content needed:", "**Visual notes:**"),
  "spoken headings and quoted text": canonical.replace(/^(Narration|Invitation \(spoken\)|Hint \(spoken\)|Reveal \(spoken\)): (.+)$/gm, '### $1\n\n> “$2”'),
  "unordered and nested lists": canonical.replace(/^(Content needed|Narration|Invitation \(spoken\)|Hint \(spoken\)|Reveal \(spoken\)): (.+)$/gm, '- **$1:**\n  - $2').replace(/^Pause: (.+)$/gm, '- **Pause:** $1'),
  "ordered field lists": canonical.replace(/^(Content needed|Narration|Invitation \(spoken\)|Hint \(spoken\)|Reveal \(spoken\)|Pause): (.+)$/gm, '1. $1: $2'),
  "soft wraps with adjacent fields": canonical.replaceAll("\n\n", "\n").replace("One, two.", "One,\ntwo."),
  "whole Markdown code fence and common preamble": "Here's the storyline:\n\n```markdown\n" + canonical + "\n```",
  "code fence with acknowledgement and footer": "Certainly!\n\nHere is the complete storyline:\n\n~~~md\n" + canonical + "\n~~~\n\nLet me know if you'd like any changes.",
  "BOM, CRLF, comments and Unicode": "\uFEFF" + canonical.replace("One, two.", "One, <!-- never spoken -->two.").replaceAll("\n", "\r\n"),
  "plain scene markers": canonical.replace(/^## Beat/gm, 'Beat'),
  "top-level narration wrapper heading": canonical.replace("# Counting", "# Narration"),
  "pause spellings and resumed prose": canonical.replace("Pause: 3s", "[pause for three seconds]").replace("Pause: 1.5s", "(pause 1500 ms)"),
  "dash separator spacing": canonical.replaceAll("Narration:", "Voice-over—").replaceAll("Hint (spoken):", "Hint (spoken)- ").replaceAll("Pause:", "Pause –"),
  "field-value tables": `# Counting

## Beat 1 — Question

| Field | Content |
| --- | --- |
| Notes | Two dots. |
| VO | One, two. |
| Invitation | How many? |
| Pause | 3 seconds |
| Hint | Count them. |
| Silent pause | 1.5 seconds |
| Reveal | Two dots. |

## Beat 2 — Check

| Type | Text |
| --- | --- |
| Spoken text | Two again. |`,
  "storyboard tables with separate production columns": `# Counting

| Beat | Title | Visuals | Voiceover | Question (spoken) | Pause | Hint | Ponder break | Reveal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Question | Two dots. | One, two. | How many? | 3s | Count them. | 1.5s | Two dots. |
| 2 | Check | Keep them. | Two again. | | | | | |`,
};
for (const [name, markdown] of Object.entries(variants)) {
  test(`normalizes ${name} without changing the spoken sequence`, () => {
    expect(outline(markdown)).toEqual(outline(canonical));
    expect(parseStoryline(markdown).beats[0].context).toContain("Two dots.");
  });
}

test("plain prose needs no exact labels, and general section headings become scenes", () => {
  const parsed = parseStoryline("# Counting\n\n## Start\n\nOne, **two**.\n\n[Pause 2 seconds]\n\nThere are two.\n\n## Next\n\nCount again.");
  expect(parsed.title).toBe("Counting");
  expect(parsed.beats.map(b => b.title)).toEqual(["Start", "Next"]);
  expect(parsed.beats[0].blocks.map(b => b.kind === "speech" ? b.text : b.durationSec)).toEqual(["One, two.", 2, "There are two."]);
});
test("inline pauses split speech at the exact position and resume its role", () => {
  const parsed = parseStoryline("Narrator: One. [pause: 2s] Two. (pause for one second) Three.");
  expect(parsed.beats[0].blocks.map(b => b.kind === "speech" ? [b.role, b.text] : b.durationSec)).toEqual([
    ["narration", "One."], 2, ["narration", "Two."], 1, ["narration", "Three."],
  ]);
});
test("prose-only nested headings do not silently drop narration", () => {
  const parsed = parseStoryline("# Lesson\n\n## Part one\n\n### First\n\nOne.\n\n#### Second\n\nTwo.");
  expect(parsed.beats.flatMap(b => b.blocks).filter(b => b.kind === "speech").map(b => b.text)).toEqual(["One.", "Two."]);
});
test("plain colon phrases within narration remain spoken", () => {
  const parsed = parseStoryline("Narration:\nRemember: count each dot once.\nThe conclusion is clear: two dots.");
  expect(parsed.beats[0].blocks[0]).toMatchObject({ text: "Remember: count each dot once. The conclusion is clear: two dots." });
});
test("words about speaking in ordinary prose are not mistaken for nonspoken field markers", () => {
  const parsed = parseStoryline("Narration:\nThose words were not spoken.\nThis is an unspoken assumption.");
  expect(parsed.beats[0].blocks[0]).toMatchObject({ text: "Those words were not spoken. This is an unspoken assumption." });
});
test("unit-labelled table headers support a numeric pause without guessing its units", () => {
  const parsed = parseStoryline("| Voiceover | Pause (s) | Reveal |\n| --- | --- | --- |\n| Count. | 2.5 | Two. |");
  expect(parsed.beats[0].blocks[1]).toMatchObject({ kind: "pause", durationSec: 2.5 });
});
test("nested production notes, nonspoken fields and reference tables never leak into speech", () => {
  const parsed = parseStoryline(`## Scene 1 — Question

- Notes:
  - Narration: an example, not a spoken instruction.
  - Pause: 30s

### Voiceover (not spoken)

Do not read this.

| Example | Value |
| --- | --- |
| Reveal | A hidden answer |

### Spoken text

Count [these dots](https://example.com).

Visual description: Never read this either.

Reveal: Two dots.`);
  expect(parsed.beats[0].blocks.map(b => b.kind === "speech" ? b.text : "pause")).toEqual(["Count these dots.", "Two dots."]);
  expect(parsed.beats[0].context).toContain("A hidden answer");
  expect(parsed.beats[0].context).toContain("an example, not a spoken instruction");
});
test("source ranges still refer to the original fenced CRLF document", () => {
  const markdown = "\uFEFFHere's the script:\r\n\r\n```md\r\n# Title\r\n\r\n## Beat 1 — Question\r\n\r\n**Voiceover:**\r\n> 😀 One.\r\n> Two.\r\n\r\n[Pause 2s]\r\n\r\nReveal: Three.\r\n```";
  const parsed = parseStoryline(markdown), blocks = parsed.beats[0].blocks;
  expect(parsed.markdown).toBe(markdown);
  for (const block of blocks) {
    expect(block.source.line).toBe(markdown.slice(0, block.source.start).split(/\r\n|\n/).length);
    expect(block.source.end).toBeLessThanOrEqual(markdown.length);
    expect(block.source.end).toBeGreaterThan(block.source.start);
  }
  const speech = blocks[0];
  expect(speech).toMatchObject({ text: "😀 One. Two.", source: { line: 9 } });
  expect(markdown.slice(speech.source.start, speech.source.end)).toContain("😀 One.");
  expect(markdown.slice(speech.source.start, speech.source.end)).toContain("Two.");
});
for (const [name, markdown] of Object.entries({
  "unlabelled prose mixed with notes": "Say this.\n\nNotes: Do not read this.",
  "unknown marked field inside narration": "Narration: Count.\n**Storyboard instruction:** display the hidden answer.",
  "unknown standalone field": "Unrecognized field:\nText here.",
  "ambiguous inline pause": "Narration: Think. [pause 3–5s] Continue.",
  "missing inline pause duration": "Narration: Think. [pause] Continue.",
  "approximate duration": "Narration: Think.\nPause: about 5 seconds",
  "stage direction": "Voiceover: One. [show answer] Two.",
  "unknown code language": "```js\nNarration: Wrong container.\n```",
  "unclosed wrapper": "```markdown\nNarration: Missing fence.",
  "speechless table": "| Unclear | Text |\n| --- | --- |\n| Field | A value |",
  "duplicate scene IDs": "Scene 1 — First\nVoiceover: One.\nScene 1 — Again\nVoiceover: Two.",
})) test(`rejects ${name} instead of guessing spoken content`, () => {
  expect(() => parseStoryline(markdown)).toThrow();
});

test("text and pause limits still apply after normalization", () => {
  expect(() => parseStoryline("Voiceover: " + "word ".repeat(4100))).toThrow("20,000");
  expect(() => parseStoryline("Voiceover: Hi.\n" + "[pause 30s]\n".repeat(21))).toThrow("600");
  expect(() => parseStoryline("Voiceover: Hi.\n[Pause 31s]")).toThrow("30 seconds");
});
