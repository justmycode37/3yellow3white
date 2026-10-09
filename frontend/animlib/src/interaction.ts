import type { CompiledScene } from './types.js';

export interface Orbit { yaw: number; pitch: number }

/** Viewer state is kept outside compiled frames and isolated by scene and view ID. */
export class ViewInteraction {
  private scenes = new Map<string, { time: number; offsets: Map<string, Orbit> }>();
  private offsets = new Map<string, Orbit>();

  sync(id: string, time: number, compiled: CompiledScene): void {
    let state = this.scenes.get(id);
    if (!state) {
      state = { time, offsets: new Map() };
      this.scenes.set(id, state);
    }
    const before = state.time;
    this.offsets = state.offsets;
    const ids = new Set(['', ...(compiled.views ?? []).map(view => view.id)]);
    for (const view of this.offsets.keys()) if (!ids.has(view)) this.offsets.delete(view);
    for (const track of compiled.tracks) {
      if (track.action.type !== 'camera') continue;
      const props = track.action.properties ?? {};
      if (!Object.hasOwn(props, 'yaw') && !Object.hasOwn(props, 'pitch')) continue;
      const start = track.start, end = start + track.duration;
      const inside = time >= start && time < end;
      const crossed = track.duration === 0
        ? before < start && time >= start || time < start && before >= start
        : time > before ? before < end && time >= start : time < before && before >= start && time < end;
      if (inside || crossed) this.offsets.delete(track.action.view ?? '');
    }
    state.time = time;
  }

  get(view = ''): Orbit { return { ...(this.offsets.get(view) ?? { yaw: 0, pitch: 0 }) }; }
  set(orbit: Orbit, view = ''): void { this.offsets.set(view, { ...orbit }); }
  reset(): void { this.scenes.clear(); this.offsets = new Map(); }
}
