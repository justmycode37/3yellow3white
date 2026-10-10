import type { Story, StoryRequest, StoryReview } from "../src/story/types.js";

export const storyRequest: StoryRequest = { prompt: "Explain why combining pass rates requires counting students.", sourceMaterial: "Class A: 9/10 pass. Class B: 15/30 pass. Combined: 24/40 = 60%.", audience: "Newcomer", language: "English", durationSec: 40 };
export function fixtureStory(): Story {
  return {
    schemaVersion: 3, title: "Two classes, one rate",
    goal: "Understand why combining percentages requires weighting by group size.",
    scenes: [
      { id: "scene-01", title: "The tempting shortcut", context: { before: "The video opens with basic percentages as the starting knowledge.", purpose: "Introduce unequal class sizes and invite the learner to combine student counts.", after: "Resolve the question by counting each student equally instead of each class." }, blocks: [
        { id: "scene-01-b01", kind: "speech", role: "narration", text: "Nine out of ten students pass in one class. In another class, fifteen out of thirty pass. Those rates are ninety percent and fifty percent. But the second class has three times as many students.", seconds: 0, invitesPause: false },
        { id: "scene-01-b02", kind: "speech", role: "invitation", text: "What fraction of all the students passed? Take a moment to combine the counts.", seconds: 0, invitesPause: true },
        { id: "scene-01-b03", kind: "pause", role: "silence", text: "", seconds: 5, invitesPause: false },
      ] },
      { id: "scene-02", title: "Count students, not classes", context: { before: "Two class rates and their different sizes led to a question about the combined count.", purpose: "Calculate the combined rate and explain why the unweighted average is misleading.", after: "Conclude the video with the principle that each student counts once." }, blocks: [
        { id: "scene-02-b01", kind: "speech", role: "reveal", text: "Twenty-four out of forty students passed: sixty percent. Each student counts once. Averaging the two percentages would give both classes equal influence, even though one contains three times as many students.", seconds: 0, invitesPause: false },
      ] },
    ],
  };
}
export const passingReview: StoryReview = { verdict: "pass", summary: "The narration explains the counts and pauses before the answer.", issues: [], factualChecks: ["9 + 15 = 24; 10 + 30 = 40; 24/40 = 60%."] };
