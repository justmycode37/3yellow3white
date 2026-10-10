# Aha!

A React and Vite frontend for turning learning material into visual explanations. Served by the Bun backend and integrated with the shared animlib player. The workspace sends source material to the backend Astra script pipeline; rendering remains a downstream stage.

```sh
cd ../..
npm ci
npm ci --prefix frontend/app
npm run app:dev
npm run app:build
npm run app:test
```

## Screens and interactions

- Workspace: `/`, three overlapping coloured input cards: Drag & drop, Text & file, and Photos. Side cards reveal further on hover or keyboard focus; click or tap brings a mode to the front. Each mode keeps its own inputs, and only the active mode is submitted. Photos supports image selection and an on-demand camera with capture, cancellation, permission-error handling, and stream cleanup. File selection accepts up to 10 files totaling 50 MB, including PDFs, Word/text documents, images, and MP4/MOV/WebM videos. Creation submits an idempotent server job and opens its status view. Backend processing supplies image pixels and scanned PDF pages to Astra.
- Library: a separate `/library` page reached from the workspace or navigation drawer. Includes six example videos in Organic chemistry and Linear algebra, saved previews under their subject or My ideas, subject filters, search, sorting, and bookmarks.
- Plan: `/plan`, a subject list with rounded coloured icons on the left and a half-width curriculum on the right, using the supplied ETH timetable. Short subject names, original class positions, and lunch gaps are preserved without visible times. Selecting a subject opens its plan below the overview without selection outlines. Empty subjects show file upload or pasted-text input; existing material appears as ordered chapters and video topic widgets. Hover or keyboard focus reveals a rounded black “Make me a video” action; touch devices keep it visible. The action opens Workspace with the topic text and source details filled in. On mobile the curriculum sits below the list. The curriculum is only shown on Plan.
- Settings: `/settings`, light and dark appearance cards. Dark mode uses a pure-black page background.
- Navigation: a left drawer with workspace, library, Plan, and creation links at the top; Settings stays at the bottom.
- Player: `/watch/:id`, full-viewport animlib WebGPU/WebGL2 lesson canvas, play/pause, scrubbing, keyboard shortcuts, replay, and fullscreen. Navigation and dialogs temporarily pause playback. The scrubber and timer follow animlib's timeline.
- Light is the initial theme. Theme preference and curriculum context are stored locally; generated video jobs are saved on the server. Dark mode uses darker versions of each pastel.

## Integration points

- `src/WorkspacePage.tsx` → `createVideo`: reads documents from the active input mode and submits topic/source text through `src/videos.ts`. No subject selection or course setup is required. The player opens immediately while generation continues on the server. Curriculum subject, chapter, and source metadata remain attached across library refreshes.
- `src/curriculum.ts` and `src/CurriculumView.tsx`: shared example timetable data and proportional layout; the timetable times are used only for positioning, never displayed.
- `src/SubjectPlan.tsx` and `src/subjectPlans.ts`: per-subject material uploads, additive chapter outlines, and local persistence under `aha-subject-plans-v1`. Older saved plans migrate into matching subjects. Original source text is retained for topic video requests.
- `src/plan.ts`: local, deterministic chapter and segment suggestions. It uses headings and source text, not an AI service. Long sections split at sentence boundaries where possible, targeting at most four minutes at 140 source words per minute. Actual video durations will depend on the explanation engine.
- `src/documentReader.ts`: lazily loaded PDF.js and Mammoth readers. PDF/Word content is read on-device; scanned PDFs require a readable text layer. Files are limited to 50 MB and PDFs to 500 pages.
- `src/LessonPlayer.tsx`: mounts and disposes animlib, subscribes to server manifests or loads local sample scenes, and connects controls to `src/lessonPlayback.ts`. Animlib owns the playback clock, buffering, and pause intent. WebGPU is preferred with automatic WebGL2 fallback. The canvas is mounted imperatively so recovery can replace a locked drawing surface safely.
- `src/lessonScenes.ts`: local sample `SceneSource[]` for the six example lessons and older local previews. Server previews use progressively delivered source and audio through the same player.
- `src/data.ts`: the `Lesson` interface and example lessons. `videoId` links server-backed lessons to their manifests; `source` retains local curriculum context.
- `src/Artwork.tsx`: placeholder educational diagrams for thumbnails and demo playback.
- `src/styles.css`, `src/interface.css`, `src/workspace.css`, and `src/plan.css`: shared component styles, the rounded pastel interface, responsive layouts, and reduced-motion support.

Workspace submissions send the selected raw files and topic to the backend, which persists and processes them privately. The default Astra pipeline reports preparation status and errors, with explicit retries. No script, ZIP, or orchestration metadata is displayed or downloaded by the browser, and the renderer is not initialized for script-only jobs. Plan chapters and extracted source text remain in local browser storage; its on-device document reader is separate from workspace ingestion. See [source formats and orchestration](../../docs/story-orchestration.md), [legacy video delivery](../../docs/video-delivery.md), and [narration](../../docs/narration.md).

Typography uses locally bundled Google Fonts: DynaPuff for the Aha! wordmark and DM Sans for the interface. “Cream” was not found in the Google Fonts catalog; the wordmark font can be replaced in `src/main.tsx` and `.wordmark` when the intended font is supplied.

## Repository build

Run `npm ci` and `npm ci --prefix frontend/app` from the repository root, followed by `npm run app:build`. The app links the local animlib package in `shared/animlib`; its build, dev, and test commands first build that library. Vite writes the static site, module worker, and QuickJS WASM to `frontend/site/`, where the Bun backend serves them. `npm run app:test` covers plan generation, playback controls, lifecycle, and scene compilation. `npm --workspace animlib run test:gpu` optionally verifies real native WebGPU rendering of all sample lessons in both themes.
