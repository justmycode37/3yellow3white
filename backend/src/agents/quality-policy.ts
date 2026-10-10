import { loadPrompt } from './prompts.js';

export function animationQualityPolicy(): Promise<string> {
  return loadPrompt('animation-quality');
}
