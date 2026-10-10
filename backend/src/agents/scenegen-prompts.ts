import { readFile } from 'node:fs/promises';

/** Active authoring assets; provenance records imported origins and deliberate revisions. */
export function scenegenPrompt(name: 'visualization' | 'planning' | 'topics-system' | 'topics-format'): Promise<string> {
  return readFile(new URL(`../../prompts/scenegen/${name}.md`, import.meta.url), 'utf8');
}
