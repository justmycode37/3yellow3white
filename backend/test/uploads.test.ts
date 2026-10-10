import { expect, test } from 'bun:test'
import { extractUpload } from '../src/uploads.js'

function pdf(text: string): Uint8Array {
  const stream = `BT /F1 12 Tf 20 100 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]
  let source = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(source.length); source += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = source.length
  source += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(source)
}

test('server extracts actual PDF and Word uploads under Bun', async () => {
  expect(await extractUpload({ name: 'notes.pdf', mimeType: 'application/pdf', bytes: pdf('Vector notes from PDF.') })).toContain('Vector notes from PDF.')
  // Minimal DOCX archive containing a Word paragraph.
  const bytes = new Uint8Array(Buffer.from('UEsDBBQAAAAIAIRUSl2Rzx8FvQAAACkBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2QvQ7CMAyEXyXKiqgLAwNqywCswMALWKlbIpofJebv7XEBMTAw2t/d+eRqdXeDulLKNvhaz4pSr5rq+IiUlRCfa31ijkuAbE7kMBchkhfSheSQZUw9RDRn7AnmZbkAEzyT5ymPGbqpNtThZWC1vcv6fUXsWq3fuvFUrTHGwRpkwTBSaKq9lEq2JXXAxDt0ooJbSC20wVycOIv/MVff/nSdhq6zhr7+MS2mYChn63s3FF/i0PrJpwe8ntE8AVBLAwQUAAAACACEVEpdPhDC4IsAAAC+AAAAEQAAAHdvcmQvZG9jdW1lbnQueG1sRY5LDsIwDAWvEuUAdWHBomrLLWBdUvcjNXZkGwq3JykLNvNkjTRye33Hzb1QdGXq/Kmq/bVv92bk8IxI5rImbfbOL2apAdCwYBy04oSU3cQSB8unzLCzjEk4oOpKc9zgXNcXiMNKviQfPH7KpgIpsP6GwVgcsaG6STi6e45ULRRZKAfTwV8A/s/1X1BLAQIUAxQAAAAIAIRUSl2Rzx8FvQAAACkBAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQDFAAAAAgAhFRKXT4QwuCLAAAAvgAAABEAAAAAAAAAAAAAAIAB7gAAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAACAAIAgAAAAKgBAAAAAA==', 'base64'))
  expect(await extractUpload({ name: 'notes.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes })).toContain('Vector notes from Word.')
})

test('unreadable uploads fail with a useful document error', async () => {
  await expect(extractUpload({ name: 'empty.md', mimeType: 'text/markdown', bytes: new TextEncoder().encode('  ') })).rejects.toMatchObject({ code: 'DOCUMENT' })
  await expect(extractUpload({ name: 'broken.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: new Uint8Array([1, 2]) })).rejects.toMatchObject({ code: 'DOCUMENT' })
})
