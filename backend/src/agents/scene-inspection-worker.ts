import { inspectScene, sampleScene } from './scene-inspection.js';
import type { InspectionOptions, PreviewOptions, SceneCandidate } from './scene-inspection.js';

self.onmessage = async (event: MessageEvent<{ candidate: SceneCandidate; operation: 'inspect' | 'sample'; options: InspectionOptions & PreviewOptions }>) => {
  try {
    const { candidate, operation, options } = event.data;
    const result = operation === 'inspect' ? await inspectScene(candidate, options) : await sampleScene(candidate, options);
    self.postMessage({ result });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Scene inspection failed.' }); }
};
