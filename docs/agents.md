# Pi agents

The backend uses pinned Pi 1.1.0 to write a lesson plan and storyline Markdown in
one JSON response, reviews it in a separate editorial conversation, then writes animlib scene JavaScript. The host sends only the approved script
to ElevenLabs, then gives each scene agent its narration timing, the lesson plan,
and the authoring sections extracted verbatim from the animlib API reference. Each task gets a separate
conversation with host validation/submission tools and the pinned `pi-web-access`
extension. Built-in shell/file tools, discovered extensions, skills, and local
instructions are disabled. Scene validation uses
the existing QuickJS compiler with memory and execution limits.

Prompt ownership, shared policies, assembly order, validation boundaries, and saved-job
compatibility are described in [instruction architecture](instruction-architecture.md).
That map is the maintainer entry point; runtime prompts live in `backend/prompts/`.

The scene and thumbnail runners share the configured login. Pi persists subscription refreshes with file
locking. The host saves scripts, narration IDs, and validated scene sources per
video under `AGENT_DATA_DIR`; completed stages are reused on restart. `lesson.json`
is the authoritative versioned plan/script envelope; `script.md` is a readable
export. Videos with an older saved `script.md` resume without a new planning call.
Each completed narration scene becomes available immediately; scene code generation
overlaps later speech. Code agents run sequentially with the previous scene’s evaluated
end-state. Scenes are published progressively with audio, word timings, and captions.

## Web research

`npm ci` installs `pi-web-access` 0.38.0. The backend loads that package explicitly
for every Pi conversation; no separate CLI installation or extension discovery is
needed. On models that support adding tools during a conversation, `web_enable`
activates `web_search`, `fetch_content`, `get_search_content`, and `source_check`.
Other models receive the research tools immediately. Web access also works in
validated-reference and submission modes; `submit_output` must still be called
alone when finishing a task.

Search works without extra API keys through Exa MCP. The extension can also reuse
the session's supported OpenAI/ChatGPT authentication or use configured search
providers. Optional provider settings go in `web-search.json` under an explicitly
set `PI_CODING_AGENT_DIR`; when unset, the extension uses Pi's own default config
location (`~/.pi/agent`, with legacy/XDG fallbacks), independently of Aha's
credential-directory default. For a headless backend, keep `workflow` at `none`
(the package default) to return source-linked results without a curator browser
or summary model call. Restart the backend after changing extension settings.

Fetched pages and search results are reference material, and research failures
are returned to the agent for handling. The extension can clone GitHub repositories
and process local videos; it maintains its own private result cache. Its session
shutdown hooks run after each conversation, including failures and cancellation,
to release results and stop pending background fetches.

## Scene generation speed

Set `AGENT_SCENE_OUTPUT_MODE=validated-reference` to let a scene agent finish
with the ID returned by a successful `validate_output` call. The host retrieves
that exact source and validates it again. The model can still inspect validation
results and revise its candidate before finishing; the planning and editorial
review calls are unchanged. This avoids generating the same scene code again
in the final response. The default is `text`; set it explicitly to roll back.

The three-topic benchmark measured about 26% less scene-generation time across
two rounds with Astra/high and unchanged narration, scene plans, and full API
reference. This is a small empirical comparison, not a guarantee of identical
generations or universal quality preservation. See [benchmark results](scene-speed-results.md)
for variants, rejected outputs, saved animations, and limitations.

## Planning and scene quality

### Generated thumbnails

New Pi videos generate a thumbnail alongside script/scene work, using a separate
Pi conversation with `THUMBNAIL_MODEL=gpt-6.1-sol` and low reasoning. It uses the
same `AGENT_PROVIDER`, auth mode and credential directory as other backend AI.
The task receives the title, bounded topic/document excerpts and uploaded images,
plus `backend/prompts/thumbnail.md` and six actual SVG examples exported from
`frontend/app/src/Artwork.tsx`. Keep those examples and the style guide aligned
when the app's artwork changes.

The validator accepts only bounded paths/groups, monochrome paints and simple
transforms, then converts the SVG to typed path geometry. The manifest persists
that geometry and thumbnail status in SQLite. React renders explicit path elements
with the app's ink colors; it never injects model-authored markup. Existing artwork
remains visible while generation runs or if it fails. Thumbnail failures do not
fail the video. Scenes stream while the thumbnail is pending; the final video
status waits for both. Deletion/shutdown cancels both tasks. An interrupted
thumbnail resumes with its video; a saved thumbnail is reused. Completed older
videos and simulated videos retain their existing artwork.

To try six varied topics without generating narration, run:

```sh
npm run agents:thumbnails
# Or one custom topic:
npm run agents:thumbnails -- "Recursion" "A smaller version of the same problem, ending at a base case."
```

