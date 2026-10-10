import { createPlayer } from "../src/index";
import type { PlayerState } from "../src/types";
import { initialSources } from "./scenes";
import { interactionSource } from "./interaction";
import { reactiveInteractionSource } from "./reactive";
import { loadNarration, narrationTranscript } from "./narration";
import "./styles.css";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const playButton = document.getElementById("play") as HTMLButtonElement;
const scrubber = document.getElementById("scrubber") as HTMLInputElement;
const errorMessage = document.getElementById("error") as HTMLParagraphElement;
const narrationId = new URLSearchParams(location.search).get("narration");
let narrationError: unknown;
const narration = narrationId ? await loadNarration(narrationId).catch(error => { narrationError = error; return undefined; }) : undefined;
const updateTranscript = narration ? narrationTranscript(narration.package) : undefined;
const player = createPlayer({
  canvas,
  controlsRoot: canvas.parentElement!,
  assets: narration?.assets ?? { "scene-tone": { kind: "audio", url: new URL("./assets/scene-tone.wav", import.meta.url).href } },
});
let state = player.getState();

function reportError(error: unknown): void {
  errorMessage.textContent = error instanceof Error ? error.message : String(error);
  errorMessage.hidden = false;
}
function update(next: PlayerState): void {
  state = next;
  updateTranscript?.(next);
  const playing = next.status === "playing";
  document.getElementById("play-icon")!.hidden = playing;
  document.getElementById("pause-icon")!.hidden = !playing;
  playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
  playButton.title = playing ? "Pause" : "Play";
  playButton.disabled = !next.scene;
  scrubber.disabled = !next.scene;
  let offset = 0;
  for (const scene of next.scenes) {
    if (scene.id === next.scene) break;
    offset += scene.duration;
  }
  scrubber.max = String(Math.max(0.001, next.scenes.reduce((total, scene) => total + scene.duration, 0)));
  scrubber.value = String(offset + next.time);
  scrubber.setAttribute("aria-valuetext", `${(offset + next.time).toFixed(1)} seconds`);
  errorMessage.hidden = !next.error;
  errorMessage.textContent = next.error ?? "";
}
player.subscribe(update);
playButton.addEventListener("click", () => {
  if (state.status === "playing") player.pause();
  else void (async () => {
    const last = state.scenes.at(-1);
    const first = state.scenes[0];
    if (first && last?.id === state.scene && state.time >= state.duration) {
      await player.seek({ scene: first.id, time: 0 });
    }
    await player.play();
  })().catch(reportError);
});
scrubber.addEventListener("input", () => {
  let time = Number(scrubber.value);
  const last = state.scenes.at(-1);
  if (!last) return;
  let target = last;
  for (const scene of state.scenes) {
    if (time < scene.duration || scene === last) { target = scene; break; }
    time -= scene.duration;
  }
  void player.seek({ scene: target.id, time }).catch(reportError);
});
canvas.parentElement!.addEventListener("keydown", event => {
  if (event.target !== player.canvas) return;
  if (event.code === "Space") { event.preventDefault(); playButton.click(); }
});
const sources = (narration?.scenes ?? (narrationId ? [] : new URLSearchParams(location.search).has("reactive") ? [reactiveInteractionSource] : new URLSearchParams(location.search).has("interactive") ? [interactionSource] : initialSources)).map(scene => ({ ...scene }));
const ready = player.submit({ type: "load", scenes: sources }).then(result => {
  if (!result.ok) reportError(result.diagnostics.map(diagnostic => diagnostic.message).join("\n"));
  if (narrationError) reportError(narrationError);
  return result;
}).catch(reportError);
Object.assign(window, { animlibDemo: { player, ready, sources, narration: narration?.package } });
window.addEventListener("pagehide", () => player.dispose(), { once: true });
