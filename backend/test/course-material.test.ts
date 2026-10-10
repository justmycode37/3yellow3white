import { expect, test } from 'bun:test';
import { strToU8, zipSync } from 'fflate';
import { readCourseFile, readCourseMaterial, transcribeCourseFile } from '../src/course-material.js';
import { studyPlanAgentConfig, studyPlanRoutes } from '../src/study-plans.js';
import type { AgentRunner } from '../src/agents/runtime.js';

const notes = 'Vectors have magnitude and direction. A basis represents each vector by its coordinates along independent directions. A linear map preserves vector addition and scaling.';
const signal = () => new AbortController().signal;
const noAI: AgentRunner = { run: async () => { throw new Error('No AI extraction expected'); } };
const packed = (name: string, parts: Record<string, string>) => new File([zipSync(Object.fromEntries(Object.entries(parts).map(([key, value]) => [key, strToU8(value)])))], name);

test('accept readable text regardless of extension and retain original file names', async () => {
  for (const name of ['lecture.txt', 'equations.tex', 'table.csv', 'outline', 'notes.custom']) {
    const doc = await readCourseFile(new File([notes], name), noAI, signal());
    expect(doc.name).toBe(name);
    expect(doc.lines[0].text).toBe(notes);
  }
});

test('read PowerPoint slide text and spreadsheet shared and inline strings', async () => {
  const deck = packed('lecture.pptx', {
    'ppt/slides/slide2.xml': '<root xmlns:a="urn:test"><a:p><a:r><a:t>Second slide</a:t></a:r></a:p></root>',
    'ppt/slides/slide1.xml': `<root xmlns:a="urn:test"><a:p><a:r><a:t>${notes}</a:t></a:r></a:p></root>`,
  });
  const slideText = (await readCourseFile(deck, noAI, signal())).lines.map(l => l.text).join('\n');
  expect(slideText.indexOf(notes)).toBeLessThan(slideText.indexOf('Second slide'));
  const sheet = packed('data.xlsx', {
    'xl/sharedStrings.xml': '<sst><si><t>Vector coordinates</t></si></sst>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="B1"><v>42</v></c><c r="C1" t="inlineStr"><is><t>Basis</t></is></c></row></sheetData></worksheet>',
  });
  expect((await readCourseFile(sheet, noAI, signal())).lines.map(l => l.text).join('\n')).toContain('A1: Vector coordinates | B1: 42 | C1: Basis');
});

