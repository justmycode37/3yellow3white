# scenegen: render checks and single-scene retry

Runs the backend unchanged, with extra checks on every generated scene. The prompts
are the backend's own (`backend/prompts/scenegen/`). Nothing here is used by the normal
`backend/src/index.ts` start.

```
cd backend
bun ../scenegen/backend/dev.ts                 # the app, with the checks below
bun test ../scenegen/backend/dev.test.ts       # 12 tests
```

## Checks

Run after the backend's own validation; a failing scene goes back to the model with
the message. All in `backend/scene-checks.ts`.

| Check | Rejects a scene when |
|---|---|
| LaTeX render | A formula uses a command the player cannot render |
| Plan view tags | A planned scene is not marked `3D:` or `2D (because ...):` |
| Plan colours | An entity is coloured YELLOW or GOLD (reserved for the highlight) |
| 3D in a view | A scene planned as 3D has no view region, or the main camera is tilted |
| Upright text | Text inside a 3D view is not a billboard or is rotated |
| 3D parts in their view | A 3D object is drawn outside the view that holds its model |
| Controls top right | A control is given its own position |
| Controls work at the end | A control changes nothing on the final held frame |
| Markers in front | A point is drawn behind a line or curve it sits on |
| Text overlap | animlib's `detectSceneOverlaps` reports overlapping settled text |
| Cut off at the edge | A formula, label, arrow or marker leaves a frame 1.2 times as wide as it is tall |
| Lines through labels | A line or arrow runs through a label or formula |
| Too much text | More than twelve formulas, definition lines and labels are visible at once |
| Too heavy | More than 300 separate animations, which the browser player cannot build in time |

## Tools

```
bun ../scenegen/backend/rescene.ts <videoId> <sceneIndex> [--apply]   # regenerate one scene, keep narration
bun ../scenegen/backend/rescene.ts <videoId> 3 --pending 2=<file> --apply   # change neighbouring scenes together
bun ../scenegen/backend/scan.ts <videoId>                              # run the checks over a saved video
```

`rescene` uses the current `backend/prompts/scenegen/visualization.md`, so it is the
quick way to try a prompt edit. `--apply` replaces the scene in the saved video once
every later scene still compiles on top of it; the previous source is kept under
`out/visualization-tests/`.

## Prompt size

The wrapper also trims the previous scene's frame in each scene prompt: bulk geometry
(mesh vertices, triangles, normals, long point lists) is replaced by its size. The
model fetches earlier objects with `s.previous.get(id)` and never needs those numbers,
and they were often most of the prompt. Validation still uses the full frame.

Check failures are logged to `out/scenegen-check-failures.log`.
