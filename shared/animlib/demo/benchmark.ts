import { createPlayer } from "../src/index";
import type { Asset, PlayerState } from "../src/types";

interface SavedScene { id: string; source: string; duration: number; audio?: { id: string; url: string } }
interface SavedRun { id: string; variant: string; topic: string; title: string; elapsedMs: number; scenes: SavedScene[] }
interface Trial { id?: string; variant: string; topic: string; elapsedMs?: number; status?: string; errorCode?: string }
interface Manifest {
  runs: SavedRun[];
  trials?: Trial[];
  reviews?: Record<string, { verdict: string; summary: string }>;
}

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const runSelect = element<HTMLSelectElement>("run");
const sceneSelect = element<HTMLSelectElement>("scene");
const scopeSelect = element<HTMLSelectElement>("sample-scope");
const playButton = element<HTMLButtonElement>("play");
const restartButton = element<HTMLButtonElement>("restart");
const scrubber = element<HTMLInputElement>("scrubber");
const mute = element<HTMLInputElement>("mute");
const status = element<HTMLParagraphElement>("status");
const errorMessage = element<HTMLParagraphElement>("error");
const source = element<HTMLPreElement>("source");
const samples = [...document.querySelectorAll<HTMLButtonElement>("[data-fraction]")];
const params = new URLSearchParams(location.search);
const manifestUrl = params.get("manifest") ?? "http://127.0.0.1:8082/manifest.json";
let manifest: Manifest = { runs: [] };
let player: ReturnType<typeof createPlayer> | undefined;
let state: PlayerState | undefined;
let currentRun: SavedRun | undefined;
let loading = false;
let generation = 0;
let displayedScene: string | null | undefined;

function reportError(error: unknown): void {
  errorMessage.textContent = error instanceof Error ? error.message : String(error);
  errorMessage.hidden = false;
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}

function renderComparison(): void {
  const body = element<HTMLTableSectionElement>("comparison-body");
  body.replaceChildren();
  const topics = ["rna", "binary", "derivative"];
  const trials = Array.isArray(manifest.trials) ? manifest.trials : [];
  const variants = [...new Set([
    ...manifest.runs.map(run => run.variant),
    ...trials.map(trial => trial.variant),
    ...Object.keys(manifest.reviews ?? {}),
  ])].sort((a, b) => a === "baseline" ? -1 : b === "baseline" ? 1 : a.localeCompare(b));
  for (const variant of variants) {
    const row = document.createElement("tr");
    const name = document.createElement("th");
    name.scope = "row";
    name.textContent = variant;
    row.append(name);
    let totalMs = 0;
    let completed = 0;
    for (const topic of topics) {
      const cell = document.createElement("td");
      const run = manifest.runs.find(run => run.variant === variant && run.topic.toLowerCase() === topic);
      const trial = trials.find(trial => trial.variant === variant && trial.topic.toLowerCase() === topic && trial.status === "complete");
      const elapsedMs = run?.elapsedMs ?? trial?.elapsedMs;
      if (typeof elapsedMs === "number" && Number.isFinite(elapsedMs) && elapsedMs >= 0) {
        totalMs += elapsedMs;
        completed++;
        const time = `${(elapsedMs / 1000).toFixed(2)} s`;
        if (run) {
          const link = document.createElement("a");
          const url = new URL(location.href);
          url.searchParams.set("run", run.id);
          link.href = url.href;
          link.dataset.run = run.id;
          link.textContent = time;
          link.setAttribute("aria-label", `Replay ${variant}, ${topic}, generation time ${time}`);
          link.addEventListener("click", event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
            event.preventDefault();
            void loadRun(run.id).catch(reportError);
          });
          cell.append(link);
        } else {
          cell.textContent = `${time} · replay pending`;
        }
      } else {
        const failed = trials.find(trial => trial.variant === variant && trial.topic.toLowerCase() === topic && trial.status === "failed");
        cell.textContent = failed ? `Failed${failed.errorCode ? ` (${failed.errorCode})` : ""}` : "Pending";
        cell.className = "muted";
      }
      row.append(cell);
    }
    const total = document.createElement("td");
    total.textContent = completed === topics.length
      ? `${(totalMs / 1000).toFixed(2)} s`
      : completed ? `${(totalMs / 1000).toFixed(2)} s partial (${completed}/3)` : "Pending";
    row.append(total);
    const review = document.createElement("td");
    const notes = manifest.reviews?.[variant];
    const verdict = document.createElement("strong");
    verdict.textContent = notes?.verdict || "Review pending";
    review.append(verdict);
    if (notes?.summary) {
      const summary = document.createElement("span");
      summary.className = "review-summary";
      summary.textContent = notes.summary;
      review.append(summary);
    }
    row.append(review);
    body.append(row);
  }
}

