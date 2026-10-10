# Aha! — VISCon Hackathon

Aha! is a React and Vite prototype for turning course material into short visual lesson previews. The Plan page reads PDF, Word, text, or Markdown files in the browser and suggests colour-coded chapters and video topics. The library, player, light and dark themes, and creation flow are interactive demos. New previews use a persistent server job and progressively delivered interactive scenes. AI explanation and speech providers are not connected yet.

## Repository layout

```text
frontend/app/      React source, styles, and plan tests
frontend/site/     Built Aha! site served by Bun
backend/src/       Bun HTTP API and frontend routes
shared/animlib/     Shared scene compiler, evaluator, WebGPU player, and demo
```

The built frontend is checked in so the backend can serve it directly. Use Node.js
22.16 or newer for the existing npm/Vite tooling. `npm ci` also installs a pinned
[Bun](https://bun.sh/docs) runtime for the backend commands, so a global Bun install
is optional. Dependencies are managed with npm and the checked-in package locks.
To update the site after editing the React source:

```sh
npm ci
npm ci --prefix frontend/app
npm run app:test
npm run app:build
```

For a live frontend development server, run `npm run app:dev`. The source app's [README](frontend/app/README.md) describes its screens and current integration points.

Lesson playback uses animlib's WebGPU canvas and clock. The app's controls drive
play, pause, seeking, and replay; opening navigation or a dialog pauses the
animation. The six example lessons remain local demos. New previews receive server scenes
and audio progressively, with buffering and reconnect support. Playback requires a WebGPU-capable browser on HTTPS or
localhost. An unavailable GPU shows an error with a retry action.

## Run the combined app

```sh
npm ci
npm run backend:dev
```

Open <http://localhost:8080>. Direct visits to `/plan`, `/settings`, and `/watch/:id` also load the app. Existing `/api/hello`, `/api/me`, and `/healthz` endpoints remain available. The Plan page keeps material in browser memory. Creating a video sends extracted document text to the server; jobs and scenes persist in SQLite. Plans and preferences use local storage.

For deployment, run `npm run backend:start` instead of the previous Uvicorn
command. The default bind address is `0.0.0.0:8080`; override it with `HOST` and
`PORT`. Both backend commands build the shared library first. Run
`npm run backend:test` for shared scene evaluation tests, and
`npm run backend:typecheck` to check the backend's TypeScript.

The animation library remains a separate npm workspace. From the repository root, `npm ci` installs it, and the existing `npm run dev`, `npm test`, and `npm run build` scripts operate on that library. See its [README](shared/animlib/README.md).

Browser code imports the player from `animlib`; the Bun backend and other Node
consumers can import scene compilation and state evaluation from `animlib/core`
without loading the renderer. See the library's
[shared evaluation example](shared/animlib/README.md#shared-scene-evaluation).
See [video delivery](docs/video-delivery.md) for the request API, streaming contract,
interactive playback, persistence and generator integration. The current generator
produces sample animations with a test tone; LLM and TTS providers are not connected.

## Automatic deployment

GitHub Actions builds and tests pull requests, then deploys successful `main`
updates directly over SSH. The app ships its pinned Bun runtime and production
dependencies, verifies a candidate release before restarting the service, and
rolls back if the new revision is unhealthy. See [deployment setup and recovery](docs/deployment.md).
