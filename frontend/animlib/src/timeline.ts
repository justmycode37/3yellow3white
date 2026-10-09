import type { CameraState, CompiledScene, ElementState, Frame, Track } from "./types.js";
import colorString from "color-string";

export function easeAt(progress: number, ease: Track["ease"]): number {
  const t = Math.max(0, Math.min(1, progress));
  return ease === "smooth" ? t * t * (3 - 2 * t) : ease === "in" ? t * t : ease === "out" ? 1 - (1 - t) ** 2 : t;
}

function color(value: string): number[] | null {
  return colorString.get.rgb(value);
}

function interpolate(from: unknown, to: unknown, t: number): unknown {
  if (t === 0) return structuredClone(from);
  if (t === 1) return structuredClone(to);
  if (typeof from === "number" && typeof to === "number") return from + (to - from) * t;
  if (Array.isArray(from) && Array.isArray(to)) return from.map((x, i) => interpolate(x, to[i], t));
  if (typeof from === "string" && typeof to === "string") {
    const a = color(from), b = color(to);
    if ((a || from === "none") && (b || to === "none") && (a || b)) {
      const start=a??[b![0],b![1],b![2],0],end=b??[a![0],a![1],a![2],0];
      return `rgba(${start.slice(0, 3).map((v, i) => Math.round(v + (end[i] - v) * t)).join(",")},${start[3] + (end[3] - start[3]) * t})`;
    }
  }
  return t < 1 ? from : to;
}

/** Pure evaluation: seek and normal playback return the same frame for the same inputs. */
export function evaluateScene(scene: CompiledScene, requestedTime: number): Frame {
  const time = Math.max(0, Math.min(scene.duration, requestedTime));
  const elements = new Map(scene.initial.map(e => [e.id, structuredClone(e)]));
  let camera = structuredClone(scene.camera);
  let cameraAnimated = false;
  const views = new Map((scene.views ?? []).map(v => [v.id, { ...structuredClone(v), cameraAnimated: false }]));
  const events = [
    ...scene.lifecycle.map((event, index) => ({ time: event.time, index, event })),
    ...scene.tracks.map((track, index) => ({ time: track.start, index: scene.lifecycle.length + index, track })),
  ].sort((a, b) => a.time - b.time || a.index - b.index);

  for (const item of events) {
    if (item.time > time) break;
    if ("event" in item) {
      const event = item.event;
      if (event.type === "add") for (const e of event.elements ?? []) elements.set(e.id, structuredClone(e));
      else if (event.type === "remove") {
        for (const id of event.ids) elements.delete(id);
        for (const e of elements.values()) if (e.geometry.children) e.geometry.children = e.geometry.children.filter(id => !event.ids.includes(id));
      }
      else for (const id of event.ids) { const e = elements.get(id); if (e) { e.persistent = true; delete e.transient; } }
      continue;
    }
    const track = item.track;
    const t = easeAt(track.duration === 0 ? 1 : (time - track.start) / track.duration, track.ease);
    if (track.action.type === "camera") {
      const view = track.action.view ? views.get(track.action.view) : undefined;
      const targetCamera = view?.camera ?? camera;
      if (time < track.start + track.duration) {
        if (view) view.cameraAnimated = true; else cameraAnimated = true;
      }
      for (const [key, target] of Object.entries(track.action.properties ?? {})) {
        const k = key as keyof CameraState;
        (targetCamera as unknown as Record<string, unknown>)[k] = interpolate(track.cameraFrom?.[k], target, t);
      }
      continue;
    }
    for (const id of track.action.ids) {
      const e = elements.get(id), from = track.from[id];
      if (!e || !from) continue;
      if (track.action.type === "morph") {
        const to = track.action.geometry!;
        e.geometry = structuredClone(t === 1 ? to : from.geometry);
        if (t < 1) e.morph = { from: structuredClone(from.geometry), to: structuredClone(to), progress: t, map: track.action.map };
        else delete e.morph;
      } else if (track.action.type === "numbers") {
        e.geometry.numbers = { ...e.geometry.numbers };
        for (const [key,target] of Object.entries(track.action.values ?? {})) {
          e.geometry.numbers[key] = interpolate(from.geometry.numbers?.[key],target,t) as number;
        }
      } else for (const [key, target] of Object.entries(track.action.properties ?? {})) {
        const start=key==='viewportOffset'?from.viewportOffset??[0,0]:from[key as keyof ElementState];
        (e as unknown as Record<string, unknown>)[key] = interpolate(start, target, t);
      }
    }
  }
  return { elements: [...elements.values()], camera, cameraAnimated, views: [...views.values()] };
}
