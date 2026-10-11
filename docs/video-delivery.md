# Progressive interactive video delivery

The default Pi pipeline writes storyline Markdown with spoken narration and a visual
brief for every scene. ElevenLabs supplies audio and character alignment, from which
the server derives word timings. Each scene agent receives those timings, the animlib
API, and the evaluated end-state of the preceding scene. See [Pi setup](agents.md).
Set `VIDEO_GENERATOR=simulated` explicitly for three scenes with a diagnostic test tone.

The workspace uploads PDF, DOCX, UTF-8 text, Markdown, PNG, JPEG, and WebP files.
Original bytes are stored in SQLite before the server accepts the job. The durable
worker extracts document text on the server and passes photos to the script model
as image attachments. Scanned PDFs without selectable text need photos or pasted text.

## Contract and ownership

`shared/video/contract.ts` defines the versioned manifest and request types.
`POST /api/videos` accepts `{title, topic, documents: [{name, text}]}` with an
`Idempotency-Key` header, returning HTTP 202 and a stable manifest. Reusing the key
with different input returns 409. JSON source bodies are limited to 1 MB.
Alternatively send multipart form data: `request` contains that JSON and repeated
`files` fields contain the original files. Each file is at most 50 MB, all uploads
at most 100 MB, and a request contains at most ten source documents/files. Extracted
source text is limited to 1 MB in total. File hashes are part of idempotency identity.

POST and DELETE validate the browser's origin. Behind the production gateway, set
`NARRATION_PUBLIC_ORIGIN=https://11.hackathon.ethz.ch` to the exact public browser
origin, without a trailing slash. Video and narration writes share this setting,
so internal HTTP forwarding or a rewritten host does not reject legitimate requests.
Without the setting, the expected origin uses `X-Forwarded-Proto` (or the request
scheme) and the request URL's host. Cross-site requests remain rejected.

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
atomically. It aborts active scene generation and sends a terminal `deleted` event to
subscribers. Deletion during compilation cannot republish the removed video. Internal
agent/narration caches remain on disk for stage reuse; deletion removes the video
and its assets from the library and database. The dashboard refreshes job status and
removes videos deleted by another viewer.

## Generation and persistence

`VideoService` runs one durable queue in one Bun process. Startup resumes queued
or generating jobs at their first unpublished scene. `VIDEO_DB_PATH` defaults to
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

## Contextual scene requests

Right-click a lesson's drawing surface to pause at that moment and request an
explanation or an interactive exploration. Submit with Enter or the arrow button.
The request captures the scene ID, scene-local time, click position relative to the
canvas, displayed frame, effective camera, and control values. Generation receives
that context together with the selected scene's authoritative source/narration and
original lesson material. For browser-local samples, the browser supplies the sample
scene source. Empty or ambiguous regions are interpreted using the surrounding
concept, rather than assuming an exact object hit.

`POST /api/videos/:lessonId/scene-requests` accepts `{question, context, localScene?}`
with an `Idempotency-Key`, returning HTTP 202 and `{id, afterSceneId, question, video}`.
Requests are limited to 2,000 characters and the complete JSON body to 1 MB. GET on
the same URL restores the ordered requests and current job snapshots. Each child
job uses the existing durable generation queue, narration, audio endpoints, and
manifest SSE stream. Each request produces at most one scene and does not create
another library card or thumbnail. Insertion-specific authoring guidance sets no
duration or word-count target. The original video manifest remains unchanged; playback composes
its timeline with the saved additions. Deleting a server video deletes its additions
and their assets too. Like the existing library, additions are shared across visitors.
Already-open viewers restore other visitors' additions when reopening the lesson.

Scenes are inserted after the selected scene, including when the selected scene is
itself an addition. Playback holds the selected scene's final frame if the next
requested scene is still generating or preparing, before the original continuation
or its audio starts. Multiple requests keep their insertion order; playback waits
at each pending insertion point as needed. Playback resumes automatically when ready,
unless the user has paused or opened an overlay. Seeking away cancels that automatic
jump. Users can also choose **Play added scenes**. Current position and playback
intent are preserved when scenes are inserted elsewhere in the timeline.
A source's optional `handoffFrom` names an earlier scene (or null for an independent
start), preserving the original continuation's object state when another sequence
is inserted between scenes. `audioId` binds each generated scene to its own asset
namespace. Interactive control changes still propagate within their original group.
Generation or preparation failures leave the original lesson available.

The Pi pipeline interprets the request and authors the actual explanation/toy.
`VIDEO_GENERATOR=simulated` exercises the complete flow with the existing diagnostic
slider scenes and test tone; it does not interpret the request or generate speech.
