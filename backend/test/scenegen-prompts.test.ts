import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { scenegenPrompt } from '../src/agents/scenegen-prompts.js';

// Topic extraction assets remain verbatim PR #36 imports. Planning/visualization
// are maintained spatial authoring guidance, reviewed against library #60/#62/#69.
// Hashes pin reviewed bytes; provenance records both imported and revised hashes.
const hashes = {
  visualization: 'c0fec258234cfd577fe5ab46df6200a6c60c9aaa7fb0bc165952dbef911e324c',
  planning: 'ba41f4ea8b4c7c571672ba22a269b1278e251e4853a8a5c6ef9f4a5a20162fb3',
  'topics-system': 'ad3bcf9c7c1351f28c6f80b6fd2c8cfbb15655ebdb587d2d623af2d94eb37131',
  'topics-format': '260ba64060e06134c8208ba90533bdfeccbe28cff6d92bdb07d9d8e79a03afb7',
} as const;

test('active prompt assets match their reviewed revision bytes', async () => {
  for (const [name, hash] of Object.entries(hashes)) {
    const text = await scenegenPrompt(name as keyof typeof hashes);
    expect(createHash('sha256').update(text).digest('hex')).toBe(hash);
  }
});
