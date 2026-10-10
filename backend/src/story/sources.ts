import { spawn } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import mammoth from 'mammoth'
import { unzipSync } from 'fflate'
import { StoryError } from './types.js'
import type { StoryImage } from './types.js'

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
export const SOURCE_EXTENSIONS = /\.(pdf|docx|txt|md|png|jpe?g|webp|gif|avif|heic|heif|mp4|mov|webm|m4v)$/i
/** Stored privately in the job database; never included in a manifest or ZIP. */
export interface SourceFile { name: string; base64: string }
export interface SourceInput { topic: string; documents: { name: string; text: string }[]; files?: SourceFile[] }
export type Transcriber = (audio: Uint8Array, signal?: AbortSignal) => Promise<string>
export type MediaCommand = (program: string, args: string[], signal?: AbortSignal) => Promise<string>

export const mediaCommand: MediaCommand = (program, args, signal) => new Promise((resolve, reject) => {
  const child = spawn(program, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, LC_ALL: 'C' } })
  let stdout = '', size = 0, stopped = false
  const stop = () => { stopped = true; child.kill('SIGKILL') }
  const timer = setTimeout(stop, 90_000)
  signal?.addEventListener('abort', stop, { once: true }); if (signal?.aborted) stop()
  const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', stop) }
  child.stdout.on('data', (data: Buffer) => { size += data.length; if (size > 1_000_000) stop(); else stdout += data.toString() })
  child.stderr.on('data', () => {})
  child.on('error', () => { cleanup(); reject(new StoryError('MEDIA_CONFIG', `Install ${program} on the server to process this source.`, 503, true)) })
  child.on('close', code => {
    cleanup()
    if (stopped) reject(new StoryError('MEDIA_TIMEOUT', 'Source processing was cancelled or timed out. Use a smaller file.', 422, true))
    else if (code !== 0) reject(new StoryError('MEDIA_INVALID', 'Could not read this source. Check that it is a valid, unencrypted file.'))
    else resolve(stdout)
  })
})

export const transcribeAudio = async (audio: Uint8Array, signal?: AbortSignal, options: { apiKey?: string; fetch?: (url: string, init: RequestInit) => Promise<Response> } = {}) => {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY
  if (!apiKey) throw new StoryError('TRANSCRIPTION_CONFIG', 'Set OPENAI_API_KEY on the server to transcribe videos with audio.', 503, true)
  const body = new FormData()
  body.append('model', process.env.STORY_TRANSCRIPTION_MODEL ?? 'gpt-4o-transcribe')
  body.append('file', new Blob([new Uint8Array(audio)], { type: 'audio/mpeg' }), 'source.mp3')
  body.append('response_format', 'json')
  let response: Response
  try {
    response = await (options.fetch ?? fetch)('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', body,
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.any([AbortSignal.timeout(180_000), ...(signal ? [signal] : [])]) })
  } catch { throw new StoryError('TRANSCRIPTION_CONNECTION', 'Video transcription was interrupted. Retry the job.', 502, true) }
  if (!response.ok) { await response.body?.cancel(); throw new StoryError('TRANSCRIPTION_HTTP', `Video transcription returned HTTP ${response.status}. Check server configuration.`, 502, true) }
  const chunks: Uint8Array[] = []; let size = 0
  const reader = response.body?.getReader()
  if (reader) while (true) {
    const { done, value } = await reader.read(); if (done) break
    size += value.length
    if (size > 100_000) { await reader.cancel(); throw new StoryError('SOURCE_SIZE', 'The video transcript is too long. Use a shorter clip.') }
    chunks.push(value)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.length > 100_000) throw new StoryError('SOURCE_SIZE', 'The video transcript is too long. Use a shorter clip.')
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new StoryError('TRANSCRIPTION_INVALID', 'Video transcription returned invalid data.', 502, true) }
  if (!value || typeof value !== 'object' || !('text' in value) || typeof value.text !== 'string') throw new StoryError('TRANSCRIPTION_INVALID', 'Video transcription returned no text.', 502, true)
  return value.text
}

