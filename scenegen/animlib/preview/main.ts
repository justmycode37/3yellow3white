// Plays scenegen output with animlib: preview.json = { title, topics: [{ title, scenes }] }.
// Topics are separate sequences (each film starts from an empty stage); captions
// from the generated script are shown under the canvas at their timestamps.
import { createPlayer } from "../../../shared/animlib/src/index";
import type { PlayerState } from "../../../shared/animlib/src/types";

type Caption = { start: number; end: number; text: string };
type Scene = { id: string; source: string; duration: number; captions: Caption[] };
type Topic = { title: string; scenes: Scene[] };

const $ = (id: string) => document.getElementById(id)!;
const data: { title: string; topics: Topic[] } = await (await fetch("/preview.json")).json();
const player = createPlayer({ canvas: $("canvas") as HTMLCanvasElement });
const scrubber = $("scrubber") as HTMLInputElement, playButton = $("play") as HTMLButtonElement;
let state: PlayerState = player.getState(), topic = 0, autoplay = false;

function fail(error: unknown) { $("error").textContent = error instanceof Error ? error.message : String(error); $("error").hidden = false; }
async function load(index: number, play = false) {
  topic = index; autoplay = play;
  $("title").textContent = `${data.title}: ${data.topics[index].title}`;
  [...$("topics").children].forEach((b, i) => b.classList.toggle("active", i === index));
  const result = await player.submit({ type: "load", scenes: data.topics[index].scenes.map(s => ({ id: s.id, source: s.source })) });
  $("error").hidden = result.ok;
  if (!result.ok) return fail(result.diagnostics.map(d => `${d.scene ?? ""} ${d.message}`).join("\n"));
  if (play) await player.play();
}
function update(next: PlayerState) {
  state = next;
  const scenes = data.topics[topic].scenes;
  let offset = 0;
  for (const s of next.scenes) { if (s.id === next.scene) break; offset += s.duration; }
  scrubber.max = String(Math.max(0.001, next.scenes.reduce((t, s) => t + s.duration, 0)));
  scrubber.value = String(offset + next.time);
  playButton.textContent = next.status === "playing" ? "❚❚" : "▶";
  const caption = scenes.find(s => s.id === next.scene)?.captions.find(c => next.time >= c.start && next.time <= c.end);
  $("captions").textContent = caption?.text ?? "";
  // A film ends on its last scene; continue with the next topic automatically.
  const last = next.scenes.at(-1);
  if (autoplay && next.status === "ended" && last?.id === next.scene && topic + 1 < data.topics.length) void load(topic + 1, true).catch(fail);
}
data.topics.forEach((t, i) => {
  const button = document.createElement("button");
  button.textContent = `${i + 1}. ${t.title}`;
  button.addEventListener("click", () => void load(i, state.status === "playing").catch(fail));
  $("topics").append(button);
});
player.subscribe(update);
playButton.addEventListener("click", () => {
  if (state.status === "playing") { autoplay = false; player.pause(); }
  else { autoplay = true; void player.play().catch(fail); }
});
scrubber.addEventListener("input", () => {
  let time = Number(scrubber.value), target = state.scenes.at(-1);
  for (const s of state.scenes) { if (time < s.duration || s === target) { target = s; break; } time -= s.duration; }
  if (target) void player.seek({ scene: target.id, time }).catch(fail);
});
await load(0).catch(fail);
Object.assign(window, { scenegenPreview: { player, data } });
