# Aha! — VISCon Hackathon

Aha! is a React and Vite prototype for turning course material into short visual lesson previews. The Plan page shows a compact colour-coded curriculum and a separate plan for each subject. It reads PDF, Word, text, or Markdown files in the browser, groups them into chapters and video topics, and sends selected topics to the workspace composer. The library, player, light and dark themes, and creation flow are interactive demos. New previews use a persistent server job and progressively delivered interactive scenes. An optional Pi agent pipeline generates scripts and scene code with ElevenLabs narration.

## Repository layout

```text
frontend/app/      React source, styles, and plan tests
frontend/site/     Built Aha! site served by Bun
backend/src/       Bun HTTP API and frontend routes
shared/animlib/     Shared scene compiler, evaluator, WebGPU/WebGL2 player, and demo
shared/video/      Versioned progressive video delivery contract
```

The built frontend is checked in so the backend can serve it directly. Use Node.js
22.19 or newer for the existing npm/Vite tooling. `npm ci` also installs a pinned
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
lessons play locally. Workspace submissions persist on the server and run Astra to produce a private scene-script ZIP.
The status screen reports when the explanation is prepared; rendered playback is a downstream stage.
The existing [Pi agent setup](docs/agents.md) and simulated scene/test-tone mode remain explicit opt-ins. See [video delivery](docs/video-delivery.md).

## Run the combined app

```sh
npm ci
npm run backend:dev
```

Open <http://localhost:8080>. Direct visits to `/library`, `/plan`, `/plan/:subject`, `/settings`, and `/watch/:id` also load the app. Existing `/api/hello`, `/api/me`, and `/healthz` endpoints remain available. The Plan page reads material locally and saves chapters and source text in local storage. Creating an explanation sends text and selected documents, photos, or videos to the backend. Original uploads and jobs persist privately in SQLite; the backend prepares source text and images for Astra. See [source formats, limits, and configuration](docs/story-orchestration.md#workspace-uploads-and-durable-handoff).

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
Set `VIDEO_GENERATOR=pi` to connect the video queue to Pi script/scene agents and
ElevenLabs; see [local/VM authentication and remote logout](docs/agents.md).
The backend also normalizes AI-written storyline Markdown through `/api/narrations` (including
common label, formatting, pause, and table variations), generates
ElevenLabs narration with word timings and explicit pauses, and provides a
validated scene-agent handoff. See [narration setup and contracts](docs/narration.md).
The backend now has an Astra orchestration stage: request +
`backend/prompts/guidance.md` → reviewed, validated story ZIP for the next agent
layer. The ZIP contains only one Markdown file per scene: brief nonspoken context
(overall goal, before, this scene, after), then the finished spoken script and
optional pause markers. There are no visual instructions or extra archive files.
Reviews and metadata remain outside the ZIP. This is an internal handoff with no frontend. See [story orchestration](docs/story-orchestration.md)
for service integration, runtime setup, example requests, and the ZIP contract.
This is the default workspace pipeline (`VIDEO_GENERATOR=astra`); set `OPENAI_API_KEY`, or use `STORY_PROVIDER=codex` locally with a signed-in CLI. Audio-bearing video uploads require an API key for transcription. The Docker image includes the media-processing tools.

## Automatic deployment

GitHub Actions builds and tests pull requests, including Docker startup, shutdown,
and persistence checks, then deploys successful `main` updates over SSH. The app
runs in a non-root Docker Compose container with persistent SQLite, narration,
and agent-state bind mounts. Candidate images are tested before replacing production; failed activation
restores the previous container or legacy systemd service. See
[deployment setup, container commands, and recovery](docs/deployment.md).