This uses the production Pi task and consumes model usage. Prompts, raw SVGs,
normalized geometry and timings are saved privately under
`AGENT_DATA_DIR/thumbnail-trials/TIMESTAMP/`. No videos are added to the library.

### Lesson planning

`backend/prompts/guidance.md` contains compact explanation guidance adapted from
PR #19. Requested audience, scene count, duration, and pause preferences take
priority over defaults. Explicit thinking pauses need natural spoken invitations;
visual holds do not require scripted silence.

`shared/animlib/docs/capabilities.md` is the compact visual-capability brief for
the top-level storyboard planner and its editorial reviewer. It covers supported
geometry, sampled 3D surfaces/solids, procedural textures and materials, motion,
math, 3D views, interaction, scene continuity, diagrams assembled
from primitives, and current limitations. The host adds it to the system guidance
on every draft and review, including repairs; the reviewer checks visual feasibility
before speech synthesis. Scene authors continue to receive the full API reference.
Keep the brief aligned with the public API and reference when capabilities change.

Planning and scene craft adapt the useful parts of PR #21 into the existing calls.
The plan records the audience/prerequisites, central question, learning goal,
key insight, running example, misconceptions, and shared entity/color meanings.
Each scene records its purpose, why it comes here, ordered key points, qualitative
visuals, intended end picture, carry/cleanup IDs, source references, and up to two
useful interactions. A complete outline and adjacent scene plans go to every
scene agent, including while later narration is still being synthesized.

For reusable objects, the planner describes later uses and lasting relationships
in the shared entity `meaning`, with construction needs in the introducing
scene's `visualDescription` and continuing structure in `endsWith`/`carry`.
This uses the existing plan schema. The outline contains titles and purposes;
only the current, previous, and next scene plans are sent in full. Recording
later uses in the shared entity registry makes requirements several scenes away
available when the object is first built. The planner states what must remain
connected or constant; the scene author selects bindings, rigid groups, or joint
rotations using the API reference's method-selection guidance. This prepares the
representation without revealing later results early.

Bindings are scene-local: the evaluated frame carries element geometry and
transforms, not `connect`, `attach`, or behavior declarations. Scene authors must
re-establish those relationships on the carried IDs. A connector keeps endpoints
attached but does not constrain their distance. The planner and rendered-review
guidance check these requirements; current compiler/plan validation does not
automatically prove connectivity throughout motion or constant segment lengths.
These prompt changes affect newly generated stages; saved scenes are reused and
are not repaired automatically.

The host validates scene/beat correspondence, source filenames, palette tokens,
and consistent entity/control declarations before submitting paid speech. PDF
extraction retains `[Page N]` markers; references are planner assertions to review,
not independently verified citations. Document content remains untrusted lesson
material. Planning never supplies acoustic timestamps or fixed scene durations.

New lessons receive an editorial review before paid speech, adapting the useful
review prompt from PR #25. The reviewer sees the full request/sources, the same
source images, the plan, and parsed speech in order. It checks examples, factual
claims, missing reasoning, pause/reveal order, requested scope and language, and
agreement between neighboring scripts and plans. Visual plans remain valid in
nonspoken metadata. Unreadable or missing source details must not be invented;
the explanation need not force every topic into a puzzle or mathematical derivation.

Material errors trigger a fresh authoring conversation that repairs the script
and plan together; cosmetic warnings do not trigger a rewrite. At most three
draft/review pairs are allowed. Failure stops before speech submission. Reviews
record concrete checks but do not constitute independent fact verification.
This adds one model call before TTS for a passing first draft, plus calls for
necessary repairs. It does not gate individual scene streaming once speech starts.

Each invocation gets a unique private `editorial/RUN_UUID/` directory containing
`lesson-draft-N.json`, `lesson-draft-N.prompt.md`, `lesson-review-N.json`, and
`lesson-review-N.prompt.md` (N starts at zero). Restarts preserve earlier runs,
including partial pairs, without overwriting or mixing their evidence. Only a
passing lesson is committed as `lesson.json`; its host-owned `editorialReview`
records the approved run UUID, pair number, and SHA-256 of the saved draft.
`storyline.prompt.md` is a convenient export of that approved authoring prompt.
Restarts reuse the committed envelope; a crash before its commit can repeat
authoring/review calls in a new run directory. Existing
saved lesson envelopes and legacy Markdown resume without editorial rewriting,
preserving their speech and scene identities.

An evaluated previous frame at default controls is authoritative for generation;
planned end descriptions do not replace it. Compiled output must keep declared
carry entities, clean up declared temporary entities, and declare exactly the
planned control IDs/types. This checks declared structure, not mathematical or
perceptual correctness. Scene craft guidance asks the author to inspect clutter,
legibility, motion, causal teaching, and reveal order. Screen layout and pacing remain topic-dependent and bounded by real
audio timing.

