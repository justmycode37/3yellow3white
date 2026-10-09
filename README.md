# Aha! — VISCon Hackathon

Aha! is a React and Vite prototype for turning course material into short visual lesson previews. The Plan page reads PDF, Word, text, or Markdown files in the browser and suggests colour-coded chapters and video topics. The library, player, light and dark themes, and creation flow are interactive demos. Video generation and AI services are not connected yet.

## Repository layout

```text
frontend/app/       React source, styles, and plan tests
frontend/animlib/   Seekable WebGPU animation library and demo
frontend/site/     Built Aha! site served by FastAPI
backend/app/main.py FastAPI API and frontend routes
```

The built frontend is checked in because the VISCon runtime serves static files with FastAPI. To update it after editing the React source:

```sh
npm ci
npm ci --prefix frontend/app
npm run app:test
npm run app:build
```

For a live frontend development server, run `npm run app:dev`. The source app's [README](frontend/app/README.md) describes its screens and current integration points.

Lesson playback uses animlib's WebGPU canvas and clock. The app's controls drive
play, pause, seeking, and replay; opening navigation or a dialog pauses the
animation. Sample scenes remain local demos, including previews created by the
mock creation flow. Playback requires a WebGPU-capable browser on HTTPS or
localhost. An unavailable GPU shows an error with a retry action.

## Run the combined app

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

Open <http://localhost:8080>. Direct visits to `/plan`, `/settings`, and `/watch/:id` also load the app. Existing `/api/hello`, `/api/me`, and `/healthz` endpoints remain available. Uploaded study material stays in browser memory; the saved plan and other preferences use local storage.

The animation library remains a separate npm workspace. From the repository root, `npm ci` installs it, and the existing `npm run dev`, `npm test`, and `npm run build` scripts operate on that library. See its [README](frontend/animlib/README.md).
