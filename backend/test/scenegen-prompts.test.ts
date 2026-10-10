import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { scenegenPrompt } from '../src/agents/scenegen-prompts.js';

// Topic prompts: PR #36 commit 7036e3b1a4c3e86ec1a3c7b057c118c76ef3fbff. Visualization and planning:
// maintained in backend/prompts/scenegen/ since PR #59; update these hashes with the files.
// These pin source fidelity, including whitespace, rather than prompt paraphrases.
const hashes = {
  visualization: '55088a7f21ddec11d9ede2033eee124cc6e67965141cb98b05d1348efbd001f7',
  planning: 'c5bd88baced4d8a0eefa31fb7bd19a82d67e051fb83ee3e0a0428fed3ee681e7',
  'topics-system': 'ad3bcf9c7c1351f28c6f80b6fd2c8cfbb15655ebdb587d2d623af2d94eb37131',
  'topics-format': '260ba64060e06134c8208ba90533bdfeccbe28cff6d92bdb07d9d8e79a03afb7',
} as const;

test('active scenegen prompt assets exactly match the original source bytes', async () => {
  for (const [name, hash] of Object.entries(hashes)) {
    const text = await scenegenPrompt(name as keyof typeof hashes);
    expect(createHash('sha256').update(text).digest('hex')).toBe(hash);
  }
});
