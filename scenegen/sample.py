"""A quick preview of a whole lecture: the first few scenes of every topic, one mp4."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import animate, animlib_engine, schema, script


def run(provider, lecture_dir, plugin_root, per_topic=2, quality="l", subtitles=True):
    lecture_dir = Path(lecture_dir).resolve()
    plan = schema.load(lecture_dir / "topics.json")
    jobs = []
    for n, topic in enumerate(plan["topics"], 1):
        board_file = lecture_dir / f"{n:02d}_{topic['id']}" / "storyboard.json"
        if not board_file.exists():
            print(f"Topic {n}: no storyboard yet, skipped (run `scenegen file` first)")
            continue
        board = schema.load(board_file)
        ids = [s["id"] for s in board["scenes"][:per_topic]]
        print(f"Topic {n}/{len(plan['topics'])}: {topic['title']} (scenes {', '.join(ids)})")
        jobs.append((board_file, board, ids))

    def render(job):  # topics are independent, so they render in parallel
        board_file, board, ids = job
        clips = animate.run(provider, board_file, plugin_root, only=ids, quality=quality,
                            final_quality=quality, subtitles=False)
        return board_file.parent, board, ids, clips

    with ThreadPoolExecutor(max_workers=max(1, len(jobs))) as pool:
        parts = list(pool.map(render, jobs))
    films = [clip for *_, clips in parts for clip in clips]
    if not films:
        raise RuntimeError("nothing rendered")
    target = animate.stitch(plugin_root, films, lecture_dir / "lecture_sample.mp4")
    print(f"Lecture sample: {target}")
    if subtitles:
        exe = animate.plugin_python(plugin_root)
        entries, md, offset = [], [f"# Lecture sample: {plan['source_title']}", ""], 0.0
        for folder, board, ids, clips in parts:
            e, m = script.write(provider, folder, board, ids, clips, plugin_root, exe, offset)
            entries += e
            md.append(m)
            offset += sum(script._clip_duration(plugin_root, exe, c) for c in clips)
        srt = script.save(entries, "\n".join(md), lecture_dir, "lecture_sample")
        print(f"Script: {lecture_dir / 'lecture_sample_script.md'}")
        print(f"Subtitled: {script.burn(plugin_root, exe, target, srt)}")
    return target


def run_animlib(provider, lecture_dir, per_topic=2):
    """animlib preview of a lecture: the first scenes of every topic, written in parallel."""
    lecture_dir = Path(lecture_dir).resolve()
    plan = schema.load(lecture_dir / "topics.json")
    jobs = []
    for n, topic in enumerate(plan["topics"], 1):
        board_file = lecture_dir / f"{n:02d}_{topic['id']}" / "storyboard.json"
        if board_file.exists():
            ids = [s["id"] for s in schema.load(board_file)["scenes"][:per_topic]]
            print(f"Topic {n}/{len(plan['topics'])}: {topic['title']} (scenes {', '.join(ids)})")
            jobs.append((board_file, ids))
    with ThreadPoolExecutor(max_workers=max(1, len(jobs))) as pool:
        list(pool.map(lambda job: animlib_engine.run(provider, job[0], only=job[1]), jobs))
