import { AudioClock } from "./audio.js";
import { ControlOverlay } from "./controls.js";
import { CanvasRenderer } from "./renderer.js";
import { SceneSequence } from "./sequence.js";
import { paletteResolver } from "./palette.js";
import type { Asset, ColorPalette, CompiledScene, ControlValue, PlayerOptions, PlayerState, Submission, SubmitResult } from "./types.js";

export class Player {
  private readonly renderer: CanvasRenderer;
  private readonly audio: AudioClock;
  private readonly sequence: SceneSequence;
  private readonly palette: ColorPalette;
  private readonly overlay?: ControlOverlay;
  private listeners = new Set<(state: PlayerState) => void>();
  private sceneId: string | null = null;
  private time = 0;
  private status: PlayerState["status"] = "empty";
  private error?: string;
  private raf?: number;
  private startedAt = 0;
  private offset = 0;
  private playbackGeneration = 0;
  private disposed = false;
  private operations: Promise<unknown> = Promise.resolve();

  constructor(options: PlayerOptions) {
    const palette = paletteResolver(options.palette).palette;
    this.palette = palette;
    this.renderer = new CanvasRenderer(options.canvas, palette);
    this.audio = new AudioClock(options.assets);
    this.sequence = new SceneSequence({
      palette,
      seed: options.seed,
      executionLimitMs: options.executionLimitMs,
      prepare: async scenes => {
        await this.audio.prepare(scenes);
        await this.renderer.prepare(scenes);
      },
    });
    this.renderer.onOrbitChange = () => this.refresh();
    this.renderer.onError = error => {
      if (this.disposed) return;
      this.stopClock();
      this.status = "blocked";
      this.error = error.message;
      // A failed GPU must not be asked to render again while reporting its error.
      this.notify();
    };
    const controlsRoot = options.controlsRoot === false ? undefined : options.controlsRoot ?? options.canvas.parentElement;
    if (controlsRoot) {
      this.overlay = new ControlOverlay(controlsRoot, (id, value) => {
        if (this.sceneId) return this.setControl({ scene: this.sceneId, id, value }).catch(error => this.report(error));
      }, options.canvas.ownerDocument ? options.canvas : undefined);
    }
  }

  private assertAlive(): void {
    if (this.disposed) throw new Error("Player is disposed");
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operations.then(() => { this.assertAlive(); return operation(); });
    this.operations = result.catch(() => {});
    return result;
  }

  private currentIndex(): number { return this.sceneId === null ? -1 : this.sequence.index(this.sceneId); }
  private currentScene() { const index = this.currentIndex(); return index < 0 ? undefined : this.sequence.compiled[index]; }
  private clockTime(scene = this.currentScene()): number {
    if (this.status !== "playing") return this.time;
    const elapsed = scene?.options.audio
      ? this.audio.time : this.offset + (performance.now() - this.startedAt) / 1000;
    return Math.min(scene?.duration ?? 0, Math.max(0, elapsed));
  }

  private stopClock(time = this.clockTime()): void {
    this.time = time;
    this.playbackGeneration++;
    if (this.raf !== undefined) cancelAnimationFrame(this.raf);
    this.raf = undefined;
    this.audio.stop();
  }

  private report(error: unknown): void {
    if (this.disposed) return;
    this.error = error instanceof Error ? error.message : String(error);
    this.refresh();
  }

