import type { NarrationPackageV1 } from "../../../backend/src/narration/types";
import type { Asset, PlayerState, SceneSource } from "../src/types";

export async function loadNarration(id: string): Promise<{ package: NarrationPackageV1; assets: Record<string, Asset>; scenes: SceneSource[] }> {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error("Invalid narration ID.");
  const [jobResponse, previewResponse] = await Promise.all([fetch(`/api/narrations/${id}`), fetch(`/api/narrations/${id}/preview`)]);
  const job = await jobResponse.json();
  if (!jobResponse.ok || job.status !== "complete") throw new Error(job.message ?? job.error?.message ?? `Narration is ${job.status}; finish generation before previewing.`);
  if (!previewResponse.ok) throw new Error("The narration preview could not load.");
  return { package: job.package, ...await previewResponse.json() };
}
export function narrationTranscript(pkg: NarrationPackageV1): (state: PlayerState) => void {
  const panel = document.createElement("section"); panel.id = "narration-transcript";
  panel.style.cssText = "position:fixed;bottom:80px;left:5%;right:5%;max-height:25vh;overflow:auto;background:#111e;color:white;padding:16px;border-radius:12px;font:16px/1.6 sans-serif;z-index:4";
  const notice = document.createElement("p"); notice.textContent = "Timing diagnostic: words and the blue dot follow the narration clock.";
  const label = document.createElement("p"), transcript = document.createElement("div");
  panel.append(notice, label, transcript); document.body.append(panel);
  let sceneId: string | null = null;
  let active: HTMLSpanElement | undefined;
  const elements = new Map<string, HTMLSpanElement>();
  return state => {
    const scene = pkg.scenes.find(scene => scene.id === state.scene); if (!scene) return;
    const words = scene.utterances.flatMap(u => u.words);
    if (state.scene !== sceneId) {
      sceneId = state.scene; transcript.replaceChildren(); elements.clear(); active = undefined;
      for (const word of words) {
        const span = document.createElement("span"); span.textContent = word.text + " "; span.dataset.wordId = word.id;
        span.title = `${word.startSec.toFixed(3)}–${word.endSec.toFixed(3)} s`; elements.set(word.id, span); transcript.append(span);
      }
    }
    const word = words.find(word => word.startSec <= state.time && state.time < word.endSec);
    const next = word ? elements.get(word.id) : undefined;
    if (active !== next) {
      if (active) { active.style.background = ""; active.removeAttribute("aria-current"); }
      if (next) { next.style.background = "#156542"; next.setAttribute("aria-current", "true"); }
      active = next;
    }
    const pause = scene.pauses.find(p => p.startSec <= state.time && state.time < p.endSec);
    label.textContent = `${scene.title} · ${state.time.toFixed(3)} s${pause ? " · Silent ponder break — hold the question" : ""}`;
  };
}
