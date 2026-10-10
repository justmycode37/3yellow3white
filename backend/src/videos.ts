import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { SceneSequence } from 'animlib/core'
import type { Frame } from 'animlib/core'
import type { VideoManifest, VideoRequest, VideoScene } from '../../shared/video/contract'
import { StoryError } from './story/types.js'
import { readWorkspaceRequest } from './story/workspace.js'
import type { WorkspaceRequest, WorkspacePipeline, StoryHandoff } from './story/workspace.js'
import { AgentError } from './agents/config.js'

type Row = { id: string; owner: string; request: string; manifest: string }
export interface GenerationContext { videoId: string; owner: string; previousFrame?: Frame; signal: AbortSignal }
export type Generator = (request: VideoRequest, index: number, context?: GenerationContext) => Promise<{ scene: Omit<VideoScene, 'audio'> & { audio?: { id: string } }; audio: Uint8Array } | null>

// A deterministic fixture exercises audio delivery without claiming to generate narration.
export const simulatedGenerator: Generator = async (_request, index) => {
  if (index >= 3) return null
  await new Promise(resolve => setTimeout(resolve, index === 0 ? 300 : 2500))
  const duration = 6, rate = 8000, samples = duration * rate
  const audio = new Uint8Array(44 + samples * 2), view = new DataView(audio.buffer)
  const write = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)))
  write(0, 'RIFF'); view.setUint32(4, audio.length - 8, true); write(8, 'WAVE'); write(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  write(36, 'data'); view.setUint32(40, samples * 2, true)
  for (let i = 0; i < samples; i++) {
    const envelope = Math.max(0, 1 - i / (rate * 0.3))
    view.setInt16(44 + i * 2, Math.round(Math.sin(i / rate * Math.PI * 2 * (330 + index * 110)) * 2500 * envelope), true)
  }
  return { audio, scene: {
    id: `scene-${index}`, index, duration,
    captions: [{ start: 0, end: duration, text: 'Sample animation: move the slider to explore. Narration is not connected yet.' }],
    source: `export default scene({ end: 'advance', audio: 'audio-${index}' }, s => {
      const distance = s.slider('distance', { label: 'Distance', min: 0.5, max: 3, default: 1.5, step: 0.1 });
      const dot = s.circle('dot-${index}', { radius: 0.3, fill: 'BLUE', position: [-distance, 0] });
      s.play(dot.moveTo([distance, 0]), { duration: 3 });
      s.play(dot.moveTo([-distance, 0]), { duration: 3 });
    });`,
  } }
}

/** One durable queue per Bun process. A replacement process resumes unfinished jobs. */
export class VideoService {
  private db: Database
  private listeners = new Map<string, Set<(manifest: VideoManifest) => void>>()
  private running = false
  private stopped = false
  private idle: Promise<void> = Promise.resolve()
  private abort = new AbortController()

