import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { ModelRuntime, readStoredCredential } from "@earendil-works/pi-coding-agent";
import { InMemoryCredentialStore } from "@earendil-works/pi-ai";
import type { AgentConfig } from "./config.js";
import { AgentError } from "./config.js";

export const authPath = (config: AgentConfig) => join(config.agentDir, "auth.json");

export function deviceId(config: AgentConfig): string {
  mkdirSync(config.agentDir, { recursive: true, mode: 0o700 });
  const path = join(config.agentDir, "host-id");
  try { writeFileSync(path, randomUUID(), { flag: "wx", mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  const id = readFileSync(path, "utf8").trim();
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) throw new AgentError("CONFIG", "The saved agent host-id is invalid.");
  return id;
}

export async function createModelRuntime(config: AgentConfig, options: { login?: boolean; signal?: AbortSignal } = {}) {
  let credentials: InMemoryCredentialStore | undefined;
  if (config.authMode === "api-key") {
    if (!config.apiKey?.trim()) throw new AgentError("AUTH", "API-key mode requires OPENAI_API_KEY.");
    credentials = new InMemoryCredentialStore();
    await credentials.modify("openai", async () => ({ type: "api_key", key: config.apiKey }));
  } else if (!options.login && readStoredCredential(config.provider, authPath(config))?.type !== "oauth") {
    throw new AgentError("AUTH", `No ${config.provider} subscription login in PI_CODING_AGENT_DIR. Use an existing Pi login or run agents:login with AGENT_PROVIDER=openai.`);
  }
  const runtime = await ModelRuntime.create({ authPath: authPath(config), credentials,
    modelsPath: null, allowModelNetwork: false, refreshOnCreate: false, signal: options.signal });
  const provider = runtime.getProvider(config.provider)!;
  // Explicit mode: subscription runs cannot fall back to an environment API key.
  // API-key runs never read or overwrite the persisted subscription credentials.
  runtime.registerNativeProvider({ ...provider, auth: config.authMode === "subscription" ? { oauth: provider.auth.oauth } : { apiKey: provider.auth.apiKey } });
  return runtime;
}

export async function revokeSubscription(config: AgentConfig, fetcher: typeof fetch = fetch) {
  if (config.provider !== 'openai') throw new AgentError('REVOKE', 'This is a shared Pi login. Manage its registration through Pi or ChatGPT Settings; Aha will not delete it.');
  const credential = readStoredCredential("openai", authPath(config));
  if (!credential) return false;
  if (credential.type !== "oauth" || typeof credential.clientId !== "string") throw new AgentError("AUTH", "No current OpenAI subscription registration is stored here. Disconnect legacy logins through account settings.");
  const discovery = await fetcher("https://auth.openai.com/.well-known/openid-configuration", { signal: AbortSignal.timeout(15_000) });
  if (!discovery.ok) throw new AgentError("REVOKE", "Could not discover the revocation endpoint. Credentials were retained; disconnect the app in ChatGPT Settings.");
  const { revocation_endpoint } = await discovery.json() as { revocation_endpoint?: string };
  if (!revocation_endpoint || new URL(revocation_endpoint).origin !== "https://auth.openai.com") throw new AgentError("REVOKE", "Unexpected revocation endpoint. Disconnect the app in ChatGPT Settings.");
  const response = await fetcher(revocation_endpoint, { method: "POST", signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: credential.refresh, token_type_hint: "refresh_token", client_id: credential.clientId }) });
  if (response.status !== 200) throw new AgentError("REVOKE", "Remote revocation was not confirmed. Credentials were retained; disconnect the app in ChatGPT Settings.");
  const runtime = await createModelRuntime({ ...config, authMode: "subscription" }, { login: true });
  await runtime.logout("openai");
  return true;
}
