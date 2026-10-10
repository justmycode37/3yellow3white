export const STORY_MODEL = "gpt-6-astra";
export const STORY_VERSION = 3;

export interface StoryRequest {
  prompt: string;
  sourceMaterial: string;
  audience: string;
  language: string;
  durationSec: number;
}
export interface StoryBlock {
  id: string;
  kind: "speech" | "pause";
  role: "narration" | "invitation" | "hint" | "reveal" | "credit" | "silence";
  text: string;
  seconds: number;
  invitesPause: boolean;
}
export interface StoryScene {
  id: string;
  title: string;
  context: { before: string; purpose: string; after: string };
  blocks: StoryBlock[];
}
export interface Story {
  schemaVersion: 3;
  title: string;
  goal: string;
  scenes: StoryScene[];
}
export interface StoryReview {
  verdict: "pass" | "revise";
  summary: string;
  issues: { severity: "error" | "warning"; sceneId: string | null; detail: string }[];
  factualChecks: string[];
}
export interface StoryImage { label: string; base64: string }
export interface ModelMessage { role: "system" | "user" | "assistant"; content: string; images?: StoryImage[] }
export interface ModelResult {
  value: unknown;
  model: string;
  provider: string;
  responseId?: string;
  usage?: unknown;
}
export interface StoryProvider {
  name: string;
  model: string;
  reasoningEffort: string;
  generate(messages: ModelMessage[], schema: Record<string, unknown>, name: string, signal?: AbortSignal): Promise<ModelResult>;
}
export type StoryStatus = "queued" | "generating" | "reviewing" | "repairing" | "packaging" | "complete" | "failed" | "interrupted";
export interface StoryJob {
  id: string;
  owner: string;
  status: StoryStatus;
  createdAt: string;
  updatedAt: string;
  model: string;
  attempt: number;
  title?: string;
  sceneCount?: number;
  estimatedDurationSec?: number;
  zipSha256?: string;
  error?: { code: string; message: string; retryable: boolean };
}
export class StoryError extends Error {
  constructor(public code: string, message: string, public status = 422, public retryable = false) { super(message); }
}
export function safeStoryError(error: unknown): StoryError {
  return error instanceof StoryError ? error : new StoryError("STORY_FAILED", "Story generation failed. Check the server configuration and retry.", 500, true);
}
