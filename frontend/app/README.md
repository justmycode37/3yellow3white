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
- Courses: `/courses` (legacy `/plan` links still work). A left-hand course list sits beside a two-by-two video grid. Three video slots show recent playback, filled with examples when needed, in the listed course’s colour; the fourth plus tile opens Workspace. Add course appears below the list with a name and colour form. A delete button at the bottom of the selected course, above the footer, confirms removal of the course and its material while keeping videos in Library. Courses and playback order persist locally; opening a course retains its material upload and topic-to-video flow. Material appears as topics containing short lessons with estimated durations. Library keeps its existing subject-list styling and only shows subjects that have videos; empty courses remain on Courses.
- Settings: `/settings`, light and dark appearance cards. Dark mode uses a pure-black page background.
- Navigation: a left drawer with workspace, library, Courses, and creation links at the top; a quick Light/Dark switch stays at the bottom.
- Player: `/watch/:id`, full-viewport animlib WebGPU/WebGL2 lesson canvas, play/pause, scrubbing, keyboard shortcuts, replay, and fullscreen. The canvas is white in light mode and black in dark mode, with contrasting menu and playback controls on transparent backgrounds and no title/subtitle panel. The bold progress bar fills over a grey unplayed track. Theme changes recolor the existing renderer while preserving playback position and scene interactions. Navigation and dialogs temporarily pause playback. The scrubber and timer follow animlib's timeline.
- Light is the initial theme. Theme preference and curriculum context are stored locally; generated video jobs are saved on the server. Dark mode uses darker versions of each pastel.

## Integration points

- `src/GenerationProgress.tsx`: generation shows a live number in the DynaPuff title font with a small “tokens” label below until the first scene becomes playable, then hides it throughout playback and later buffering. Digits roll upward as usage increases and downward for confirmed corrections; reduced motion shows updates immediately. Server manifest snapshots provide cumulative model usage, including planning, reviews, scene work, and thumbnail calls. During active model calls, the server sends an activity-based estimate every 500 ms, including silent reasoning before any output arrives. A visible `~`, tooltip, and accessible label identify estimates; provider-reported usage replaces each response's estimate and can reconcile the count downward. The heartbeat stops when the model request ends. Below the counter, `GenerationWater.tsx` draws minimal grey glasses with blue water and an ≈ symbol. Each glass is a 250 mL illustrative comparison, scaled from Mistral’s published 45 mL per 400 output-token response; the tooltip identifies the comparison as unmeasured for this model. Input tokens are excluded. Legacy jobs without usage show a waiting state. Speech synthesis usage is not measured in model tokens.

- `src/CanvasQuestion.tsx`: right-click the canvas to open a compact input and black circular send icon; successive questions cycle through the widget colours. The draft retains the lesson, timestamp, pixel and normalized location, and detached scene frame locally. Playback pauses while the input is open. Escape or clicking outside dismisses it. Sending is disabled; no question API is called.

- `videoMode: 'classic' | 'interactive'`: the selected viewing experience, separate from the input method. The repository frontend sends it in JSON and multipart creation requests and preserves it in browser-local lesson metadata across library refreshes. The standalone prototype saves it on its sample lesson. This change does not enable interactive generation: the future backend must validate, persist, and pass it to generation/rendering as described in `backend/prompts/guidance.md` (repository path). Requests without a mode default to Classic in that contract.

- `src/WorkspacePage.tsx` → `createVideo`: reads documents from the active input mode and submits topic/source text through `src/videos.ts`. No subject selection or course setup is required. The player opens immediately while generation continues on the server. Curriculum subject, chapter, and source metadata remain attached across library refreshes.
- `src/courses.ts` and `src/CoursesPage.tsx`: default subjects from `curriculum.ts`, the active course list under `aha-courses-v1` (version 2 preserves deleted defaults and migrates version 1 custom courses), and actual playback history under `aha-recent-playback-v1`. The timetable is no longer displayed. English sample Linear algebra videos map to the listed Lineare Algebra course.
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
explicit diagnostic fixture. Course topics and extracted source text still use browser local
storage. See [video delivery](../../docs/video-delivery.md), [agent setup](../../docs/agents.md),
and [narration](../../docs/narration.md).


Course uploads now stage files and pasted text together. The top-right Add button
calls `/api/study-plans` once, always using AI, and stores the returned topics and
video-sized lessons. File names, sizes, and remove buttons remain in the drop area
while staged or processing. Input tabs remain selectable during processing;
cancel and failure retain the material for retry. Course material and delete
controls use distinct React keys so switching courses unmounts the old panel.
See the root README for supported formats, limits, and `STUDY_PLAN_MODEL`.
