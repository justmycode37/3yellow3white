"""Layer 1: one topic -> chained storyboard of scenes (via an LLM)."""
from __future__ import annotations

import json
import re

from . import schema
from .style import DEFAULT_PALETTE, STYLE_GUIDE

SYSTEM = f"""\
You are a storyboard director for short mathematical explanation animations in the
style of 3Blue1Brown. You plan scenes; another model will later animate each scene
separately in code, so your plan must state clearly what each scene teaches, what it shows, and
how it hands its final picture to the next scene.

{STYLE_GUIDE}
Answer with a single JSON object and nothing else (no prose, no code fences).
"""

FORMAT = """JSON format:
{
  "topic": str,
  "audience": str,                  # who this is for, what they already know
  "assumed": [str],                 # prerequisites NOT taught here
  "central_question": str,          # the one question the whole film answers
  "palette": {role: "#RRGGBB"},     # start from the default palette below
  "color_meanings": {concept: palette role},   # one colour = one concept, whole film
  "opening": str,                   # what is on screen before scene 1 (usually an empty frame)
  "scenes": [{
    "id": "s01_snake_case",
    "title": str,
    "purpose": str,      # the one insight the student should leave this scene with
    "shows": str,        # qualitative description of the visual explanation: what appears,
                         # what moves or changes and why, what is compared, the "aha" moment
    "key_points": [str], # the ideas the visuals must make visible, in order
    "elements": [str],   # visual elements on screen at the end, each "name: role",
                         # reusing the same names across scenes for the same thing
    "ends_with": str,    # qualitative description of the final frame
    "duration": seconds, # 20-60: unhurried, room to watch and think
    "arc_step": int,     # which teaching-plan step this scene serves
    "interactive": [{    # what the viewer can change while the scene plays (0-2 items)
      "id": "snake_case",            # stable control id, unique in the scene
      "control": "slider" | "toggle" | "select",
      "label": str,                  # 1-3 words shown next to the control
      "changes": str,                # which element/quantity it drives, and its sensible range
      "discover": str                # what the student finds out by playing with it
    }]
  }]
}

Rules:
- Describe WHAT the scene must show and WHY, not exact numbers, coordinates or
  matrices. The animator chooses a concrete example; mention one only where the
  explanation depends on its character (e.g. "a rotation", "a shear", "a 2x2 matrix").
- Do NOT write starts_with: scene i starts on scene i-1's ends_with (scene 1 on
  "opening"). So each ends_with must describe everything still visible, and the next
  scene must build on that picture rather than start over.
- Each scene introduces one idea. Build from a concrete picture to the general rule.
- Keep each scene simple: describe one clear motion and its result, not a list of
  effects. Keep "elements" short (about 4-7 core objects): helper copies,
  decompositions, highlights and intermediate equations do not carry over to the
  next scene; ends_with is a clean picture.
- Do not plan captions or explanatory sentences on screen: only labels, formulas,
  matrices and numbers. "shows" must explain through motion and pictures.
- Spatial subjects (molecules, 3D shapes) may be shown in 3D; the viewer can then
  rotate the view with the mouse, which counts as interaction but needs no control.
- Interactivity: the player lets viewers change inputs live (sliders for numbers,
  toggles for show/hide or on/off, selects for a few named choices), even while the
  animation runs or is paused. Give a scene an interactive element when playing with
  it deepens the scene's idea (e.g. a slider for a vector's coordinate or a matrix
  entry, a toggle to compare with/without, a select for the order of two maps).
  The default value must show exactly the storyboarded example, and the control must
  drive the real geometry, not a decoration. Most films should have interactive
  elements in at least half of their scenes; use an empty list where interaction
  would distract (e.g. a scene that only assembles a formula). At most 2 per scene.
- 4 to 8 scenes.
"""


PLAN_SYSTEM = """\
You are an expert math teacher planning a short 3Blue1Brown-style animated
explanation. Before any visuals are designed, you decide how a student will come to
understand the topic as well as possible. Answer with a single JSON object only.
"""

