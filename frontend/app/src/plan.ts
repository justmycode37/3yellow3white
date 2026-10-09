export interface DocumentLine {
  text: string
  heading?: number
  page?: number
}

export interface PlanDocument {
  name: string
  lines: DocumentLine[]
  pages?: number
}

export interface VideoSegment {
  id: string
  title: string
  text: string
  minutes: number
  pageStart?: number
  pageEnd?: number
}

export interface PlanChapter {
  id: string
  title: string
  segments: VideoSegment[]
}

export interface StudyPlan {
  version: 1
  title: string
  sourceName: string
  sourcePages?: number
  chapters: PlanChapter[]
  example?: boolean
}

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean)
const titleFrom = (text: string) => text.replace(/^#+\s*|\s*#+$/g, '').replace(/^(?:(?:chapter|kapitel|chapitre)\s+)?(?:\d+(?:\.\d+)*|[IVX]+)[.:)]?\s*[:–—-]?\s+/i, '').trim()

function headingLevel(line: DocumentLine): number | undefined {
  if (line.heading) return line.heading
  const text = line.text.trim()
  if (text.length > 130 || /[.!?;]$/.test(text) || /\.{3,}\s*\d+$/.test(text)) return
  const markdown = text.match(/^(#{1,6})\s+/)
  if (markdown) return markdown[1].length
  if (/^(chapter|kapitel|chapitre)\s+(\d+|[IVX]+)(?:\b|[.:])/i.test(text)) return 1
  const numbered = text.match(/^(\d+(?:\.\d+)*)(?:[.)])?\s+([\p{L}].*)$/u)
  if (numbered && words(numbered[2]).length <= 14) return numbered[1].split('.').length
  if (words(text).length >= 2 && words(text).length <= 10 && text === text.toUpperCase() && /[A-Z]{3}/.test(text)) return 1
}

function splitContent(lines: DocumentLine[], limit: number): DocumentLine[][] {
  const chunks: DocumentLine[][] = []
  let chunk: DocumentLine[] = [], count = 0
  for (const line of lines) {
    // Keep sentences together where possible, including very long PDF paragraphs.
    const sentences = line.text.split(/(?<=[.!?])\s+(?=[A-Z])/u)
    for (const sentence of sentences) {
      const tokens = words(sentence)
      for (let offset = 0; offset < tokens.length; offset += limit) {
        const part = tokens.slice(offset, offset + limit)
        if (count && count + part.length > limit) { chunks.push(chunk); chunk = []; count = 0 }
        chunk.push({ text: part.join(' '), page: line.page })
        count += part.length
      }
    }
  }
  if (chunk.length) chunks.push(chunk)
  return chunks
}

function excerptTitle(text: string, fallback: string): string {
  const sentence = text.split(/[.!?]/)[0].trim()
  if (sentence.length >= 4 && sentence.length <= 80) return sentence
  const firstWords = words(text).slice(0, 8).join(' ')
  return firstWords.length >= 4 ? `${firstWords}…` : fallback
}

/** A local outline suggestion, based on source headings and bounded reading chunks. */
export function createStudyPlan(document: PlanDocument, targetMinutes = 4): StudyPlan {
  const limit = Math.max(2, Math.min(5, targetMinutes)) * 140
  const lines = document.lines.map(line => ({ ...line, text: line.text.trim(), heading: headingLevel(line) }))
    .filter(line => line.text && !/^\d+$/.test(line.text) && !/\.{3,}\s*\d+$/.test(line.text))
  if (words(lines.map(line => line.text).join(' ')).length < 20) throw new Error('Add more material so we can suggest a useful plan — at least a few paragraphs or a chapter outline.')

  let title = document.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim() || 'Your study plan'
  const headings = lines.filter(line => line.heading)
  const first = headings[0]
  // A single top-level heading above lower-level headings is the document title.
  if (first && !/^(?:(?:chapter|kapitel|chapitre)\s+)?\d+[.\s:]/i.test(first.text) && headings.length > 1 && headings.slice(1).every(line => line.heading! > first.heading!)) {
    title = titleFrom(first.text)
    lines.splice(lines.indexOf(first), 1)
  }
  const levels = lines.flatMap(line => line.heading ? [line.heading] : [])
  const chapterLevel = levels.length ? Math.min(...levels) : 1
  const chapters: PlanChapter[] = []
  let chapter: PlanChapter = { id: 'chapter-1', title: levels.length ? 'Introduction' : 'Overview', segments: [] }
  let topic = '', content: DocumentLine[] = [], topicPage: number | undefined
  let chapterStarted = false
  let sequence = 0

  const flushTopic = () => {
    if (!content.length && !topic) return
    const chunks = splitContent(content, limit)
    if (!chunks.length) chunks.push([])
    chunks.forEach((chunk, index) => {
      const text = chunk.map(line => line.text).join(' ').trim()
      const base = topic || excerptTitle(text, chapter.title)
      const pages = chunk.flatMap(line => line.page ? [line.page] : [])
      const minutes = Math.max(2, Math.min(5, Math.ceil(words(text).length / 140)))
      chapter.segments.push({
        id: `segment-${++sequence}`,
        title: chunks.length > 1 ? `${base} · Part ${index + 1}` : base,
        text,
        minutes,
        pageStart: pages.length ? Math.min(...pages) : topicPage,
        pageEnd: pages.length ? Math.max(...pages) : topicPage,
      })
    })
    content = []; topic = ''; topicPage = undefined
  }
  const flushChapter = () => {
    if (chapterStarted && !content.length && !topic && !chapter.segments.length) topic = chapter.title
    flushTopic()
    if (chapter.segments.length) chapters.push(chapter)
  }

  for (const line of lines) {
    if (line.heading && line.heading === chapterLevel) {
      flushChapter()
      chapter = { id: `chapter-${chapters.length + 1}`, title: titleFrom(line.text), segments: [] }
      chapterStarted = true
      topicPage = line.page
    } else if (line.heading) {
      flushTopic()
      topic = titleFrom(line.text)
      topicPage = line.page
    } else {
      content.push(line)
    }
  }
  flushChapter()

  // Unstructured notes still become short segments, grouped into manageable chapters.
  if (!levels.length && chapters[0]?.segments.length > 5) {
    const segments = chapters[0].segments
    chapters.length = 0
    for (let i = 0; i < segments.length; i += 5) {
      chapters.push({ id: `chapter-${i / 5 + 1}`, title: i === 0 ? 'Getting started' : `Continue learning · ${i / 5 + 1}`, segments: segments.slice(i, i + 5) })
    }
  }
  if (!chapters.length) throw new Error('We couldn’t find enough readable content. Try another document or paste your notes.')
  return { version: 1, title, sourceName: document.name, sourcePages: document.pages, chapters }
}

export const exampleDocument: PlanDocument = {
  name: 'Linear algebra',
  lines: [
    { text: 'Linear algebra', heading: 1 },
    { text: 'Vectors & spaces', heading: 2 },
    { text: 'Vectors and linear combinations', heading: 3 },
    { text: 'A vector describes a point or direction using coordinates. Add vectors component by component and multiply them by scalars. A linear combination is a weighted sum of vectors. Work through two vectors in the plane to see how their combinations reach other points.' },
    { text: 'Span, independence, and bases', heading: 3 },
    { text: 'The span of a collection of vectors contains all their linear combinations. Vectors are linearly independent when none is redundant. A basis is an independent spanning set. Compare two independent vectors with two vectors on the same line, then use a basis to express a new vector.' },
    { text: 'Matrices', heading: 2 },
    { text: 'Reading a matrix', heading: 3 },
    { text: 'A matrix is a rectangular array with rows and columns. Its dimensions tell us which operations are possible. Matrix addition and scalar multiplication operate entry by entry. Represent a small system of equations as a matrix and identify its coefficients.' },
    { text: 'Matrix multiplication', heading: 3 },
    { text: 'The entry in row i and column j of AB is the dot product of row i of A and column j of B. The inner dimensions must agree. Multiply two small matrices step by step. Matrix multiplication represents composition of linear maps and generally AB is not equal to BA.' },
    { text: 'Inverses and determinants', heading: 3 },
    { text: 'An inverse reverses an invertible linear transformation. A square matrix is invertible exactly when its determinant is nonzero. The determinant describes signed area or volume scaling. Calculate a two-by-two determinant and connect a zero determinant to a collapsed plane.' },
    { text: 'Linear systems', heading: 2 },
    { text: 'Gaussian elimination', heading: 3 },
    { text: 'Elementary row operations preserve the solution set of a system. Use a pivot to eliminate entries beneath it, producing row echelon form. Solve a small system through elimination and back substitution. Explain why swapping rows and adding a multiple of one row to another preserve solutions.' },
    { text: 'Rank and the solution space', heading: 3 },
    { text: 'Rank counts independent pivot columns. Free variables parameterize the solutions. Distinguish no solution, a unique solution, and infinitely many solutions by inspecting an augmented matrix. Connect the null space to the homogeneous equation Ax equals zero.' },
    { text: 'Eigenvalues & eigenvectors', heading: 2 },
    { text: 'Directions that stay the same', heading: 3 },
    { text: 'An eigenvector is a nonzero vector whose direction remains on the same line after a linear transformation. Its eigenvalue is the scale factor. Use a diagonal matrix to visualize two eigenvector directions and connect the picture to Av equals lambda v.' },
    { text: 'Diagonalization', heading: 3 },
    { text: 'A matrix with enough independent eigenvectors can be expressed in an eigenvector basis as a diagonal matrix. Construct the change-of-basis matrix from its eigenvectors. This simplifies repeated transformations and matrix powers. Note that not every matrix can be diagonalized.' },
  ],
}
