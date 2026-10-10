import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { scenegenPrompt } from '../src/agents/scenegen-prompts.js';

// Topic prompts: PR #36 commit 7036e3b1a4c3e86ec1a3c7b057c118c76ef3fbff. Visualization and planning:
// maintained in backend/prompts/scenegen/ since PR #59; update these hashes with the files.
// These pin source fidelity, including whitespace, rather than prompt paraphrases.
const hashes = {
  visualization: 'c0cba75f6e817d905b79b57b20c9071bde53dcdfaeec3e2fb3f1a2046c5c280e',
  planning: '7d7cc7ba6990c8667ce539db77afa4f2ef6ef0294b13eb2d416a11bb6013ca42',
  'topics-system': 'ad3bcf9c7c1351f28c6f80b6fd2c8cfbb15655ebdb587d2d623af2d94eb37131',
  'topics-format': '260ba64060e06134c8208ba90533bdfeccbe28cff6d92bdb07d9d8e79a03afb7',
} as const;

test('active scenegen prompt assets exactly match the original source bytes', async () => {
  for (const [name, hash] of Object.entries(hashes)) {
    const text = await scenegenPrompt(name as keyof typeof hashes);
    expect(createHash('sha256').update(text).digest('hex')).toBe(hash);
  }
});
