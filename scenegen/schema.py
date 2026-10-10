"""Storyboard data model and checks.

A storyboard is an ordered list of scenes for one topic, described
qualitatively: what each scene must make the student see and understand, not
exact coordinates. The animator picks concrete values.

Scenes chain through `ends_with`: scene i starts on the picture scene i-1 ends
with (scene 1 starts empty). When animating, the previous scene's code is also
handed to the next animator so the first frame can match exactly.
"""
from __future__ import annotations

import json
import re

TEXT_FIELDS = ("title", "purpose", "shows", "ends_with")
CONTROL_KINDS = {"slider", "toggle", "select"}


def starts_with(storyboard, index):
    if index == 0:
        return storyboard.get("opening", "An empty dark frame.")
    return storyboard["scenes"][index - 1]["ends_with"]


def validate(storyboard):
    """Return a list of human-readable errors (empty means valid)."""
    if not isinstance(storyboard, dict):
        return ["storyboard must be a JSON object"]
    errors = []
    for key in ("topic", "audience", "palette", "color_meanings", "scenes"):
        if key not in storyboard:
            errors.append(f"missing top-level key '{key}'")
    if errors:
        return errors
    palette = storyboard["palette"]
    if not isinstance(palette, dict) or not palette:
        return ["palette must be a non-empty object of role -> #RRGGBB"]
    for role, value in palette.items():
        if not (isinstance(value, str) and re.fullmatch(r"#[0-9A-Fa-f]{6}", value)):
            errors.append(f"palette.{role}: must be a #RRGGBB colour")
    meanings = storyboard["color_meanings"]
    if not isinstance(meanings, dict):
        errors.append("color_meanings must map a concept to a palette role")
    else:
        for concept, role in meanings.items():
            if role not in palette:
                errors.append(f"color_meanings['{concept}']: '{role}' is not a palette role")
        roles = list(meanings.values())
        for role in {r for r in roles if roles.count(r) > 1}:
            errors.append(f"palette role '{role}' is used for more than one concept; one colour = one meaning")

    scenes = storyboard["scenes"]
    if not isinstance(scenes, list) or not scenes:
        return errors + ["scenes must be a non-empty array"]
    ids = set()
    for i, scene in enumerate(scenes):
        if not isinstance(scene, dict):
            errors.append(f"scenes[{i}]: must be an object")
            continue
        sid = scene.get("id", "")
        if not isinstance(sid, str) or not re.fullmatch(r"[a-z0-9_]+", sid) or sid in ids:
            errors.append(f"scenes[{i}]: id must be unique snake_case, got {sid!r}")
        ids.add(sid)
        path = f"scene {sid or i}"
        for key in TEXT_FIELDS:
            if not isinstance(scene.get(key), str) or len(scene[key].strip()) < 10:
                errors.append(f"{path}: '{key}' must be a real description")
        for key in ("key_points", "elements"):
            value = scene.get(key)
            if not isinstance(value, list) or not value or not all(isinstance(v, str) for v in value):
                errors.append(f"{path}: '{key}' must be a non-empty list of text")
        duration = scene.get("duration")
        if not isinstance(duration, (int, float)) or not 10 <= duration <= 90:
            errors.append(f"{path}: duration must be 10-90 seconds")
        controls = scene.get("interactive", [])
        if not isinstance(controls, list) or len(controls) > 2:
            errors.append(f"{path}: 'interactive' must be a list of at most 2 controls")
        else:
            seen = set()
            for c in controls:
                cid = c.get("id") if isinstance(c, dict) else None
                if not isinstance(cid, str) or not re.fullmatch(r"[a-z0-9_]+", cid) or cid in seen:
                    errors.append(f"{path}: interactive ids must be unique snake_case, got {cid!r}")
                    continue
                seen.add(cid)
                if c.get("control") not in CONTROL_KINDS:
                    errors.append(f"{path}: interactive '{cid}': control must be one of {sorted(CONTROL_KINDS)}")
                for key in ("label", "changes", "discover"):
                    if not isinstance(c.get(key), str) or not c[key].strip():
                        errors.append(f"{path}: interactive '{cid}': '{key}' must be non-empty text")
        if "starts_with" in scene:
            errors.append(f"{path}: do not write starts_with; it is the previous scene's ends_with")
    return errors


def load(path):
    with open(path, encoding="utf-8-sig") as fh:
        return json.load(fh)


def dump(storyboard, path):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(storyboard, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
