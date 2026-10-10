import { homedir } from "node:os";
import { resolve, join } from "node:path";

export class AgentError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = "AgentError"; }
}

export function agentConfig(env: Record<string, string | undefined> = process.env) {
  const authMode = env.AGENT_AUTH_MODE ?? "subscription";
  if (authMode !== "subscription" && authMode !== "api-key") throw new AgentError("CONFIG", "AGENT_AUTH_MODE must be subscription or api-key.");
  const provider = env.AGENT_PROVIDER ?? 'openai';
  if (provider !== 'openai' && provider !== 'openai-codex') throw new AgentError('CONFIG', 'AGENT_PROVIDER must be openai or openai-codex.');
  if (provider === 'openai-codex' && authMode !== 'subscription') throw new AgentError('CONFIG', 'Existing Pi openai-codex credentials require subscription mode.');
  const thinking = env.AGENT_THINKING ?? "high";
  if (!["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(thinking)) throw new AgentError("CONFIG", "Invalid AGENT_THINKING level.");
  const sceneOutputMode = env.AGENT_SCENE_OUTPUT_MODE ?? 'text';
  if (sceneOutputMode !== 'text' && sceneOutputMode !== 'validated-reference') throw new AgentError('CONFIG', 'AGENT_SCENE_OUTPUT_MODE must be text or validated-reference.');
  const sceneTimingMode = env.AGENT_SCENE_TIMING_MODE ?? 'inline';
  if (sceneTimingMode !== 'inline' && sceneTimingMode !== 'host') throw new AgentError('CONFIG', 'AGENT_SCENE_TIMING_MODE must be inline or host.');
  return {
    authMode,
    provider,
    agentDir: resolve(env.PI_CODING_AGENT_DIR ?? join(homedir(), ".aha", "pi")),
    dataDir: resolve(env.AGENT_DATA_DIR ?? "data/agents"),
    model: env.AGENT_MODEL ?? "gpt-6-astra",
    thinking: thinking as "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max",
    sceneOutputMode: sceneOutputMode as 'text' | 'validated-reference',
    sceneTimingMode: sceneTimingMode as 'inline' | 'host',
    apiKey: env.OPENAI_API_KEY,
  };
}
export type AgentConfig = ReturnType<typeof agentConfig>;

/** Provider errors may contain request headers or document content. Only expose fixed messages. */
export function agentFailure(error: unknown): AgentError {
  if (error instanceof AgentError) return error;
  const message = error instanceof Error ? error.message : "";
  if (/model.*(?:not supported|does not exist|not found|unavailable)/i.test(message)) return new AgentError("MODEL", "AGENT_MODEL is unavailable for this account. Select a supported model and run agents:check.");
  if (/401|403|auth|credential|invalid.grant|revoked/i.test(message)) return new AgentError("AUTH", "Agent authentication failed. Stop the backend, run agents:logout then agents:login, or check the API key if using API-key mode.");
  if (/429|quota|usage.limit|usage.unavailable|rate.limit/i.test(message)) return new AgentError("LIMIT", "The model usage limit was reached. Check your account allowance before retrying.");
  return new AgentError("PROVIDER", "The agent request failed. Check agents:check and retry the job.");
}
