# Narration and scene timing

The narration stage normalizes AI-written Markdown, synthesizes the requested Alexander voice through ElevenLabs, and produces WAV audio plus a versioned JSON timing package. It does not generate the storyline or animation with an LLM. The included preview is a timing diagnostic, not a generated lesson.

## Give the storyline writer its instructions

The [Astra orchestration stage](story-orchestration.md) produces an internal ZIP containing only `scene-01.md`, `scene-02.md`, and so on. Each scene contains brief `Context (not spoken)` entries (overall goal, before, this scene, after) and a separate script of finished spoken sentences and optional pauses. Neither section contains visual instructions. `readStoryArchive(zip, job.zipSha256).narrationMarkdown` removes the context and joins only the scripts in order for `NarrationService.submit(owner, markdown)` without adding another ZIP entry. `backend/prompts/guidance.md` defines these mandatory boundaries for both structured and standalone callers. `buildStorylineMessages(material)` loads the same guidance. Release packaging includes the prompt, and the smoke check verifies it is present.

Preferred output:

```md
# A lesson title

## Beat 1 — A question

Content needed: The facts and running example available to the viewer.

Narration:
These are the exact words to read aloud.

Invitation (spoken):
What do you think happens next?

Pause: 5s

Reveal (spoken):
If you guessed this result, you are right.
```

`Hint (spoken):` and `Credit (spoken):` are also supported. Formatting is normalized through the Markdown syntax tree, with GFM table support; the parser does not ask another model to rewrite the script. Common variations are accepted:

| AI output variation | Interpretation |
| --- | --- |
| `Voiceover`, `Voice-over`, `Narrator`, `Spoken text`, `VO` | Narration role |
| `Invitation`, `Question (spoken)`, numbered `Hint`, `Confirmation`, `Viewer credit` | Their corresponding speech roles |
| Bold/italic labels, headings, bullets, nested lists, quoted text, soft line breaks, colon/dash separators, different case | Same labelled speech and ordering |
| `Scene 1`, `Beat 1`, `Ponder 1` at different heading levels, or numbered plain scene markers | Stable scene boundary; duplicate IDs still fail |
| Entire script in a Markdown/text fence with a common short preface | Unwrapped without shifting original source offsets |
| `Pause: 3 seconds`, `[pause for three seconds]`, `(pause 1500ms)`, `pause_s: 3` | Measured silence with the exact stated duration |
| `One. [pause 3s] Two.` | Speech, three seconds of silence, then continued speech in the same role |
| `Field`/`Type` and `Content`/`Text`/`Value` table | Ordered labelled fields |
| Storyboard table with a `Narration`/`Voiceover` column | Rows in order; only spoken columns and explicit pauses enter audio; other columns remain scene context |
| Prose-only document with title/section headings | Narration without requiring labels |

The preferred paragraph format remains in the guidance. Spoken labels retain their role across a pause unless another label changes it. Table headers such as `Pause (s)` allow a number without a unit; otherwise pause units are required. Storyboard rows can continue the preceding scene by leaving its scene cell empty. A table without a scene column creates one scene per row. Reference tables belong under `Notes:`.

`Question:` and `Answer:` remain nonspoken; use `Question (spoken):` or `Reveal:` to speak them. Notes, visual/animation fields, and explicitly nonspoken fields never become narration. Links contribute visible text, comments are masked, and the original Markdown is retained. A mixed document with unlabelled prose, an unknown marked field, an approximate/ranged pause, or a stage direction/equation inside speech fails with a line-numbered error before ElevenLabs is called. There is no heuristic that reads every leftover line or invents missing pause lengths. Normalized output retains the existing `Storyline` shape and timing package schema, so the provider, scene agent, audio routes, and animlib player use the same interfaces.

Limits: 50,000 Markdown characters, 20,000 spoken characters, 100 scenes, 500 blocks, 30 seconds per pause, 600 total pause seconds, and 30 minutes of generated audio. Long speech blocks split at sentence/word boundaries below 8,000 characters per request. Words, equations, and numbers should already be written as spoken language; stage directions and LaTeX in speech are rejected with line numbers. Invalid scripts are rejected before paid speech requests.

## Local setup

