"""Narration script for a film, timed to the rendered scenes, plus burned-in subtitles
shown in a band below the video."""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from . import schema, storyboard

SYSTEM = """\
You write the narration for a math animation in the spirit of 3Blue1Brown: a curious,
warm, unhurried voice that thinks out loud with the viewer. The animation is already
rendered; your words explain what the viewer sees at that moment. Write original
narration (do not quote any existing video). Answer with a single JSON object only.
"""

FORMAT = """\
Write the narration for the scenes below. Each scene lists its duration, what it
shows, and its animation code: use the durations and waits in the code to work out
when each animation happens, and time each line to the moment it describes.

JSON format:
{
  "title": str,
  "scenes": [{
    "id": str,                       # scene id, as given
    "lines": [{"start": seconds, "end": seconds, "text": str}]  # times relative to scene start
  }]
}

Voice (3Blue1Brown-inspired):
- Speak in full, natural sentences, as if sitting next to the viewer: "Notice how...",
  "Here's the key idea...", "Think about what happens to...", "Let's follow...".
  Never terse fragments or labels like "R applied. v moves."
- Use "we" and "you"; invite the viewer to predict before you reveal ("Where do you
  think this arrow lands?"), then let the picture answer.
- Explain why, not just what: connect each motion to the idea it shows. Build gently
  towards the film's key insight and pause on it.
- Light, friendly touches are welcome; no hype, no filler, no "In this video".
- Example of the difference in tone (write your own, do not reuse these):
  too terse: "So v lands on R v."
  natural:   "And look where our yellow vector ends up. It just rides along with the
              grid, so wherever the grid goes, v follows, landing at R times v."
- Aim for speech covering roughly 60-75% of each scene; the rest is calm silence.

Pacing (slow and calm):
- Speak at most about 2 words per second of each line's duration, and leave real
  silences (1-3 s) while important motion plays or right after a key moment.
- Each subtitle line at most 14 words; split a longer sentence over consecutive lines.
- Lines must fit inside their scene (0 <= start < end <= duration), in order, not overlapping.
- Continue naturally from one scene to the next; never re-introduce the film per scene.
"""


def _clip_duration(plugin_root, python_exe, film):
    code = ("import sys, av\n"
            "with av.open(sys.argv[1]) as c: print(c.duration / av.time_base)")
    out = subprocess.run([str(python_exe), "-c", code, str(film)], capture_output=True, text=True,
                         env=dict(os.environ, PYTHONPATH=str(plugin_root)), cwd=plugin_root)
    return float(out.stdout.strip())


def _validate(data, scenes, durations):
    if not isinstance(data, dict) or not isinstance(data.get("scenes"), list):
        return ["need {'scenes': [...]}"]
    errors = []
    by_id = {s.get("id"): s for s in data["scenes"] if isinstance(s, dict)}
    for scene, dur in zip(scenes, durations):
        lines = (by_id.get(scene["id"]) or {}).get("lines")
        if not isinstance(lines, list) or not lines:
            errors.append(f"scene {scene['id']}: needs lines")
            continue
        last = 0.0
        for k, ln in enumerate(lines):
            a, b, t = ln.get("start"), ln.get("end"), ln.get("text")
            if not all(isinstance(v, (int, float)) for v in (a, b)) or not isinstance(t, str) or not t.strip():
                errors.append(f"scene {scene['id']} line {k}: needs numeric start/end and text")
                continue
            if a < last - 1e-6 or b <= a or b > dur + 0.05:
                errors.append(f"scene {scene['id']} line {k}: times must be ordered, non-overlapping "
                              f"and within 0-{dur:.2f} s")
            last = b
    return errors


def write(provider, folder, board, scene_ids, films, plugin_root, python_exe, offset=0.0):
    """Manim films: read clip lengths and scene code, then write the narration."""
    folder = Path(folder)
    scenes = [s for s in board["scenes"] if s["id"] in scene_ids]
    durations = [_clip_duration(plugin_root, python_exe, f) for f in films]
    codes = []
    for scene in scenes:
        code_file = folder / "scenes" / f"{scene['id']}.py"
        codes.append(code_file.read_text(encoding="utf-8") if code_file.exists() else "(code unavailable)")
    entries, md, _ = write_for(provider, board, scenes, durations, codes, offset)
    return entries, md


def write_for(provider, board, scenes, durations, codes, offset=0.0):
    """Ask for narration of the given scenes. Returns (entries with global times,
    script markdown, per-scene lines with scene-local times)."""
    parts = []
    for scene, dur, code in zip(scenes, durations, codes):
        parts.append(f"### Scene {scene['id']}: {scene['title']} ({dur:.2f} s)\n"
                     f"Purpose: {scene['purpose']}\nShows: {scene['shows']}\n"
                     f"```\n{code}\n```")
    plan = board.get("teaching_plan", {})
    user = (FORMAT + f"\n\nFilm: {board['topic']} (for {board['audience']})\n"
            f"Key insight: {plan.get('key_insight', board.get('central_question', ''))}\n\n"
            + "\n\n".join(parts))
    data = storyboard._ask_json(provider, SYSTEM, user,
                                lambda d: _validate(d, scenes, durations), "script", 2)
    by_id = {s["id"]: s for s in data["scenes"]}
    entries, md, t0 = [], [f"# Script: {data.get('title', board['topic'])}", ""], offset
    for scene, dur in zip(scenes, durations):
        md += [f"## {scene['title']}  ({_ts(t0)} - {_ts(t0 + dur)})", ""]
        for ln in by_id[scene["id"]]["lines"]:
            entries.append((t0 + ln["start"], t0 + ln["end"], ln["text"].strip()))
            md.append(f"- **{_ts(t0 + ln['start'])}** {ln['text'].strip()}")
        md.append("")
        t0 += dur
    local = {sc["id"]: by_id[sc["id"]]["lines"] for sc in scenes}
    return entries, "\n".join(md), local


def _ts(t):
    return f"{int(t // 60):02d}:{t % 60:05.2f}"


def _srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def save(entries, script_md, folder, stem="film"):
    folder = Path(folder)
    srt = "\n".join(f"{i}\n{_srt_time(a)} --> {_srt_time(b)}\n{text}\n"
                    for i, (a, b, text) in enumerate(entries, 1))
    (folder / f"{stem}.srt").write_text(srt, encoding="utf-8")
    (folder / f"{stem}_script.md").write_text(script_md, encoding="utf-8")
    return folder / f"{stem}.srt"


def burn(plugin_root, python_exe, film, srt):
    """film_subtitled.mp4: the video with a black band below it carrying the subtitles."""
    film, srt = Path(film).resolve(), Path(srt).resolve()
    ffmpeg = subprocess.run([str(python_exe), "-c", "from studio.media import ffmpeg; print(ffmpeg())"],
                            capture_output=True, text=True, cwd=plugin_root,
                            env=dict(os.environ, PYTHONPATH=str(plugin_root))).stdout.strip()
    target = film.with_name(film.stem + "_subtitled.mp4")
    style = "Fontname=Arial,Fontsize=16,PrimaryColour=&H00F4EFEC,Alignment=2,MarginV=10,BorderStyle=1,Outline=0"
    vf = f"pad=iw:ih+ih/5:0:0:black,subtitles={srt.name}:force_style='{style}'"
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(film),
                    "-vf", vf, "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", str(target)],
                   check=True, cwd=srt.parent)
    return target
