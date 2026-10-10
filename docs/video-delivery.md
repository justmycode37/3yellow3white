# Progressive interactive video delivery

The default `VIDEO_GENERATOR=astra` runs workspace input through source processing, script generation, a separate review, and a private ZIP of scene Markdown. `script_ready` means the spoken explanation is prepared; this stage does not claim to render a video. No ZIP, source bytes, internal story IDs, or script text are exposed in browser manifests. See [source formats, limits, and next-agent handoff](story-orchestration.md).

The opt-in `VIDEO_GENERATOR=pi` pipeline and its existing server-side uploads, ElevenLabs narration, progressive scene generation, and timing/visual packets remain available. `VIDEO_GENERATOR=simulated` selects sample scenes and diagnostic test tones. See [Pi setup](agents.md).

## Contract and ownership

`shared/video/contract.ts` defines the versioned manifest and request types.
`POST /api/videos` accepts `{title, topic, documents: [{name, text}]}` with an
`Idempotency-Key` header, returning HTTP 202 and a stable manifest. Reusing the key
with different input returns 409. JSON source bodies are limited to 1 MB.
Alternatively send multipart form data: `request` contains that JSON and repeated
`files` fields contain the original files. Each file is at most 50 MB, all uploads
at most 100 MB for legacy generators (50 MB total for Astra), and a request contains at most ten source documents/files. Extracted
source text is limited to 1 MB in total. File hashes are part of idempotency identity.

`GET /api/videos` lists all saved jobs for the shared user. `GET /api/videos/:id`
returns a snapshot. `GET /api/videos/:id/events` sends named `manifest` SSE events
with monotonically increasing revision IDs. Every event is a full snapshot:
reconnections receive current state regardless of Last-Event-ID, and clients
ignore revisions already applied. Heartbeats keep idle connections alive;
terminal manifests close the stream. Disconnecting a viewer does not cancel work.

Scene order is contiguous and published scenes are immutable. Audio bytes and
scene metadata commit in the same SQLite transaction before notification. Audio
URLs address the same stored scenes. There are no browser sessions or separate
accounts: all visitors share one application user, and existing jobs created under
older session identities remain visible.

`DELETE /api/videos/:id` removes the video, its stored audio, and its original uploads
atomically. It aborts active scene or Astra generation and removes any private database handoff and sends a terminal `deleted` event to
subscribers. Deletion during compilation cannot republish the removed video. Internal
agent/narration caches remain on disk for stage reuse; deletion removes the video
and its assets from the library and database. The dashboard refreshes job status and
removes videos deleted by another viewer.

## Generation and persistence

`VideoService` runs one durable queue in one Bun process. Startup resumes queued
or generating legacy jobs at their first unpublished scene. Astra uses durable story checkpoints, reuses completed ZIPs, and exposes `POST /api/videos/:id/retry` for explicit retries of interrupted/failed model calls. `VIDEO_DB_PATH` defaults to
`data/videos.sqlite`; deployment sets it outside release directories. Run only one
worker against this database. Multiple workers require leases/claims before use.
Back up the SQLite database using a SQLite-aware backup procedure.

The `Generator` interface receives the persisted request, next scene index, and
job context (shared owner, previous frame, image attachments, and cancellation signal). It returns source,
duration, narration, visual description, word timings, captions, an audio ID and WAV bytes, or null when complete. Pi persists
completed scripts and scenes separately and reuses the narration service cache. The service compiles and validates scenes with
`animlib/core` before publication. Narration publishes each completed scene's audio and timing packet atomically to
disk. Scene generation starts from the first ready packet while later speech continues;
it does not wait for the combined narration WAV. Code agents run one scene at a time.
Interrupted narration for a resumed video is retried automatically using saved chunks;
a speech request interrupted before its result was saved may be billed again.
Provider failures persist a terminal failure
while retaining available scenes. Retry/resume of failed provider jobs,
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

Tests cover idempotency, shared ownership, durable uploads and extraction, deletion, early scene delivery, atomic publication, snapshot reconnection,
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