For debugging, private job folders save `storyline.prompt.md`, each
`scene-N.prompt.md`, the captured canonical `scene-N.input.json`, and up to twenty failed validation messages per scene in
`scene-N.diagnostics.json`. Compiler codes, line/column locations and hints reach
the agent's validation tool and repair turns. Repairs must preserve established
facts, IDs, inherited state and measured audio timing. These files contain lesson
material and source; keep the existing private job-directory permissions.

### Optional rendered review

After capturing 1-5 screenshots or timestamped contact sheets of a scene, run:

```sh
npm run agents:review -- VIDEO_UUID SCENE_INDEX /absolute/path/frame.png
```

Use the same `AGENT_DATA_DIR` as the generation server. Indices start at zero.
This makes an explicit model call with the samples, saved authoring task, current
source, and captured canonical input. It applies the visual-review checklist
adapted from PR #21: collisions, framing, legibility, teaching, continuity, and
motion. Unknown sample times remain null; still samples cannot certify continuous
motion or acoustic sync. Supply timestamps for precise findings.

The result is `scene-N.review.json` and, when a repair is proposed, a validated
`scene-N.review.js` draft. Validation uses the captured inherited start and preserves the audio ID,
end mode, measured duration, planned controls, and carry/cleanup declarations.
Reviewing does not replace published scenes or run automatically during generation.
Render the draft again to assess its visual changes. An upstream replacement also
requires downstream revalidation. The command needs artifacts saved by the new
generator; older videos remain playable without review inputs.

## Local setup

Use Node >=22.19 for npm tooling; the repository supplies Bun 1.4.2.

1. Run `npm ci`.
2. Copy `backend/.env.example` to `backend/.env.local` and configure ElevenLabs.
3. Keep `AGENT_AUTH_MODE=subscription` and run `npm run agents:login`.
4. Open the printed URL, complete **Sign in with ChatGPT**, and, if needed, paste
   the final redirect URL into the terminal. The app identifies itself as
   **Aha Demo <host-id prefix>**. Verify that registration in ChatGPT Settings.
5. Run `npm run agents:check`. This makes a small real inference request and
   consumes some account usage. `npm run agents:status` only checks local config.
6. With `VIDEO_GENERATOR=pi`, run `npm run backend:dev` and create a video normally.

These npm commands run from `backend/`, so Bun reads the same `.env.local` for
login and the server. Credentials default to `~/.aha/pi/auth.json`, outside the
checkout. To override this, use the same absolute `PI_CODING_AGENT_DIR` for every
command. Each developer logs in separately. A persistent `host-id` identifies
each installation. Pi is the default. Set `VIDEO_GENERATOR=simulated` explicitly to use the existing
simulated generator. Queued simulated jobs retain that generator after enabling Pi.
Login refuses to overwrite a saved registration: stop the backend and log out
before logging in again, so an old remote session is not left behind.

## Reuse an existing local Pi login

If this machine is already logged into Pi using its `openai-codex` provider,
set these values in the ignored `backend/.env.local`:

```dotenv
AGENT_AUTH_MODE=subscription
AGENT_PROVIDER=openai-codex
PI_CODING_AGENT_DIR=/home/your-user/.pi/agent
```

The backend uses Pi's supported provider and the original credential file directly,
including its locked refresh handling. It does not copy tokens or fall back to an
OpenAI API key. Run `npm run agents:status` and `npm run agents:check` to verify this
configuration. Aha's login/logout commands do not replace or remove a shared Pi
registration; manage that login through Pi or ChatGPT Settings.

`AGENT_PROVIDER` defaults to `openai` for new Aha registrations. API-key mode uses
that provider. Select an ElevenLabs voice available in the account owning the
configured key; the example Alexander voice may belong to a different account.

## Switch to an API key

Set the following server-only configuration, restart, and run `agents:check`:

```dotenv
AGENT_AUTH_MODE=api-key
OPENAI_API_KEY=your-key
```

API-key mode holds the key in memory and ignores saved OAuth credentials.
Subscription mode requires OAuth and cannot fall back to an API key. Changing
modes does not revoke the previous subscription registration.

`AGENT_MODEL` defaults to `gpt-6-astra` and `AGENT_THINKING` to `high`.
Agent tasks have no wall-clock timeout, so thinking, validation repairs, and
final output can finish. The former `AGENT_TIMEOUT_MS` setting is ignored.
Deleting a video or shutting down the server still cancels its active agent.
The model must exist in the pinned catalog and be available to your account;
`agents:check` verifies inference. Each conversation allows twelve agent turns
and three final-output validation attempts. The host retries recognizable network
failures, interrupted streams, temporary throttling, and transient provider errors
up to twice, with exponential backoff and jitter (about one and two seconds).
Each retry uses a fresh conversation with the same request and image attachments;
partial failed output is discarded. Cancellation interrupts requests and backoff.
Authentication, configuration, exhausted quota, output limits, invalid output,
and unclassified failures are not retried. Pi's own provider retries and automatic
compaction remain disabled so retry budgets do not multiply.

