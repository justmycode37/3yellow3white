# Aha!

A frontend-only hackathon prototype for turning learning material into visual explanations. Built with React, TypeScript, and Vite. No backend or AI services are connected.

```sh
npm install
npm run dev
npm run build
npm test
```

## Screens and interactions

- Workspace: file selection, drag and drop, image preview, text input, subject and depth controls.
- Library: six example videos in Organic chemistry and Linear algebra, subject filters, search, sorting, and bookmarks.
- Plan: `/plan`, PDF, DOCX, TXT, Markdown, or pasted-text input. Suggests chapters and short video topics from document headings and bounded text segments. Each chapter has its own colour, with matching topic cards beside it on desktop and below it on mobile. Topic cards expand to show source notes and PDF page references, and can open the demo creation flow. The latest plan is saved locally.
- Settings: `/settings`, light and dark appearance cards. Dark mode uses a pure-black page background.
- Navigation: a left drawer with workspace, library, Plan, and creation links at the top; Settings stays at the bottom.
- Player: `/watch/:id`, full-screen lesson canvas, play/pause, scrubbing, keyboard shortcuts, and fullscreen. Section labels and bullet captions are omitted.
- Light is the initial theme. Theme preference and library metadata are stored locally. Dark mode uses darker versions of each pastel.

## Integration points

- `src/App.tsx` → `Studio`: replace the simulated creation stages with the explanation engine. The inputs include `files`, `text`, `title`, and `subject`. Plan topics prefill the source text and title. The `onCreate` callback adds a lesson to the library.
- `src/plan.ts`: local, deterministic chapter and segment suggestions. It uses headings and source text, not an AI service. Long sections split at sentence boundaries where possible, targeting at most four minutes at 140 source words per minute. Actual video durations will depend on the explanation engine.
- `src/documentReader.ts`: lazily loaded PDF.js and Mammoth readers. PDF/Word content is read on-device; scanned PDFs require a readable text layer. Files are limited to 50 MB and PDFs to 500 pages.
- `src/App.tsx` → `Player`: replace `lesson-stage` with the animation library's canvas. Keep `time`, `playing`, and `speed` connected to that renderer. The menu and bottom controls are independent.
- `src/data.ts`: the `Lesson` interface and example lessons. Add a render manifest or video URL here when the engine is ready.
- `src/Artwork.tsx`: placeholder educational diagrams for thumbnails and demo playback.
- `src/styles.css`, `src/interface.css`, and `src/plan.css`: shared component styles, the rounded pastel interface, responsive layouts, and reduced-motion support.

Uploaded files remain in browser memory and are never sent to a server. The create action produces a labeled sample preview, not a generated explanation. Reloading clears selected files. Example playback is silent.

Typography uses locally bundled Google Fonts: DynaPuff for the Aha! wordmark and DM Sans for the interface. “Cream” was not found in the Google Fonts catalog; the wordmark font can be replaced in `src/main.tsx` and `.wordmark` when the intended font is supplied.

## Repository build

Run `npm ci --prefix frontend/app` from the repository root, followed by `npm run app:build`. Vite writes the static site to `frontend/site/`, where FastAPI serves it. The existing animation library in `frontend/animlib` has its own build and tests.