  constructor(path: string, private generate: Generator = simulatedGenerator, private provider: VideoManifest['provider'] = 'simulated', private storyPipeline?: WorkspacePipeline) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    this.db = new Database(path, { create: true })
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, owner TEXT NOT NULL, key TEXT NOT NULL, request TEXT NOT NULL, manifest TEXT NOT NULL, UNIQUE(owner,key));
      CREATE TABLE IF NOT EXISTS video_audio (video TEXT NOT NULL, scene TEXT NOT NULL, bytes BLOB NOT NULL, PRIMARY KEY(video,scene));
      CREATE TABLE IF NOT EXISTS video_story_handoffs (video TEXT PRIMARY KEY, story TEXT NOT NULL, sha256 TEXT);`)
    this.kick()
  }

  private row(id: string) { return this.db.query('SELECT * FROM videos WHERE id = ?').get(id) as Row | null }
  get(id: string, owner: string): VideoManifest | undefined {
    const row = this.row(id)
    return row?.owner === owner ? JSON.parse(row.manifest) : undefined
  }
  list(owner: string): VideoManifest[] {
    return (this.db.query('SELECT manifest FROM videos WHERE owner = ? ORDER BY rowid DESC').all(owner) as { manifest: string }[]).map(row => JSON.parse(row.manifest))
  }
  create(owner: string, key: string, request: WorkspaceRequest): VideoManifest {
    const prior = this.db.query('SELECT * FROM videos WHERE owner = ? AND key = ?').get(owner, key) as Row | null
    if (prior) {
      if (prior.request !== JSON.stringify(request)) throw new Error('Idempotency key already used for a different request')
      return JSON.parse(prior.manifest)
    }
    const queued = this.db.query("SELECT count(*) AS n FROM videos WHERE json_extract(manifest, '$.status') IN ('queued','generating')").get() as { n: number }
    if (queued.n >= 10) throw new StoryError('QUEUE_FULL', 'The generation queue is full. Try again shortly.', 429, true)
    if (request.files?.length && this.provider !== 'astra') throw new StoryError('SOURCE_CONFIG', 'File uploads require VIDEO_GENERATOR=astra on the server.', 503)
    const manifest: VideoManifest = { schemaVersion: 1, id: crypto.randomUUID(), title: request.title, revision: 0, status: 'queued', provider: this.provider, createdAt: new Date().toISOString(), scenes: [] }
    this.db.query('INSERT INTO videos VALUES (?, ?, ?, ?, ?)').run(manifest.id, owner, key, JSON.stringify(request), JSON.stringify(manifest))
    this.kick()
    return manifest
  }
  /** Backend-only handoff. No ZIP, job id, or artifact URL is exposed in browser manifests. */
  storyHandoff(id: string, owner: string): StoryHandoff | undefined {
    if (this.get(id, owner)?.status !== 'script_ready') return undefined
    const row = this.db.query('SELECT story, sha256 FROM video_story_handoffs WHERE video = ?').get(id) as { story: string; sha256: string } | null
    return row?.sha256 ? { storyId: row.story, zipSha256: row.sha256 } : undefined
  }
  private storyId(id: string) {
    return (this.db.query('SELECT story FROM video_story_handoffs WHERE video = ?').get(id) as { story: string } | null)?.story
  }
  private save(manifest: VideoManifest) {
    manifest.revision++
    this.db.query('UPDATE videos SET manifest = ? WHERE id = ?').run(JSON.stringify(manifest), manifest.id)
  }
  private notify(manifest: VideoManifest) {
    for (const listener of this.listeners.get(manifest.id) ?? []) listener(manifest)
  }
  private kick() {
    if (this.running || this.stopped) return
    this.running = true
    this.idle = Promise.resolve().then(async () => {
      while (!this.stopped) {
        const row = this.db.query("SELECT * FROM videos WHERE json_extract(manifest, '$.status') IN ('queued','generating') ORDER BY rowid LIMIT 1").get() as Row | null
        if (!row) break
        const manifest: VideoManifest = JSON.parse(row.manifest)
        const sequence = new SceneSequence()
        try {
          if (manifest.provider === 'astra') {
            if (!this.storyPipeline) throw new StoryError('MODEL_CONFIG', 'This job requires VIDEO_GENERATOR=astra.', 503, true)
            manifest.status = 'generating'; this.save(manifest); this.notify(manifest)
            const handoff = await this.storyPipeline.run(JSON.parse(row.request), { owner: row.owner, signal: this.abort.signal, storyId: this.storyId(row.id),
              checkpoint: id => { this.db.query('INSERT OR REPLACE INTO video_story_handoffs VALUES (?, ?, NULL)').run(row.id, id) } })
            if (this.stopped) break
            this.db.transaction(() => {
              this.db.query('INSERT OR REPLACE INTO video_story_handoffs VALUES (?, ?, ?)').run(row.id, handoff.storyId, handoff.zipSha256)
              manifest.status = 'script_ready'; delete manifest.error; delete manifest.retryable; this.save(manifest)
            })()
            this.notify(manifest)
            continue
          }
          if (manifest.provider === 'pi' && this.provider !== 'pi') throw new AgentError('CONFIG', 'This video requires VIDEO_GENERATOR=pi.')
          const generate = manifest.provider === 'simulated' && this.provider !== 'simulated' ? simulatedGenerator : this.generate
          manifest.status = 'generating'; this.save(manifest); this.notify(manifest)
          const initial = await sequence.submit({ type: 'load', scenes: manifest.scenes })
          if (!initial.ok) throw new Error('Stored scenes could not be restored')
          while (!this.stopped) {
            const priorIndex = manifest.scenes.length - 1
            const next = await generate(JSON.parse(row.request), manifest.scenes.length, { videoId: manifest.id, owner: row.owner,
              previousFrame: priorIndex >= 0 ? sequence.frame(priorIndex, manifest.scenes[priorIndex].duration) : undefined, signal: this.abort.signal })
            if (this.stopped) break
            if (!next) { manifest.status = 'complete'; this.save(manifest); this.notify(manifest); break }
            const scene: VideoScene = { ...next.scene, audio: { id: next.scene.audio?.id ?? `audio-${next.scene.index}`, url: `/api/videos/${manifest.id}/audio/${next.scene.id}` } }
            if (scene.index !== manifest.scenes.length || scene.duration <= 0) throw new Error('Invalid generated scene order or duration')
            const result = await sequence.submit({ type: 'insert', after: manifest.scenes.at(-1)?.id ?? null, scenes: [scene] })
            if (!result.ok) throw new Error(result.diagnostics.map(d => d.message).join('; '))
            if (Math.abs(sequence.compiled.at(-1)!.duration - scene.duration) > 1e-6) throw new Error('Scene timing does not match its declared duration')
            // Publish the scene and its asset atomically before sending an event.
            this.db.transaction(() => {
              this.db.query('INSERT INTO video_audio VALUES (?, ?, ?)').run(manifest.id, scene.id, next.audio)
              manifest.scenes.push(scene); this.save(manifest)
            })()
            this.notify(manifest)
          }
        } catch (error) {
          if (this.stopped) break
          manifest.status = 'failed'; manifest.error = error instanceof AgentError || error instanceof StoryError ? error.message : 'Generation failed. Available scenes can still be played.'
          manifest.retryable = manifest.provider === 'astra' && (!(error instanceof StoryError) || error.retryable)
          console.error('Video generation failed', manifest.id, error instanceof AgentError ? error.code : 'GENERATION')
          this.save(manifest); this.notify(manifest)
        } finally { sequence.dispose() }
      }
    }).finally(() => { this.running = false })
  }
  async close() { this.stopped = true; this.abort.abort(); await this.idle; this.db.close() }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url), parts = url.pathname.split('/')
    const cookie = request.headers.get('cookie')?.match(/(?:^|;\s*)aha-session=([a-f0-9-]{36})(?:;|$)/)?.[1]
    const session = cookie ?? crypto.randomUUID()
    const owner = request.headers.get('x-user-id') ? `user:${request.headers.get('x-user-id')}` : `session:${session}`
    const headers = new Headers({ 'Cache-Control': 'no-store' })
    if (!cookie) headers.set('Set-Cookie', `aha-session=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${url.protocol === 'https:' ? '; Secure' : ''}`)
    const json = (body: unknown, status = 200) => Response.json(body, { status, headers })
    if (parts.length === 3) {
      if (request.method === 'GET') return json(this.list(owner))
      if (request.method !== 'POST') return json({ detail: 'Method Not Allowed' }, 405)
      const origin = request.headers.get('origin')
      // The trusted TLS proxy preserves Host and supplies the external protocol.
      const protocol = request.headers.get('x-forwarded-proto') ?? url.protocol.slice(0, -1)
      if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== `${protocol}://${url.host}`)) return json({ detail: 'Invalid origin' }, 403)
      const key = request.headers.get('Idempotency-Key')
      if (!key || key.length > 128) return json({ detail: 'An Idempotency-Key is required' }, 400)
      try { return json(this.create(owner, key, await readWorkspaceRequest(request)), 202) }
      catch (error) { return json({ detail: error instanceof Error ? error.message : 'Invalid request' }, error instanceof StoryError ? error.status : 409) }
    }
    const manifest = this.get(parts[3], owner)
    if (!manifest) return json({ detail: 'Not Found' }, 404)
    if (request.method === 'POST' && parts.length === 5 && parts[4] === 'retry') {
      const origin = request.headers.get('origin'), protocol = request.headers.get('x-forwarded-proto') ?? url.protocol.slice(0, -1)
      if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== `${protocol}://${url.host}`)) return json({ detail: 'Invalid origin' }, 403)
      if (manifest.status !== 'failed' || !manifest.retryable || !this.storyPipeline) return json({ detail: 'This job cannot be retried.' }, 409)
      try {
        const storyId = this.storyId(manifest.id)
        if (storyId) await this.storyPipeline.retry(owner, storyId)
        manifest.status = 'queued'; delete manifest.error; delete manifest.retryable
        this.save(manifest); this.notify(manifest); this.kick()
        return json(manifest, 202)
      } catch (error) { return json({ detail: error instanceof StoryError ? error.message : 'Could not retry this job.' }, error instanceof StoryError ? error.status : 500) }
    }
    if (request.method !== 'GET') return json({ detail: 'Method Not Allowed' }, 405)
    if (parts.length === 4) return json(manifest)
    if (parts.length === 6 && parts[4] === 'audio') {
      const asset = this.db.query('SELECT bytes FROM video_audio WHERE video = ? AND scene = ?').get(manifest.id, parts[5]) as { bytes: Uint8Array } | null
      if (!asset) return json({ detail: 'Not Found' }, 404)
      headers.set('Content-Type', 'audio/wav'); headers.set('Cache-Control', 'private, max-age=31536000, immutable')
      return new Response(new Uint8Array(asset.bytes), { headers })
    }
    if (parts.length !== 5 || parts[4] !== 'events') return json({ detail: 'Not Found' }, 404)
    // Each event is an authoritative snapshot. Reconnect needs no unbounded replay log.
    let cleanup = () => {}
    const stream = new ReadableStream<Uint8Array>({
      start: controller => {
        const encoder = new TextEncoder()
        let closed = false
        const listeners = this.listeners.get(manifest.id) ?? new Set()
        this.listeners.set(manifest.id, listeners)
        const heartbeat = setInterval(() => { if (!closed) controller.enqueue(encoder.encode(': heartbeat\n\n')) }, 10_000)
        const abort = () => { cleanup(); try { controller.close() } catch { /* already cancelled */ } }
        cleanup = () => {
          closed = true; clearInterval(heartbeat); listeners.delete(send)
          if (!listeners.size) this.listeners.delete(manifest.id)
          request.signal.removeEventListener('abort', abort)
        }
        const send = (snapshot: VideoManifest) => {
          if (closed) return
          controller.enqueue(encoder.encode(`id: ${snapshot.revision}\nevent: manifest\ndata: ${JSON.stringify(snapshot)}\n\n`))
          if (snapshot.status === 'complete' || snapshot.status === 'script_ready' || snapshot.status === 'failed') abort()
        }
        listeners.add(send); request.signal.addEventListener('abort', abort, { once: true })
        if (request.signal.aborted) abort(); else send(manifest)
      },
      cancel: () => cleanup(),
    })
    headers.set('Content-Type', 'text/event-stream'); headers.set('X-Accel-Buffering', 'no')
    return new Response(stream, { headers })
  }
}
