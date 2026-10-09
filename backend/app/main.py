"""API plus the built animlib demo."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import unquote

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

DEMO_DIR = Path(__file__).resolve().parents[2] / "frontend" / "animlib" / "dist" / "demo"
if not (DEMO_DIR / "index.html").is_file():
    raise RuntimeError(
        "animlib demo is not built at "
        f"{DEMO_DIR}. From the repo root run: npm ci && npm run demo:build"
    )

app = FastAPI(
    title="3yellow3white",
    description="VIScon Hackathon — animlib demo",
    version="0.1.0",
)


def _viscon_user(request: Request) -> dict[str, str | None]:
    """Identity headers injected by the VISCon managed reverse proxy."""
    raw_name = request.headers.get("x-user-name")
    return {
        "id": request.headers.get("x-user-id"),
        "name": unquote(raw_name) if raw_name else None,
    }


@app.get("/api/hello")
def hello(request: Request) -> dict[str, object]:
    """Sample API endpoint your frontend can call. Replace freely."""
    return {
        "message": "Hello from the 3yellow3white backend",
        "user": _viscon_user(request),
    }


@app.get("/api/me")
def me(request: Request) -> dict[str, object]:
    """Shows VISCon proxy identity headers when auth mode is enabled."""
    return {"user": _viscon_user(request)}


@app.get("/healthz")
def healthz() -> dict[str, bool]:
    return {"ok": True}


@app.api_route("/", methods=["GET", "HEAD"])
def index() -> FileResponse:
    return FileResponse(DEMO_DIR / "index.html")


# Vite demo assets are rooted at /. API routes above stay matched first.
app.mount("/", StaticFiles(directory=str(DEMO_DIR)), name="demo")
