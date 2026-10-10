import { createAgentSession, DefaultResourceLoader, defineTool, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";
import type { ModelRuntime } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { createModelRuntime } from "./auth.js";
import { agentConfig, AgentError, agentFailure } from "./config.js";
import type { AgentConfig } from "./config.js";

export interface AgentTask {
  systemPrompt: string;
  prompt: string;
  validate?: (output: string) => Promise<void>;
  signal?: AbortSignal;
}
export interface AgentRunner { run(task: AgentTask): Promise<string> }

/** One credential runtime, a fresh conversation for every script or scene. */
export class PiAgentRunner implements AgentRunner {
  private runtime?: Promise<ModelRuntime>;
  constructor(readonly config: AgentConfig = agentConfig(), private runtimeFactory = () => createModelRuntime(config)) {}

  async run(task: AgentTask): Promise<string> {
    const controller = new AbortController();
    const signal = task.signal ? AbortSignal.any([task.signal, controller.signal]) : controller.signal;
    const timeout = setTimeout(() => controller.abort(new AgentError("TIMEOUT", "Agent generation timed out.")), this.config.timeoutMs);
    let session: Awaited<ReturnType<typeof createAgentSession>>["session"] | undefined;
    const abort = () => { void session?.abort(); };
    signal.addEventListener("abort", abort, { once: true });
    try {
      signal.throwIfAborted();
      const runtime = await (this.runtime ??= this.runtimeFactory().catch(error => { this.runtime = undefined; throw error; }));
      const auth = await runtime.getAuth("openai", { signal });
      if (!auth) throw new AgentError("AUTH", "Agent login is missing. Run agents:login.");
      const model = runtime.getModel("openai", this.config.model);
      if (!model) throw new AgentError("MODEL", "AGENT_MODEL is not in the pinned Pi model catalog.");
      const settingsManager = SettingsManager.inMemory({ compaction: { enabled: false }, retry: { enabled: false, provider: { maxRetries: 0 } } });
      const resourceLoader = new DefaultResourceLoader({ cwd: this.config.agentDir, agentDir: this.config.agentDir, settingsManager,
        noExtensions: true, noSkills: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
        systemPrompt: task.systemPrompt, appendSystemPromptOverride: () => [] });
      await resourceLoader.reload();
      const validationTool = defineTool({ name: "validate_output", label: "Validate output",
        description: "Validate your complete proposed output. Fix any reported errors before returning it as your final answer.",
        parameters: Type.Object({ output: Type.String({ maxLength: 256000 }) }),
        async execute(_id, { output }) {
          try { await task.validate!(output); return { content: [{ type: "text", text: "Valid." }], details: {} }; }
          catch (error) { return { content: [{ type: "text", text: error instanceof Error ? error.message : "Invalid output." }], details: {} }; }
        },
      });
      ({ session } = await createAgentSession({ modelRuntime: runtime, model, thinkingLevel: this.config.thinking,
        cwd: this.config.agentDir, agentDir: this.config.agentDir, settingsManager, resourceLoader,
        sessionManager: SessionManager.inMemory(), tools: task.validate ? ["validate_output"] : [],
        customTools: task.validate ? [validationTool] : [] }));
      signal.throwIfAborted();
      let turns = 0;
      session.subscribe(event => { if (event.type === "turn_start" && ++turns > 12) controller.abort(new AgentError("TURN_LIMIT", "Agent exceeded its turn limit.")); });
      let prompt = task.prompt;
      for (let attempt = 0; attempt < 3; attempt++) {
        await session.prompt(prompt);
        signal.throwIfAborted();
        const last = [...session.messages].reverse().find(message => message.role === "assistant");
        if (!last || last.stopReason !== "stop") throw agentFailure(new Error(last?.errorMessage ?? "Incomplete model response"));
        const output = session.getLastAssistantText()?.trim();
        if (!output || output.length > 256000) throw new AgentError("OUTPUT", "The agent returned an empty or oversized result.");
        try { await task.validate?.(output); return output; }
        catch (error) {
          if (attempt === 2) throw new AgentError("VALIDATION", "The agent could not produce valid output after three attempts.");
          prompt = `Correct the previous output. Validation failed: ${error instanceof Error ? error.message : "Invalid output"}. Return only the corrected output.`;
        }
      }
      throw new AgentError("OUTPUT", "The agent did not complete.");
    } catch (error) {
      if (signal.aborted) throw signal.reason instanceof AgentError ? signal.reason : new AgentError("ABORTED", "Agent generation was cancelled.");
      throw agentFailure(error);
    } finally {
      clearTimeout(timeout); signal.removeEventListener("abort", abort); session?.dispose();
    }
  }
}