From the repository root, install dependencies with `npm ci`, copy `backend/.env.example` to `backend/.env.local`, and configure:

- `ELEVENLABS_API_KEY`: server-only ElevenLabs key, with text-to-speech access.
- `ELEVENLABS_VOICE_ID`: `hIru3zkEJ3dBYHTbMy2V`, verified as **Alexander - Clear, Steady and Refined** in the project's account. Voice access must also be available to the runtime key; another account may need to add the same voice.
- `ELEVENLABS_MODEL_ID`: defaults to `eleven_multilingual_v2`.
- `NARRATION_DATA_DIR`: an absolute writable directory, e.g. a `.narration` directory in the checkout.
- `NARRATION_ALLOW_LOCAL=1`: is a legacy local binding option; the backend then defaults to a loopback bind. It refuses a shared bind with this bypass enabled and ignores it in production.
- Omit `NARRATION_PUBLIC_ORIGIN` locally. Behind the production gateway set it to the exact public browser origin, `https://11.hackathon.ethz.ch`.

Never use `VITE_` for credentials. `.env` files and generated audio are ignored by Git. The checked-in example contains no API key.

Generate the smoke sample before starting the backend worker:

```sh
npm run build
node_modules/.bin/bun --env-file=backend/.env.local backend/src/narration/cli.ts backend/prompts/narration-smoke.md
```

The CLI prints the package location and preview URL. Start the backend and demo in separate terminals:

```sh
node_modules/.bin/bun --env-file=backend/.env.local backend/src/index.ts
npm run dev
```

Open `http://localhost:5173/?narration=JOB_ID`. Press Play to grant browser audio permission. The transcript highlights the current word and the marker moves at selected word starts; seeking and pauses use animlib's single Web Audio clock. A WebGPU-capable browser is required. For alternative ports, set `PORT` on the backend and `NARRATION_API_TARGET=http://127.0.0.1:PORT` for the demo server.

Run only one writer process per data directory. Do not run the direct CLI while a backend using that directory is active; use the HTTP API instead. Stop the backend before using the CLI to resume an interrupted job.

## HTTP and service interfaces

The application currently uses a single shared user for all video and narration requests. Login headers and browser cookies do not divide the library. Responses do not contain keys or internal owner fields.

| Request | Response |
|---|---|
| `POST /api/narrations` with `{ "markdown": "..." }` | `202` with job ID, status and status URL; identical completed input returns `200` |
| `GET /api/narrations/:id` | Job state/progress, plus `package` when complete |
| `POST /api/narrations/:id/retry` with `{}` | Explicitly resumes a failed/interrupted job using saved chunks |
| `GET /api/narrations/:id/scene-agent` | Readable Markdown handoff |
| `GET /api/narrations/:id/scenes/:sceneId` | Scene-agent input with immutable timing and audio binding |
| `GET /api/narrations/:id/alignment` | Full original and normalized character alignment |
| `GET /api/narrations/:id/audio/:assetId` | Registered WAV audio only |
| `GET /api/narrations/:id/preview` | Deterministic diagnostic scenes and their audio asset registry |

GET routes also support HEAD. POST requires JSON and a same-origin request. A missing key or voice returns `503 NOT_CONFIGURED` while health checks and the rest of the app remain available. Invalid scripts return `422` with a source line when possible. Pending artifacts return `409`; wrong owners and unknown assets return `404`.

For backend-to-backend orchestration, call `NarrationService.submit(owner, markdown)`, poll `get(owner, id)`, and retrieve `package(owner, id)`. `buildSceneAgentInput(package, sceneId, previousFrame?)` supplies the scene agent's instructions, timing, context, expected audio ID/hash, and end mode. `validateSceneAgainstNarration(source, package, sceneId, previousFrame?)` compiles the returned code with `animlib/core`, checks its audio binding/end mode/duration, and returns the final frame for the next scene. Semantic correctness of a visual reveal still requires the scene agent/reviewer; compilation cannot prove it.

## Package contract

`NarrationPackageV1` is defined in `backend/src/narration/types.ts`. `narration.json` is authoritative; `scene-agent.md` is generated from it and rounds values for reading only.

