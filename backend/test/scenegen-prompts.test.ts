import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { scenegenPrompt } from '../src/agents/scenegen-prompts.js';

// Topic prompts: PR #36 commit 7036e3b1a4c3e86ec1a3c7b057c118c76ef3fbff. Visualization and planning
// are maintained in backend/prompts/scenegen/ (PR #74 rules, plus guidance from PR #69 and PR #73 for shaded
// meshes, surfaces, solids, tubes, textures and materials); update these hashes with the files.
// These pin the exact reviewed text, including whitespace.
const hashes = {
  visualization: '0488945b54b82902f679cec01d04a0e17950ce60899c587810d367f1e9b788a3',
  planning: '6d1fc378c91c9fef72d8035ea98c0a4c1b2c8f03dbfe11ac12b3eb0883407700',
  'topics-system': 'ad3bcf9c7c1351f28c6f80b6fd2c8cfbb15655ebdb587d2d623af2d94eb37131',
  'topics-format': '260ba64060e06134c8208ba90533bdfeccbe28cff6d92bdb07d9d8e79a03afb7',
} as const;

test('active scenegen prompt assets exactly match the reviewed source bytes', async () => {
  for (const [name, hash] of Object.entries(hashes)) {
    const text = await scenegenPrompt(name as keyof typeof hashes);
    expect(createHash('sha256').update(text).digest('hex')).toBe(hash);
  }
});
