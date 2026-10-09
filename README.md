# 3yellow3white

VIScon Hackathon app. FastAPI serves the built animlib demo and a small API.

## Layout

```text
3yellow3white/
  frontend/
    index.html       # unused hello-world page
    animlib/         # seekable WebGPU animation library and demo
      dist/demo/     # npm run demo:build — what FastAPI serves (gitignored)
  backend/
    requirements.txt
    app/
      main.py        # FastAPI entry: app.main:app
```

One process serves both: FastAPI API + static frontend. Deploy infra expects this shape.

The animation library is an npm workspace in `frontend/animlib`. From the
repository root, run `npm ci`, then `npm run dev` for its standalone demo,
`npm test` for its tests, or `npm run build` to build the library. See the
[animlib README](frontend/animlib/README.md) for the API and development commands.

## Local run

Node.js 22.16 or newer. From the repository root, build the demo once (and again after animlib changes):

```bash
npm ci
npm run demo:build
```

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

Open http://localhost:8080 — the animlib demo. WebGPU needs this localhost origin or HTTPS.

- UI: `/`
- API: `/api/hello`
- Me (VISCon headers): `/api/me`
- Health: `/healthz`

Production (VISCon Managed): proxy terminates TLS and forwards to `0.0.0.0:8080`.
Your app may receive `X-User-Id` and `X-User-Name` (name is percent-encoded).

## For teammates

1. Keep `backend/app/main.py` exporting `app` (or update deploy config).
2. Leave `frontend/animlib` sources alone. Rebuild with `npm run demo:build` after demo changes.
3. Add API routes next to `/api/hello`, before the static mount at `/`.
4. Put secrets in a local `.env` (gitignored); wire them in code as needed.

## Deploy

See sibling repo `hackathon-2026-infra`.
