import type { VideoRequest } from '../../../shared/video/contract'
import { MAX_UPLOAD_BYTES, SOURCE_EXTENSIONS, prepareSources } from './sources.js'
import type { SourceFile } from './sources.js'
import { StoryService } from './service.js'
import { StoryError } from './types.js'
import { readStoryArchive } from './handoff.js'

export interface WorkspaceRequest extends VideoRequest { files?: SourceFile[] }
export interface StoryHandoff { storyId: string; zipSha256: string }
export interface WorkspacePipeline {
  run(request: WorkspaceRequest, context: { owner: string; signal: AbortSignal; storyId?: string; checkpoint: (storyId: string) => void }): Promise<StoryHandoff>
  retry(owner: string, storyId: string): Promise<unknown>
}
export function createWorkspacePipeline(stories: StoryService, prepare = prepareSources): WorkspacePipeline {
  return {
    retry: (owner, id) => stories.retry(owner, id),
    async run(request, { owner, signal, storyId, checkpoint }) {
      if (!storyId) {
        const { sourceMaterial, images } = await prepare(request, signal)
        signal.throwIfAborted()
        const job = await stories.submit(owner, {
          prompt: request.topic.trim() || `Explain the material in the attached sources. Working title: ${request.title}`,
          sourceMaterial,
        }, images)
        storyId = job.id
        checkpoint(storyId)
      }
      while (true) {
        signal.throwIfAborted()
        const job = await stories.get(owner, storyId)
        if (job.status === 'complete') {
          // Validate the exact archive that the next agent receives before marking ready.
          readStoryArchive(await stories.artifact(owner, storyId, 'story.zip'), job.zipSha256!)
          return { storyId, zipSha256: job.zipSha256! }
        }
        if (job.status === 'failed' || job.status === 'interrupted') throw new StoryError(job.error?.code ?? 'STORY_FAILED', job.error?.message ?? 'Story generation failed.', 422, job.error?.retryable)
        await new Promise<void>((resolve, reject) => {
          const abort = () => { clearTimeout(timer); reject(signal.reason) }
          const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, 100)
          signal.addEventListener('abort', abort, { once: true })
          if (signal.aborted) abort()
        })
      }
    },
  }
}

/** Parse and bound the actual stream before allocating FormData or JSON. */
export async function readWorkspaceRequest(request: Request): Promise<WorkspaceRequest> {
  const contentType = request.headers.get('content-type') ?? ''
  const multipart = contentType.startsWith('multipart/form-data;')
  if (contentType && !multipart && !contentType.startsWith('application/json') && !contentType.startsWith('text/plain')) throw new StoryError('CONTENT_TYPE', 'Send JSON or multipart/form-data.', 415)
  const limit = multipart ? MAX_UPLOAD_BYTES + 1_000_000 : 1_000_000
  if (Number(request.headers.get('content-length')) > limit) throw new StoryError('SOURCE_SIZE', 'The upload is too large (50 MB total).', 413)
  const chunks: Uint8Array[] = []; let size = 0
  const reader = request.body?.getReader()
  if (reader) while (true) {
    const { done, value } = await reader.read(); if (done) break
    size += value.length
    if (size > limit) { await reader.cancel(); throw new StoryError('SOURCE_SIZE', 'The upload is too large (50 MB total).', 413) }
    chunks.push(value)
  }
  const blob = new Blob(chunks.map(chunk => new Uint8Array(chunk)))
  let body: VideoRequest; const files: SourceFile[] = []
  try {
    if (multipart) {
      const form = await new Response(blob, { headers: { 'Content-Type': contentType } }).formData()
      if ([...form.keys()].some(key => key !== 'request' && key !== 'files')) throw new Error()
      const metadata = form.getAll('request')
      if (metadata.length !== 1 || typeof metadata[0] !== 'string') throw new Error()
      body = JSON.parse(metadata[0])
      const uploads = form.getAll('files')
      if (uploads.length > 10) throw new StoryError('SOURCE_SIZE', 'Use up to 10 files.', 413)
      let total = 0
      for (const value of uploads) {
        if (typeof value === 'string' || !SOURCE_EXTENSIONS.test(value.name) || value.name.length > 200) throw new StoryError('SOURCE_TYPE', 'Choose a PDF, DOCX, text, image, or MP4/MOV/WebM video.', 400)
        total += value.size
        if (!value.size || total > MAX_UPLOAD_BYTES) throw new StoryError('SOURCE_SIZE', 'Files must not be empty and must total at most 50 MB.', 413)
        files.push({ name: value.name, base64: Buffer.from(await value.arrayBuffer()).toString('base64') })
      }
    } else body = JSON.parse(await blob.text())
  } catch (error) { if (error instanceof StoryError) throw error; throw new StoryError('REQUEST', 'Invalid upload or JSON metadata.', 400) }
  if (!body || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200 || typeof body.topic !== 'string' || body.topic.length > 12_000 || !Array.isArray(body.documents) || body.documents.length > 10 || body.documents.some(document => !document || typeof document.name !== 'string' || document.name.length > 200 || typeof document.text !== 'string') || (!body.topic.trim() && !body.documents.some(document => document.text.trim()) && !files.length)) throw new StoryError('REQUEST', 'Provide a title and topic or source material.', 400)
  if (body.documents.reduce((sum, document) => sum + document.text.length + document.name.length, 0) > 59_000) throw new StoryError('SOURCE_SIZE', 'Source text must be shorter than 59,000 characters.', 413)
  return { title: body.title.trim(), topic: body.topic, documents: body.documents.map(({ name, text }) => ({ name, text })), ...(files.length ? { files } : {}) }
}