Structured `agent.retrying`, `agent.recovered`, and `agent.failed` logs correlate
each invocation with an `agentRunId`, video/stage/scene identifiers when available,
the provider attempt, and safe failure category/HTTP status. Raw provider errors,
headers, tokens, prompts, and lesson contents are excluded. Operator instructions
remain in CLI errors; video manifests and events use fixed user-facing messages
with a reminder that already published scenes remain watchable. Stored failures
from older versions are sanitized on read too.

## Demo server

Compose mounts a private persistent directory at `/data/agents`. Its `pi/`
subdirectory holds credentials/host identity, and `jobs/` holds generated work.
On the VM it defaults to `/srv/apps/3yellow3white-actions/agents`. Override it
using `AGENT_STATE_DIR` in the existing runtime environment file. Deployment
creates it for `deploy` with mode 700, outside releases. Compose manages the
container's `PI_CODING_AGENT_DIR` and `AGENT_DATA_DIR` values.

Set `VIDEO_GENERATOR=pi`, `AGENT_AUTH_MODE=subscription`, model settings and the
existing ElevenLabs configuration in the VM runtime environment. After deploying:

```sh
cd /srv/apps/3yellow3white-actions/docker-current
sudo docker compose -p 3yellow3white --env-file compose.env exec app bun backend/src/agents/cli.ts login
sudo docker compose -p 3yellow3white --env-file compose.env exec app bun backend/src/agents/cli.ts check
```

Login needs an interactive terminal. Open its URL on your computer and paste the
final redirect URL when asked; Docker needs no exposed OAuth callback port.
Give the VM its own login and host identity. Avoid concurrently using a copied
refresh token on both laptop and server. Credentials stay out of images and CI.

## End the demo

Disconnect the VM's **Aha Demo <host-id prefix>** in ChatGPT Settings from your browser, even if
you have lost VM access. Confirm that you can identify the registration during
setup and test disconnect/reconnect before relying on it. Disconnecting a shared
registration may affect other installations; do not assume instantaneous cutoff
of already-issued access tokens.

For local cleanup, stop the backend and run `npm run agents:logout`. It calls
OpenAI's discovered revocation endpoint and requires success before deleting the
saved credential. On failure it retains the credential and directs you to
ChatGPT Settings. The host ID is retained. Deleting `auth.json` or Pi's local
logout alone does not prove remote revocation. Revoke API keys separately.

On the VM, stop generation first and use the same persistent mount:

```sh
sudo docker compose -p 3yellow3white --env-file compose.env stop
sudo docker compose -p 3yellow3white --env-file compose.env run --rm --no-deps app backend/src/agents/cli.ts logout
```

Revocation does not erase documents, scripts, audio, or scenes on the VM.

## Failures and verification

The server writes JSON lines to stdout (progress) and stderr (warnings/errors).
Filter by `videoId` to follow a video from `video.queued` through source extraction,
script drafting/review, narration waits, scene generation, and publication to
`video.completed` or `video.failed`. Narration-stage records link `videoId` with
`narrationId`; use that ID for speech chunk, cache reuse, and narration failures.
Slow stages emit `stage.running` every 30 seconds with `elapsedMs`; this means
the operation is still pending, not that its provider has confirmed progress.
Scene indexes are zero-based; draft/review attempts are one-based. Resumed job
elapsed times cover the current run only. Logs omit lesson text, uploaded file
names, credentials, provider response bodies, and raw exception messages.
Logging changes take effect when the backend restarts; they cannot add progress
events to an already-running process.

Authentication failures, limits, timeouts, and invalid output fail the video job
with a safe message; completed scenes remain playable. Shutdown cancels the
active agent and leaves unfinished videos resumable. Video restart recovery resumes interrupted narration using cached chunks; the last
unsaved speech request may be billed again. Failed narration still needs explicit retry. Failed video jobs do not automatically retry.

Backend tests exercise real Pi sessions with an injected model stream and fake
speech. They cover auth isolation, revocation failure, tool restrictions,
validation repair, cancellation, audio IDs, and reuse of saved generation.
They also check that repeated tool calls stop at the turn limit.
Container smoke tests import Pi under Bun and verify persistent state across
replacement, without external inference or speech calls.

References: [Pi SDK](https://pi.dev/docs/latest/sdk),
[OpenAI revocation](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions),
[VM credentials](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms).