PLAN_FORMAT = """\
Plan how to teach this topic so a student understands it as deeply as possible.

JSON format:
{
  "learning_goal": str,          # what the student can see/explain afterwards
  "prerequisites": [str],        # what must already be solid; the film may briefly recall it
  "key_insight": str,            # the single "aha" the whole film is built around
  "misconceptions": [str],       # typical wrong ideas the film should prevent
  "concrete_example": str,       # one running example that carries the film (qualitative)
  "arc": [{                      # the order in which understanding is built
    "step": str,                 # what the student understands after this step
    "why_now": str,              # why this comes here (what it builds on / prepares)
    "visual_idea": str           # the picture or motion that makes it click
  }]
}

Principles:
- Concrete before abstract: start with one example the viewer can watch, then
  generalise. Name things only after they have been seen.
- One new idea per step; each step must rely only on earlier steps or prerequisites.
- Build towards the key insight, show it unmistakably, then consolidate it (a second
  example, a contrast or a counterexample that makes its boundaries clear).
- Address each misconception with something the viewer sees, not with words.
- 4 to 8 arc steps.
"""


def plan_request(topic, audience=None, notes=None):
    user = [f"Topic: {topic}"]
    if audience:
        user.append(f"Audience: {audience}")
    if notes:
        user.append(f"Source material to stay faithful to:\n{notes}")
    user.append(PLAN_FORMAT)
    return "\n\n".join(user)


def validate_plan(plan):
    errors = []
    if not isinstance(plan, dict):
        return ["teaching plan must be a JSON object"]
    for key in ("learning_goal", "key_insight", "concrete_example"):
        if not isinstance(plan.get(key), str) or not plan[key].strip():
            errors.append(f"'{key}' must be non-empty text")
    arc = plan.get("arc")
    if not isinstance(arc, list) or not 3 <= len(arc) <= 10:
        errors.append("'arc' must list 3-10 steps")
    else:
        for i, step in enumerate(arc):
            if not isinstance(step, dict) or not all(
                    isinstance(step.get(k), str) and step[k].strip()
                    for k in ("step", "why_now", "visual_idea")):
                errors.append(f"arc[{i}] needs step, why_now and visual_idea")
    return errors


def _ask_json(provider, system, user, validator, name, max_repairs):
    reply = provider.complete(system, user, name=name)
    for attempt in range(max_repairs + 1):
        try:
            data = parse_json(reply)
            errors = validator(data)
        except (ValueError, json.JSONDecodeError) as exc:
            data, errors = None, [f"response is not valid JSON: {exc}"]
        if not errors:
            return data
        if attempt == max_repairs:
            raise ValueError(f"{name} still invalid after repairs:\n- " + "\n- ".join(errors))
        reply = provider.complete(
            system, user + "\n\nYour previous answer:\n" + reply +
            "\n\nIt failed these checks. Return the full corrected JSON:\n- " + "\n- ".join(errors),
            name=f"{name}_repair{attempt + 1}")


def build_request(topic, audience=None, notes=None, scenes=None):
    user = [f"Topic: {topic}"]
    if audience:
        user.append(f"Audience: {audience}")
    if scenes:
        user.append(f"Number of scenes: exactly {scenes}")
    if notes:
        user.append(f"Source material to stay faithful to:\n{notes}")
    user.append(FORMAT)
    user.append("Default palette:\n" + json.dumps(DEFAULT_PALETTE, indent=2))
    return "\n\n".join(user)


def parse_json(text):
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.S)
    if fenced:
        text = fenced.group(1)
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < 0:
        raise ValueError("no JSON object in response")
    return json.loads(text[start:end + 1])


def generate(provider, topic, audience=None, notes=None, scenes=None, max_repairs=3):
    """Plan the teaching first, then ask for the storyboard that realises the plan;
    validation errors are fed back until both pass."""
    plan = _ask_json(provider, PLAN_SYSTEM, plan_request(topic, audience, notes),
                     validate_plan, "teaching_plan", max_repairs)
    user = build_request(topic, audience, notes, scenes)
    user += ("\n\nTeaching plan to realise (scenes must follow this arc in order; one or more "
             "scenes per arc step; set each scene's \"arc_step\" to the 1-based step it serves):\n"
             + json.dumps(plan, indent=2, ensure_ascii=False))
    board = _ask_json(provider, SYSTEM, user,
                      lambda b: schema.validate(b) + _arc_errors(b, plan), "storyboard", max_repairs)
    board["teaching_plan"] = plan
    return board


def _arc_errors(board, plan):
    n = len(plan["arc"])
    steps = [s.get("arc_step") for s in board.get("scenes", []) if isinstance(s, dict)]
    if any(not isinstance(x, int) or not 1 <= x <= n for x in steps):
        return [f"every scene needs an integer arc_step between 1 and {n}"]
    if steps != sorted(steps) or set(steps) != set(range(1, n + 1)):
        return ["scenes must cover every arc step, in order"]
    return []
