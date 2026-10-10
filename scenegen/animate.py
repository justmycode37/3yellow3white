"""Layer 3: run each scene prompt through an LLM, render it with the plugin,
feed render errors back for repair, and stitch the scenes into one film."""
from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

from . import animation_prompt, motion, package, schema

SYSTEM = """\
You are an expert Manim Community Edition animator who writes 3Blue1Brown-style
explanatory scenes. You may read files to consult the plugin documentation the task
names. Your final answer must be the complete Python file in a single ```python block.
"""


def extract_code(text):
    blocks = re.findall(r"```(?:python|py)?\s*\n(.*?)```", text, re.S)
    if not blocks:
        raise ValueError("response contains no ```python block")
    return max(blocks, key=len)


def plugin_python(plugin_root):
    exe = plugin_root / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if not exe.exists():
        raise FileNotFoundError(f"{exe} missing: run the plugin's scripts/bootstrap.ps1 first")
    return exe


def render(plugin_root, scene_file, cls, output, quality):
    env = dict(os.environ, PYTHONPATH=str(plugin_root), PYTHONDONTWRITEBYTECODE="1")
    command = [str(plugin_python(plugin_root)), "-m", "studio", "render", str(scene_file), cls,
               "--output", str(output), "--quality", quality, "--silent"]
    result = subprocess.run(command, cwd=plugin_root, env=env, capture_output=True,
                            text=True, encoding="utf-8", errors="replace")
    log = (result.stdout or "") + "\n" + (result.stderr or "")
    (output / "render.log").write_text(log, encoding="utf-8")
    return result.returncode == 0, log


def animate_scene(provider, board, index, out, plugin_root, quality="m", max_repairs=2, reviews=1,
                  final_quality="h"):
    scene = board["scenes"][index]
    cls = animation_prompt.class_name(scene["id"])
    previous = None
    if index > 0:  # sequential: the previous scene's code fixes our first frame
        prev_file = out / "scenes" / f"{board['scenes'][index - 1]['id']}.py"
        if prev_file.exists():
            previous = prev_file.read_text(encoding="utf-8")
    task = animation_prompt.build(board, index, plugin_root, previous)
    (out / "prompts").mkdir(exist_ok=True)
    (out / "prompts" / f"{index + 1:02d}_{scene['id']}.sent.md").write_text(task, encoding="utf-8")
    scene_file = out / "scenes" / f"{scene['id']}.py"
    scene_file.parent.mkdir(parents=True, exist_ok=True)
    render_dir = out / "render" / scene["id"]
    render_dir.mkdir(parents=True, exist_ok=True)
    (render_dir / "timeline.json").write_text(
        json.dumps(animation_prompt.timeline(scene), indent=2), encoding="utf-8")

    code = _generate(provider, task, task, scene_file, cls, render_dir, plugin_root,
                     quality, max_repairs, scene["id"])
    print(f"  rendered {scene['id']}")
    for round_ in range(1, reviews + 1):
        sheet = contact_sheet(plugin_root, render_dir / "film.mp4", render_dir / f"review{round_}.jpg",
                              scene["duration"])
        jolts = motion.find_jolts(plugin_root, render_dir / "film.mp4", plugin_python(plugin_root))
        if jolts:
            print(f"  motion check: fast changes at {jolts}")
        reply = provider.complete(SYSTEM, review_request(task, code, sheet, scene["duration"],
                                                         motion.describe(jolts)),
                                  name=f"{scene['id']}_review{round_}")
        verdict = reply.strip().splitlines()[-1] if reply.strip() else ""
        if "```" not in reply and "APPROVED" in verdict:
            print(f"  review {round_}: approved")
            break
        try:
            improved = extract_code(reply)
        except ValueError:
            print(f"  review {round_}: no usable revision, keeping current version")
            break
        notes = reply.split("```")[0].strip()
        (render_dir / f"review{round_}.md").write_text(notes, encoding="utf-8")
        backup = code
        try:
            code = _generate(provider, task, None, scene_file, cls, render_dir, plugin_root,
                             quality, max_repairs, scene["id"], first_code=improved)
            print(f"  review {round_}: revised ({notes.splitlines()[0][:100] if notes else 'no notes'})")
        except RuntimeError:
            print(f"  review {round_}: revision failed to render, keeping previous version")
            scene_file.write_text(backup, encoding="utf-8")
            render(plugin_root, scene_file, cls, render_dir, quality)
            break
    if final_quality and final_quality != quality:
        ok, _ = render(plugin_root, scene_file, cls, render_dir, final_quality)
        print(f"  final {final_quality} render: {'ok' if ok else 'FAILED, kept draft quality'}")
        if not ok:
            render(plugin_root, scene_file, cls, render_dir, quality)
    return render_dir / "film.mp4"


