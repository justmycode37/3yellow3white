"""VISCon API and static Aha! frontend."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import unquote

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend" / "site"

app = FastAPI(
    title="3yellow3white",
    description="VIScon Hackathon — hello world scaffold",
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


@app.get("/")
def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


# The React app uses these client-side routes; serve its shell on a direct visit.
@app.get("/plan")
@app.get("/settings")
@app.get("/watch/{lesson_id}")
def app_page() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


# Vite builds CSS/JS/assets into frontend/site/, served under /static/*.
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")
