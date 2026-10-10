from pathlib import Path

from . import PendingResponse


class HandoffProvider:
    """File-based stand-in for an API: request -> <name>.request.md,
    answer expected in <name>.response.md. Rerun the command once it exists."""

    def __init__(self, workdir=".", **_):
        self.dir = Path(workdir) / "llm"
        self.dir.mkdir(parents=True, exist_ok=True)

    def complete(self, system, user, name="request"):
        request = self.dir / f"{name}.request.md"
        response = self.dir / f"{name}.response.md"
        request.write_text(f"# SYSTEM\n\n{system}\n\n# USER\n\n{user}\n", encoding="utf-8")
        if not response.exists():
            raise PendingResponse(
                f"Paste {request} into your LLM and save its answer to {response}, then rerun.")
        return response.read_text(encoding="utf-8-sig")