def _generate(provider, task, request, scene_file, cls, render_dir, plugin_root, quality,
              max_repairs, sid, first_code=None):
    """Get code from the LLM (or use first_code), render, and repair on errors."""
    code = first_code
    for attempt in range(max_repairs + 1):
        if code is None:
            reply = provider.complete(SYSTEM, request, name=f"{sid}_try{attempt + 1}")
            try:
                code = extract_code(reply)
            except ValueError as exc:
                request = task + f"\n\nYour previous answer was unusable: {exc}. Return the whole file."
                continue
        scene_file.write_text(code, encoding="utf-8")
        ok, log = render(plugin_root, scene_file, cls, render_dir, quality)
        if ok:
            return code
        lines = [l for l in log.strip().splitlines() if "SyntaxWarning" not in l and "re.match(" not in l]
        tail = "\n".join(lines[-60:])
        print(f"  {sid}: render failed (attempt {attempt + 1}), asking for a fix")
        request = (task + "\n\n## Your previous file\n\n```python\n" + code + "\n```\n\n"
                   "## It failed to render\n\n```\n" + tail + "\n```\n\n"
                   "Fix the problem and return the complete corrected file.")
        code = None
    raise RuntimeError(f"{sid} still fails after {max_repairs} repairs; see {render_dir / 'render.log'}")


def contact_sheet(plugin_root, film, target, duration, frames=12):
    """Tile evenly spaced frames (left to right, top to bottom) into one image."""
    fps = frames / duration
    code = ("import sys; from studio.media import run_ffmpeg; "
            "run_ffmpeg('-i', sys.argv[1], '-vf', f'fps={sys.argv[3]},scale=640:-1,tile=3x4', "
            "'-frames:v', '1', sys.argv[2])")
    env = dict(os.environ, PYTHONPATH=str(plugin_root))
    subprocess.run([str(plugin_python(plugin_root)), "-c", code, str(film), str(target), f"{fps:.4f}"],
                   check=True, env=env, cwd=plugin_root)
    return target


def review_request(task, code, sheet, duration, motion_report=""):
    times = ", ".join(f"{(k + 0.5) * duration / 12:.1f}s" for k in range(12))
    return f"""{task}

## Review of your rendered scene

Your current file:

```python
{code}
```

Read the image `{sheet}`: twelve frames of the rendered scene, left to right, top to
bottom, at {times}. Inspect every frame closely, as a demanding 3Blue1Brown editor
who will not publish anything with a visible flaw. Check each of these and list every
problem you find, with the frame time:
1. Collisions: any text, label, number or arrow touching or overlapping another
   (including temporary counters and labels during motion). Leftover arrowheads:
   any arrow showing a second head, or a short arrow's head visible inside a longer
   arrow on the same line, is a serious bug (see "Arrows: no leftover heads").
2. Framing: anything cut off at the edge; content crammed into one corner; the main
   geometry too small (it should fill a large part of the frame, use a zoomed
   coordinate scale rather than a tiny default grid).
3. Legibility: text smaller than a comfortable size at 1080p, low contrast, cluttered
   areas, too many simultaneous labels.
   Any explanatory sentence, caption or title on screen is a problem: only labels,
   formulas, matrices and numbers are allowed; remove the rest.
4. Teaching: is each key point actually visible, in order, with enough hold time to
   read it? Are colours used with their fixed meanings?
5. Continuity: first frame = required starting picture; last frame = required final picture.
6. Smoothness: any sudden flip, snap, reset or very fast whole-plane motion is a
   serious problem (see "Smooth motion"). Also read your code for instant changes
   (set_value or add/remove of visible objects outside an animation, run_time < 1 s
   for big motions).

{motion_report}

Then decide. If you found no problems at all, end your reply with the line APPROVED.
Otherwise give the numbered problem list, then the complete improved file in one
```python block. Fix ONLY the listed problems with the smallest change: do not
redesign, do not add new elements or effects, and prefer removing clutter over adding
anything. Keep the same example values, keep the first frame identical (it must
match the previous scene), and keep the total duration at {duration} s.
"""


