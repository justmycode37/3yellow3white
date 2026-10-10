"""Command line: `python -m scenegen --help`."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import animate, animation_prompt, animlib_engine, distill, package, preview, sample, schema, storyboard
from .providers import PendingResponse, get_provider

ENGINE = "animlib"  # set from --engine in main()
DEFAULT_PLUGIN = Path(__file__).resolve().parents[2] / "explanation-studio-1.0.0"


def write_prompts(board, out, plugin_root):
    prompts = out / "prompts"
    prompts.mkdir(parents=True, exist_ok=True)
    for stale in prompts.glob("*.md"):  # a rerun may have fewer or renamed scenes
        stale.unlink()
    for i, scene in enumerate(board["scenes"]):
        stem = f"{i + 1:02d}_{scene['id']}"
        if ENGINE == "animlib":
            # The previous scene's source is attached when the scene is animated.
            text = animlib_engine.build_prompt(board, i, [])
        else:
            text = animation_prompt.build(board, i, plugin_root)
            timing = out / "render" / scene["id"]
            timing.mkdir(parents=True, exist_ok=True)
            (timing / "timeline.json").write_text(
                json.dumps(animation_prompt.timeline(scene), indent=2), encoding="utf-8")
        (prompts / f"{stem}.md").write_text(text, encoding="utf-8")
    combine(prompts, prompts / "all_scenes.md", "[0-9]*.md")
    schema.dump(board, out / "storyboard.json")
    zipped = package.zip_scenes(out, board)
    print(f"Wrote {len(board['scenes'])} scene prompts (+ all_scenes.md, {zipped.name}) to {out}")


def combine(folder, target, pattern):
    """Join per-scene prompt files into one file, in scene order."""
    parts = [f.read_text(encoding="utf-8") for f in sorted(folder.glob(pattern))
             if not f.name.startswith("all_scenes") and not f.name.endswith(".sent.md")]
    target.write_text("\n\n---\n\n".join(parts), encoding="utf-8")


def cmd_scenes(args):
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    provider = get_provider(args.provider, model=args.model, workdir=out)
    notes = Path(args.notes).read_text(encoding="utf-8") if args.notes else None
    try:
        board = storyboard.generate(provider, args.topic, args.audience, notes, args.scenes)
    except PendingResponse as exc:
        print(exc)
        return 2
    schema.dump(board, out / "storyboard.json")
    print(f"Storyboard with {len(board['scenes'])} scenes: {out / 'storyboard.json'}")
    write_prompts(board, out, Path(args.plugin))
    return 0


def cmd_prompts(args):
    board = schema.load(args.storyboard)
    errors = schema.validate(board)
    if errors:
        print("Storyboard invalid:\n- " + "\n- ".join(errors))
        return 1
    out = Path(args.out) if args.out else Path(args.storyboard).parent
    write_prompts(board, out, Path(args.plugin))
    return 0


def cmd_animate(args):
    plugin = Path(args.plugin).resolve()
    options = {"model": args.model}
    if args.provider == "claude-code":
        # lets the animator read the engine's docs (animlib reference / plugin docs)
        options["read_dir"] = str(animlib_engine.REPO if args.engine == "animlib" else plugin.parent)
    else:
        options["workdir"] = Path(args.storyboard).parent
    provider = get_provider(args.provider, **options)
    if args.engine == "animlib":
        animlib_engine.run(provider, args.storyboard, only=args.scene, redo=args.redo,
                           subtitles=not args.no_subtitles)
        print(f"Watch it: py -m scenegen preview {Path(args.storyboard).parent}")
        return 0
    try:
        animate.run(provider, args.storyboard, plugin, only=args.scene, quality=args.quality,
                    redo=args.redo, reviews=args.reviews,
                    final_quality=args.final_quality, subtitles=not args.no_subtitles)
    except PendingResponse as exc:
        print(exc)
        return 2
    return 0


def cmd_file(args):
    out = Path(args.out)
    provider = get_provider(args.provider, model=args.model, workdir=out)
    try:
        distill.run(provider, args.source, out, Path(args.plugin).resolve(),
                    max_topics=args.max_topics, only=args.topic, write_prompts=write_prompts,
                    replan=args.replan)
    except PendingResponse as exc:
        print(exc)
        return 2
    print(f"Overview: {out / 'overview.md'}")
    return 0


def cmd_sample(args):
    plugin = Path(args.plugin).resolve()
    options = {"model": args.model}
    if args.provider == "claude-code":
        options["read_dir"] = str(plugin.parent)
    if args.engine == "animlib" and args.provider == "claude-code":
        options["read_dir"] = str(animlib_engine.REPO)
    provider = get_provider(args.provider, **options)
    if args.engine == "animlib":
        sample.run_animlib(provider, args.lecture, per_topic=args.per_topic)
        print(f"Watch it: py -m scenegen preview {args.lecture}")
        return 0
    sample.run(provider, args.lecture, plugin, per_topic=args.per_topic, quality=args.quality)
    return 0


def cmd_script(args):
    plugin = Path(args.plugin).resolve()
    provider = get_provider(args.provider, model=args.model)
    board_file = Path(args.storyboard).resolve()
    board, out = schema.load(board_file), board_file.parent
    ids = [s["id"] for s in board["scenes"] if (out / "render" / s["id"] / "film.mp4").exists()]
    films = [out / "render" / i / "film.mp4" for i in ids]
    if not films:
        print("No rendered scenes yet; run `scenegen animate` first.")
        return 1
    film = animate.stitch(plugin, films, out / "film.mp4") if len(films) > 1 else films[0]
    animate.add_script(provider, out, board, ids, films, plugin, film)
    return 0


def cmd_preview(args):
    preview.serve(args.folder, open_browser=not args.no_open)
    return 0


def cmd_check(args):
    errors = schema.validate(schema.load(args.storyboard))
    print("OK" if not errors else "Invalid:\n- " + "\n- ".join(errors))
    return 1 if errors else 0


def main(argv=None):
    parser = argparse.ArgumentParser(prog="scenegen", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("scenes", help="topic -> storyboard.json + per-scene animation prompts")
    p.add_argument("topic")
    p.add_argument("--out", required=True)
    p.add_argument("--audience")
    p.add_argument("--notes", help="text file with source material for the topic")
    p.add_argument("--scenes", type=int, help="exact number of scenes")
    p.add_argument("--engine", default="animlib", choices=["animlib", "manim"])
    p.add_argument("--provider", default="claude-code",
                   choices=["claude-code", "anthropic", "openai", "handoff"])
    p.add_argument("--model")
    p.add_argument("--plugin", default=str(DEFAULT_PLUGIN), help="Explanation Studio root")
    p.set_defaults(func=cmd_scenes)

    p = sub.add_parser("file", help="whole PDF/text file -> topics -> a storyboard + prompts per topic")
    p.add_argument("source", help="PDF, .txt or .md file")
    p.add_argument("--out", required=True)
    p.add_argument("--max-topics", type=int, default=8)
    p.add_argument("--engine", default="animlib", choices=["animlib", "manim"])
    p.add_argument("--topic", action="append", help="only build storyboards for this topic id")
    p.add_argument("--replan", action="store_true", help="redo the topic list even if topics.json exists")
    p.add_argument("--provider", default="claude-code",
                   choices=["claude-code", "anthropic", "openai", "handoff"])
    p.add_argument("--model")
    p.add_argument("--plugin", default=str(DEFAULT_PLUGIN))
    p.set_defaults(func=cmd_file)

    p = sub.add_parser("prompts", help="regenerate prompts from an edited storyboard.json")
    p.add_argument("storyboard")
    p.add_argument("--out")
    p.add_argument("--engine", default="animlib", choices=["animlib", "manim"])
    p.add_argument("--plugin", default=str(DEFAULT_PLUGIN))
    p.set_defaults(func=cmd_prompts)

    p = sub.add_parser("animate", help="storyboard -> scene code (LLM) -> rendered mp4s + film.mp4")
    p.add_argument("storyboard")
    p.add_argument("--scene", action="append", help="only this scene id (repeatable)")
    p.add_argument("--engine", default="animlib", choices=["animlib", "manim"],
                   help="animlib: live browser scenes (default); manim: rendered mp4 via the plugin")
    p.add_argument("--reviews", type=int, default=1,
                   help="visual review rounds per scene: Claude looks at rendered frames and revises")
    p.add_argument("--redo", action="store_true", help="regenerate scenes that already have a video")
    p.add_argument("--no-subtitles", action="store_true", help="skip the narration script and subtitles")
    p.add_argument("--quality", default="l", choices=["l", "m", "h"],
                   help="draft quality used while iterating (l=480p15, m=720p30, h=1080p60)")
    p.add_argument("--final-quality", default="l", choices=["l", "m", "h"],
                   help="quality of the final render of each scene")
    p.add_argument("--provider", default="claude-code",
                   choices=["claude-code", "anthropic", "openai", "handoff"])
    p.add_argument("--model")
    p.add_argument("--plugin", default=str(DEFAULT_PLUGIN))
    p.set_defaults(func=cmd_animate)

    p = sub.add_parser("sample", help="preview a whole lecture: first scenes of every topic in one mp4")
    p.add_argument("lecture", help="output folder of `scenegen file`")
    p.add_argument("--per-topic", type=int, default=2)
    p.add_argument("--engine", default="animlib", choices=["animlib", "manim"])
    p.add_argument("--quality", default="l", choices=["l", "m", "h"])
    p.add_argument("--provider", default="claude-code",
                   choices=["claude-code", "anthropic", "openai", "handoff"])
    p.add_argument("--model")
    p.add_argument("--plugin", default=str(DEFAULT_PLUGIN))
    p.set_defaults(func=cmd_sample)

    p = sub.add_parser("script", help="narration script + subtitles under the video, for rendered scenes")
    p.add_argument("storyboard")
    p.add_argument("--provider", default="claude-code",
                   choices=["claude-code", "anthropic", "openai", "handoff"])
    p.add_argument("--model")
    p.add_argument("--plugin", default=str(DEFAULT_PLUGIN))
    p.set_defaults(func=cmd_script)

    p = sub.add_parser("preview", help="play animlib output in the browser (a film or a whole lecture folder)")
    p.add_argument("folder")
    p.add_argument("--no-open", action="store_true")
    p.set_defaults(func=cmd_preview)

    p = sub.add_parser("check", help="validate a storyboard.json")
    p.add_argument("storyboard")
    p.set_defaults(func=cmd_check)

    args = parser.parse_args(argv)
    global ENGINE
    ENGINE = getattr(args, "engine", "animlib")
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
