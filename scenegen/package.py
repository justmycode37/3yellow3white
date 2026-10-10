"""Bundle a film's scene prompts (one .md per scene) and results into one zip."""
from __future__ import annotations

import zipfile
from pathlib import Path


def zip_scenes(folder, storyboard):
    """<folder>/scenes.zip: every scene prompt as its own `NN_<scene>.md` at the top
    level, plus, once the scenes are animated, their code and the film's files."""
    folder = Path(folder)
    target = folder / "scenes.zip"
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, scene in enumerate(storyboard["scenes"], 1):
            prompt = folder / "prompts" / f"{i:02d}_{scene['id']}.md"
            if prompt.exists():
                zf.write(prompt, prompt.name)
        zf.write(folder / "storyboard.json", "storyboard.json")
        for scene in storyboard["scenes"]:
            sid = scene["id"]
            for src, name in ((folder / "scenes" / f"{sid}.js", f"scenes/{sid}.js"),
                              (folder / "scenes" / f"{sid}.py", f"scenes/{sid}.py"),
                              (folder / "render" / sid / "film.mp4", f"videos/{sid}.mp4")):
                if src.exists():
                    zf.write(src, name)
        for name in ("manifest.json", "film_script.md", "film.srt", "film.mp4"):
            if (folder / name).exists():
                zf.write(folder / name, name)
    return target


def zip_topics(out, plan):
    """For a whole-file run: one zip holding every topic's scenes.zip contents."""
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
