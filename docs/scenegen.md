# scenegen: course file → topics → storyboards → animlib scenes

`scenegen/` is a Python pipeline that turns a lecture file (or a single topic) into
animated explanations in a 3Blue1Brown style. Scenes are written as **animlib**
JavaScript sources and play in the browser; a Manim path is kept as an option.

```
file ─LLM→ topics.json ─LLM→ teaching plan ─LLM→ storyboard.json ─template→ prompts
                                                        │
                    script + captions ←LLM─ animlib scenes (compiled by animlib) ←LLM─┘
```

## Layers

0. **File → topics** (`scenegen file`): PDF / `.txt` / `.md` is read in full; the LLM
   returns an ordered topic list with summaries, key ideas, prerequisites and condensed
   source notes (`topics.json`, `overview.md`).
1. **Teaching plan → storyboard**: per topic the LLM first plans how to teach it
   (learning goal, key insight, misconceptions, running example, ordered arc), then
   writes scenes that follow that arc. Scenes are qualitative: `purpose`, `shows`,
   `key_points`, `elements`, `ends_with`, `duration`. Scene *i* starts on scene
   *i−1*'s `ends_with`.
2. **Prompts** (`prompts/NN_scene.md`, `all_scenes.md`, `scenes.zip`): one
   self-contained prompt per scene with overarching context, START and END scene,
   the animation to perform and the shared style rules (simplicity, minimal on-screen
   text, smooth and unhurried motion, fixed colour meanings and layout).
3. **Animate** (`scenegen animate`, engine `animlib` by default): the LLM writes each
   scene as `export default scene(...)`. The source is compiled by animlib together
   with all earlier scenes (`scenegen/animlib/check.mjs`, using `animlib/core`), so
   handoffs through `s.keep` / `s.previous` are real; diagnostics and wrong durations
   are sent back for repair. Output: `scenes/<id>.js` and `manifest.json` (scenes with
   `id`, `index`, `source`, `duration`, `captions`, matching `shared/video/contract.ts`).
4. **Script**: the LLM writes natural narration timed to each scene's code; it is saved
   as `film_script.md` / `film.srt` and as per-scene `captions` in the manifest.

## Usage

Requires Python 3, Node 22.16+ with `npm ci && npm run build` (animlib), and an LLM
provider (`pip install -r scenegen/requirements.txt` for the API providers). Default provider `claude-code` uses the `claude` CLI login; `--provider
anthropic` / `openai` use API keys; `handoff` writes requests to files.

```powershell
py -m scenegen file lecture.pdf --out out/lecture       # topics + storyboards + prompts
py -m scenegen sample out/lecture --per-topic 2         # first scenes of every topic (parallel)
py -m scenegen animate out/lecture/03_.../storyboard.json   # one whole film
py -m scenegen preview out/lecture                      # play in the browser with captions

py -m scenegen scenes "Matrix multiplication" --out out/matmul   # single topic, no file
```

`--engine manim` on `animate` / `sample` renders mp4s through the Explanation Studio
plugin instead (visual review loop, motion check, burned-in subtitles); it needs the
plugin folder next to the repo and its `scripts/bootstrap.ps1` run once.

## Example

`examples/lecture-linear-algebra/` holds a short test lecture (`lecture.pdf`) and the
pipeline output for it: `topics.json`, and per topic the storyboard (with its teaching
plan), the first two animlib scenes, the manifest and the narration script.
