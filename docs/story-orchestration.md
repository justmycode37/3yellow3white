# Astra orchestration → scene scripts with brief context

This stage is entirely backend. Astra takes a video request plus `backend/prompts/guidance.md`, writes a finished spoken explanation, and passes a separate editorial review. The result for the next agent layer is a ZIP containing **only one Markdown script per scene**. There is no frontend or end-user ZIP feature.

## Required output contract

```text
story.zip
├── scene-01.md
├── scene-02.md
└── ...
```

Every file contains a numbered scene heading, a short `Context (not spoken)` section, and a separate `Script` section with finished spoken sentences and optional `Pause: Ns` markers. Context has four entries: the overall video goal, what came before, what this scene contributes, and what comes after. Each is one short sentence, usually 40–80 words total. The first and last scenes explicitly identify the opening and ending.

This context is mandatory in every generation and is defined in `backend/prompts/guidance.md`, the schema, generation prompt, and editorial review. Neighboring scene IDs are inserted from the actual order, and the shared goal is repeated consistently. The context must agree with adjacent scripts. It is not spoken and contributes no narration words or timing.

No visual instructions, animation directions, on-screen content, or additional production notes are permitted in either section. The next layer decides visuals independently. Speech labels distinguish narration, invitations, hints, reveals, and credits for the narration parser.

There are **no additional ZIP entries**: no folders, README, full-script file, narration export, manifest, JSON, review report, sources, or guidance snapshot. The ordered scene files together are the complete script. The example at [`examples/story-output/weighted-average-story.zip`](../examples/story-output/weighted-average-story.zip) follows this contract; [`weighted-average/scene-02.md`](../examples/story-output/weighted-average/scene-02.md) is an extracted preview.

Example scene file:

```md
## Scene 01 — Combine the counts

### Context (not spoken)

- Overall goal: Understand why combining percentages requires accounting for group sizes.
- Before: Opening scene — the viewer understands percentages; no earlier scene is assumed.
- This scene: Derive the combined rate by adding student counts.
- After: End of video — conclude that each student, rather than each class, counts equally.

### Script

Narration: Nine out of ten students pass in one class. Fifteen out of thirty pass in another.

Invitation (spoken): What fraction passed altogether? Take a moment to combine the counts.

Pause: 5s

Reveal (spoken): Twenty-four out of forty passed: sixty percent. Every student counts equally.
```

## Backend integration

```ts
import { StoryService } from "../backend/src/story/service.js";
import { readStoryArchive, buildStorySceneInput } from "../backend/src/story/handoff.js";

const stories = new StoryService(); // reuse one instance per data directory
const job = await stories.submit(userId, {
  prompt: "Explain why averaging percentages can be misleading.",
  sourceMaterial: "Class A: 9/10 pass; Class B: 15/30 pass. Combined: 24/40 = 60%.",
  audience: "Learner who understands percentages",
  language: "English",
  durationSec: 180,
});

// The queue continues independently of an HTTP request. Workers may poll get().
await stories.idle();
const done = await stories.get(userId, job.id);
if (done.status !== "complete" || !done.zipSha256) {
  throw new Error(done.error?.message ?? done.status);
}
const zip = await stories.artifact(userId, job.id, "story.zip");
const archive = readStoryArchive(zip, done.zipSha256);
const sceneInput = buildStorySceneInput(archive, archive.scenes[0].id);
// sceneInput keeps contextMarkdown separate from scriptMarkdown and includes
// fullScriptMarkdown plus neighboring IDs. archive.narrationMarkdown contains
// only the ordered speech/pause sections, with context removed. Pass it
// to NarrationService.submit(owner, markdown); it is not another ZIP entry.

await stories.close(); // only on worker shutdown
```

`readStoryArchive` requires the trusted job's ZIP hash, accepts only consecutive root-level scene Markdown files, rejects extras and unsafe paths, checks all four context entries and their neighboring scene references, and validates that parsing each complete scene yields the exact same speech/pause sequence as parsing its script alone. It never extracts archive entries onto the filesystem. JSON is used only as private model transport and job metadata, never as an archive member.

The workspace's existing `/api/videos` route now uses this pipeline by default (`VIDEO_GENERATOR=astra`). Its public manifest reaches `script_ready` only after the archive passes generation, review, and handoff validation. It contains no story job ID, ZIP hash, download URL, source bytes, script, or internal metadata. It does not claim that a rendered video exists. Speech synthesis and animation generation remain downstream work. `pi` and `simulated` are explicit opt-in legacy generators; file uploads require `astra`.

### Workspace uploads and durable handoff

