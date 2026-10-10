# Aha! — VISCon Hackathon

Aha! is a React and Vite prototype for turning course material into short visual lesson previews. The Plan page shows a compact colour-coded curriculum and a separate plan for each subject. It reads PDF, Word, text, or Markdown files in the browser, groups them into chapters and video topics, and sends selected topics to the workspace composer. The library, player, light and dark themes, and creation flow are interactive demos. New previews use a persistent server job and progressively delivered interactive scenes. The Pi agent pipeline generates scripts and scene code with word-aligned ElevenLabs narration.

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
lessons play locally. New previews persist on the server and deliver interactive
scenes and audio progressively. Enable real generation using the [Pi agent setup](docs/agents.md),
or explicitly set `VIDEO_GENERATOR=simulated` for scenes with a test tone. See [video delivery](docs/video-delivery.md).

## Run the combined app

```sh
npm ci
npm run backend:dev
```

Open <http://localhost:8080>. Direct visits to `/library`, `/plan`, `/plan/:subject`, `/settings`, and `/watch/:id` also load the app. Existing `/api/hello`, `/api/me`, and `/healthz` endpoints remain available. The Plan page reads material locally and saves chapters and source text in local storage. Creating a video uploads original documents and photos to the server alongside typed text. Files, jobs, scene code, word timings, and audio persist in SQLite. All visitors share one library; videos can be deleted there.

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
The video queue uses Pi script/scene agents by default, with
ElevenLabs; see [local/VM authentication and remote logout](docs/agents.md).
The backend also normalizes AI-written storyline Markdown through `/api/narrations` (including
common label, formatting, pause, and table variations), generates
ElevenLabs narration with word timings and explicit pauses, and provides a
validated scene-agent handoff. See [narration setup and contracts](docs/narration.md).
The storyline writer should receive `backend/prompts/guidance.md`; its section 16
specifies the Markdown handoff. `buildStorylineMessages` loads it for that agent.

## Automatic deployment

GitHub Actions builds and tests pull requests, including Docker startup, shutdown,
and persistence checks, then deploys successful `main` updates over SSH. The app
runs in a non-root Docker Compose container with persistent SQLite, narration,
and agent-state bind mounts. Candidate images are tested before replacing production; failed activation
restores the previous container or legacy systemd service. See
[deployment setup, container commands, and recovery](docs/deployment.md).

The Plan page can organize extracted course text into AI-suggested topics with
learning goals, visual ideas, prerequisites, condensed source notes, and suggested
source references. Review and edit topic titles and learning goals before saving;
the original material is retained for comparison. Notes and references are
model-authored, not verified quotations. The same Pi login used for video generation
powers `POST /api/study-plans`; narration credentials are not needed for planning.
Requests accept up to 200,000 source characters, run for at most three minutes, and
are limited to two concurrent plans per server. Saved plans remain in browser
storage. Turn off “Organize topics with AI” to use the local document-outline method;
this is also available when AI planning fails or the server runs in simulated mode.

Original scenegen prompts from PR #36 are preserved verbatim in
`backend/prompts/scenegen/`, with source paths, commit, and SHA-256 checksums in
`provenance.json`. The planning and visualization Markdown files are byte-for-byte
copies; `topics-system.md` and `topics-format.md` contain the exact Python `SYSTEM`
and `FORMAT` string values from `scenegen/distill.py`. Only the original
`{max_topics}` substitution (default 8) and source-material insertion happen at
runtime. `topicLessonText` uses the original `topic_notes` wording. The app adapts
the original topic response to its chapter UI outside the prompt, using one chapter
and a four-minute estimate. Existing saved plans remain readable.

The full original visualization/planning rules are active, including 3D by default,
interaction targets, fixed layout, and pacing. Existing host contracts still govern
narration timing, API capabilities, and the user's classic/interactive choice.
App-specific scene guidance remains separate in `backend/prompts/scene-craft.md`;
it is not part of the copied source. The standalone Python pipeline and its
storyboard/animation prompts are not imported.
