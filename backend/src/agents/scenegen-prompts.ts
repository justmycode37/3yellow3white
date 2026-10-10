import { readFile } from 'node:fs/promises';

/** PR #36 prompt assets, with reviewed API guidance updates. Keep integration code outside them. */
export function scenegenPrompt(name: 'visualization' | 'planning' | 'topics-system' | 'topics-format'): Promise<string> {
  return readFile(new URL(`../../prompts/scenegen/${name}.md`, import.meta.url), 'utf8');
}