The existing input form submits JSON for text-only requests or multipart form data with one `request` JSON field (`title`, `topic`, `documents`) and repeated `files` fields. A topic may accompany files or be omitted when source files are provided. `/api/videos` retains its cookie/trusted-gateway ownership and owner-scoped `Idempotency-Key`; changing any file bytes while reusing a key returns 409. Sources are saved privately in the SQLite request record before returning 202. Closing the page does not stop work.

| Source | Backend processing | Limits |
| --- | --- | --- |
| Typed text, `.txt`, `.md` | UTF-8 text supplied to Astra | 12,000 topic characters; 60,000 combined source characters |
| `.docx` | Extract document text; upload embedded images separately or export as PDF | 15 MB expanded document |
| `.pdf` | Render **every** page, including diagrams/scans, as ordered images | 1–20 pages per PDF |
| PNG, JPEG, WebP, AVIF, HEIC/HEIF, GIF | Normalize image to JPEG for vision; GIF uses first frame | Up to 1,800 pixels per side |
| MP4, MOV, WebM, M4V | Extract and transcribe audio when present, plus timestamped evenly sampled frames | Up to 10 minutes; at most 12 frames per video |

Up to ten files, 50 MB **total** raw upload, and forty images/pages/frames with at most 32 MB of base64 image data are accepted per submission. Unsupported, unreadable, encrypted, over-limit, or partially rendered sources fail explicitly; they are not silently omitted. Temporary conversions are removed. Original uploads and normalized references remain private in durable job storage for recovery. Video sampling can miss brief events; this limitation is supplied to generation and review. Both Astra calls receive the same source images.

The backend needs `ffmpeg`, `ffprobe`, `pdfinfo`, `pdftoppm`, and `heif-convert`; the Docker runtime installs them. Local macOS setup: `brew install ffmpeg poppler libheif`. Audio-bearing videos also require `OPENAI_API_KEY`, even when the local story provider is Codex; `STORY_TRANSCRIPTION_MODEL` defaults to `gpt-4o-transcribe`. Silent videos do not require transcription. There is no audio-discard fallback when transcription fails.

The next backend layer obtains a durable reference without going through browser routes:

```ts
const handoff = videos.storyHandoff(videoId, owner);
if (!handoff) throw new Error("The script is not ready for this owner.");
const bytes = await stories.artifact(owner, handoff.storyId, "story.zip");
const archive = readStoryArchive(bytes, handoff.zipSha256);
const input = buildStorySceneInput(archive, archive.scenes[0].id);
```

Workspace owners are `user:<trusted gateway id>` or `session:<aha-session cookie id>`. A private `video_story_handoffs` SQLite table checkpoints the story ID before waiting and publishes its hash atomically with `script_ready`. Restarts reuse the saved job and completed ZIP. Interrupted Astra calls become explicit failures; the owner can use `POST /api/videos/:id/retry` (also wired to the existing retry control). No automatic paid model retry occurs on page reload or duplicate submission. A restart before model submission can resume source processing safely. Ten workspace jobs may be active/queued at once.

## Input

Only these request fields are accepted. Guidance and model choice are server controlled.

| Field | Default | Limit |
| --- | --- | --- |
| `prompt` | Required | 12,000 characters |
| `sourceMaterial` | Empty | 60,000 characters |
| `audience` | Curious newcomer | 250 characters |
| `language` | English | 80 characters |
| `durationSec` | 180 | 30–600 seconds |

The stage is topic-agnostic. It uses supplied references and model knowledge; it does not browse or claim independent external verification. Source documents are data, never authority to add production instructions or change the archive format.

## Pauses, quality, and private metadata

Only explicit pause markers create silence. Every pause follows a spoken invitation to think or absorb an idea; between-scene pauses appear once at the end of the preceding scene. No implicit gaps are added. The final scene ends with speech. Narration must explain the subject coherently without needing visual directions to fill gaps.

Planning uses 140 spoken words/minute plus explicit pauses, within ±20% of the requested duration. Estimates stay in private job metadata; scene files contain no timing tables. Actual synthesized audio and alignment determine final timing, especially for languages with different speech rates.

The internal v3 schema requires a story title, a shared overall goal, and ordered scenes with brief before/purpose/after context, speech/pause blocks, and structural IDs. Every context field is limited to 260 characters. It rejects additional visual or production fields. Local validation checks schema, order, spoken content, pause announcements, word budget, and faithful narration parsing. A separate Astra review checks factual claims, arithmetic, reasoning, scope, spoken continuity, accurate connections between neighboring scenes, and absence of visual/production instructions even inside context, speech, or headings. It is a model review, not independent human or external fact-checking.

