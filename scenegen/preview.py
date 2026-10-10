"""Serve scenegen's animlib output to the browser player (scenegen/animlib/preview)."""
from __future__ import annotations

import json
import os
import subprocess
import webbrowser
from pathlib import Path

from . import animlib_engine, schema

PAGE = Path(__file__).resolve().parent / "animlib" / "preview"


def build(folder):
    """Write <folder>/preview.json from a film folder or a whole lecture folder."""
    folder = Path(folder).resolve()
    topics = []
    if (folder / "manifest.json").exists():
        manifest = schema.load(folder / "manifest.json")
        topics.append({"title": manifest["title"], "scenes": manifest["scenes"]})
        title = manifest["title"]
    else:
        title = schema.load(folder / "topics.json")["source_title"] if (folder / "topics.json").exists() else folder.name
        for manifest_file in sorted(folder.glob("*/manifest.json")):
            manifest = schema.load(manifest_file)
            if manifest["scenes"]:
                topics.append({"title": manifest["title"], "scenes": manifest["scenes"]})
    if not topics:
        raise RuntimeError(f"no manifest.json under {folder}: run `scenegen animate` or `scenegen sample` first")
    (folder / "preview.json").write_text(json.dumps({"title": title, "topics": topics}), encoding="utf-8")
    return folder


def serve(folder, open_browser=True, port=5199):
    folder = build(folder)
    node = Path(animlib_engine.node_exe())
    vite = animlib_engine.REPO / "node_modules" / "vite" / "bin" / "vite.js"
    env = dict(os.environ, SCENEGEN_PREVIEW_DIR=str(folder),
               PATH=str(node.parent) + os.pathsep + os.environ.get("PATH", ""))
    url = f"http://localhost:{port}/"
    print(f"Preview: {url}  (Ctrl+C to stop)")
    proc = subprocess.Popen([str(node), str(vite), "--config", str(PAGE / "vite.config.ts"),
                             "--port", str(port), "--strictPort"], env=env, cwd=animlib_engine.REPO)
    if open_browser:
        webbrowser.open(url)
    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.terminate()
