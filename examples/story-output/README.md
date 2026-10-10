# Astra scene scripts with brief context

[`weighted-average-story.zip`](weighted-average-story.zip) was generated and separately reviewed by `gpt-6-astra` through the local Codex provider using the updated guidance on 2026-10-10. It is an internal backend handoff to the next agent layer.

The ZIP contains **exactly five files**: `scene-01.md` through `scene-05.md`, at its root. Each has a brief **Context (not spoken)** section followed by a **Script** section of finished spoken sentences and optional pause markers. The four context entries cover the overall goal, what came before, this scene's contribution, and what comes after. They are mandatory for every generation, as specified in [`guidance.md`](../../backend/prompts/guidance.md).

Neither context nor script contains visual instructions. There are no additional archive entries: no JSON, manifests, source files, reviews, or other files. The ZIP reader separates context from narration so context does not enter speech or timing.

- Title: Why Two Percentages Don't Always Average
- Requested duration: 180 seconds
- Planning estimate: 173.6 seconds, including 377 spoken words and pauses of 7 and 5 seconds
- Archive size: 3,172 bytes
- SHA-256: `7f2cdb89cf9ad9e8ad4106b7700e66c2456f3ab1712353655fa53b0c512cfda4`

Open [`weighted-average/scene-01.md`](weighted-average/scene-01.md) or [`weighted-average/scene-02.md`](weighted-average/scene-02.md) for a preview. These extracted files match the ZIP exactly. The ordered script sections form the complete narration.

The [request](../story-requests/weighted-average.json) and [backend contract](../../docs/story-orchestration.md) are repository documentation outside the ZIP. Integrity, exact membership, required scene context, narration separation, and next-layer consumption were verified. The sample passed the first draft and separate Astra review; its arithmetic and neighboring scene connections were also checked during implementation. Duration remains a planning estimate until speech synthesis supplies measured audio timing.
