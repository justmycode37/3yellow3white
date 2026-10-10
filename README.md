# Aha! — VISCon Hackathon

Aha! is a React and Vite prototype for turning course material into short visual lesson previews. The Plan page shows a compact colour-coded curriculum and a separate plan for each subject. It reads PDF, Word, text, or Markdown files in the browser, groups them into chapters and video topics, and sends selected topics to the workspace composer. The library, player, light and dark themes, and creation flow are interactive demos. New previews use a persistent server job and progressively delivered interactive scenes. AI explanation and speech are not yet connected to this preview flow.

## Repository layout

```text
frontend/app/      React source, styles, and plan tests
frontend/site/     Built Aha! site served by Bun
backend/src/       Bun HTTP API and frontend routes
shared/animlib/     Shared scene compiler, evaluator, WebGPU/WebGL2 player, and demo
shared/video/      Versioned progressive video delivery contract
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

Lesson playback uses animlib's clock and a full-viewport canvas, preferring WebGPU
with automatic WebGL2 fallback. The app's controls drive play, pause, seeking,
and replay; opening navigation or a dialog pauses the animation. Existing sample
lessons play locally. New previews persist on the server and deliver interactive
scenes and test-tone audio progressively. See [video delivery](docs/video-delivery.md).

## Run the combined app

```sh
npm ci
npm run backend:dev
```

Open <http://localhost:8080>. Direct visits to `/library`, `/plan`, `/plan/:subject`, `/settings`, and `/watch/:id` also load the app. Existing `/api/hello`, `/api/me`, and `/healthz` endpoints remain available. The Plan page reads material locally and saves chapters and source text in local storage. Creating a video sends extracted document text to the server; jobs and scenes persist in SQLite. Raw files stay in browser memory.

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
The video queue currently uses a simulated generator. The backend separately
normalizes AI-written storyline Markdown through `/api/narrations` (including
common label, formatting, pause, and table variations), generates
ElevenLabs narration with word timings and explicit pauses, and provides a
validated scene-agent handoff. See [narration setup and contracts](docs/narration.md).
The storyline writer should receive `backend/prompts/guidance.md`; its section 16
specifies the Markdown handoff. `buildStorylineMessages` loads it for that agent.

## Automatic deployment

GitHub Actions builds and tests pull requests, including Docker startup, shutdown,
and persistence checks, then deploys successful `main` updates over SSH. The app
runs in a non-root Docker Compose container with persistent SQLite/narration bind
mounts. Candidate images are tested before replacing production; failed activation
restores the previous container or legacy systemd service. See
[deployment setup, container commands, and recovery](docs/deployment.md).

## scenegen: course file → animlib scenes

`scenegen/` is a Python pipeline that distills a lecture file into topics, plans how to
teach each one, writes a storyboard, and has an LLM write the scenes as animlib sources
(compiled and checked with `animlib/core`), plus a timed narration script. See
[docs/scenegen.md](docs/scenegen.md).
