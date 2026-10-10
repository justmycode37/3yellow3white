import { SceneCompileError } from "./compiler.js";
import { SourceCompiler } from "./compiler-client.js";
import { evaluateScene } from "./timeline.js";
import { paletteResolver } from "./palette.js";
import type { ColorPalette, CompiledScene, ControlValue, Frame, SceneSource, Submission, SubmitResult } from "./types.js";

export interface SequenceOptions {
  palette?: ColorPalette;
  seed?: number;
  executionLimitMs?: number;
  prepare?: (scenes: CompiledScene[]) => Promise<void>;
}

/** Headless source/state coordinator. All candidate scenes are validated before commit. */
export class SceneSequence {
  sources: SceneSource[] = [];
  compiled: CompiledScene[] = [];
  revision = 0;
  private values = new Map<string, Record<string, ControlValue>>();
  private queue: Promise<unknown> = Promise.resolve();
  private compiler = new SourceCompiler();
  private disposed = false;
  constructor(private options: SequenceOptions = {}) {
    this.options = { ...options, palette: paletteResolver(options.palette).palette };
  }

  index(id: string): number {
    const index = this.sources.findIndex(s => s.id === id);
    if (index < 0) throw new Error(`Unknown scene: ${id}`);
    return index;
  }
  frame(index: number, time: number): Frame {
    if (!this.compiled[index]) throw new Error(`Unknown scene index: ${index}`);
    return evaluateScene(this.compiled[index], time);
  }
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work); this.queue = result.catch(() => undefined); return result;
  }
  private async reconstruct(sources: SceneSource[], values: Map<string, Record<string, ControlValue>>, prefix: CompiledScene[] = []) {
    const compiled: CompiledScene[] = prefix.slice();
    let previous: Frame | undefined = compiled.length ? evaluateScene(compiled.at(-1)!, compiled.at(-1)!.duration) : undefined;
    for (const source of sources.slice(prefix.length)) {
      try {
        const scene = await this.compiler.compile(source.source, { previous, controls: values.get(source.id), seed: this.options.seed ?? 1, palette: this.options.palette }, this.options);
        compiled.push(scene); previous = evaluateScene(scene, scene.duration);
      } catch (error) {
        if (error instanceof SceneCompileError) error.diagnostic.scene = source.id;
        throw error;
      }
    }
    await this.options.prepare?.(compiled.slice(prefix.length));
    if (this.disposed) throw new Error("Scene sequence is disposed");
    const normalized = new Map<string, Record<string, ControlValue>>();
    sources.forEach((s, i) => normalized.set(s.id, Object.fromEntries(compiled[i].controls.map(c => [c.id, c.value]))));
    return { compiled, values: normalized };
  }
  submit(change: Submission): Promise<SubmitResult> {
    return this.enqueue(async () => {
      try {
        if (this.disposed) throw new Error("Scene sequence is disposed");
        let sources: SceneSource[];
        if (change.type === "load") sources = structuredClone(change.scenes);
        else if (change.type === "replace") {
          const index = this.index(change.scene);
          sources = this.sources.map((s, i) => i === index ? { ...s, source: change.source } : { ...s });
        } else if (change.type === "insert") {
          sources = this.sources.map(s => ({ ...s }));
          const index = change.after === null ? -1 : this.index(change.after);
          sources.splice(index + 1, 0, ...structuredClone(change.scenes));
        } else throw new Error("Unknown submission type");
        if (!Array.isArray(sources) || sources.length > 100) throw new Error("Scene count limit exceeded (100)");
        const ids = new Set<string>();
        for (const s of sources) {
          if (!s || typeof s.id !== "string" || !s.id || s.id.length > 256 || ids.has(s.id)) throw new Error(`Invalid or duplicate scene ID: ${s?.id}`);
          ids.add(s.id);
        }
        const append = change.type === 'insert' && change.after === (this.sources.at(-1)?.id ?? null);
        const candidate = await this.reconstruct(sources, change.type === "load" ? new Map() : this.values, append ? this.compiled : []);
        this.sources = sources; this.compiled = candidate.compiled; this.values = candidate.values; this.revision++;
        return { ok: true, revision: this.revision, diagnostics: [] };
      } catch (error) {
        return { ok: false, revision: this.revision, diagnostics: [error instanceof SceneCompileError ? error.diagnostic : { severity: "error", code: "SUBMISSION", message: error instanceof Error ? error.message : String(error) }] };
      }
    });
  }
  setControl(sceneId: string, id: string, value: ControlValue): Promise<void> {
    return this.enqueue(async () => {
      if (this.disposed) throw new Error("Scene sequence is disposed");
      const scene = this.compiled[this.index(sceneId)];
      if (!scene.controls.some(c => c.id === id)) throw new Error(`Unknown control: ${sceneId}/${id}`);
      const values = new Map(this.values);
      values.set(sceneId, { ...values.get(sceneId), [id]: value });
      const candidate = await this.reconstruct(this.sources, values);
      this.compiled = candidate.compiled; this.values = candidate.values;
    });
  }

  dispose(): void {
    this.disposed = true;
    this.compiler.dispose();
  }
}
