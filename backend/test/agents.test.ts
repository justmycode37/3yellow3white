import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import type { AssistantMessage, Context } from "@earendil-works/pi-ai";
import { compileSource } from "animlib/core";
import { agentConfig, AgentError } from "../src/agents/config.js";
import { authPath, createModelRuntime, deviceId, revokeSubscription } from "../src/agents/auth.js";
import { PiAgentRunner } from "../src/agents/runtime.js";
import type { AgentTask } from "../src/agents/runtime.js";
import { createPiGenerator } from "../src/agents/generator.js";
import { NarrationService } from "../src/narration/service.js";
import { settingsFromEnv } from "../src/narration/elevenlabs.js";
import { VideoService } from "../src/videos.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function config() {
  const root = await mkdtemp(join(tmpdir(), "aha-agents-")); roots.push(root);
  return agentConfig({ PI_CODING_AGENT_DIR: root, AGENT_DATA_DIR: join(root, "jobs"), AGENT_AUTH_MODE: "api-key", OPENAI_API_KEY: "test-api-key" });
}
const oauth = { type: "oauth", access: "test-subscription-token", refresh: "test-refresh-token", expires: Date.now() + 3600_000, clientId: "test-client" };

test("auth mode is explicit: subscription requires OAuth and API-key mode ignores saved OAuth", async () => {
  const settings = await config();
  await expect(createModelRuntime({ ...settings, authMode: "subscription" })).rejects.toMatchObject({ code: "AUTH" });
  await writeFile(authPath(settings), JSON.stringify({ openai: oauth }));
  const api = await createModelRuntime(settings);
  expect((await api.getAuth("openai"))?.auth.apiKey).toBe("test-api-key");
  expect(api.getProvider("openai")!.auth.oauth).toBeUndefined();
  const subscription = await createModelRuntime({ ...settings, authMode: "subscription" });
  expect((await subscription.getAuth("openai"))?.auth.apiKey).toBe("test-subscription-token");
  expect(subscription.getProvider("openai")!.auth.apiKey).toBeUndefined();
  expect(JSON.parse(await readFile(authPath(settings), "utf8")).openai).toEqual(oauth);
  await expect(createModelRuntime({ ...settings, apiKey: undefined })).rejects.toMatchObject({ code: "AUTH" });
});

test("each installation retains a stable host identity", async () => {
  const first = await config(), second = await config();
  expect(deviceId(first)).toBe(deviceId(first));
  expect(deviceId(first)).not.toBe(deviceId(second));
});

test("logout revokes at the provider before removing local credentials and retains them on failure", async () => {
  const settings = await config();
  await writeFile(authPath(settings), JSON.stringify({ openai: oauth }));
  const calls: { url: string; options?: RequestInit }[] = [];
  const fetcher = (async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("openid-configuration")) return Response.json({ revocation_endpoint: "https://auth.openai.com/oauth/revoke" });
    expect(JSON.parse(await readFile(authPath(settings), "utf8")).openai).toEqual(oauth);
    return new Response(null, { status: 503 });
  }) as typeof fetch;
  await expect(revokeSubscription(settings, fetcher)).rejects.toMatchObject({ code: "REVOKE" });
  expect(JSON.parse(await readFile(authPath(settings), "utf8")).openai).toEqual(oauth);
  const body = calls[1].options!.body as URLSearchParams;
  expect(body.get("token")).toBe("test-refresh-token");
  expect(body.get("client_id")).toBe("test-client");
  expect(calls[1].url).not.toContain("test-refresh-token");
  const success = (async (url, options) => options?.method === "POST" ? new Response(null, { status: 200 }) : fetcher(url, options)) as typeof fetch;
  expect(await revokeSubscription(settings, success)).toBe(true);
  expect(JSON.parse(await readFile(authPath(settings), "utf8")).openai).toBeUndefined();
});

