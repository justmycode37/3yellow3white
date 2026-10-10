import { AsyncLocalStorage } from 'node:async_hooks'
import type { VideoTokenUsage } from '../../shared/video/contract'

export const emptyTokenUsage = (): VideoTokenUsage => ({ inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedOutputTokens: 0 })
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0

/** OpenAI input already includes cached input; Pi reports cache reads/writes separately. */
export function reportedTokenUsage(value: unknown): VideoTokenUsage | undefined {
  if (!value || typeof value !== 'object') return undefined
  const usage = value as Record<string, unknown>
  if (!('input' in usage || 'input_tokens' in usage || 'output_tokens' in usage)) return undefined
  const inputTokens = 'input_tokens' in usage ? count(usage.input_tokens) : count(usage.input) + count(usage.cacheRead) + count(usage.cacheWrite)
  const outputTokens = count(usage.output_tokens ?? usage.output)
  return { inputTokens, outputTokens, totalTokens: Math.max(inputTokens + outputTokens, count(usage.total_tokens ?? usage.totalTokens)), estimatedOutputTokens: 0 }
}

/** Per-video totals across concurrent model calls, tool turns and retries. */
export class TokenUsageTracker {
  private responses = new Map<string, VideoTokenUsage>()
  private timer?: ReturnType<typeof setTimeout>
  private dirty = false
  private lastSent = 0
  constructor(private publish: (usage: VideoTokenUsage) => void, private initial = emptyTokenUsage()) {}
  snapshot(): VideoTokenUsage {
    const total = { ...this.initial }
    for (const usage of this.responses.values()) {
      total.inputTokens += usage.inputTokens
      total.outputTokens += usage.outputTokens
      total.totalTokens += usage.totalTokens
      total.estimatedOutputTokens += usage.estimatedOutputTokens
    }
    return total
  }
  update(id: string, usage: VideoTokenUsage, confirmed = false) {
    this.responses.set(id, { ...usage })
    this.dirty = true
    if (confirmed || Date.now() - this.lastSent >= 250) this.flush()
    else this.timer ??= setTimeout(() => this.flush(), 250)
  }
  flush() {
    clearTimeout(this.timer); this.timer = undefined
    if (!this.dirty) return
    this.dirty = false; this.lastSent = Date.now()
    this.publish(this.snapshot())
  }
}

const tracking = new AsyncLocalStorage<TokenUsageTracker>()
export const withTokenUsage = <T>(tracker: TokenUsageTracker, run: () => T): T => tracking.run(tracker, run)

interface UsageEvent {
  type: string
  message?: { role: string; usage?: unknown }
  assistantMessageEvent?: { type: string; delta?: string }
}

/** Capture the job's tracker now; SDK callbacks may run from their own async context. */
export function createAgentUsageObserver() {
  const tracker = tracking.getStore()
  let id = crypto.randomUUID(), characters = 0
  return (event: UsageEvent) => {
    if (!tracker) return
    if (event.type === 'message_start' && event.message?.role === 'assistant') {
      id = crypto.randomUUID(); characters = 0
    }
    const delta = event.assistantMessageEvent
    if (event.type === 'message_update' && delta && ['text_delta', 'thinking_delta', 'toolcall_delta'].includes(delta.type) && typeof delta.delta === 'string') {
      characters += delta.delta.length
      // Visible output is only an estimate; hidden reasoning/input arrives in final usage.
      tracker.update(id, { ...emptyTokenUsage(), estimatedOutputTokens: Math.ceil(characters / 4) })
    }
    if (event.type === 'message_end' && event.message?.role === 'assistant') {
      const usage = reportedTokenUsage(event.message.usage)
      // Failed/aborted responses can omit usage: retain their estimate instead of erasing it.
      if (usage && (usage.totalTokens > 0 || characters === 0)) tracker.update(id, usage, true)
    }
  }
}
