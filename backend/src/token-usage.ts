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
  message?: { role: string; usage?: unknown; stopReason?: string }
  assistantMessageEvent?: { type: string; delta?: string }
}

/** Capture the job's tracker now; SDK callbacks may run from their own async context. */
export function createAgentUsageObserver() {
  const tracker = tracking.getStore()
  let id = crypto.randomUUID(), characters = 0, estimate = 0
  let active = false, requestPending = false, disposed = false, limit = Infinity
  let projectionStarted = 0, projectionBase = 1
  let timer: ReturnType<typeof setInterval> | undefined
  let removeAbortListener: (() => void) | undefined
  const stopRequest = () => {
    active = false
    clearInterval(timer); timer = undefined
    removeAbortListener?.(); removeAbortListener = undefined
    tracker?.flush()
  }
  const reset = () => { id = crypto.randomUUID(); characters = 0; estimate = 0 }
  const updateEstimate = () => {
    if (!tracker || disposed) return
    const now = performance.now()
    // This is a provisional activity estimate, not provider-reported usage. Some
    // reasoning models emit no events until their response is nearly complete.
    // Advance at 20 tokens/second, lifting the projection when visible output is
    // ahead. The model's output limit bounds it; final usage replaces it exactly.
    const projected = active ? Math.floor(projectionBase + (now - projectionStarted) * 20 / 1000) : 0
    const visible = Math.ceil(characters / 4)
    if (active && visible > projected) { projectionBase = visible; projectionStarted = now }
    const next = Math.min(limit, Math.max(estimate, visible, projected))
    if (next === estimate) return
    estimate = next
    tracker.update(id, { ...emptyTokenUsage(), estimatedOutputTokens: estimate })
  }
  const observe = (event: UsageEvent) => {
    if (!tracker || disposed) return
    // A provider's first event may arrive well after its request starts. Keep the
    // request's existing projection when Pi eventually emits message_start.
    if (event.type === 'message_start' && event.message?.role === 'assistant' && !requestPending) reset()
    const delta = event.assistantMessageEvent
    if (event.type === 'message_update' && delta && ['text_delta', 'thinking_delta', 'toolcall_delta'].includes(delta.type) && typeof delta.delta === 'string') {
      characters += delta.delta.length
      updateEstimate()
    }
    if (event.type === 'message_end' && event.message?.role === 'assistant') {
      stopRequest()
      requestPending = false
      const usage = reportedTokenUsage(event.message.usage)
      // Failed/aborted responses can omit usage or return placeholder zeroes;
      // retain their last provisional estimate, but never continue its timer.
      const completed = ['stop', 'toolUse', 'length'].includes(event.message.stopReason ?? '')
      if (usage && (usage.totalTokens > 0 || estimate === 0 || completed)) tracker.update(id, usage, true)
    }
  }
  return Object.assign(observe, {
    startRequest(maxTokens: number, signal?: AbortSignal) {
      stopRequest()
      if (!tracker || disposed || signal?.aborted) return
      reset()
      limit = Math.max(1, count(maxTokens))
      active = true; requestPending = true; projectionStarted = performance.now(); projectionBase = 1
      updateEstimate()
      tracker.flush()
      timer = setInterval(updateEstimate, 500)
      timer.unref?.()
      if (signal) {
        signal.addEventListener('abort', stopRequest, { once: true })
        removeAbortListener = () => signal.removeEventListener('abort', stopRequest)
      }
    },
    stopRequest,
    dispose() { stopRequest(); disposed = true },
  })
}
