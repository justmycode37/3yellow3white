import Ajv from "ajv";
import { StoryError } from "./types.js";
import type { Story, StoryRequest, StoryReview } from "./types.js";

const text = (maxLength = 1200, minLength = 1) => ({ type: "string", minLength, maxLength });
const list = (items: object, minItems = 0, maxItems = 20) => ({ type: "array", items, minItems, maxItems });
const obj = (properties: Record<string, object>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const id = { type: "string", pattern: "^[a-z][a-z0-9-]{0,39}$" };

export const storySchema = obj({
  schemaVersion: { type: "integer", const: 3 },
  title: text(140), goal: text(260),
  scenes: list(obj({
    id, title: text(100),
    context: obj({ before: text(260), purpose: text(260), after: text(260) }),
    blocks: list(obj({
      id,
      kind: { type: "string", enum: ["speech", "pause"] },
      role: { type: "string", enum: ["narration", "invitation", "hint", "reveal", "credit", "silence"] },
      text: text(2500, 0), seconds: { type: "number", minimum: 0, maximum: 30 },
      invitesPause: { type: "boolean" },
    }), 1, 24),
  }), 1, 24),
});

export const reviewSchema = obj({
  verdict: { type: "string", enum: ["pass", "revise"] }, summary: text(700),
  issues: list(obj({ severity: { type: "string", enum: ["error", "warning"] }, sceneId: { type: ["string", "null"] }, detail: text(700) }), 0, 12),
  factualChecks: list(text(500), 1, 12),
});
const ajv = new Ajv({ allErrors: true, strict: true });
const validate = ajv.compile<Story>(storySchema);
const validateReview = ajv.compile<StoryReview>(reviewSchema);

export function readStory(value: unknown): Story {
  if (!validate(value)) throw new StoryError("STORY_SCHEMA", `Invalid story: ${ajv.errorsText(validate.errors, { separator: "; " }).slice(0, 3500)}`);
  return value as Story;
}
export function readReview(value: unknown): StoryReview {
  if (!validateReview(value)) throw new StoryError("REVIEW_SCHEMA", "Astra returned an invalid quality review.", 502, true);
  const review = value as StoryReview;
  if (review.verdict === "pass" && review.issues.some(i => i.severity === "error")) throw new StoryError("REVIEW_SCHEMA", "The quality review contradicts its findings.", 502, true);
  return review;
}

export function readStoryRequest(value: unknown): StoryRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new StoryError("REQUEST", "Send a JSON object.", 400);
  const v = value as Record<string, unknown>;
  const allowed = ["prompt", "sourceMaterial", "audience", "language", "durationSec"];
  if (Object.keys(v).some(k => !allowed.includes(k))) throw new StoryError("REQUEST", `Allowed fields: ${allowed.join(", ")}.`, 400);
  function field(key: string, fallback: string, max: number): string {
    const raw = v[key] ?? fallback;
    if (typeof raw !== "string" || raw.length > max || /\u0000/.test(raw)) throw new StoryError("REQUEST", `${key} must be a string of at most ${max} characters.`, 400);
    return raw.trim();
  }
  const request = {
    prompt: field("prompt", "", 12_000), sourceMaterial: field("sourceMaterial", "", 60_000),
    audience: field("audience", "Curious newcomer", 250), language: field("language", "English", 80),
    durationSec: v.durationSec ?? 180,
  };
  if (!request.prompt || !request.audience || !request.language) throw new StoryError("REQUEST", "Provide a prompt, audience, and language (or omit the latter two for defaults).", 400);
  if (typeof request.durationSec !== "number" || !Number.isFinite(request.durationSec) || request.durationSec < 30 || request.durationSec > 600) throw new StoryError("REQUEST", "durationSec must be between 30 and 600 seconds.", 400);
  return request as StoryRequest;
}
