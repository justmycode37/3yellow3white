# scenegen: prompt wrapper and render checks

Runs the backend unchanged, with the working copies of the scenegen prompts swapped in
for the frozen copies in `backend/prompts/scenegen/`, plus extra checks on every
generated scene. Nothing here is used by the normal `backend/src/index.ts` start.

```
cd backend
bun ../scenegen/backend/dev.ts                 # the app, with the prompts and checks below
bun test ../scenegen/backend/dev.test.ts       # 10 tests
```

## Prompts

| File | Used for |
|---|---|
| `prompts/planning.md` | Lesson planning: 3D by default, interactions, one idea and at most three formulas per scene, controls top right |
| `prompts/visualization.md` | Each scene: style, simplicity, smooth motion, supported LaTeX, 3D, alignment, controls top right, formula budget and spacing |

Both are re-read on use, so an edit applies to the next scene without a restart. Each
scene prompt that is sent is saved under `out/visualization-prompts/`.

## Checks

Run after the backend's own validation; a failing scene goes back to the model with
the message. All in `backend/scene-checks.ts`.

| Check | Rejects a scene when |
|---|---|
| LaTeX render | A formula uses a command the player cannot render |
| Planned 3D is real 3D | The plan says `3D:` but the source has no 3D mode, view or camera move |
| Plan view tags | A planned scene is not marked `3D:` or `2D (because ...):` |
| 3D parts in their view | A 3D object is drawn outside the view that holds its model |
| Controls top right | A control is given its own position |
| Controls work at the end | A control changes nothing on the final held frame |
| Formula overlap | Two formulas overlap on the final frame or in two sampled frames |
| Formula off frame | A formula leaves a frame 1.5 times as wide as it is tall |
| Too much text | More than seven formulas and labels are visible at once |

## Tools

```
bun ../scenegen/backend/rescene.ts <videoId> <sceneIndex> [--apply]   # regenerate one scene, keep narration
bun ../scenegen/backend/rescene.ts <videoId> 3 --pending 2=<file> --apply   # change neighbouring scenes together
bun ../scenegen/backend/scan.ts <videoId>                              # run the checks over a saved video
```

`rescene --apply` replaces the scene in the saved video once every later scene still
compiles on top of it; the previous source is kept under `out/visualization-tests/`.
