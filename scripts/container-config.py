#!/usr/bin/env python3
"""Translate existing systemd-style env files without executing or interpolating them."""
import json
import os
import re
import subprocess
import sys
from pathlib import Path


def environment_value(value, location):
    """Parse the supported single-line subset of systemd EnvironmentFile syntax."""
    value = value.lstrip(" \t\r")
    quote = value[0] if value.startswith(('"', "'")) else None
    result = []
    trailing = 0
    index = 1 if quote else 0
    while index < len(value):
        char = value[index]
        index += 1
        if quote and char == quote:
            if value[index:].strip(" \t\r"):
                raise ValueError(f"Unsupported quoted environment value: {location}")
            return "".join(result)
        escaped = False
        if char == "\\" and quote != "'":
            if index == len(value):
                raise ValueError(f"Unsupported multiline environment value: {location}")
            following = value[index]
            if quote is None or following in '\\"`$':
                char = following
                index += 1
                escaped = True
        result.append(char)
        trailing = trailing + 1 if not quote and not escaped and char in " \t\r" else 0
    if quote:
        raise ValueError(f"Unsupported multiline environment value: {location}")
    return "".join(result[:-trailing] if trailing else result)


def read_environment(paths):
    values = {}
    for path in paths:
        try:
            text = path.read_text()
        except FileNotFoundError:
            continue
        except PermissionError:
            # systemd reads root-owned EnvironmentFiles before changing User.
            # Capture privately; never print configuration values to the log.
            text = subprocess.check_output(["sudo", "-n", "cat", "--", str(path)], text=True)
        for number, line in enumerate(text.split("\n"), 1):
            line = line.lstrip(" \t\r")
            if not line or line.startswith(("#", ";")):
                continue
            key, separator, value = line.partition("=")
            key = key.strip()
            if not separator or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
                raise ValueError(f"Invalid environment assignment: {path}:{number}")
            value = environment_value(value, f"{path}:{number}")
            if any(char in value for char in "\r\n\x00"):
                raise ValueError(f"Unsupported multiline environment value: {path}:{number}")
            values[key] = value
    return values


def host_path(value):
    # These paths go into a Compose interpolation file, not a shell command.
    if not value.startswith("/") or not re.fullmatch(r"/[A-Za-z0-9_./-]+", value):
        raise ValueError("Persistent paths must be absolute, using letters, numbers, /, _, ., or -")
    return Path(value).resolve()


def main():
    release, base, revision, image_id, *overrides = sys.argv[1:]
    release, base = Path(release), Path(base)
    values = read_environment([Path("/srv/apps/3yellow3white/.env"), Path("/etc/3yellow3white/environment")])
    values.update(read_environment([Path(path) for path in overrides]))
    video_db = host_path(values.get("VIDEO_DB_PATH", str(base / "data/videos.sqlite")))
    narration = host_path(values.get("NARRATION_DATA_DIR", "/var/lib/3yellow3white/narration"))
    agents = host_path(values.get("AGENT_STATE_DIR", str(base / "agents")))
    # SQLite needs its whole directory, including WAL/SHM files, to persist.
    directories = [video_db.parent, narration, agents]
    for index, left in enumerate(directories):
        for right in directories[index + 1:]:
            if left == right or left in right.parents or right in left.parents:
                raise ValueError("Video, narration, and agent directories must be separate")
    for path in directories:
        if path == release or release in path.parents or base / "releases" == path or base / "releases" in path.parents:
            raise ValueError("Persistent data cannot be inside a release directory")
    runtime = release / "runtime.env"
    runtime.write_text("".join(f"{key}={value}\n" for key, value in values.items()))
    runtime.chmod(0o600)
    settings = {
        "AHA_IMAGE": image_id,
        "AHA_REVISION": revision,
        "AHA_UID": str(os.getuid()),
        "AHA_GID": str(os.getgid()),
        "AHA_VIDEO_DATA_DIR": str(video_db.parent),
        "AHA_VIDEO_DB_NAME": video_db.name,
        "AHA_NARRATION_DATA_DIR": str(narration),
        "AHA_AGENT_DATA_DIR": str(agents),
        "AHA_RUNTIME_ENV": str(runtime),
        "AHA_BIND_ADDRESS": "0.0.0.0",
        "AHA_PORT": "8080",
    }
    (release / "compose.env").write_text("".join(f"{key}={value}\n" for key, value in settings.items()))
    (release / "paths.json").write_text(json.dumps({"video": str(video_db.parent), "narration": str(narration), "agents": str(agents)}))


if __name__ == "__main__":
    main()
