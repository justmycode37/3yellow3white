import type { FrameSample, InspectionOptions, InspectionReport, PreviewOptions, SceneCandidate } from './scene-inspection.js';

// Geometry inspection can be expensive. Keep it off the server event loop and terminate on timeout/cancel.
export function inspectInWorker(candidate: SceneCandidate, options: InspectionOptions, signal?: AbortSignal): Promise<InspectionReport> {
  return runWorker(candidate, 'inspect', options, signal);
}
export function sampleInWorker(candidate: SceneCandidate, options: PreviewOptions, signal?: AbortSignal): Promise<FrameSample[]> {
  return runWorker(candidate, 'sample', options, signal);
}
function runWorker<T>(candidate: SceneCandidate, operation: 'inspect' | 'sample', options: InspectionOptions & PreviewOptions, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./scene-inspection-worker.ts', import.meta.url).href);
    const finish = (error?: unknown, result?: T) => {
      clearTimeout(timer); signal?.removeEventListener('abort', abort); worker.terminate();
      if (error) reject(error); else resolve(result!);
    };
    const abort = () => finish(signal?.reason ?? new Error('Scene inspection cancelled.'));
    const timer = setTimeout(() => finish(new Error('Scene inspection exceeded 15 seconds. Try fewer timestamps or simpler geometry.')), 15_000);
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = event => finish(event.data.error ? new Error(event.data.error) : undefined, event.data.result);
    worker.onerror = event => { event.preventDefault(); finish(new Error(event.message)); };
    worker.postMessage({ candidate, operation, options });
  });
}
