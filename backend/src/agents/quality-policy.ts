import { readFile } from 'node:fs/promises';

export function animationQualityPolicy(): Promise<string> {
  return readFile(new URL('../../prompts/animation-quality.md', import.meta.url), 'utf8');
}
