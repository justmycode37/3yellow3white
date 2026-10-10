"""animlib engine: storyboard scenes -> animlib JavaScript scene sources.

Replaces the Manim path. Each scene is written by the LLM as an animlib
`export default scene(...)` source, compiled together with all earlier scenes by
animlib's own compiler (real handoffs via s.keep / s.previous), repaired on
diagnostics, and delivered as a manifest the browser player can run.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from . import animation_prompt, schema, script
from .style import STYLE_GUIDE

REPO = Path(__file__).resolve().parents[1]
ANIMLIB = REPO / "shared" / "animlib"
CHECK = Path(__file__).resolve().parent / "animlib" / "check.mjs"

SYSTEM = """\
You are an expert animator writing 3Blue1Brown-style explanatory scenes with animlib,
a JavaScript animation library. You may read files to consult the animlib reference
and demo the task names. Your final answer must be the complete scene source in a
single ```js block and nothing after it.
"""


def node_exe():
    exe = shutil.which("node") or r"C:\Program Files\nodejs\node.exe"
    if not Path(exe).exists():
        raise RuntimeError("Node.js not found: install Node 22.16+ and run `npm ci && npm run build`")
    if not (ANIMLIB / "dist" / "core.js").exists():
        raise RuntimeError("animlib is not built: run `npm ci && npm run build` in the repo root")
    return exe


def check(sources):
    """Compile [{id, source}] in order with animlib. Returns the checker's JSON."""
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as fh:
        json.dump(sources, fh)
    try:
        out = subprocess.run([node_exe(), str(CHECK), fh.name], capture_output=True, text=True,
                             encoding="utf-8", cwd=REPO)
    finally:
        os.unlink(fh.name)
    if out.returncode or not out.stdout.strip():
        return {"ok": False, "diagnostics": [{"message": (out.stderr or "checker crashed").strip()[-1500:]}]}
    return json.loads(out.stdout.strip().splitlines()[-1])


def extract_source(text):
    blocks = re.findall(r"```(?:js|javascript|ts)?\s*\n(.*?)```", text, re.S)
    blocks = [b for b in blocks if "export default scene" in b]
    if not blocks:
        raise ValueError("response contains no ```js block with `export default scene(...)`")
    return max(blocks, key=len).strip() + "\n"


def build_prompt(board, index, previous):
    """previous: [(scene_id, source)] of the scenes already written, in order."""
    scenes = board["scenes"]
    scene = scenes[index]
    last = index + 1 == len(scenes)
    outline = "\n".join(
        (f"**→ {i + 1}. {s['title']}: {s['purpose']}**" if i == index else
         f"   {i + 1}. {s['title']}: {s['purpose']}") for i, s in enumerate(scenes))
    context = animation_prompt.overarching_context(board, index, outline)
    colors = "\n".join(f"- {concept}: palette role `{role}`"
                       for concept, role in board["color_meanings"].items())
    if previous:
        prev_id, prev_src = previous[-1]
        start = (f"{schema.starts_with(board, index)}\n\n"
                 "This is the previous scene's final frame. Its source is below. Everything it "
                 "passed to `s.keep(...)` is already on screen in your scene at time zero, exactly "
                 "as it ended: get each one with `s.previous.get(\"<id>\")` and continue animating "
                 "that same object. Do NOT recreate kept objects (duplicate ids are errors). "
                 "Anything the previous scene did not keep is gone unless you call "
                 "`s.previous.exiting()` and animate it away.\n\n"
                 f"Previous scene `{prev_id}`:\n```js\n{prev_src}```")
    else:
        start = f"The film opens here: {schema.starts_with(board, 0)}"
    return f"""\
# Animation task: scene {index + 1} of {len(scenes)}: {scene['title']}

Write **one animlib scene** (JavaScript) for an explanatory animation about
**{board['topic']}**, for {board['audience']}.

{context}

The scene is defined by its START and its END. Your animation is the motion that turns
the start picture into the end picture while making the purpose visible.

## START scene (first frame)

{start}

## END scene (last frame)

{scene['ends_with']}

On screen at the end, with the same names and roles used across the film:
{animation_prompt._bullets(scene['elements'])}

{"This is the last scene: end on a clean, readable hold." if last else
 f'The next scene ("{scenes[index + 1]["title"]}") continues from your final frame: call `s.keep(x)` on every object that must still be there, with stable, descriptive ids.'}

## The animation: from START to END

**Purpose:** {scene['purpose']}

**What it shows:** {scene['shows']}

**Ideas the visuals must make visible, in order:**
{animation_prompt._bullets(scene['key_points'])}

You choose the concrete example (numbers, vectors, positions) and how to animate it.
Pick values that make the idea easy to see and keep them consistent with the START scene.

## Style

{STYLE_GUIDE}
Colour meanings (fixed for the whole film; map each role to the closest animlib
palette token such as `Color.GREEN`, `Color.RED`, `Color.YELLOW`, `Color.BLUE`, and
use the same token for the same concept in every scene):
{colors}

## animlib: how to write the scene

Read these before writing (paths relative to `{REPO}`):
- `shared/animlib/docs/reference.md`: the API. Sections 1, 3, 4 and 5 are essential
  (source format, timing, elements, persistence/handoffs, morphing and LaTeX).
- `shared/animlib/demo/scenes.ts`: complete working scenes, including a grid, arrows,
  a LaTeX formula with `\\\\animpart` / `\\\\animnum`, and a handoff with `s.previous`.
- `shared/animlib/src/types.ts`: exact option and method names.

Hard rules:
- The source is exactly one module: `export default scene({{ mode: "2d", end: "{'hold' if last else 'advance'}", background: "BLACK" }}, s => {{ ... }});`
  No imports, no audio option, no DOM, timers or async code.
- Colours are palette tokens only (`Color.BLUE` or `"BLUE"`); raw CSS colours are rejected.
- Timing is sequential: `s.play(action or [actions], {{ duration, ease: "smooth" }})` and
  `s.wait(seconds)`. The durations must add up to **{scene['duration']} s** (±0.5 s).
- Every element needs a stable, descriptive id (`"grid"`, `"i-hat"`, `"matrix-A"`).
  Reuse the ids of kept objects from earlier scenes; never invent a second object
  for the same thing.
- To change an arrow's length or direction, morph that same arrow
  (`arrow.morphTo({{ kind: "arrow", points: [...] }})`); never draw a longer arrow on
  top of the old one. Rotate a whole grid by putting its lines in a group and using
  `rotateTo`; for other linear maps morph each line's points to its image.
- Formulas use `s.latex` with named parts so later scenes can morph them; keep them
  in the right-hand panel area, clear of the geometry.
- Interactivity is optional: at most one `s.slider` when letting the viewer change a
  value genuinely helps (it must not change the scene's duration).

## Deliverable

Return only the complete scene source in one ```js block. It is compiled by animlib
together with the earlier scenes; any diagnostic is sent back to you to fix.
"""


