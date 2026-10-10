"""Layer 2: storyboard scene -> self-contained prompt for an animation LLM.

The prompt is qualitative: it says what the scene must make the student see and
understand, and leaves concrete values to the animator. Continuity comes from
the previous scene's `ends_with` and, when animating, the previous scene's code.
"""
from __future__ import annotations

from . import schema
from .style import STYLE_GUIDE


def class_name(scene_id):
    return "".join(part.capitalize() for part in scene_id.split("_"))


def timeline(scene):
    """Visual-only timing manifest so `python -m studio render --silent` can check the clock."""
    d = scene["duration"]
    return {"title": scene["title"], "visual_iteration_only": True, "duration": d,
            "beats": [{"id": "scene", "start": 0, "duration": d, "end": d,
                       "narration": "(visual only)", "visual": scene["shows"], "cues": []}]}


def _bullets(items):
    return "\n".join(f"- {item}" for item in items)


def overarching_context(storyboard, index, outline):
    """The big picture every scene prompt carries: course, film, and scene neighbours."""
    scenes = storyboard["scenes"]
    lines = ["## Overarching context", ""]
    ctx = storyboard.get("context") or {}
    if ctx.get("source_title"):
        lines.append(f"**Course material:** {ctx['source_title']}")
    if ctx.get("position"):
        lines.append(f"**This film:** {ctx['position']}: {storyboard['topic']}")
    if ctx.get("topic_summary"):
        lines.append(f"**What the film teaches:** {ctx['topic_summary']}")
    lines.append(f"**The film's question:** {storyboard.get('central_question', storyboard['topic'])}")
    if storyboard.get("assumed"):
        lines.append("**Viewers already know:** " + ", ".join(storyboard["assumed"]))
    if ctx.get("earlier_topics"):
        lines.append("**Covered in earlier films (do not re-teach):** " + ", ".join(ctx["earlier_topics"]))
    if ctx.get("later_topics"):
        lines.append("**Coming in later films (do not anticipate):** " + ", ".join(ctx["later_topics"]))
    plan = storyboard.get("teaching_plan")
    if plan:
        lines += ["", "**Teaching plan for the whole film**",
                  f"- Learning goal: {plan['learning_goal']}",
                  f"- Key insight the film builds to: {plan['key_insight']}",
                  f"- Running example: {plan['concrete_example']}"]
        if plan.get("misconceptions"):
            lines.append("- Misconceptions to prevent: " + "; ".join(plan["misconceptions"]))
        step_no = storyboard["scenes"][index].get("arc_step")
        if isinstance(step_no, int) and 1 <= step_no <= len(plan["arc"]):
            step = plan["arc"][step_no - 1]
            lines += [f"- **This scene serves step {step_no} of {len(plan['arc'])}:** {step['step']}",
                      f"  (why here: {step['why_now']}; visual idea: {step['visual_idea']})"]
    lines += ["", f"**All scenes of this film** (you are writing scene {index + 1}):", "", outline, ""]
    if index > 0:
        prev = scenes[index - 1]
        lines.append(f"**Previous scene:** {prev['title']}: {prev['purpose']}")
    if index + 1 < len(scenes):
        nxt = scenes[index + 1]
        lines.append(f"**Next scene:** {nxt['title']}: {nxt['purpose']}")
    lines.append("Your scene must hand over cleanly: it continues the previous scene's idea and "
                 "sets up the next one, without repeating or skipping ahead.")
    return "\n".join(lines)


def interactive_section(scene):
    """What the viewer can play with in this scene (engine-neutral description)."""
    controls = scene.get("interactive") or []
    if not controls:
        return ("## Interactive elements\n\nNone in this scene: it should simply play. "
                "Do not add controls.")
    lines = ["## Interactive elements", "",
             "The viewer can change these while the scene plays or is paused. Build each one:"]
    for c in controls:
        lines += [f"- **{c['label']}** ({c['control']}, id `{c['id']}`)",
                  f"  - Drives: {c['changes']}",
                  f"  - The student should discover: {c['discover']}"]
    lines += ["", "The default value shows exactly the example described above. The control "
              "drives the real geometry and every number or formula that depends on it, at "
              "every moment of the scene, and never changes the scene's duration."]
    return "\n".join(lines)


