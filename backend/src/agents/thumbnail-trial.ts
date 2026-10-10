import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PiAgentRunner } from './runtime.js';
import { agentFailure } from './config.js';
import { parseThumbnailSVG, thumbnailAgentConfig, thumbnailTask } from './thumbnail.js';

/** Run the same Pi task as production without creating a video or paying for narration. */
async function main() {
  const config = thumbnailAgentConfig();
  const directory = resolve(config.dataDir, 'thumbnail-trials', `${Date.now()}`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const runner = new PiAgentRunner(config);
  const topics = process.argv[2] ? [[process.argv[2], process.argv[3] ?? process.argv[2]]] : [
    ['Photosynthesis', 'How a leaf uses sunlight to turn water and carbon dioxide into stored chemical energy.'],
    ['Compound interest', 'Growth earns further growth: why reinvesting interest leads to accelerating accumulation.'],
    ['Recursion', 'A problem contains a smaller version of itself, until a simple base case stops the process.'],
    ['Entropy', 'Why there are many more ways for particles to be spread out than gathered in one place.'],
    ['Bayesian updating', 'New evidence changes the relative plausibility of two competing explanations.'],
    ['Supply and demand', 'A price where how much people want to buy meets how much sellers offer.'],
  ];
  const results = [];
  console.log(`Generating ${topics.length} thumbnails with ${config.provider}/${config.model}. Artifacts: ${directory}`);
  for (const [index, [title, topic]] of topics.entries()) {
    const task = await thumbnailTask({ title, topic, documents: [] }, new AbortController().signal);
    await writeFile(join(directory, `${index}.prompt.txt`), `${task.systemPrompt}\n\n${task.prompt}`, { mode: 0o600 });
    const started = performance.now();
    const svg = await runner.run(task);
    const artwork = parseThumbnailSVG(svg);
    await writeFile(join(directory, `${index}.svg`), svg, { mode: 0o600 });
    results.push({ title, topic, artwork, elapsedMs: Math.round(performance.now() - started) });
    await writeFile(join(directory, 'results.json'), JSON.stringify(results, null, 2), { mode: 0o600 });
    console.log(`${index + 1}/${topics.length}: ${title}, ${artwork.paths.length} paths, ${results.at(-1)!.elapsedMs} ms`);
  }
}

if (import.meta.main) main().catch(error => { const failure = agentFailure(error); console.error(`${failure.code}: ${failure.message}`); process.exitCode = 1; });
