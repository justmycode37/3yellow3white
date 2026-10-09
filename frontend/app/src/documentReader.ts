import type { DocumentLine, PlanDocument } from './plan'

const cancelled = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException('Reading cancelled', 'AbortError')
}

export async function readPlanDocument(file: File, onProgress: (message: string) => void, signal?: AbortSignal): Promise<PlanDocument> {
  if (file.size > 50 * 1024 * 1024) throw new Error('Choose a document smaller than 50 MB.')
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!['pdf', 'docx', 'txt', 'md'].includes(extension || '')) throw new Error('Choose a PDF, Word (.docx), text, or Markdown document.')
  onProgress('Reading your document…')
  cancelled(signal)

  if (extension === 'pdf') {
    const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    cancelled(signal)
    const task = pdfjs.getDocument({ data: await file.arrayBuffer() })
    const abort = () => { void task.destroy() }
    signal?.addEventListener('abort', abort, { once: true })
    try {
      const pdf = await task.promise
      if (pdf.numPages > 500) throw new Error('This document has more than 500 pages. Split it into a few smaller documents first.')
      const outline = await pdf.getOutline()
      const headings = new Map<string, number>()
      type OutlineItem = { title: string, items?: OutlineItem[] }
      const key = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
      const collect = (items: OutlineItem[], depth = 1) => items.forEach(item => {
        headings.set(key(item.title), depth)
        if (item.items?.length) collect(item.items, depth + 1)
      })
      if (outline) collect(outline)
      const lines: (DocumentLine & { size: number, edge: boolean })[] = []
      const sizes = new Map<number, number>()
      for (let number = 1; number <= pdf.numPages; number++) {
        cancelled(signal)
        onProgress(`Reading page ${number} of ${pdf.numPages}…`)
        const page = await pdf.getPage(number)
        const content = await page.getTextContent()
        const pageLines: { text: string, size: number }[] = []
        let text = '', size = 0, y: number | undefined
        const flush = () => {
          if (text.trim()) pageLines.push({ text: text.trim(), size })
          text = ''; size = 0
        }
        for (const item of content.items) {
          if (!('str' in item)) continue
          if (y !== undefined && Math.abs(item.transform[5] - y) > 3) flush()
          const fontSize = Math.round(Math.abs(item.height) * 2) / 2
          sizes.set(fontSize, (sizes.get(fontSize) || 0) + item.str.length)
          text += `${text && !text.endsWith(' ') ? ' ' : ''}${item.str}`
          size = Math.max(size, fontSize)
          y = item.transform[5]
          if (item.hasEOL) flush()
        }
        flush()
        pageLines.forEach((line, i) => lines.push({ ...line, page: number, edge: i < 2 || i >= pageLines.length - 2 }))
        page.cleanup()
      }
      cancelled(signal)
      if (lines.map(line => line.text).join('').length < 80) throw new Error('This PDF has no readable text. For scanned pages, use a text-based PDF or paste your notes.')
      const bodySize = [...sizes].sort((a, b) => b[1] - a[1])[0]?.[0] || 12
      const titleSizes = [...new Set(lines.filter(line => line.size > bodySize * 1.15 && line.text.length < 130).map(line => line.size))].sort((a, b) => b - a)
      const edgeCounts = new Map<string, Set<number>>()
      for (const line of lines.filter(line => line.edge)) {
        const seen = edgeCounts.get(key(line.text)) || new Set<number>()
        seen.add(line.page!)
        edgeCounts.set(key(line.text), seen)
      }
      const seenRepeated = new Set<string>()
      const result = lines.filter(line => {
        if (!line.edge || (edgeCounts.get(key(line.text))?.size || 0) < 3) return true
        const normalized = key(line.text)
        if (seenRepeated.has(normalized)) return false
        seenRepeated.add(normalized)
        return true
      }).map(({ text, size, page }) => ({
        text, page,
        heading: headings.get(key(text)) || (size > bodySize * 1.15 && text.length < 130 ? titleSizes.indexOf(size) + 1 : undefined),
      }))
      return { name: file.name, pages: pdf.numPages, lines: result }
    } catch (error) {
      cancelled(signal)
      if (error instanceof Error && error.name === 'PasswordException') throw new Error('This PDF is password protected. Upload an unlocked copy to make a plan.')
      if (error instanceof Error && error.name === 'InvalidPDFException') throw new Error('We couldn’t read this PDF. Try exporting it again or paste its text.')
      throw error
    } finally {
      signal?.removeEventListener('abort', abort)
      await task.destroy()
    }
  }

  if (extension === 'docx') {
    const mammoth = await import('mammoth')
    cancelled(signal)
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, {
      externalFileAccess: false,
      convertImage: mammoth.images.imgElement(async () => ({ src: '' })),
    })
    cancelled(signal)
    // Read text from a detached document; never insert document HTML into the app.
    const document = new DOMParser().parseFromString(result.value, 'text/html')
    const lines = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li'))
      .filter(element => !element.querySelector('p,li'))
      .map(element => ({ text: element.textContent || '', heading: /^H[1-6]$/.test(element.tagName) ? Number(element.tagName[1]) : undefined }))
    return { name: file.name, lines }
  }

  const text = await file.text()
  cancelled(signal)
  return { name: file.name, lines: text.split(/\r?\n/).map(text => ({ text })) }
}