  private refresh(): void {
    if (this.disposed) return;
    const index = this.currentIndex();
    const scene = index < 0 ? undefined : this.sequence.compiled[index];
    if (scene) {
      const frame = this.sequence.frame(index, this.time);
      this.renderer.syncInteraction(this.sceneId!, this.time, scene, frame);
      this.renderer.setOrbitEnabled(scene.options.orbit && frame.camera.perspective > 0 && !frame.cameraAnimated);
      this.renderer.render(frame, scene.options);
    } else {
      this.renderer.setOrbitEnabled(false);
      this.renderer.render({
        elements: [], cameraAnimated: false,
        camera: { yaw: 0, pitch: 0, target: [0, 0, 0], height: 8, distance: 10, perspective: 0 },
      }, { mode: "2d", end: "hold", orbit: false, background: this.palette.background, palette: this.palette });
    }
    this.overlay?.update(this.sceneId ?? "", scene?.controls ?? [], scene ? paletteResolver(this.palette).resolve(scene.options.background) : undefined);
    this.notify();
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try { listener(state); } catch (error) { console.error("animlib subscriber failed", error); }
    }
  }

  submit(change: Submission): Promise<SubmitResult> {
    return this.enqueue(async () => {
      const oldSources = this.sequence.sources.slice();
      const oldCompiled = this.sequence.compiled.slice();
      const result = await this.sequence.submit(change);
      if (!result.ok || this.disposed) return result;
      // Appending preloaded scenes must not interrupt the active audio clock.
      if (change.type === 'insert' && oldSources.length > 0 && change.after === oldSources.at(-1)?.id) {
        this.notify();
        return result;
      }
      const activeId = this.sceneId;
      const oldIndex = oldSources.findIndex(scene => scene.id === activeId);
      const affected = change.type === "load"
        || change.type === "replace" && oldSources.findIndex(scene => scene.id === change.scene) <= oldIndex
        || change.type === "insert" && (change.after === null || oldSources.findIndex(scene => scene.id === change.after) < oldIndex);
      const wasPlaying = this.status === "playing";
      // Read the old clock before changing active ID, even if the active scene moved.
      this.stopClock(this.clockTime(oldCompiled[oldIndex]));
      this.error = undefined;
      if (change.type === "load") this.renderer.resetInteraction();
      if (change.type === "load" || !activeId) {
        this.sceneId = this.sequence.sources[0]?.id ?? null;
        this.time = 0;
      } else {
        this.sceneId = activeId;
        this.time = affected ? 0 : Math.min(this.time, this.currentScene()?.duration ?? 0);
      }
      this.status = this.sceneId ? "paused" : "empty";
      this.refresh();
      // Compilation success is separate from browser playback permission.
      if (wasPlaying && change.type !== "load" && this.sceneId) await this.play().catch(() => {});
      return result;
    });
  }

  async play(): Promise<void> {
    this.assertAlive();
    if (!this.sceneId || this.status === "playing") return;
    const scene = this.currentScene()!;
    if (this.time >= scene.duration && scene.duration > 0) this.time = 0;
    const generation = ++this.playbackGeneration;
    this.error = undefined;
    try {
      if (scene.options.audio && !await this.audio.start(scene.options.audio, this.time)) return;
      if (generation !== this.playbackGeneration || this.disposed) return;
      this.offset = this.time;
      this.startedAt = performance.now();
      this.status = "playing";
      this.refresh();
      this.scheduleFrame();
    } catch (error) {
      if (generation !== this.playbackGeneration || this.disposed) return;
      this.audio.stop();
      this.status = "blocked";
      this.report(error);
      throw error;
    }
  }

  private scheduleFrame(): void {
    if (this.disposed || this.status !== "playing" || this.raf !== undefined) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = undefined;
      if (this.disposed || this.status !== "playing") return;
      this.time = this.clockTime();
      const scene = this.currentScene()!;
      if (scene.options.audio && this.audio.interrupted) {
        this.stopClock();
        this.status = "blocked";
        this.error = "Browser interrupted audio playback; press Play to resume";
        this.refresh();
        return;
      }
      if (this.time >= scene.duration) {
        this.stopClock();
        const next = this.currentIndex() + 1;
        if (scene.options.end === "advance" && next < this.sequence.sources.length) {
          this.sceneId = this.sequence.sources[next].id;
          this.time = 0;
          this.status = "paused";
          this.refresh();
          void this.play().catch(() => {});
        } else {
          this.time = scene.duration;
          this.status = "ended";
          this.refresh();
        }
        return;
      }
      this.refresh();
      this.scheduleFrame();
    });
  }

  pause(): void {
    this.assertAlive();
    this.stopClock();
    this.status = this.sceneId ? "paused" : "empty";
    this.refresh();
  }

  async seek(position: { scene: string; time: number }): Promise<void> {
    this.assertAlive();
    if (!Number.isFinite(position.time)) throw new Error("Seek time must be finite");
    const index = this.sequence.index(position.scene);
    this.stopClock();
    this.sceneId = position.scene;
    this.time = Math.max(0, Math.min(position.time, this.sequence.compiled[index].duration));
    this.status = "paused";
    this.error = undefined;
    this.refresh();
  }

  async next(): Promise<void> {
    this.assertAlive();
    const next = this.sequence.sources[this.currentIndex() + 1];
    if (next) await this.seek({ scene: next.id, time: 0 });
  }

  async previous(): Promise<void> {
    this.assertAlive();
    const previous = this.sequence.sources[this.currentIndex() - 1];
    if (previous) await this.seek({ scene: previous.id, time: 0 });
  }

  setControl(change: { scene: string; id: string; value: ControlValue }): Promise<void> {
    return this.enqueue(async () => {
      const oldScenes = new Map<string, CompiledScene>(this.sequence.sources.map((scene, index) => [scene.id, this.sequence.compiled[index]]));
      await this.sequence.setControl(change.scene, change.id, change.value);
      if (this.disposed) return;
      const wasPlaying = this.status === "playing";
      this.stopClock(this.clockTime(oldScenes.get(this.sceneId ?? "")));
      this.time = Math.min(this.time, this.currentScene()?.duration ?? 0);
      this.status = this.sceneId ? "paused" : "empty";
      this.error = undefined;
      this.refresh();
      if (wasPlaying && this.time < (this.currentScene()?.duration ?? 0)) await this.play().catch(() => {});
      else if (wasPlaying) { this.status = "ended"; this.refresh(); }
    });
  }

  setMuted(muted: boolean): void { this.assertAlive(); this.audio.setMuted(muted); }

  registerAssets(assets: Record<string, Asset>): void { this.assertAlive(); this.audio.register(assets); }
  unlockAudio(): Promise<void> { this.assertAlive(); return this.audio.unlock(); }

  getState(): PlayerState {
    const scene = this.currentScene();
    const time = this.clockTime();
    const index = this.currentIndex();
    const frame = index >= 0 ? this.sequence.frame(index, time) : undefined;
    return {
      revision: this.sequence.revision,
      scene: this.sceneId,
      time,
      duration: scene?.duration ?? 0,
      status: this.status,
      scenes: this.sequence.sources.map((source, index) => ({ id: source.id, duration: this.sequence.compiled[index].duration })),
      controls: scene?.controls.map(control => ({ ...control, ...(control.position ? { position: [...control.position] as [number,number] } : {}), options: control.options?.slice() })) ?? [],
      orbitEnabled: Boolean(scene?.options.orbit && frame && frame.camera.perspective > 0 && !frame.cameraAnimated),
      views: (frame?.views ?? []).map(view => ({ id: view.id, rect: [...view.rect] as typeof view.rect, orbitEnabled: view.orbit && view.camera.perspective > 0 && !view.cameraAnimated })),
      ...(this.error ? { error: this.error } : {}),
    };
  }

  subscribe(listener: (state: PlayerState) => void): () => void {
    this.assertAlive();
    this.listeners.add(listener);
    try { listener(this.getState()); } catch (error) { console.error("animlib subscriber failed", error); }
    return () => { this.listeners.delete(listener); };
  }

  dispose(): void {
    if (this.disposed) return;
    this.stopClock();
    this.disposed = true;
    this.listeners.clear();
    this.overlay?.dispose();
    this.renderer.dispose();
    this.audio.dispose();
    this.sequence.dispose();
  }
}

export function createPlayer(options: PlayerOptions): Player { return new Player(options); }
