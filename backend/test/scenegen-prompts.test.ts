import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { scenegenPrompt } from '../src/agents/scenegen-prompts.js';

// Topic prompts: PR #36 commit 7036e3b1a4c3e86ec1a3c7b057c118c76ef3fbff. Visualization and planning:
// PR #59 commit fd3cebffe3f7c03c0751d2c8a915af1d569701ed (scenegen/prompts/).
// These pin source fidelity, including whitespace, rather than prompt paraphrases.
const hashes = {
  visualization: '76471267cd523675d8420ce59a7c45c8569164118f22514bc16502cee65c2978',
  planning: '4a96995d665ca2dd2fe6de6e49701144747edbe1eba3eb674aa16b690cf3c5e0',
  'topics-system': 'ad3bcf9c7c1351f28c6f80b6fd2c8cfbb15655ebdb587d2d623af2d94eb37131',
  'topics-format': '260ba64060e06134c8208ba90533bdfeccbe28cff6d92bdb07d9d8e79a03afb7',
} as const;

test('active scenegen prompt assets exactly match the original source bytes', async () => {
  for (const [name, hash] of Object.entries(hashes)) {
    const text = await scenegenPrompt(name as keyof typeof hashes);
    expect(createHash('sha256').update(text).digest('hex')).toBe(hash);
  }
});