function update(next: PlayerState): void {
  state = next;
  const ready = !loading && Boolean(next.scene);
  playButton.disabled = !ready;
  restartButton.disabled = !ready;
  scrubber.disabled = !ready;
  sceneSelect.disabled = !ready;
  samples.forEach(button => { button.disabled = !ready; });
  playButton.textContent = next.status === "playing" ? "Pause" : "Play";
  const total = next.scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const index = next.scenes.findIndex(scene => scene.id === next.scene);
  const elapsed = next.scenes.slice(0, Math.max(0, index)).reduce((sum, scene) => sum + scene.duration, 0) + next.time;
  scrubber.max = String(Math.max(total, 0.001));
  scrubber.value = String(elapsed);
  scrubber.setAttribute("aria-valuetext", `${elapsed.toFixed(1)} of ${total.toFixed(1)} seconds`);
  element<HTMLOutputElement>("clock").textContent = `${formatTime(elapsed)} / ${formatTime(total)}`;
  element<HTMLSpanElement>("scene-clock").textContent = next.scene ? `${formatTime(next.time)} / ${formatTime(next.duration)}` : "";
  if (next.scene !== displayedScene) {
    displayedScene = next.scene;
    sceneSelect.value = next.scene ?? "";
    source.textContent = currentRun?.scenes.find(scene => scene.id === next.scene)?.source ?? "";
  }
  if (!loading) status.textContent = `${next.status} · ${player?.backend ?? "initializing renderer"} · ${next.scenes.length} scenes · ${mute.checked ? "muted" : "narration enabled"}`;
  if (next.error) reportError(next.error);
  else if (next.status === "playing") errorMessage.hidden = true;
}

