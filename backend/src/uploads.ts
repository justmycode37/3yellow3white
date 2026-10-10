import { createHash } from 'node:crypto'
import { AgentError } from './agents/config.js'

export const MAX_FILE_BYTES = 50 * 1024 * 1024
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024
export interface Upload { name: string; mimeType: string; bytes: Uint8Array }
const types: Record<string, string> = {
  pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain', md: 'text/markdown', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
}
export function uploadType(name: string) { return types[name.split('.').at(-1)?.toLowerCase() ?? ''] }
export function uploadMetadata(upload: Upload) {
  return { name: upload.name, mimeType: upload.mimeType, size: upload.bytes.length,
    sha256: createHash('sha256').update(upload.bytes).digest('hex') }
}

/** Extract inside the durable worker, after the original upload is committed. */
export async function extractUpload(upload: Upload): Promise<string> {
  try {
    let text: string
    if (upload.mimeType === 'application/pdf') {
      const { extractText, getDocumentProxy } = await import('unpdf')
      const pdf = await getDocumentProxy(new Uint8Array(upload.bytes))
      try {
        if (pdf.numPages > 500) throw new AgentError('DOCUMENT', 'Split PDFs with more than 500 pages into smaller files.')
        text = (await extractText(pdf, { mergePages: true })).text
      } finally { await pdf.loadingTask.destroy() }
    } else if (upload.name.toLowerCase().endsWith('.docx')) {
      const mammoth = await import('mammoth')
      text = (await mammoth.extractRawText({ buffer: Buffer.from(upload.bytes) })).value
    } else text = new TextDecoder('utf-8', { fatal: true }).decode(upload.bytes)
    if (!text.trim()) throw new AgentError('DOCUMENT', `No readable text in ${upload.name}. For scans, upload a photo or paste the text.`)
    if (Buffer.byteLength(text) > 1_000_000) throw new AgentError('DOCUMENT', 'Extracted document text must be under 1 MB. Split the material into smaller files.')
    return text
  } catch (error) {
    if (error instanceof AgentError) throw error
    throw new AgentError('DOCUMENT', `Could not read ${upload.name}. Use an unlocked PDF, DOCX, UTF-8 text file, or photo.`)
  }
}