def build(storyboard, index, plugin_root, previous_code=None):
    scenes = storyboard["scenes"]
    scene = scenes[index]
    cls = class_name(scene["id"])
    base = "ThreeDScene" if "3d" in scene.get("dimension", "2d") else "Scene"

    outline = "\n".join(
        (f"**→ {i + 1}. {s['title']}: {s['purpose']}**" if i == index else
         f"   {i + 1}. {s['title']}: {s['purpose']}")
        for i, s in enumerate(scenes))
    colors = "\n".join(f"- {concept}: `{role.upper()}` ({storyboard['palette'][role]})"
                       for concept, role in storyboard["color_meanings"].items())
    palette_code = "\n".join(f'{role.upper()} = "{hexcode}"'
                             for role, hexcode in storyboard["palette"].items())

    if index == 0:
        start = f"The film opens here: {schema.starts_with(storyboard, 0)}"
    elif previous_code:
        start = (f"Starting picture (the previous scene's final frame): "
                 f"{schema.starts_with(storyboard, index)}\n\n"
                 "The previous scene's code is below. Your first frame must reproduce its final "
                 "frame exactly (same example values, positions, colours and sizes), added with "
                 "`self.add(...)` and no animation, so the cut between the scenes is invisible. "
                 "Reuse its construction code and keep its example values.\n\n"
                 f"```python\n{previous_code}\n```")
    else:
        start = (f"Starting picture (the previous scene's final frame): "
                 f"{schema.starts_with(storyboard, index)}\n\n"
                 "Show this picture on your first frame with `self.add(...)` and no animation. "
                 "(When run through `scenegen animate`, the previous scene's code is attached "
                 "here so you can match it exactly.)")
    context = overarching_context(storyboard, index, outline)
    following = (f'The next scene ("{scenes[index + 1]["title"]}") starts from your final frame.'
                 if index + 1 < len(scenes) else "This is the last scene: end on a clean, readable hold.")

    return f"""\
# Animation task: scene {index + 1} of {len(scenes)}: {scene['title']}

Write **one Manim Community Edition scene** for an explanatory animation about
**{storyboard['topic']}**, for {storyboard['audience']}.

{context}

The scene is defined by its START and its END. Your animation is the motion that turns
the start picture into the end picture while making the purpose visible.

## START scene (first frame)

{start}

## END scene (last frame)

{scene['ends_with']}

On screen at the end, with the same names and roles used across the film:
{_bullets(scene['elements'])}

{following}

## The animation: from START to END

**Purpose:** {scene['purpose']}

**What it shows:** {scene['shows']}

**Ideas the visuals must make visible, in order:**
{_bullets(scene['key_points'])}

You choose the concrete example (numbers, vectors, positions) and how to animate it.
Pick values that make the idea easy to see and keep them consistent with the START scene.

{interactive_section(scene)}
(Manim renders a fixed video: instead of a live control, animate a short sweep of each
listed value through its range and back to the default.)

## Style

{STYLE_GUIDE}
Colour meanings (fixed for the whole film):
{colors}

```python
{palette_code}
```
Set the background to `BACKGROUND`.

## Arrows: no leftover heads (hard rule)

A stretched or scaled arrow must never show a second arrowhead. This is the most
common bug, so build every arrow this way:
- To stretch/scale a vector, animate the SAME arrow: drive its length with a
  ValueTracker and rebuild it each frame,
  `v = always_redraw(lambda: Arrow(ORIGIN, end(t.get_value()), buff=0, stroke_width=6,
  max_tip_length_to_length_ratio=0.25, color=C))`. Do not use `.scale()` or
  `.stretch()` on an Arrow (the tip distorts), and do not grow a new longer arrow on
  top of the old one.
- Never draw two arrows along the same line from the same start (e.g. a scaled
  2·î drawn over the original î): the shorter arrow's head shows up in the middle of
  the longer one. If a scaled copy is needed, first fade the original out (or move the
  copy off the original's line), and bring it back afterwards.
- When one arrow replaces another, use `ReplacementTransform(old, new)` or
  `self.remove(old)`; after `Transform(a, b)` only `a` is on screen, and `b` must never
  also be added.
- Before finishing, check every moment where an arrow changes length: exactly one
  arrowhead per arrow must be visible.

## Tools: Explanation Studio plugin

The plugin is at `{plugin_root}`. For craft guidance, read
`skills/explanation-video/references/visual-reasoning.md` and look at
`examples/pca/scene.py` for driving geometry with real values.
- LaTeX may be missing: typeset formulas with
  `from studio.math_labels import math_label` (`math_label(r"A\\vec{{v}}", height=0.5, color=TEXT)`)
  instead of `MathTex`/`Tex`.
- Visuals only: no narration, voice or `film.json`.

## Deliverable

- One Python file with `class {cls}({base})`.
- Total running time **{scene['duration']} s** (±0.3 s): the `run_time`s and `wait`s must add up to it.
- Return only the complete Python file in one ```python block.
"""