async function loadRun(id: string): Promise<void> {
  const run = manifest.runs.find(candidate => candidate.id === id);
  if (!run) throw new Error(`Saved run was not found: ${id}`);
  const token = ++generation;
  loading = true;
  currentRun = run;
  displayedScene = undefined;
  errorMessage.hidden = true;
  status.textContent = "Preparing all scenes and narration…";
  player?.dispose();
  const canvas = document.createElement("canvas");
  canvas.id = "canvas";
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", run.title || run.id);
  element<HTMLDivElement>("stage").replaceChildren(canvas);
  const assets: Record<string, Asset> = {};
  for (const scene of run.scenes) {
    if (!scene.audio) continue;
    if (assets[scene.audio.id] && assets[scene.audio.id].url !== scene.audio.url) throw new Error(`Run has conflicting audio URLs for ${scene.audio.id}`);
    assets[scene.audio.id] = { kind: "audio", url: scene.audio.url };
  }
  const activePlayer = createPlayer({ canvas, controlsRoot: canvas.parentElement!, assets });
  player = activePlayer;
  activePlayer.setMuted(mute.checked);
  activePlayer.subscribe(update);
  runSelect.value = run.id;
  document.querySelectorAll<HTMLAnchorElement>("[data-run]").forEach(link => {
    if (link.dataset.run === run.id) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
  sceneSelect.replaceChildren(...run.scenes.map((scene, index) => new Option(`${index + 1}. ${scene.id}`, scene.id)));
  element<HTMLParagraphElement>("metadata").textContent = `${run.title || run.topic} · ${run.variant} · generation ${(run.elapsedMs / 1000).toFixed(2)} s · ${run.scenes.length} scenes · ${run.id}`;
  const url = new URL(location.href);
  url.searchParams.set("run", run.id);
  history.replaceState(null, "", url);
  try {
    const result = await activePlayer.submit({ type: "load", scenes: run.scenes.map(({ id, source }) => ({ id, source })) });
    if (token !== generation) return;
    if (!result.ok) throw new Error(result.diagnostics.map(diagnostic => diagnostic.message).join("\n"));
    loading = false;
    update(activePlayer.getState());
  } catch (error) {
    if (token !== generation) return;
    loading = false;
    status.textContent = "This run could not be prepared.";
    reportError(error);
  }
}

async function loadManifest(): Promise<void> {
  const response = await fetch(manifestUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Manifest request failed (${response.status}): ${manifestUrl}`);
  const data: Manifest = await response.json();
  if (!Array.isArray(data.runs)) throw new Error("Manifest must contain a runs array.");
  manifest = data;
  renderComparison();
  runSelect.replaceChildren(...manifest.runs.map(run => new Option(`${run.topic} · ${run.variant} · ${(run.elapsedMs / 1000).toFixed(2)} s · ${run.id}`, run.id)));
  runSelect.disabled = manifest.runs.length === 0;
  if (!manifest.runs.length) {
    status.textContent = "No saved runs yet. Reload the manifest after generation finishes.";
    return;
  }
  const requested = new URLSearchParams(location.search).get("run");
  await loadRun(manifest.runs.some(run => run.id === requested) ? requested! : manifest.runs[0].id);
}

async function seekGlobal(time: number): Promise<void> {
  if (!player || !state?.scenes.length) return;
  let remaining = Math.max(0, time);
  const last = state.scenes.at(-1)!;
  for (const scene of state.scenes) {
    if (remaining < scene.duration || scene === last) {
      await player.seek({ scene: scene.id, time: Math.min(remaining, scene.duration) });
      return;
    }
    remaining -= scene.duration;
  }
}

runSelect.addEventListener("change", () => { void loadRun(runSelect.value).catch(reportError); });
element<HTMLButtonElement>("reload").addEventListener("click", () => { void loadManifest().catch(reportError); });
playButton.addEventListener("click", () => {
  if (!player || !state) return;
  if (state.status === "playing") { player.pause(); return; }
  const activePlayer = player;
  // Resume AudioContext within the click gesture, before any asynchronous seek.
  const unlocked = activePlayer.unlockAudio();
  void (async () => {
    await unlocked;
    if (state?.scene === state?.scenes.at(-1)?.id && state!.time >= state!.duration) await seekGlobal(0);
    await activePlayer.play();
  })().catch(reportError);
});
restartButton.addEventListener("click", () => { void seekGlobal(0).catch(reportError); });
scrubber.addEventListener("input", () => { void seekGlobal(Number(scrubber.value)).catch(reportError); });
sceneSelect.addEventListener("change", () => { void player?.seek({ scene: sceneSelect.value, time: 0 }).catch(reportError); });
mute.addEventListener("change", () => { player?.setMuted(mute.checked); if (state) update(state); });
for (const button of samples) button.addEventListener("click", () => {
  if (!state || !player || !state.scene) return;
  const fraction = Number(button.dataset.fraction);
  const action = scopeSelect.value === "scene"
    ? player.seek({ scene: state.scene, time: state.duration * fraction })
    : seekGlobal(state.scenes.reduce((sum, scene) => sum + scene.duration, 0) * fraction);
  void action.catch(reportError);
});
element<HTMLDivElement>("stage").addEventListener("keydown", event => {
  if (event.target === player?.canvas && event.code === "Space") { event.preventDefault(); playButton.click(); }
});
window.addEventListener("pagehide", () => player?.dispose(), { once: true });
void loadManifest().catch(error => { status.textContent = "Manifest unavailable. Check the saved-run server, then Reload manifest."; reportError(error); });