/** All input modalities converge on source text plus ordered images for Astra and its reviewer. */
export async function prepareSources(input: SourceInput, signal?: AbortSignal, options: { command?: MediaCommand; transcribe?: Transcriber } = {}) {
  const command = options.command ?? mediaCommand, transcribe = options.transcribe ?? transcribeAudio
  const images: StoryImage[] = [], parts = input.documents.map(document => `Source document: ${JSON.stringify(document.name)}\n${document.text}`)
  const files = input.files ?? []
  if (files.length > 10 || files.reduce((sum, file) => sum + Buffer.byteLength(file.base64, 'base64'), 0) > MAX_UPLOAD_BYTES) throw new StoryError('SOURCE_SIZE', 'Use up to 10 files totaling no more than 50 MB.')
  const dir = await mkdtemp(join(tmpdir(), 'aha-sources-'))
  try {
    const appendImage = async (path: string, label: string) => {
      images.push({ label, base64: (await readFile(path)).toString('base64') })
      if (images.length > 40 || images.reduce((sum, image) => sum + image.base64.length, 0) > 32_000_000) throw new StoryError('SOURCE_SIZE', 'Use fewer sources (at most 40 page images, photos, and sampled frames per request).')
    }
    const ffmpeg = (args: string[]) => command('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', ...args], signal)
    for (let i = 0; i < files.length; i++) {
      signal?.throwIfAborted()
      const file = files[i], ext = extname(file.name).toLowerCase(), label = `Source ${i + 1}: ${JSON.stringify(file.name)}`
      if (!SOURCE_EXTENSIONS.test(file.name) || file.name.length > 200) throw new StoryError('SOURCE_TYPE', 'Choose a PDF, DOCX, text, image, or MP4/MOV/WebM video.')
      const bytes = Buffer.from(file.base64, 'base64')
      if (!bytes.length) throw new StoryError('SOURCE_EMPTY', `${label} is empty.`)
      const path = join(dir, `source-${i}${ext}`)
      await writeFile(path, bytes, { mode: 0o600 })
      if (ext === '.txt' || ext === '.md') {
        let text: string
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { throw new StoryError('SOURCE_TEXT', 'Text files must use UTF-8 encoding.') }
        parts.push(`${label}\n${text}`)
      } else if (ext === '.docx') {
        let expanded = 0
        try { unzipSync(bytes, { filter: entry => { expanded += entry.originalSize; if (expanded > 15_000_000) throw new Error(); return false } }) }
        catch { throw new StoryError('SOURCE_DOCX', 'The Word document is invalid or expands beyond 15 MB.') }
        const text = (await mammoth.extractRawText({ buffer: bytes })).value
        if (!text.trim()) throw new StoryError('SOURCE_EMPTY', 'The Word document has no readable text. Upload its images separately or export it as PDF.')
        parts.push(`${label} (document text)\n${text}`)
      } else if (ext === '.pdf') {
        const info = await command('pdfinfo', [path], signal)
        const count = Number(/^Pages:\s+(\d+)/m.exec(info)?.[1])
        if (!Number.isInteger(count) || count < 1 || count > 20) throw new StoryError('SOURCE_PDF', 'Upload a PDF with 1–20 pages; split longer documents first.')
        const prefix = join(dir, `pdf-${i}`)
        await command('pdftoppm', ['-f', '1', '-l', String(count), '-scale-to', '1800', '-jpeg', path, prefix], signal)
        const pages = (await readdir(dir)).filter(name => name.startsWith(`pdf-${i}-`) && name.endsWith('.jpg')).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        if (pages.length !== count) throw new StoryError('SOURCE_PDF', 'Not every PDF page could be read. No partial source was submitted.')
        for (let j = 0; j < pages.length; j++) await appendImage(join(dir, pages[j]), `${label}, page ${j + 1}/${count}`)
        parts.push(`${label}: all ${count} pages attached in order, including any diagrams or scanned text.`)
      } else if (/\.(mp4|mov|webm|m4v)$/.test(ext)) {
        const info = JSON.parse(await command('ffprobe', ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_format', '-show_streams', '-of', 'json', path], signal))
        const duration = Number(info.format?.duration)
        if (!(duration > 0 && duration <= 600) || !info.streams?.some((stream: any) => stream.codec_type === 'video')) throw new StoryError('SOURCE_VIDEO', 'Use a video between 0 and 10 minutes long.')
        if (info.streams.some((stream: any) => stream.codec_type === 'audio')) {
          const audio = join(dir, `audio-${i}.mp3`)
          await ffmpeg(['-protocol_whitelist', 'file,pipe', '-threads', '2', '-i', path, '-vn', '-t', '600', '-ac', '1', '-ar', '16000', '-b:a', '48k', audio])
          parts.push(`${label}, spoken audio transcript:\n${await transcribe(await readFile(audio), signal)}`)
        } else parts.push(`${label} has no audio track.`)
        const count = Math.min(12, Math.max(1, Math.ceil(duration / 5)))
        for (let j = 0; j < count; j++) {
          const at = Math.min(duration - 0.01, (j + 0.5) * duration / count), frame = join(dir, `frame-${i}-${j}.jpg`)
          await ffmpeg(['-ss', String(Math.max(0, at)), '-protocol_whitelist', 'file,pipe', '-threads', '2', '-i', path, '-frames:v', '1', '-vf', "scale=1600:1600:force_original_aspect_ratio=decrease", '-q:v', '3', frame])
          await appendImage(frame, `${label}, sampled frame at ${at.toFixed(2)} seconds`)
        }
        parts.push(`${label}: duration ${duration.toFixed(2)} seconds; ${count} evenly sampled frames attached. Sampling may omit short visual events; do not claim to have inspected every frame.`)
      } else {
        let source = path
        if (ext === '.heic' || ext === '.heif') {
          source = join(dir, `heif-${i}.jpg`)
          await command('heif-convert', ['-q', '85', path, source], signal)
        }
        const image = join(dir, `image-${i}.jpg`)
        await ffmpeg(['-protocol_whitelist', 'file,pipe', '-threads', '2', '-i', source, '-frames:v', '1', '-vf', 'scale=1800:1800:force_original_aspect_ratio=decrease', '-q:v', '3', image])
        await appendImage(image, `${label}${ext === '.gif' ? ', first frame of GIF' : ''}`)
        parts.push(`${label}: image attached${ext === '.gif' ? ' (first frame only)' : ''}.`)
      }
      if (parts.join('\n\n').length > 60_000) throw new StoryError('SOURCE_SIZE', 'Source text exceeds 60,000 characters. Split or shorten the material.')
    }
    const sourceMaterial = parts.join('\n\n')
    if (sourceMaterial.length > 60_000) throw new StoryError('SOURCE_SIZE', 'Source text exceeds 60,000 characters.')
    return { sourceMaterial, images }
  } finally { await rm(dir, { recursive: true, force: true }) }
}
