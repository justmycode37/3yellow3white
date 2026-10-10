# scenegen: render checks and single-scene retry

Runs the backend unchanged, with extra checks on every generated scene. The prompts
are the backend's own (`backend/prompts/scenegen/`). Nothing here is used by the normal
`backend/src/index.ts` start.

```
cd backend
bun ../scenegen/backend/dev.ts                 # the app, with the checks below
bun test ../scenegen/backend/dev.test.ts       # 7 tests
```

## Checks

Run after the backend's own validation; a failing scene goes back to the model with
the message. All in `backend/scene-checks.ts`.

| Check | Rejects a scene when |
|---|---|
| LaTeX render | A formula uses a command the player cannot render |
| Plan view tags | A planned scene is not marked `3D:` or `2D (because ...):` |
| 3D parts in their view | A 3D object is drawn outside the view that holds its model |
| Controls top right | A control is given its own position |
| Controls work at the end | A control changes nothing on the final held frame |
| Text overlap | animlib's `detectSceneOverlaps` reports overlapping settled text |
| Formula off frame | A formula leaves a frame 1.5 times as wide as it is tall |
| Too much text | More than seven formulas and labels are visible at once |

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
