import { compileSource, SceneCompileError } from "./compiler.js";
import type { CompilerRequest, CompilerResponse } from "./compiler-client.js";

// A module worker owns the VM. Submitted source stays inside QuickJS without browser host bindings.
const worker = globalThis as unknown as {
  onmessage: ((event: MessageEvent<CompilerRequest>) => void) | null;
  postMessage(response: CompilerResponse): void;
};
worker.onmessage = event => {
  const request = event.data;
  void compileSource(request.source, request.input, request.limits).then(scene => {
    worker.postMessage({ id: request.id, ok: true, scene });
  }, error => {
    worker.postMessage({
      id: request.id,
      ok: false,
      diagnostic: error instanceof SceneCompileError ? error.diagnostic : {
        severity: "error", code: "COMPILER_WORKER", message: error instanceof Error ? error.message : String(error),
      },
    });
  });
};