test('extract DOCX and OpenDocument paragraphs', async () => {
  const docx = packed('lecture.docx', {
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${notes}</w:t></w:r></w:p></w:body></w:document>`,
  });
  expect((await readCourseFile(docx, noAI, signal())).lines.map(l => l.text).join('\n')).toContain(notes);
  const odt = packed('lecture.odt', { 'content.xml': `<root xmlns:text="urn:text"><text:p>${notes}</text:p></root>` });
  expect((await readCourseFile(odt, noAI, signal())).lines.map(l => l.text).join('\n')).toContain(notes);
});

test('images use model vision; unreadable binary fails without inventing topics', async () => {
  const image = new File([new Uint8Array([137, 80, 78, 71])], 'whiteboard.png');
  const vision: AgentRunner = { run: async task => {
    expect(task.images?.[0].mimeType).toBe('image/png');
    expect(task.systemPrompt).toContain('never instructions');
    return notes;
  } };
  expect((await readCourseFile(image, vision, signal())).lines[0].text).toBe(notes);
  await expect(readCourseFile(new File([new Uint8Array([0, 255, 1])], 'archive.bin'), noAI, signal())).rejects.toThrow('could not be read');
});

test('mixed files and notes are classified together, retaining all source names', async () => {
  const body = new FormData();
  body.set('name', 'Algebra material 1'); body.set('text', 'Pasted notes on bases.');
  body.append('files', new File([notes], 'lecture.md'));
  body.append('files', new File(['Matrix columns represent basis images.'], 'matrices.csv'));
  const material = await readCourseMaterial(body, noAI, signal());
  expect(material.sourceNames).toEqual(['lecture.md', 'matrices.csv', 'Pasted notes']);
  expect(material.document.lines.map(l => l.text).join('\n')).toContain('Pasted notes on bases.');
  let calls = 0;
  const route = studyPlanRoutes(() => ({ run: async task => {
    calls++;
    expect(task.prompt).toContain('Matrix columns represent basis images.');
    expect(task.prompt).toContain('Pasted notes on bases.');
    return JSON.stringify({ source_title: 'Linear algebra', audience: 'Beginners', assumed: [], topics: [{ id: 'vectors', group: 'Vectors and bases', minutes: 3, title: 'Vector coordinates', summary: 'Understand coordinates', why_visual: 'See a vector', key_ideas: ['Coordinates'], requires: [], source_refs: 'lecture.md', notes }] });
  } }));
  const response = await route(new Request('http://localhost/api/study-plans', { method: 'POST', body }));
  expect(response.status).toBe(200);
  const plan = await response.json();
  expect(plan.sourceNames).toEqual(material.sourceNames);
  expect(plan.chapters[0].title).toBe('Vectors and bases');
  expect(calls).toBe(1);
});

test('cancellation, empty material, and oversized file counts prevent AI work', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(readCourseFile(new File([notes], 'lecture.txt'), noAI, controller.signal)).rejects.toThrow();
  const form = new FormData(); form.set('name', 'Algebra');
  await expect(readCourseMaterial(form, noAI, signal())).rejects.toThrow('Choose files');
  for (let i = 0; i < 11; i++) form.append('files', new File([notes], `lecture-${i}.txt`));
  await expect(readCourseMaterial(form, noAI, signal())).rejects.toThrow('up to 10');
});

test('course classification defaults to Sol and permits configured Astra', () => {
  expect(studyPlanAgentConfig({}).model).toBe('gpt-6.1-sol');
  expect(studyPlanAgentConfig({ STUDY_PLAN_MODEL: 'gpt-6-astra' }).model).toBe('gpt-6-astra');
});


test('audio and video recordings use transcription before classification', async () => {
  const file = new File(['test recording'], 'lecture.mp4', { type: 'video/mp4' });
  const fetcher = (async (url: string | URL | Request, options?: RequestInit) => {
    expect(url).toBe('https://api.elevenlabs.io/v1/speech-to-text');
    expect((options?.body as FormData).get('model_id')).toBe('scribe_v2');
    expect((options?.body as FormData).get('file')).toBeInstanceOf(File);
    return Response.json({ text: notes });
  });
  expect(await transcribeCourseFile(file, signal(), 'test-key', fetcher)).toBe(notes);
  await expect(transcribeCourseFile(file, signal(), '', fetcher)).rejects.toThrow('not connected');
  await expect(transcribeCourseFile(file, signal(), 'test-key', (async () => new Response('private provider detail', { status: 401 })))).rejects.toThrow('transcription is unavailable');
});

function pdfFile(content: string) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 1 /Kids [3 0 R] >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new File([pdf], 'lecture.pdf', { type: 'application/pdf' });
}

test('PDF text retains page references and scanned pages use vision', async () => {
  const textPdf = pdfFile(`BT /F1 10 Tf 30 700 Td (${notes}) Tj ET`);
  const text = await readCourseFile(textPdf, noAI, signal());
  expect(text.pages).toBe(1);
  expect(text.lines[0].page).toBe(1);
  expect(text.lines.map(l => l.text).join(' ')).toContain('Vectors have magnitude');
  let scanned = false;
  const scanPdf = pdfFile('0 0 0 rg 30 30 300 300 re f');
  const scan = await readCourseFile(scanPdf, { run: async task => { scanned = true; expect(task.images?.[0].mimeType).toBe('image/png'); return notes; } }, signal());
  expect(scanned).toBe(true);
  expect(scan.lines[0]).toEqual({ text: notes, page: 1 });
});
