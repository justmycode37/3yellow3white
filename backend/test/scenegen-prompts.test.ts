import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { scenegenPrompt } from '../src/agents/scenegen-prompts.js';

// Topic prompts: PR #36 commit 7036e3b1a4c3e86ec1a3c7b057c118c76ef3fbff. Visualization and planning
// are maintained in backend/prompts/scenegen/ (PR #65 rules, plus PR #69's guidance for shaded
// meshes, surfaces, solids and tubes); update these hashes together with the files.
// These pin the exact reviewed text, including whitespace.
const hashes = {
  visualization: '67196ff37ceb11ac7c338e4affd47c04ffa0ccbe46bcdd412bafa602ef373af7',
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
