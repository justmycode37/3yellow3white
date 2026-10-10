import json
import os
import shutil
from pathlib import Path
import subprocess


class ClaudeCodeProvider:
    """Calls the `claude` CLI in headless mode, so requests run on the Claude
    subscription you are logged in with (Pro/Max usage limits apply)."""

    def __init__(self, model=None, read_dir=None, **_):
        # read_dir: let the model read (never write) files under this folder,
        # e.g. the plugin docs the animation prompts point to.
        self.read_dir = read_dir
        # The native installer puts claude in ~/.local/bin, which may not be on PATH yet.
        fallback = Path.home() / ".local" / "bin" / ("claude.exe" if os.name == "nt" else "claude")
        self.exe = shutil.which("claude") or (str(fallback) if fallback.exists() else None)
        if not self.exe:
            raise RuntimeError("`claude` CLI not found. Install Claude Code and run `claude` once to log in.")
        self.model = model

    def complete(self, system, user, name="request"):
        command = [self.exe, "-p", "--output-format", "json", "--system-prompt", system]
        if self.read_dir:
            command += ["--allowedTools", "Read,Glob,Grep",
                        "--disallowedTools", "Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch"]
        else:
            command += ["--disallowedTools", "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch"]
        if self.model:
            command += ["--model", self.model]
        # Prompt goes through stdin to avoid Windows command-line length limits.
        result = subprocess.run(command, input=user, capture_output=True, text=True,
                                encoding="utf-8", cwd=self.read_dir)
        if result.returncode != 0:
            raise RuntimeError(f"{name}: claude CLI failed: {result.stderr.strip() or result.stdout.strip()}")
        payload = json.loads(result.stdout)
        if payload.get("is_error"):
            raise RuntimeError(f"{name}: {payload.get('result')}")
        return payload["result"]
