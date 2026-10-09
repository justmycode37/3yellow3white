import { compileSource, SceneCompileError } from "./compiler.js";
import type { CompileInput, CompiledScene, Diagnostic } from "./types.js";

export interface CompileLimits { executionLimitMs?: number }
export interface CompilerRequest { id: number; source: string; input: CompileInput; limits: CompileLimits }
export type CompilerResponse =
  | { id: number; ok: true; scene: CompiledScene }
  | { id: number; ok: false; diagnostic: Diagnostic };
interface Pending {
  resolve: (scene: CompiledScene) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/** The browser runs the bounded QuickJS compiler in a worker, leaving playback responsive. */
export class SourceCompiler {
  private worker?: Worker;
  private pending = new Map<number, Pending>();
  private nextId = 0;
  private disposed = false;

  private failWorker(error: Error): void {
    const worker = this.worker;
    this.worker = undefined;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    }
    for (const request of this.pending.values()) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
    this.pending.clear();
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./compiler-worker.js", import.meta.url), { type: "module", name: "animlib-source" });
    worker.onmessage = (event: MessageEvent<CompilerResponse>) => {
      const response = event.data;
      if (!response || typeof response.id !== "number" || typeof response.ok !== "boolean"
        || (response.ok ? !response.scene || typeof response.scene !== "object"
          : !response.diagnostic || typeof response.diagnostic.message !== "string" || typeof response.diagnostic.code !== "string")) {
        this.failWorker(new SceneCompileError({ severity: "error", code: "COMPILER_WORKER", message: "The scene compiler returned an invalid response." }));
        return;
      }
      const request = this.pending.get(response.id);
      if (!request) return;
      this.pending.delete(response.id);
      clearTimeout(request.timeout);
      if (response.ok) request.resolve(response.scene);
      else request.reject(new SceneCompileError(response.diagnostic));
    };
    worker.onerror = event => {
      event.preventDefault();
      this.failWorker(new SceneCompileError({
        severity: "error", code: "COMPILER_WORKER", message: event.message || "The scene compiler worker could not start.",
        hint: "Check that the host serves the compiler worker and WebAssembly assets and allows module workers in its content security policy.",
      }));
    };
    worker.onmessageerror = () => this.failWorker(new SceneCompileError({ severity: "error", code: "COMPILER_WORKER", message: "The scene compiler response could not be read." }));
    this.worker = worker;
    return worker;
  }

  compile(source: string, input: CompileInput = {}, limits: CompileLimits = {}): Promise<CompiledScene> {
    if (this.disposed) return Promise.reject(new Error("Source compiler is disposed"));
    const id = ++this.nextId;
    const workerLimits: CompileLimits = { executionLimitMs: limits.executionLimitMs };
    return new Promise((resolve, reject) => {
      // Includes lazy VM/worker startup. The VM independently enforces the much shorter execution limit.
      const executionLimit = limits.executionLimitMs ?? 200;
      const timeoutMs = Number.isFinite(executionLimit) ? Math.max(15000, executionLimit + 5000) : 15000;
      const timeout = setTimeout(() => this.failWorker(new SceneCompileError({
        severity: "error", code: "COMPILER_TIMEOUT", message: "The scene compiler did not respond in time.",
        hint: "Check worker/WebAssembly asset loading. The valid animation is preserved; submitting again starts a fresh compiler.",
      })), timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      if (typeof Worker === "undefined") {
        // Headless Node consumers/tests have no browser Worker and need no rendering thread isolation.
        void compileSource(source, input, limits).then(scene => {
          const request = this.pending.get(id);
          if (!request) return;
          this.pending.delete(id);
          clearTimeout(request.timeout);
          request.resolve(scene);
        }, error => {
          const request = this.pending.get(id);
          if (!request) return;
          this.pending.delete(id);
          clearTimeout(request.timeout);
          request.reject(error instanceof Error ? error : new Error(String(error)));
        });
        return;
      }
      try { this.ensureWorker().postMessage({ id, source, input, limits: workerLimits } satisfies CompilerRequest); }
      catch (error) { this.failWorker(error instanceof Error ? error : new Error(String(error))); }
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.failWorker(new Error("Source compiler is disposed"));
  }
}
