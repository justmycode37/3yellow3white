# Aha!

A React and Vite frontend for turning learning material into visual explanations. Served by the Bun backend and integrated with the shared animlib player. AI video generation is not connected.

```sh
cd ../..
npm ci
npm ci --prefix frontend/app
npm run app:dev
npm run app:build
npm run app:test
```

## Screens and interactions

- Workspace: `/`, a small Interactive checkbox in the active input widget’s top-right corner. Unchecked means Classic; the selection is independent of the input card and is saved with the lesson. Three overlapping coloured input cards: Drag & drop, Text & file, and Photos. Side cards reveal further on hover or keyboard focus; click or tap brings a mode to the front. Each mode keeps its own inputs, and only the active mode is submitted. Photos supports image selection and an on-demand camera with capture, cancellation, permission-error handling, and stream cleanup. File selection accepts up to 10 files of 50 MB each. Creation submits an idempotent server job and opens its player while scenes arrive. Photo-to-video/OCR is not connected; image submissions report this before creating a job.
- Library: a separate `/library` page reached from the workspace or navigation drawer. Includes six example videos in Organic chemistry and Linear algebra, saved previews under their subject or My ideas, subject filters, search, sorting, bookmarks, generation status, and deletion. All visitors share one server library.
- Plan: `/plan`, a subject list with rounded coloured icons on the left and a half-width curriculum on the right, using the supplied ETH timetable. Short subject names, original class positions, and lunch gaps are preserved without visible times. Selecting a subject opens its plan below the overview without selection outlines. Empty subjects show file upload or pasted-text input; existing material appears as ordered chapters and video topic widgets. Hover or keyboard focus reveals a rounded black “Make me a video” action; touch devices keep it visible. The action opens Workspace with the topic text and source details filled in. On mobile the curriculum sits below the list. The curriculum is only shown on Plan.
- Settings: `/settings`, light and dark appearance cards. Dark mode uses a pure-black page background.
- Navigation: a left drawer with workspace, library, Plan, and creation links at the top; a quick Light/Dark switch and Settings stay at the bottom.
- Player: `/watch/:id`, full-viewport animlib WebGPU/WebGL2 lesson canvas, play/pause, scrubbing, keyboard shortcuts, replay, and fullscreen. The canvas is white in light mode and black in dark mode, with contrasting menu and playback controls on transparent backgrounds and no title/subtitle panel. The bold progress bar fills over a grey unplayed track. Theme changes recolor the existing renderer while preserving playback position and scene interactions. Navigation and dialogs temporarily pause playback. The scrubber and timer follow animlib's timeline.
- Light is the initial theme. Theme preference and curriculum context are stored locally; generated video jobs are saved on the server. Dark mode uses darker versions of each pastel.

## Integration points

- `videoMode: 'classic' | 'interactive'`: the selected viewing experience, separate from the input method. The repository frontend sends it in JSON and multipart creation requests and preserves it in browser-local lesson metadata across library refreshes. The standalone prototype saves it on its sample lesson. This change does not enable interactive generation: the future backend must validate, persist, and pass it to generation/rendering as described in `backend/prompts/guidance.md` (repository path). Requests without a mode default to Classic in that contract.

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

Workspace submits original documents and photos using multipart uploads alongside typed text.
The backend persists them before accepting a video and handles extraction, script generation,
ElevenLabs speech/alignment, and sequential animlib code generation. Ready scenes stream to the
player while later scenes continue, even after navigation away. The library refreshes server jobs
and supports deletion. Pi generation is the default; `VIDEO_GENERATOR=simulated` provides an
explicit diagnostic fixture. Plan chapters and extracted source text still use browser local
storage. See [video delivery](../../docs/video-delivery.md), [agent setup](../../docs/agents.md),
and [narration](../../docs/narration.md).
