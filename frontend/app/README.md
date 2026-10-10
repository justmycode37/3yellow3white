# Aha!

A frontend-only hackathon prototype for turning learning material into visual explanations. Built with React, TypeScript, and Vite. No backend or AI services are connected.

```sh
cd ../..
npm ci
npm ci --prefix frontend/app
cd frontend/app
npm run dev
npm run build
npm test
```

## Screens and interactions

- Workspace: file selection, drag and drop, image preview, text input, and server-backed sample video creation.
- Library: six example videos in Organic chemistry and Linear algebra, subject filters, search, sorting, and bookmarks.
- Plan: `/plan`, PDF, DOCX, TXT, Markdown, or pasted-text input. Suggests chapters and topics from document headings and bounded text segments. A left chapter list scrolls through all topics shown in video-sized, title-only placeholders on the right. Hovering a topic shows a large "Explain" pill as a visual placeholder; it does not create a video yet. The latest plan is saved locally.
- Settings: `/settings`, light and dark appearance cards. Dark mode uses a pure-black page background.
- Navigation: a left drawer with workspace, library, Plan, and creation links at the top; Settings stays at the bottom.
- Player: `/watch/:id`, animlib WebGPU/WebGL2 lesson canvas, play/pause, scrubbing, keyboard shortcuts, replay, and fullscreen. Navigation and dialogs temporarily pause playback. The scrubber and timer follow animlib's timeline.
- Light is the initial theme. Theme preference and bookmarks are stored locally; generated video jobs are saved on the server. Dark mode uses darker versions of each pastel.

## Integration points

- `src/App.tsx` → `Studio`: reads document text and submits a video job through `src/videos.ts`. The player opens immediately while generation continues on the server. The Plan page's "Explain" pill remains UI only.
- `src/plan.ts`: local, deterministic chapter and segment suggestions. It uses headings and source text, not an AI service. Long sections split at sentence boundaries where possible, targeting at most four minutes at 140 source words per minute. Actual video durations will depend on the explanation engine.
- `src/documentReader.ts`: lazily loaded PDF.js and Mammoth readers. PDF/Word content is read on-device; scanned PDFs require a readable text layer. Files are limited to 50 MB and PDFs to 500 pages.
- `src/LessonPlayer.tsx`: mounts and disposes animlib, subscribes to server manifests or loads local sample scenes, and connects the existing controls to `src/lessonPlayback.ts`. Animlib owns the playback clock. WebGPU is preferred with automatic WebGL2 fallback. Compilation or dual-backend failures appear beside a retry action. The canvas is mounted imperatively so backend recovery can replace a locked drawing surface without conflicting with React.
- `src/lessonScenes.ts`: local sample `SceneSource[]` for the six example lessons; server previews use progressively delivered source and audio through the same player. The playback adapter supports multi-scene progress and seeking.
- `src/data.ts`: the `Lesson` interface and example lessons. `videoId` links server-backed lessons to their manifests.
- `src/Artwork.tsx` and `src/Icons.tsx`: bold, rounded icons and organic subject illustrations. Saved lesson titles select matching artwork through `artworkForTitle` in `src/data.ts`.
- `src/styles.css`, `src/interface.css`, `src/plan.css`, and `src/artwork.css`: shared component styles, the rounded pastel interface, responsive layouts, and reduced-motion support.

The Plan page reads files locally. Creating a video sends extracted source text to the server and produces a labeled interactive sample with a test tone. Raw files remain in browser memory. Real explanation and narration providers are not connected. See [video delivery](../../docs/video-delivery.md).

Typography uses locally bundled Google Fonts: DynaPuff for the Aha! wordmark and DM Sans for the interface. “Cream” was not found in the Google Fonts catalog; the wordmark font can be replaced in `src/main.tsx` and `.wordmark` when the intended font is supplied.

## Repository build

Run `npm ci` and `npm ci --prefix frontend/app` from the repository root, followed by `npm run app:build`. The app links the local animlib package in `shared/animlib`; its build, dev, and test commands first build that library. Vite writes the static site, module worker, and QuickJS WASM to `frontend/site/`, where the Bun backend serves them. `npm run app:test` covers plan generation, playback controls, lifecycle, and scene compilation. `npm --workspace animlib run test:gpu` optionally verifies real native WebGPU rendering of all sample lessons in both themes.