function message(text: string, stopReason: AssistantMessage["stopReason"] = "stop"): AssistantMessage {
  return { role: "assistant", content: [{ type: "text", text }], provider: "openai", api: "openai-responses", model: "gpt-5.4",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason, timestamp: Date.now(), ...(stopReason === "error" ? { errorMessage: "401 sensitive-provider-detail" } : {}) };
}
async function fakeRuntime(outputs: AssistantMessage[]) {
  const settings = await config();
  const runtime = await createModelRuntime(settings);
  const contexts: Context[] = [];
  runtime.streamSimple = (_model, context, options) => {
    contexts.push(structuredClone(context));
    const stream = createAssistantMessageEventStream();
    const reply = options?.signal?.aborted ? message("", "aborted") : outputs.shift() ?? message("Unexpected call", "error");
    queueMicrotask(() => {
      stream.push({ type: "start", partial: reply });
      if (reply.stopReason === "error" || reply.stopReason === "aborted") stream.push({ type: "error", reason: reply.stopReason, error: reply });
      else if (reply.stopReason !== "pending") stream.push({ type: "done", reason: reply.stopReason, message: reply });
    });
    return stream;
  };
  return { settings, runtime, contexts, runner: new PiAgentRunner(settings, async () => runtime) };
}

test("real Pi sessions expose only validation and correct invalid final output", async () => {
  const { runner, contexts, settings } = await fakeRuntime([message("bad"), message("valid"), message("separate")]);
  await writeFile(join(settings.agentDir, "AGENTS.md"), "UNTRUSTED_LOCAL_INSTRUCTION");
  await writeFile(join(settings.agentDir, "APPEND_SYSTEM.md"), "UNTRUSTED_APPEND");
  const result = await runner.run({ systemPrompt: "Host instructions", prompt: "Generate", validate: async output => {
    if (output !== "valid") throw new Error("Use valid output");
  } });
  expect(result).toBe("valid");
  expect(contexts).toHaveLength(2);
  const toolNames = (context: Context) => context.messages.flatMap(message => message.role === "system" ? (message.toolsAdded ?? []).map(tool => tool.name) : []);
  expect(toolNames(contexts[0])).toEqual(["validate_output"]);
  expect(JSON.stringify(contexts[0])).not.toContain("UNTRUSTED_");
  expect(JSON.stringify(contexts[1])).toContain("Use valid output");
  expect(await runner.run({ systemPrompt: "Other task", prompt: "New task" })).toBe("separate");
  expect(toolNames(contexts[2])).toHaveLength(0);
  expect(JSON.stringify(contexts[2])).not.toContain("Use valid output");
});

test("Pi executes the validation tool and returns its result to the model", async () => {
  const call = message("", "toolUse");
  call.content = [{ type: "toolCall", id: "validate-1", name: "validate_output", arguments: { output: "candidate" } }];
  const { runner, contexts } = await fakeRuntime([call, message("final")]);
  const checked: string[] = [];
  expect(await runner.run({ systemPrompt: "Write", prompt: "Generate", validate: async output => { checked.push(output); } })).toBe("final");
  expect(checked).toEqual(["candidate", "final"]);
  expect(contexts[1].messages.some(message => message.role === "toolResult" && message.toolName === "validate_output")).toBe(true);
});

test("partial provider failures cannot be accepted as a successful script or leak provider details", async () => {
  const { runner } = await fakeRuntime([message("partial content", "error")]);
  const error = await runner.run({ systemPrompt: "Write", prompt: "Generate" }).catch(error => error);
  expect(error).toBeInstanceOf(AgentError);
  expect(error.code).toBe("AUTH");
  expect(error.message).not.toContain("sensitive-provider-detail");
});

test("repeated tool calls stop at the agent turn limit", async () => {
  const calls = Array.from({ length: 20 }, (_, index) => {
    const call = message("", "toolUse");
    call.content = [{ type: "toolCall", id: `validate-${index}`, name: "validate_output", arguments: { output: "candidate" } }];
    return call;
  });
  const { runner, contexts } = await fakeRuntime(calls);
  await expect(runner.run({ systemPrompt: "Write", prompt: "Generate", validate: async () => {} })).rejects.toMatchObject({ code: "TURN_LIMIT" });
  expect(contexts.length).toBeLessThanOrEqual(13);
});

