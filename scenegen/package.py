"""Bundle each scene's files into one zip per film."""
from __future__ import annotations

import zipfile
from pathlib import Path


def zip_scenes(folder, storyboard):
    """<folder>/scenes.zip with one directory per scene: prompt, timeline, and
    (once animated) the scene code and video."""
    folder = Path(folder)
    target = folder / "scenes.zip"
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(folder / "storyboard.json", "storyboard.json")
        combined = folder / "prompts" / "all_scenes.md"
        if combined.exists():
            zf.write(combined, "all_scenes.md")
        for i, scene in enumerate(storyboard["scenes"], 1):
            sid, stem = scene["id"], f"{i:02d}_{scene['id']}"
            files = {
                "prompt.md": folder / "prompts" / f"{stem}.md",
                "prompt_sent.md": folder / "prompts" / f"{stem}.sent.md",
                "timeline.json": folder / "render" / sid / "timeline.json",
                "scene.py": folder / "scenes" / f"{sid}.py",
                "scene.mp4": folder / "render" / sid / "film.mp4",
            }
            for name, src in files.items():
                if src.exists():
                    zf.write(src, f"{stem}/{name}")
        if (folder / "film.mp4").exists():
            zf.write(folder / "film.mp4", "film.mp4")
    return target


def zip_topics(out, plan):
    """For a whole-file run: one zip holding every topic's scene folders."""
    out = Path(out)
    target = out / "all_topics.zip"
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as zf:
        for name in ("topics.json", "overview.md"):
            if (out / name).exists():
                zf.write(out / name, name)
        for n, topic in enumerate(plan["topics"], 1):
            topic_zip = out / f"{n:02d}_{topic['id']}" / "scenes.zip"
            if not topic_zip.exists():
                continue
            with zipfile.ZipFile(topic_zip) as inner:
                for item in inner.namelist():
                    zf.writestr(f"{n:02d}_{topic['id']}/{item}", inner.read(item))
    return target
