import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { scenegenPrompt } from '../src/agents/scenegen-prompts.js';

// Independently extracted from PR #36 commit 7036e3b1a4c3e86ec1a3c7b057c118c76ef3fbff.
// These pin source fidelity, including whitespace, rather than prompt paraphrases.
const hashes = {
  visualization: '361648abdfcce7c7285a2e92e48f0de9831be27dbb3180a3859769e6ffcddcd3',
  planning: '36af6cbcaaa3f858e515c1f8709f0893a537f73e8528a2e47875a27e21428533',
  'topics-system': 'ad3bcf9c7c1351f28c6f80b6fd2c8cfbb15655ebdb587d2d623af2d94eb37131',
  'topics-format': '260ba64060e06134c8208ba90533bdfeccbe28cff6d92bdb07d9d8e79a03afb7',
} as const;

test('active scenegen prompt assets exactly match the original source bytes', async () => {
  for (const [name, hash] of Object.entries(hashes)) {
    const text = await scenegenPrompt(name as keyof typeof hashes);
    expect(createHash('sha256').update(text).digest('hex')).toBe(hash);
  }
});
