import { homedir } from "node:os";
import { resolve, join } from "node:path";

export class AgentError extends Error {
  constructor(public code: string, message: string, public diagnostics: {
    retryable?: boolean;
    reason?: 'network' | 'server' | 'rate_limit' | 'quota' | 'incomplete' | 'unknown';
    httpStatus?: number;
  } = {}) { super(message); this.name = "AgentError"; }
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
  const detail = error && typeof error === 'object' ? error as { message?: unknown; status?: unknown; statusCode?: unknown; code?: unknown } : {};
  const message = typeof detail.message === 'string' ? detail.message : "";
  const status = detail.status ?? detail.statusCode;
  // Keep only an HTTP status, never the provider's raw body, headers, or message.
  const parsedStatus = typeof status === 'number' ? status : Number(/\b([45]\d{2})\b/.exec(message)?.[1]);
  const httpStatus = Number.isInteger(parsedStatus) && parsedStatus >= 400 && parsedStatus <= 599 ? parsedStatus : undefined;
  if (/model.*(?:not supported|does not exist|not found|unavailable)/i.test(message)) return new AgentError("MODEL", "AGENT_MODEL is unavailable for this account. Select a supported model and run agents:check.", { httpStatus });
  if (httpStatus === 401 || httpStatus === 403 || /unauthorized|\bauth\b|\boauth\b|authentication|credential|invalid.grant|invalid (?:api key|token)|revoked/i.test(message)) return new AgentError("AUTH", "Agent authentication failed. Stop the backend, run agents:logout then agents:login, or check the API key if using API-key mode.", { httpStatus });
  if (/quota|usage.limit|usage.not.included|billing|credit.balance/i.test(message)) return new AgentError("LIMIT", "The model usage limit was reached. Check your account allowance before retrying.", { reason: 'quota', httpStatus });
  if (httpStatus === 429 || /rate.limit|too many requests/i.test(message)) return new AgentError("LIMIT", "The provider is busy. Retry after a short wait.", { retryable: true, reason: 'rate_limit', httpStatus });
  let reason: AgentError['diagnostics']['reason'] = 'unknown';
  if (httpStatus === undefined || httpStatus === 408 || httpStatus >= 500) {
    if (httpStatus === 408 || /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|UND_ERR_(?:CONNECT_TIMEOUT|HEADERS_TIMEOUT|SOCKET)/.test(String(detail.code))
      || /fetch failed|failed to fetch|network|socket|connection (?:reset|closed|terminated|refused|lost)|timed?\s*out|terminated|upstream connect/i.test(message)) reason = 'network';
    else if ((httpStatus !== undefined && [500, 502, 503, 504, 520, 524].includes(httpStatus))
      || /overloaded|server.busy|service.unavailable|server.error|internal.server.error|usage.unavailable|user.unavailable/i.test(message)) reason = 'server';
    else if (/Incomplete model response|stream ended (?:without|before)|stream closed before|no response body/i.test(message)) reason = 'incomplete';
  }
  return new AgentError("PROVIDER", "The agent request failed. Check agents:check and retry the job.", { retryable: reason !== 'unknown', reason, httpStatus });
}