def animate_scene(provider, board, index, out, previous, max_repairs=3):
    scene = board["scenes"][index]
    task = build_prompt(board, index, previous)
    (out / "prompts").mkdir(parents=True, exist_ok=True)
    (out / "prompts" / f"{index + 1:02d}_{scene['id']}.sent.md").write_text(task, encoding="utf-8")
    request = task
    for attempt in range(max_repairs + 1):
        reply = provider.complete(SYSTEM, request, name=f"{scene['id']}_try{attempt + 1}")
        try:
            source = extract_source(reply)
        except ValueError as exc:
            request = task + f"\n\nYour previous answer was unusable: {exc}. Return the whole source."
            continue
        sources = [{"id": i, "source": s} for i, s in previous] + [{"id": scene["id"], "source": source}]
        result = check(sources)
        problems = [d.get("message", "") + (f" (line {d['line']})" if d.get("line") else "") +
                    (f" Hint: {d['hint']}" if d.get("hint") else "")
                    for d in result.get("diagnostics", [])]
        if result.get("ok"):
            info = result["scenes"][-1]
            want_end = "hold" if index + 1 == len(board["scenes"]) else "advance"
            if abs(info["duration"] - scene["duration"]) > 0.5:
                problems.append(f"the timeline lasts {info['duration']:.2f} s but must last "
                                f"{scene['duration']} s (±0.5): adjust durations and waits")
            if info["end"] != want_end:
                problems.append(f'scene option end must be "{want_end}"')
            if not problems:
                (out / "scenes").mkdir(exist_ok=True)
                (out / "scenes" / f"{scene['id']}.js").write_text(source, encoding="utf-8")
                print(f"  compiled {scene['id']} ({info['duration']:.1f} s, "
                      f"{len(info['finalElements'])} elements at the end)")
                return source, info["duration"]
        print(f"  {scene['id']}: {problems[0][:110]} (attempt {attempt + 1}), asking for a fix")
        request = (task + "\n\n## Your previous source\n\n```js\n" + source + "```\n\n"
                   "## animlib rejected it\n\n- " + "\n- ".join(problems) +
                   "\n\nFix the problems and return the complete corrected source.")
    raise RuntimeError(f"{scene['id']} still fails after {max_repairs} repairs")


def run(provider, storyboard_path, only=None, redo=False, subtitles=True):
    """Write every scene in order; returns the film's manifest (also saved to disk)."""
    board = schema.load(storyboard_path)
    errors = schema.validate(board)
    if errors:
        raise ValueError("storyboard invalid:\n- " + "\n- ".join(errors))
    out = Path(storyboard_path).resolve().parent
    previous, done = [], []
    for i, scene in enumerate(board["scenes"]):
        if only and scene["id"] not in only:
            continue
        print(f"Scene {i + 1}/{len(board['scenes'])}: {scene['title']}")
        saved = out / "scenes" / f"{scene['id']}.js"
        if not redo and saved.exists():
            source = saved.read_text(encoding="utf-8")
            info = check([{"id": a, "source": b} for a, b in previous] + [{"id": scene["id"], "source": source}])
            if info.get("ok"):
                print("  already written, reusing (pass --redo to regenerate)")
                previous.append((scene["id"], source))
                done.append((scene, source, info["scenes"][-1]["duration"]))
                continue
        source, duration = animate_scene(provider, board, i, out, previous)
        previous.append((scene["id"], source))
        done.append((scene, source, duration))

    captions = {}
    if subtitles and done:
        entries, md, captions = script.write_for(
            provider, board, [s for s, _, _ in done], [d for _, _, d in done], [c for _, c, _ in done])
        script.save(entries, md, out)
        print(f"Script: {out / 'film_script.md'}")
    manifest = {
        "schemaVersion": 1, "id": out.name, "title": board["topic"], "status": "complete",
        "provider": "scenegen",
        "scenes": [{"id": s["id"], "index": n, "source": src, "duration": dur,
                    "captions": captions.get(s["id"], [])}
                   for n, (s, src, dur) in enumerate(done)],
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Manifest: {out / 'manifest.json'}")
    return manifest
