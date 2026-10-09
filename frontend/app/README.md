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

- Workspace: `/`, three overlapping coloured input cards: Drag & drop, Text & file, and Photos. Side cards reveal further on hover or keyboard focus; click or tap brings a mode to the front. Each mode keeps its own inputs, and only the active mode is submitted. Photos supports image selection and an on-demand camera with capture, cancellation, permission-error handling, and stream cleanup. File selection accepts up to 10 files of 50 MB each. Creation saves exactly one sample preview and opens it directly in the player.
- Library: a separate `/library` page reached from the workspace or navigation drawer. Includes six example videos in Organic chemistry and Linear algebra, saved previews under their subject or My ideas, subject filters, search, sorting, and bookmarks.
- Plan: `/plan`, a subject list with rounded coloured icons on the left and a half-width curriculum on the right, using the supplied ETH timetable. Short subject names, original class positions, and lunch gaps are preserved without visible times. Selecting a subject opens its plan below the overview without selection outlines. Empty subjects show file upload or pasted-text input; existing material appears as ordered chapters and video topic widgets. Hover or keyboard focus reveals a rounded black “Make me a video” action; touch devices keep it visible. The action opens Workspace with the topic text and source details filled in. On mobile the curriculum sits below the list. The curriculum is only shown on Plan.
- Settings: `/settings`, light and dark appearance cards. Dark mode uses a pure-black page background.
- Navigation: a left drawer with workspace, library, Plan, and creation links at the top; Settings stays at the bottom.
- Player: `/watch/:id`, animlib WebGPU lesson canvas, play/pause, scrubbing, keyboard shortcuts, replay, and fullscreen. Navigation and dialogs temporarily pause playback. The scrubber and timer follow animlib's timeline.
- Light is the initial theme. Theme preference and library metadata are stored locally. Dark mode uses darker versions of each pastel.

## Integration points

- `src/WorkspacePage.tsx` → `createVideo`: connect the explanation engine here using the active `mode`, `topic`, and `files`. No subject selection or course setup is required. Currently `onCreate` returns a single demo lesson; `src/App.tsx` saves it to the library and opens the player. Demo playback keeps the user's topic visible and identifies the result as a sample.
- `src/curriculum.ts` and `src/CurriculumView.tsx`: shared example timetable data and proportional layout; the timetable times are used only for positioning, never displayed.
- `src/SubjectPlan.tsx` and `src/subjectPlans.ts`: per-subject material uploads, additive chapter outlines, and local persistence under `aha-subject-plans-v1`. Older saved plans migrate into matching subjects. Original source text is retained for topic video requests.
- `src/plan.ts`: local, deterministic chapter and segment suggestions. It uses headings and source text, not an AI service. Long sections split at sentence boundaries where possible, targeting at most four minutes at 140 source words per minute. Actual video durations will depend on the explanation engine.
- `src/documentReader.ts`: lazily loaded PDF.js and Mammoth readers. PDF/Word content is read on-device; scanned PDFs require a readable text layer. Files are limited to 50 MB and PDFs to 500 pages.
- `src/LessonPlayer.tsx`: mounts and disposes animlib, loads sample scenes, and connects the existing controls to `src/lessonPlayback.ts`. Animlib owns the playback clock. Compilation or WebGPU errors appear beside a retry action; playback requires a supported browser on HTTPS or localhost.
- `src/lessonScenes.ts`: local sample `SceneSource[]` for the six example lessons and newly created demo previews. Replace these sources with the explanation engine's authored scene sequence when available; the playback adapter supports multi-scene progress and seeking.
- `src/data.ts`: the `Lesson` interface and example lessons. Add a render manifest or video URL here when the engine is ready.
- `src/Artwork.tsx`: placeholder educational diagrams for thumbnails and demo playback.
- `src/styles.css`, `src/interface.css`, `src/workspace.css`, and `src/plan.css`: shared component styles, the rounded pastel interface, responsive layouts, and reduced-motion support.

Uploaded files remain in browser memory and are never sent to a server. The create action produces a labeled sample preview, not a generated explanation. Reloading clears raw selected files; Plan chapters and their extracted source text remain in local browser storage. Topic-created previews retain their subject, chapter, and source text. Example playback is silent.

Typography uses locally bundled Google Fonts: DynaPuff for the Aha! wordmark and DM Sans for the interface. “Cream” was not found in the Google Fonts catalog; the wordmark font can be replaced in `src/main.tsx` and `.wordmark` when the intended font is supplied.

## Repository build

Run `npm ci` and `npm ci --prefix frontend/app` from the repository root, followed by `npm run app:build`. The app links the local animlib package in `shared/animlib`; its build, dev, and test commands first build that library. Vite writes the static site, module worker, and QuickJS WASM to `frontend/site/`, where the Bun backend serves them. `npm run app:test` covers plan generation, playback controls, lifecycle, and scene compilation. `npm --workspace animlib run test:gpu` optionally verifies real native WebGPU rendering of all sample lessons in both themes.
