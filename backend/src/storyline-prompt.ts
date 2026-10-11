import { readFile } from "node:fs/promises";

/** Pass these messages to the storyline writer; its Markdown output goes to NarrationService.submit(). */
export async function buildStorylineMessages(material: string, sceneRequest = false) {
  const [guidance, capabilities] = await Promise.all([
    readFile(new URL(sceneRequest ? "../prompts/scene-request-guidance.md" : "../prompts/guidance.md", import.meta.url), "utf8"),
    readFile(new URL("../../shared/animlib/docs/capabilities.md", import.meta.url), "utf8"),
  ]);
  return [
    { role: "system" as const, content: `${guidance}\n\n${capabilities}` },
    { role: "user" as const, content: material },
  ];
}