- Package: `schemaVersion`, `id`, `title`, `scriptHash`, pinned speech settings, sample rate, total measured duration, scenes, and combined audio.
- Scene: stable beat ID/title/context, `startSec` on the logical lesson timeline, measured `durationSec`, audio ID/URL/hash/sample count, utterances, and explicit pauses.
- Utterance: source text, normalized spoken text, speech role, original Markdown source range, audio interval, words, and sentences. Source ranges use UTF-16 offsets, matching the Markdown parser.
- Word: unique ID, utterance ID, text, `startSec`, `endSec`, and a half-open character range into that utterance's normalized provider alignment array. Character-array indices are not JavaScript string offsets.
- Pause: ID and start/end times. Silence is present in the WAV itself, so all consumers hear the same interval.

All utterance, sentence, word, and pause timestamps are **local to their scene**. Add scene `startSec` to get logical lesson time. Use word IDs rather than matching repeated text. Global offsets are computed from PCM sample counts, not the last spoken word. The combined WAV and individual scene WAVs contain the same samples in order; browser scene transitions may have a small scheduling gap.

The provider's normalized text supplies spoken word boundaries, including expanded numbers. Original character alignment is retained separately; original and normalized words are not assumed to map one-to-one. Provider timestamps can round up to one millisecond beyond the PCM boundary; canonical word times are bounded to the audio length while raw alignment is preserved. Larger mismatches fail. Timing precision is not a promise of perfect acoustic alignment.

Audio uses signed 16-bit mono PCM at 24 kHz wrapped in WAV. Default voice settings are stability 0.6, similarity 0.75, style 0, speaker boost enabled, and speed 1. Adjacent text is supplied for vocal continuity. An animation selects its assigned audio asset at local time zero; visuals may finish early and hold, but cannot run past the narration duration. Animlib owns playback, seeking, pause/resume, and mute synchronization.

## Persistence, failures, and deployment

The initial worker is serial and in-process. Job metadata, complete audio/alignment chunks, source Markdown, scene WAVs, the combined WAV, and the handoff package are written atomically beneath `NARRATION_DATA_DIR`. Identical requests reuse their owner-scoped content hash. Context, settings, and processing version are included in chunk identity. Regenerated or changed speech requires a new package; never combine new audio with old timings.

After a restart, queued/running jobs become `interrupted`; an explicit retry reuses saved chunks. Resuming an unfinished video automatically retries its interrupted narration. Completed scene audio and timings are available to the video generator before the full narration package is complete. Reposting identical failed input only returns its current state. Explicit retries can repeat the last request if the provider completed it but the server never received/saved it, so it may be billed twice. Network timeouts are not retried automatically. Only explicit HTTP 429/503 rejection gets bounded retries; auth, quota, voice and invalid-alignment errors are surfaced separately. Logs/public errors never include the key or provider response body.

Production runs Bun in the Docker Compose app container and reads `/etc/3yellow3white/environment`. Create a persistent directory owned by `deploy`, such as `/var/lib/3yellow3white/narration`, outside the immutable release directories. Set the key, pinned voice, data directory, and public origin there. No external queue/database is required. Artifacts are retained until explicitly removed by an operator; monitor disk use. Horizontal workers and automatic retention are not part of this version.

The storyline service now produces reviewed Astra story ZIPs; the scene-generation AI and the connection to the simulated video creation flow remain downstream work. The narration contract and executable validation/demo integration remain available independently.

## Verification

```sh
npm run backend:test
npm run backend:typecheck
npm run typecheck
npm test
npm run demo:build
```

Backend fixtures compare differently formatted AI responses against the same expected spoken sequence, including lists, headings, quotes, code fences, comments, line endings, synonyms, and tables. They cover source offsets, ambiguous inputs failing before provider calls, the guidance example, Unicode/repeated-word alignment, provider rounding, exact silence and duration offsets, caching, explicit retry, restart recovery, internal owner checks, shared-user HTTP access, API errors, and compilation of the timed demo. An HTTP-to-provider-to-scene test checks that normalized narration reaches ElevenLabs without production notes and retains its pause/audio/word offsets. Ordinary tests never call ElevenLabs. The optional CLI smoke test uses real credits. CI additionally packages and tests a Linux Docker image, including the Markdown extensions, storyline guidance, clean shutdown, and persistence across container recreation.
