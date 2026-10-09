"""Hello-world FastAPI backend — replace this with your real API."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"

app = FastAPI(
    title="3yellow3white",
    description="VIScon Hackathon — hello world scaffold",
    version="0.1.0",
)


@app.get("/api/hello")
def hello() -> dict[str, str]:
    """Sample API endpoint your frontend can call. Replace freely."""
    return {"message": "Hello from the 3yellow3white backend"}


@app.get("/healthz")
def healthz() -> dict[str, bool]:
    return {"ok": True}


@app.get("/")
def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


# Serve CSS/JS/assets from /static/*
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")
