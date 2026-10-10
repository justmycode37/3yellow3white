import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { scenegenPrompt } from '../src/agents/scenegen-prompts.js';

// Originally extracted from PR #36 commit 7036e3b1a4c3e86ec1a3c7b057c118c76ef3fbff.
// Visualization intentionally revised for shaded meshes, sampled surfaces, solids,
// swept tubes, procedural textures, configurable materials, introductory buildup,
// and explained notation. Other assets retain the original bytes. Pin exact reviewed text.
const hashes = {
  visualization: '2624c701afeb70aaa1ecb94464dc634ee47cb99ec5ada45526e552331b1aeb98',
  planning: '36af6cbcaaa3f858e515c1f8709f0893a537f73e8528a2e47875a27e21428533',
  'topics-system': 'ad3bcf9c7c1351f28c6f80b6fd2c8cfbb15655ebdb587d2d623af2d94eb37131',
  'topics-format': '260ba64060e06134c8208ba90533bdfeccbe28cff6d92bdb07d9d8e79a03afb7',
} as const;

test('active scenegen prompt assets exactly match the reviewed source bytes', async () => {
  for (const [name, hash] of Object.entries(hashes)) {
    const text = await scenegenPrompt(name as keyof typeof hashes);
    expect(createHash('sha256').update(text).digest('hex')).toBe(hash);
  }
});
