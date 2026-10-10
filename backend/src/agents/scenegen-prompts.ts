import { readFile } from 'node:fs/promises';

/** Original PR #36 text. Keep integration code outside these verbatim assets. */
export function scenegenPrompt(name: 'visualization' | 'planning' | 'topics-system' | 'topics-format'): Promise<string> {
  return readFile(new URL(`../../prompts/scenegen/${name}.md`, import.meta.url), 'utf8');
}
