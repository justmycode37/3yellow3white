import type { Story, StoryBlock, StoryScene } from "./types.js";

export const speechLabels: Record<string, string> = { narration: "Narration", invitation: "Invitation (spoken)", hint: "Hint (spoken)", reveal: "Reveal (spoken)", credit: "Credit (spoken)" };
// Model strings are content, never Markdown structure, paths, HTML, or executable code.
export const md = (value: string) => value.replace(/[\r\n]+/g, " ").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/([\\`*_{}\[\]|~])/g, "\\$1");
export const scenePath = (scene: StoryScene) => `${scene.id}.md`;
export const speechBlock = (block: StoryBlock) => block.kind === "pause" ? `Pause: ${block.seconds}s` : `${speechLabels[block.role]}: ${md(block.text)}`;
export function narrationScene(scene: StoryScene): string {
  return [`## Scene ${scene.id.slice(6)} — ${md(scene.title)}`, ...scene.blocks.map(speechBlock)].join("\n\n");
}
/** Brief conceptual context is nonspoken; no visual/animation instructions belong here. */
export function sceneMarkdown(story: Story, index: number): string {
  const scene = story.scenes[index];
  const before = story.scenes[index - 1]?.id ?? "Opening scene";
  const after = story.scenes[index + 1]?.id ?? "End of video";
  return [
    `## Scene ${scene.id.slice(6)} — ${md(scene.title)}`,
    "### Context (not spoken)",
    [`- Overall goal: ${md(story.goal)}`, `- Before: ${before} — ${md(scene.context.before)}`, `- This scene: ${md(scene.context.purpose)}`, `- After: ${after} — ${md(scene.context.after)}`].join("\n"),
    "### Script",
    ...scene.blocks.map(speechBlock),
  ].join("\n\n") + "\n";
}
export function narrationMarkdown(story: Story): string {
  return [`# ${md(story.title)}`, ...story.scenes.map(narrationScene)].join("\n\n") + "\n";
}
