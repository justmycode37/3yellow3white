import { createInterface } from "node:readline/promises";
import { readStoredCredential } from "@earendil-works/pi-coding-agent";
import { authPath, createModelRuntime, deviceId, revokeSubscription } from "./auth.js";
import { agentConfig, AgentError, agentFailure } from "./config.js";
import { PiAgentRunner } from "./runtime.js";

async function main() {
  const config = agentConfig();
  const command = process.argv[2] ?? "status";
  if (command === "login") {
    if (config.authMode !== "subscription") throw new AgentError("CONFIG", "Set AGENT_AUTH_MODE=subscription to log in. API-key mode uses OPENAI_API_KEY directly.");
    if (readStoredCredential("openai", authPath(config))) throw new AgentError("LOGIN", "A login is already saved. Stop the backend and run agents:logout before replacing its registration.");
    if (!process.stdin.isTTY) throw new AgentError("LOGIN", "Run agents:login in an interactive terminal (docker compose exec without -T on the server).");
    const id = deviceId(config);
    const runtime = await createModelRuntime(config, { login: true });
    const terminal = createInterface({ input: process.stdin, output: process.stdout });
    const controller = new AbortController();
    const interrupt = () => controller.abort();
    terminal.on("SIGINT", interrupt);
    try {
      await runtime.login("openai", "oauth", {
        signal: controller.signal,
        notify(event) {
          if (event.type === "auth_url") console.log(`Open this URL in your browser:\n${event.url}\n${event.instructions ?? ""}`);
          else if (event.type === "device_code") console.log(`${event.verificationUri}\nCode: ${event.userCode}`);
          else console.log(event.message);
        },
        async prompt(prompt) {
          if (prompt.type === "select") {
            console.log(prompt.options.map((option, index) => `${index + 1}. ${option.label}`).join("\n"));
            const value = await terminal.question(`${prompt.message}: `, { signal: prompt.signal ?? controller.signal });
            const selected = prompt.options[Number(value) - 1];
            if (!selected) throw new AgentError("LOGIN", "Invalid login option.");
            return selected.id;
          }
          return terminal.question(`${prompt.message}\n> `, { signal: prompt.signal ?? controller.signal });
        },
      }, { getDeviceId: () => id, agentName: `Aha Demo ${id.slice(0, 8)}` });
      console.log(`Subscription login saved. Run npm run agents:check to verify inference. Find Aha Demo ${id.slice(0, 8)} in ChatGPT Settings to disconnect it remotely.`);
    } finally { terminal.close(); }
  } else if (command === "status") {
    const stored = readStoredCredential("openai", authPath(config));
    console.log(JSON.stringify({ mode: config.authMode, provider: "openai", model: config.model,
      configured: config.authMode === "api-key" ? Boolean(config.apiKey?.trim()) : stored?.type === "oauth",
      credentialDirectory: config.agentDir, note: "Local configuration only; agents:check verifies inference." }, null, 2));
  } else if (command === "check") {
    const output = await new PiAgentRunner(config).run({ systemPrompt: "Reply with exactly OK.", prompt: "Connection check. Reply OK.",
      validate: async output => { if (output !== "OK") throw new Error("Reply with exactly OK."); } });
    console.log(`${output}: ${config.authMode} authentication and openai/${config.model} inference succeeded.`);
  } else if (command === "logout") {
    try {
      const revoked = await revokeSubscription(config);
      console.log(revoked ? "Remote session revocation confirmed; local subscription credentials removed. Host identity retained." : "No saved subscription login in this directory.");
    } catch {
      throw new AgentError("REVOKE", "Logout could not be fully confirmed. Disconnect the Aha Demo registration in ChatGPT Settings; do not rely on local credential deletion.");
    }
  } else throw new AgentError("COMMAND", "Use login, status, check, or logout.");
}

if (import.meta.main) main().catch(error => { const failure = agentFailure(error); console.error(`${failure.code}: ${failure.message}`); process.exitCode = 1; });
