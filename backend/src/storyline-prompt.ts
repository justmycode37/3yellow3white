import { readFile } from "node:fs/promises";

/** Pass these messages to the storyline writer; its Markdown output goes to NarrationService.submit(). */
export async function buildStorylineMessages(material: string) {
  const guidance = await readFile(new URL("../prompts/guidance.md", import.meta.url), "utf8");
  return [
    { role: "system" as const, content: guidance },
    { role: "user" as const, content: material },
  ];
}
