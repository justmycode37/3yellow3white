import { expect, test } from 'bun:test'
import { createAgentUsageObserver, emptyTokenUsage, reportedTokenUsage, TokenUsageTracker, withTokenUsage } from '../src/token-usage'
import { SHARED_OWNER, VideoService } from '../src/videos'

test('counts concurrent calls, cached input and retries without double counting final events', async () => {
  const tracker = new TokenUsageTracker(() => {}, { inputTokens: 20, outputTokens: 5, totalTokens: 25, estimatedOutputTokens: 0 })
  const first = withTokenUsage(tracker, createAgentUsageObserver)
  const second = withTokenUsage(tracker, createAgentUsageObserver)
  first({ type: 'message_start', message: { role: 'assistant' } })
  second({ type: 'message_start', message: { role: 'assistant' } })
  first({ type: 'message_update', assistantMessageEvent: { type: 'thinking_delta', delta: 'a'.repeat(40) } })
  second({ type: 'message_update', assistantMessageEvent: { type: 'toolcall_delta', delta: 'a'.repeat(20) } })
  expect(tracker.snapshot().estimatedOutputTokens).toBe(15)
  const end = { type: 'message_end', message: { role: 'assistant', usage: { input: 100, output: 30, cacheRead: 40, cacheWrite: 10, totalTokens: 180 } } }
  first(end); first(end)
  expect(tracker.snapshot()).toEqual({ inputTokens: 170, outputTokens: 35, totalTokens: 205, estimatedOutputTokens: 5 })
  second({ type: 'message_end', message: { role: 'assistant', usage: { input: 0, output: 0 } } })
  expect(tracker.snapshot().estimatedOutputTokens).toBe(5)
  second({ type: 'message_start', message: { role: 'assistant' } })
  second({ type: 'message_end', message: { role: 'assistant', usage: { input: 15, output: 5 } } })
  expect(tracker.snapshot().totalTokens).toBe(225)
  expect(tracker.snapshot().estimatedOutputTokens).toBe(5)
  tracker.flush()
  expect(reportedTokenUsage({ input_tokens: 100, cached_input_tokens: 40, output_tokens: 25, total_tokens: 125 })).toEqual({ inputTokens: 100, outputTokens: 25, totalTokens: 125, estimatedOutputTokens: 0 })
  expect(reportedTokenUsage({ input_tokens: -1, output_tokens: NaN })).toEqual(emptyTokenUsage())
})

test('isolates concurrent videos and ignores untracked agent calls', async () => {
  const first = new TokenUsageTracker(() => {}), second = new TokenUsageTracker(() => {})
  const emit = async () => {
    await Promise.resolve()
    const observer = createAgentUsageObserver()
    observer({ type: 'message_end', message: { role: 'assistant', usage: { input: 4, output: 3 } } })
  }
  await Promise.all([withTokenUsage(first, emit), withTokenUsage(second, emit), emit()])
  expect(first.snapshot().totalTokens).toBe(7)
  expect(second.snapshot().totalTokens).toBe(7)
})

test('live SSE usage arrives before scenes, survives reconnect, and flushes on success or failure', async () => {
  for (const fail of [false, true]) {
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const service = new VideoService(':memory:', async () => {
      const emit = createAgentUsageObserver()
      emit({ type: 'message_start', message: { role: 'assistant' } })
      emit({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'a'.repeat(400) } })
      await gate
      emit({ type: 'message_end', message: { role: 'assistant', usage: { input: 250, output: 110 } } })
      if (fail) throw new Error('Test failure')
      return null
    }, 'pi')
    try {
      const video = service.create(SHARED_OWNER, 'usage', { title: 'Test', topic: 'Explain vectors', documents: [] })
      for (let i = 0; i < 100 && !service.get(video.id, SHARED_OWNER)?.tokenUsage?.estimatedOutputTokens; i++) await Bun.sleep(10)
      const live = service.get(video.id, SHARED_OWNER)!
      expect(live.status).toBe('generating')
      expect(live.scenes).toHaveLength(0)
      expect(live.tokenUsage?.estimatedOutputTokens).toBe(100)
      const reconnect = await service.handle(new Request(`http://localhost/api/videos/${video.id}/events`))
      const reader = reconnect.body!.getReader()
      const snapshot = new TextDecoder().decode((await reader.read()).value)
      expect(snapshot).toContain(JSON.stringify(live.tokenUsage))
      await reader.cancel()
      const events = (await service.handle(new Request(`http://localhost/api/videos/${video.id}/events`))).text()
      release()
      const text = await events
      const completed = service.get(video.id, SHARED_OWNER)!
      expect(completed.status).toBe(fail ? 'failed' : 'complete')
      expect(completed.tokenUsage).toEqual({ inputTokens: 250, outputTokens: 110, totalTokens: 360, estimatedOutputTokens: 0 })
      expect(completed.revision).toBeGreaterThan(live.revision)
      expect(text).toContain(JSON.stringify(completed))
    } finally { release(); await service.close() }
  }
})
