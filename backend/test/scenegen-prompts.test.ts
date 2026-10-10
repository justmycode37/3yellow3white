import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { scenegenPrompt } from '../src/agents/scenegen-prompts.js';

// Topic prompts: PR #36 commit 7036e3b1a4c3e86ec1a3c7b057c118c76ef3fbff. Visualization and planning
// are maintained in backend/prompts/scenegen/ (PR #74 rules, plus guidance from PR #69 and PR #73 for shaded
// meshes, surfaces, solids, tubes, textures and materials); update these hashes with the files.
// These pin the exact reviewed text, including whitespace.
const hashes = {
  visualization: '74a74d7de1f15afb97c357aeb3ebce176db39b505a7527cfa9d67dc9d3042f71',
  planning: 'e97b262c56fd91f67e13d03e023d9c5fc1aa524ef0b252a853d50afee60a03f5',
  'topics-system': 'ad3bcf9c7c1351f28c6f80b6fd2c8cfbb15655ebdb587d2d623af2d94eb37131',
  'topics-format': '260ba64060e06134c8208ba90533bdfeccbe28cff6d92bdb07d9d8e79a03afb7',
} as const;

test('active scenegen prompt assets exactly match the reviewed source bytes', async () => {
  for (const [name, hash] of Object.entries(hashes)) {
    const text = await scenegenPrompt(name as keyof typeof hashes);
    expect(createHash('sha256').update(text).digest('hex')).toBe(hash);
  }
});