def add_script(provider, out, board, ids, films, plugin_root, film):
    """film_script.md + film.srt timed to the clips, burned below the video."""
    from . import script
    exe = plugin_python(plugin_root)
    entries, md = script.write(provider, out, board, ids, films, plugin_root, exe)
    srt = script.save(entries, md, out, Path(film).stem if Path(film).parent == out else "film")
    print(f"Script: {out / (srt.stem + '_script.md')}")
    print(f"Subtitled: {script.burn(plugin_root, exe, film, srt)}")


def stitch(plugin_root, films, target):
    listing = target.with_suffix(".txt")
    listing.write_text("".join(f"file '{f.resolve().as_posix()}'\n" for f in films), encoding="utf-8")
    code = ("import sys; from studio.media import run_ffmpeg; "
            "run_ffmpeg('-f', 'concat', '-safe', '0', '-i', sys.argv[1], '-c', 'copy', sys.argv[2])")
    env = dict(os.environ, PYTHONPATH=str(plugin_root))
    subprocess.run([str(plugin_python(plugin_root)), "-c", code, str(listing), str(target)],
                   check=True, env=env, cwd=plugin_root)
    listing.unlink()
    return target


def run(provider, storyboard_path, plugin_root, only=None, quality="m", redo=False, reviews=1,
        final_quality="h", subtitles=True):
    board = schema.load(storyboard_path)
    errors = schema.validate(board)
    if errors:
        raise ValueError("storyboard invalid:\n- " + "\n- ".join(errors))
    out = Path(storyboard_path).resolve().parent  # renders run with cwd=plugin root
    films = []
    for i, scene in enumerate(board["scenes"]):
        if only and scene["id"] not in only:
            continue
        print(f"Scene {i + 1}/{len(board['scenes'])}: {scene['title']}")
        done = out / "render" / scene["id"] / "film.mp4"
        if not redo and done.exists():
            print("  already rendered, reusing (pass --redo to regenerate)")
            films.append(done)
            continue
        films.append(animate_scene(provider, board, i, out, plugin_root, quality, reviews=reviews,
                                   final_quality=final_quality))
    sent = sorted((out / "prompts").glob("*.sent.md"))
    if sent:  # every prompt actually sent to the animator, in one file
        (out / "prompts" / "all_scenes.sent.md").write_text(
            "\n\n---\n\n".join(f.read_text(encoding="utf-8") for f in sent
                               if f.name != "all_scenes.sent.md"), encoding="utf-8")
    if len(films) > 1:
        print(f"Film: {stitch(plugin_root, films, out / 'film.mp4')}")
    if subtitles and films:
        film = out / "film.mp4" if len(films) > 1 else films[0]
        ids = [sc["id"] for sc in board["scenes"] if not only or sc["id"] in only]
        add_script(provider, out, board, ids, films, plugin_root, film)
    print(f"Scene files: {package.zip_scenes(out, board)}")
    return films