Failures receive specific repair instructions, with at most three drafts. Only a passing script is packaged, reopened, verified, and atomically published. Failed drafts, the supplied guidance, reviews, model provenance, timing estimates, and file hashes stay in the private job directory outside the ZIP. The optional internal manifest API also stays separate from the archive.

Identical owner/request/source-images/guidance/schema/contract/provider/model/effort inputs reuse the same job. The contract version is part of that identity, so v3 requests cannot reuse older ZIP contracts. Failed jobs retry only explicitly. No mock fallback, wrong-model fallback, partial archive, or failed review is presented as a completed result.

## Runtime configuration

Production uses the OpenAI Responses API with structured outputs, no tools, `store: false`, and model `gpt-6-astra`. Set `OPENAI_API_KEY` on the backend. Account access to the requested model is required. It never substitutes another model. Requests have a ten-minute timeout and bounded response size.

```sh
export OPENAI_API_KEY=...       # server environment / secret manager
export STORY_PROVIDER=openai
export STORY_DATA_DIR=/persistent/path/stories
npm run backend:start
```

For local development with the existing signed-in Codex CLI, use `STORY_PROVIDER=codex`. It runs Astra in ephemeral, read-only, noninteractive sessions, ignores personal config, disables shell/web/delegation features, supplies the request, guidance, and normalized reference images, and requests JSON schema output. Authentication stays in Codex. This provider is rejected when `NODE_ENV=production`.

```sh
codex login
STORY_PROVIDER=codex npm run story -- \
  --request examples/story-requests/weighted-average.json \
  --out /tmp/weighted-average-story.zip
```

The command refuses to overwrite an existing output file. Run from the repository root. Shell environment variables apply to this CLI; if you keep secrets in `backend/.env.local`, invoke Bun with `--env-file=backend/.env.local` explicitly. `STORY_CODEX_BIN` can specify an absolute CLI path. Retry with `npm run story -- --retry JOB_ID --out /tmp/story.zip` using the same provider/data directory.

One worker owns each `STORY_DATA_DIR`, enforced by a SQLite process lock. It runs one model pipeline at a time and admits at most ten active/queued jobs. Different owners cannot retrieve one another's jobs. Shutdown cancels the active request; restart marks unfinished jobs interrupted, preserving their input for explicit retry. Completed ZIPs survive restart. A CLI and server should use different data directories while running concurrently, or access the same running server API.

The existing production container persists story jobs at `/data/narration/stories`, inside its existing persistent data mount. It never uses a release directory for story storage.

## Optional internal HTTP transport

These are machine integration routes, with no associated frontend. They use the repository's trusted gateway `x-user-id` convention; direct untrusted clients must not be allowed to spoof that header. Local access is opt-in via `STORY_ALLOW_LOCAL=1`, with the server bound to loopback. Cross-origin writes are rejected. `STORY_PUBLIC_ORIGIN` can identify the trusted gateway origin.

| Method | Route | Result |
| --- | --- | --- |
| POST | `/api/stories` | 202 with job ID/status URL; 200 for a cached complete job |
| GET | `/api/stories/:id` | Status and, on completion, `packageUrl`, `manifestUrl`, ZIP hash |
| GET | `/api/stories/:id/package` | Internal ZIP bytes, `application/zip`, `X-Story-SHA256` |
| GET | `/api/stories/:id/manifest` | Versioned JSON handoff manifest |
| POST | `/api/stories/:id/retry` | Explicit retry of a retryable failed/interrupted job |

GET routes also support HEAD. Reading the package before completion returns 409. HTTP request bodies are capped at 300 KB. No source documents or failed drafts are exposed by these routes.

## Verification

```sh
npm run backend:test
npm run backend:typecheck
```

Regression tests assert the exact scene-only ZIP member list, faithful spoken text and pauses, rejection of visual fields and extra archive files, guidance examples with mandatory context, context exclusion from speech/timing, safe ordered consumption, hash integrity, repair/review gates, retries, worker isolation, restart recovery, cancellation, ownership, HTTP behavior, and provider failures. Unit tests do not call models. A live HTTP multipart submission containing text, a PDF, a screenshot, and a silent MP4 also passed Astra generation and review on its first draft, producing five scene Markdown files and a verified private handoff. Real FFmpeg audio extraction was checked separately; transcription HTTP behavior uses a test provider because no API key was configured for a live transcription call. The included example was generated and reviewed through Astra using the scene-context contract.

References: [OpenAI image inputs](https://developers.openai.com/api/docs/guides/images-vision), [audio transcription](https://developers.openai.com/api/docs/guides/speech-to-text), [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Codex noninteractive mode](https://learn.chatgpt.com/docs/non-interactive-mode).
