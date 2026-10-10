# Progressive interactive video delivery

The first implementation uses a simulated server generator: three six-second
interactive scenes with a short test tone, not generated explanations or speech.
Uploaded PDF, DOCX, text and Markdown documents are read by the existing browser
reader; extracted text and the requested topic are sent to and stored on the server.
Raw document upload/OCR and real generation/TTS providers are not implemented.

## Contract and ownership

`shared/video/contract.ts` defines the versioned manifest and request types.
`POST /api/videos` accepts `{title, topic, documents: [{name, text}]}` with an
`Idempotency-Key` header, returning HTTP 202 and a stable manifest. Reusing the key
with different input returns 409. Request bodies are limited to 1 MB.

`GET /api/videos` lists the current viewer's saved jobs. `GET /api/videos/:id`
returns a snapshot. `GET /api/videos/:id/events` sends named `manifest` SSE events
with monotonically increasing revision IDs. Every event is a full snapshot:
reconnections receive current state regardless of Last-Event-ID, and clients
ignore revisions already applied. Heartbeats keep idle connections alive;
terminal manifests close the stream. Disconnecting a viewer does not cancel work.

Scene order is contiguous and published scenes are immutable. Audio bytes and
scene metadata commit in the same SQLite transaction before notification. Audio
URLs use the same owner check as manifests. An upstream trusted `x-user-id` owns
authenticated jobs; otherwise a random HttpOnly SameSite session cookie owns them.
The reverse proxy must strip client-supplied identity headers before setting its
own. Anonymous libraries belong to that browser cookie, not a cross-device account.

## Generation and persistence

`VideoService` runs one durable queue in one Bun process. Startup resumes queued
or generating jobs at their first unpublished scene. `VIDEO_DB_PATH` defaults to
`data/videos.sqlite`; deployment sets it outside release directories. Run only one
worker against this database. Multiple workers require leases/claims before use.
Back up the SQLite database using a SQLite-aware backup procedure.

The `Generator` interface receives the persisted request and next scene index and
returns source, duration, captions and WAV bytes, or null when complete. A real
provider should generate narration/audio first, align animation timing, and return
short ready-to-play scenes. The service compiles and validates scenes with
`animlib/core` before publication. Provider failures persist a terminal failure
while retaining available scenes. Retry/resume of failed provider jobs, cancellation,
retention policies, quotas, distributed queues and object storage are future work.

## Playback and interactivity

Both existing local demos and server videos use `LessonPlayback` and animlib.
Server manifests append one prepared scene at a time, so loading later assets
does not prevent the first scene from becoming playable. Audio still downloads
and decodes per scene, not incrementally within a scene. Generated videos initially
wait for Play so the browser can unlock audio directly in a user gesture.

Appending compiles/prepares only the new suffix and leaves the active clock running.
Scene source is delivered, rather than only a compiled default timeline, because
sliders and toggles can change scene geometry and downstream handoffs. The existing
bounded QuickJS worker recompiles interactive changes locally; frame evaluation
and GPU rendering remain client-side. WebGPU is preferred, with automatic WebGL2
fallback when the API, adapter, device or initialization is unavailable. Both
backends use the same evaluated frames and prepared geometry. Published source itself never changes.
Providers should keep duration and narration meaningful across allowed controls.

At the available edge, the adapter preserves play/pause intent and shows buffering.
New content resumes at the next scene boundary; a user pause or open overlay prevents
resumption. Only a terminal manifest turns the available edge into the lesson end.
Seeking is limited to prepared content. Generation failures and connection messages
are separate from playback errors so available content remains usable.

## Development

Run `npm run backend:dev` on port 8080 and optionally `npm run app:dev` for Vite,
which proxies `/api`. Run `npm test`, `npm run app:test`, `npm run backend:test`,
`npm run backend:typecheck`, and `npm run app:build` for validation.

Tests cover idempotency, ownership, atomic publication, snapshot reconnection,
restart recovery, append continuity, control propagation, buffering, pause intent,
duplicate delivery, and partial generation failure. No startup latency target has
been set; fixture delays are not estimates of real generation performance.

## Renderer fallback and verification

WebGL2 preserves scene colors, triangulated text/LaTeX, 2D/3D geometry, lighting,
transparency, regional cameras and orbit controls. Playback, source recompilation,
handoffs, audio clocks and progressive append are shared above the rendering layer.
A canvas context type is permanent: failed WebGPU surfaces are replaced, with
controls and resize observation rebound. The React player mounts an imperative
canvas inside a full-viewport host so replacement and disposal are safe.
WebGPU device loss attempts WebGL2 recovery; WebGL context loss pauses playback
and audio. Restoration rebuilds GPU resources, redraws, and permits explicit resume.

`npm test` includes forced fallback/lifetime tests; these do not establish visual
correctness. To run automated real-browser rendering checks, start
`npm run dev -- --port 5178 --strictPort`, open
`http://localhost:5178/webgl-test.html`, and click **Run browser tests**.
The page forces WebGPU unavailable locally, compiles real GLSL, reads actual pixels,
and reports every assertion. Automation can await `window.webglTests` and inspect
`window.webglResult.failed`. It exercises all demos and six lesson themes, depth,
transparency, viewport clipping, text/LaTeX morphs, orbit, portrait/DPR resizing,
native sliders/toggles, seeking, append continuity, handoffs, real WAV audio-clock
synchronization, context replacement, restoration and disposal.
The separate `npm --workspace animlib run test:gpu` suite checks real native WebGPU.
WebGL antialiasing depends on the browser/context; edge pixels can differ between
backends. This does not change authored colors or scene/timeline semantics.