test("cancelling a running Pi request stops generation", async () => {
  const { runner, runtime } = await fakeRuntime([]);
  let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  runtime.streamSimple = (_model, _context, options) => {
    const stream = createAssistantMessageEventStream();
    const abort = () => stream.push({ type: "error", reason: "aborted", error: message("", "aborted") });
    options!.signal!.addEventListener("abort", abort, { once: true });
    started(); return stream;
  };
  const controller = new AbortController();
  const result = runner.run({ systemPrompt: "Write", prompt: "Generate", signal: controller.signal });
  await ready; controller.abort();
  await expect(result).rejects.toMatchObject({ code: "ABORTED" });
});

test("the video pipeline preserves narration audio IDs and reuses completed script, speech and scenes", async () => {
  const settings = await config();
  const script = "# Counting\n\n## Beat 1\n\nNarration: One dot.\n\n## Beat 2\n\nNarration: Another dot.";
  let speechCalls = 0, agentCalls = 0;
  const narration = new NarrationService({ root: join(settings.agentDir, "narration"), provider: {
    settings: settingsFromEnv({ ELEVENLABS_VOICE_ID: "test" }),
    async synthesize({ text }) {
      speechCalls++;
      const characters = Array.from(text);
      return { pcm: new Uint8Array(48_000), normalizedAlignment: { characters,
        character_start_times_seconds: characters.map((_, i) => i * 0.01), character_end_times_seconds: characters.map((_, i) => (i + 1) * 0.01) } };
    },
  } });
  const tasks: AgentTask[] = [];
  const runner = { async run(task: AgentTask) {
    agentCalls++; tasks.push(task);
    if (task.prompt.startsWith("Write")) { await task.validate!(script); return script; }
    const packet = JSON.parse(task.prompt.slice(task.prompt.indexOf("\n") + 1));
    const source = `export default scene({audio:${JSON.stringify(packet.audioAssetId)},end:${JSON.stringify(packet.endMode)}},s=>{s.circle('dot');s.wait(${packet.scene.durationSec});});`;
    await task.validate!(source); return source;
  } };
  const generate = createPiGenerator(runner, narration, settings.dataDir);
  const service = new VideoService(join(settings.agentDir, "videos.sqlite"), generate, "pi");
  try {
    const request = { title: "Counting", topic: "Dots", documents: [] };
    const created = service.create("user:demo", "one", request);
    for (let i = 0; i < 200 && service.get(created.id, "user:demo")?.status !== "complete"; i++) await Bun.sleep(10);
    const video = service.get(created.id, "user:demo")!;
    expect(video.status).toBe("complete");
    expect(video.provider).toBe("pi");
    expect(video.scenes).toHaveLength(2);
    for (const scene of video.scenes) {
      expect((await compileSource(scene.source)).options.audio).toBe(scene.audio.id);
      const audio = await service.handle(new Request(`http://localhost${scene.audio.url}`, { headers: { "x-user-id": "demo" } }));
      expect(audio.status).toBe(200);
      expect((await audio.arrayBuffer()).byteLength).toBe(48044);
    }
    expect(agentCalls).toBe(3); expect(speechCalls).toBe(2);
    expect(tasks[2].prompt).toContain('"previousFrame"');
    // Recreate the generator and request a previously completed stage, as after a crash before publication.
    const reopened = createPiGenerator(runner, narration, settings.dataDir);
    const result = await reopened(request, 0, { videoId: video.id, owner: "user:demo", signal: new AbortController().signal });
    expect(result?.scene.source).toBe(video.scenes[0].source);
    expect(agentCalls).toBe(3); expect(speechCalls).toBe(2);
  } finally { await service.close(); await narration.idle(); }
});
