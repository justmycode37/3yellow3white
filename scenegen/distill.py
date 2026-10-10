"""Layer 0: a whole source file (PDF / text / markdown) -> ordered list of topics.

Each topic carries condensed source notes, which then ground that topic's
storyboard (layer 1) exactly as a single hand-given topic would.
"""
from __future__ import annotations

import os
import re
import subprocess
import tempfile
from pathlib import Path

from . import package, schema, storyboard

SYSTEM = """\
You are a curriculum designer preparing 3Blue1Brown-style explanation videos from
course material. You read the whole source and decide which topics deserve their own
short animated film. Answer with a single JSON object and nothing else.
"""

FORMAT = """\
JSON format:
{
  "source_title": str,
  "audience": str,          # who the material is written for and what it assumes
  "assumed": [str],         # prerequisites the material takes for granted
  "topics": [{
    "id": "t01_snake_case",
    "title": str,           # short, e.g. "Matrix multiplication"
    "summary": str,         # 1-2 sentences: what a student should understand afterwards
    "why_visual": str,      # what picture or motion makes this topic click
    "key_ideas": [str],     # the ideas the film must cover, in teaching order
    "requires": [str],      # ids of earlier topics this one builds on
    "source_refs": str,     # where in the source (pages/sections/headings)
    "notes": str            # faithful condensed notes from the source for this topic:
                            # definitions, formulas, worked examples, notation, caveats
  }]
}

Rules:
- Cover the material's main ideas in teaching order; skip administrative text,
  exercises without new ideas, and pure bookkeeping.
- One topic = one film of a few minutes with one central question. Split big chapters;
  merge tiny fragments into the topic they belong to.
- "requires" may only name earlier topic ids.
- Notes must stay faithful to the source's definitions and notation; do not invent
  content the source does not support.
- Return at most {max_topics} topics.
"""


def extract_text(path, plugin_root):
    """PDF via the plugin's `studio ingest` (keeps page markers); text files as-is."""
    path = Path(path)
    if path.suffix.lower() != ".pdf":
        return path.read_text(encoding="utf-8-sig", errors="replace")
    from .animate import plugin_python
    with tempfile.TemporaryDirectory() as tmp:
        target = Path(tmp) / "source.txt"
        env = dict(os.environ, PYTHONPATH=str(plugin_root))
        subprocess.run([str(plugin_python(plugin_root)), "-m", "studio", "ingest",
                        str(path.resolve()), "--output", str(target)],
                       check=True, env=env, cwd=plugin_root)
        return target.read_text(encoding="utf-8")


def validate(plan):
    if not isinstance(plan, dict) or not isinstance(plan.get("topics"), list) or not plan["topics"]:
        return ["need a JSON object with a non-empty 'topics' array"]
    errors, seen = [], []
    for key in ("source_title", "audience"):
        if not isinstance(plan.get(key), str) or not plan[key].strip():
            errors.append(f"'{key}' must be non-empty text")
    for i, topic in enumerate(plan["topics"]):
        tid = topic.get("id", "") if isinstance(topic, dict) else ""
        if not re.fullmatch(r"[a-z0-9_]+", tid or "") or tid in seen:
            errors.append(f"topics[{i}]: id must be unique snake_case, got {tid!r}")
            continue
        for key in ("title", "summary", "why_visual", "notes"):
            if not isinstance(topic.get(key), str) or not topic[key].strip():
                errors.append(f"topic {tid}: '{key}' must be non-empty text")
        if not isinstance(topic.get("key_ideas"), list) or not topic["key_ideas"]:
            errors.append(f"topic {tid}: 'key_ideas' must be a non-empty list")
        for req in topic.get("requires", []) or []:
            if req not in seen:
                errors.append(f"topic {tid}: requires '{req}', which is not an earlier topic")
        seen.append(tid)
    return errors


def plan_topics(provider, text, max_topics=8, max_repairs=2):
    user = (FORMAT.replace("{max_topics}", str(max_topics)) +
            "\n\nSOURCE MATERIAL:\n<<<\n" + text + "\n>>>")
    reply = provider.complete(SYSTEM, user, name="topics")
    for attempt in range(max_repairs + 1):
        try:
            plan = storyboard.parse_json(reply)
            errors = validate(plan)
        except ValueError as exc:
            plan, errors = None, [f"response is not valid JSON: {exc}"]
        if not errors:
            return plan
        if attempt == max_repairs:
            raise ValueError("topic plan still invalid:\n- " + "\n- ".join(errors))
        reply = provider.complete(
            SYSTEM, user + "\n\nYour previous answer:\n" + reply +
            "\n\nIt failed these checks. Return the full corrected JSON:\n- " + "\n- ".join(errors),
            name=f"topics_repair{attempt + 1}")


def topic_notes(plan, topic):
    """Everything the storyboard writer should know about this topic."""
    by_id = {t["id"]: t for t in plan["topics"]}
    earlier = [by_id[r]["title"] for r in topic.get("requires", []) if r in by_id]
    parts = [f"From: {plan['source_title']} ({topic.get('source_refs', '')})",
             f"Summary: {topic['summary']}",
             f"What makes it visual: {topic['why_visual']}",
             "Key ideas, in order:\n" + "\n".join(f"- {k}" for k in topic["key_ideas"]),
             "Source notes:\n" + topic["notes"]]
    if earlier:
        parts.append("Already explained in earlier films (build on it, do not re-teach): "
                     + ", ".join(earlier))
    return "\n\n".join(parts)


def run(provider, source, out, plugin_root, max_topics=8, only=None, write_prompts=None,
        replan=False):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    text = extract_text(source, plugin_root)
    if len(text) > 600_000:
        raise ValueError(f"source is {len(text)} characters; split it before distilling")
    (out / "source.txt").write_text(text, encoding="utf-8")
    if (out / "topics.json").exists() and not replan:
        plan = schema.load(out / "topics.json")  # keep topic ids stable across reruns
        print("Reusing existing topics.json (pass --replan to redo it)")
    else:
        plan = plan_topics(provider, text, max_topics)
    schema.dump(plan, out / "topics.json")
    print(f"{len(plan['topics'])} topics: {out / 'topics.json'}")

    overview = [f"# {plan['source_title']}", "", f"Audience: {plan['audience']}", ""]
    for n, topic in enumerate(plan["topics"], 1):
        folder = out / f"{n:02d}_{topic['id']}"
        overview.append(f"{n}. **{topic['title']}**: {topic['summary']} (`{folder.name}/`)")
        if only and topic["id"] not in only:
            continue
        print(f"Topic {n}/{len(plan['topics'])}: {topic['title']}")
        folder.mkdir(exist_ok=True)
        board = storyboard.generate(provider, topic["title"], plan["audience"],
                                    topic_notes(plan, topic))
        titles = [t["title"] for t in plan["topics"]]
        board["context"] = {
            "source_title": plan["source_title"],
            "position": f"film {n} of {len(titles)}",
            "topic_summary": topic["summary"],
            "earlier_topics": titles[:n - 1],
            "later_topics": titles[n:],
        }
        schema.dump(board, folder / "storyboard.json")
        if write_prompts:
            write_prompts(board, folder, plugin_root)
    (out / "overview.md").write_text("\n".join(overview) + "\n", encoding="utf-8")
    print(f"All topics: {package.zip_topics(out, plan)}")
    return plan
