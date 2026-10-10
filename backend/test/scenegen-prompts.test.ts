import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { compileSource, evaluateScene } from 'animlib/core';
import { scenegenPrompt } from '../src/agents/scenegen-prompts.js';

// Topic extraction assets remain verbatim PR #36 imports. Planning/visualization
// are maintained spatial authoring guidance, including textures/materials at 076f017.
// Hashes pin reviewed bytes; provenance records both imported and revised hashes.
const hashes = {
  visualization: '119bad49226025feffd3b6e1258adc7d35c7f24791ef59dad65ad11f0d174e04',
  planning: '2693bda1f04d8943b027ed108c0b2d35949388391628ed467a69f853f9276907',
  'topics-system': 'ad3bcf9c7c1351f28c6f80b6fd2c8cfbb15655ebdb587d2d623af2d94eb37131',
  'topics-format': '260ba64060e06134c8208ba90533bdfeccbe28cff6d92bdb07d9d8e79a03afb7',
} as const;

test('active prompt assets match their reviewed revision bytes', async () => {
  for (const [name, hash] of Object.entries(hashes)) {
    const text = await scenegenPrompt(name as keyof typeof hashes);
    expect(createHash('sha256').update(text).digest('hex')).toBe(hash);
  }
});

test('the procedural finish example compiles with the installed scene API', async () => {
  const guidance = await scenegenPrompt('visualization');
  const examples = [...guidance.matchAll(/```js\n([\s\S]*?)\n```/g)];
  expect(examples).toHaveLength(1);
  const compiled = await compileSource(`export default scene({mode:'3d',orbit:false},s=>{
    const v = s;
    ${examples[0][1]}
    s.wait(1);
  });`);
  const timber = evaluateScene(compiled, 0).elements.find(element => element.id === 'timber');
  expect(timber?.geometry.texture).toMatchObject({ pattern: 'wood', scale: [3, 0.5, 3], bumpStrength: 0.003 });
  expect(timber?.geometry.material).toMatchObject({ roughness: 0.85, specular: 0.15 });
});
