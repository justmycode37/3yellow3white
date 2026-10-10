import type { PlanDocument, StudyPlan, VideoSegment } from '../../../shared/study-plan.js';
import type { AgentRunner } from './runtime.js';
import { scenegenPrompt } from './scenegen-prompts.js';

const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Expected an object.');
  return v as Record<string, unknown>;
};
function text(v: unknown, max = 4000): string {
  if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`Expected text of 1–${max} characters.`);
  return v.trim();
}
function list(v: unknown, max: number): unknown[] {
  if (!Array.isArray(v) || v.length > max) throw new Error(`Expected a list of at most ${max} items.`);
  return v;
}
function strings(v: unknown, max: number): string[] { return list(v, max).map(x => text(x)); }
function positive(v: unknown): number {
  if (!Number.isSafeInteger(v) || (v as number) < 1) throw new Error('Expected a positive integer.');
  return v as number;
}

export function parsePlanDocument(value: unknown): PlanDocument {
  const d = record(value);
  const lines = list(d.lines, 20000).map(value => {
    const line = record(value);
    if (typeof line.text !== 'string' || line.text.length > 200000) throw new Error('Invalid source line.');
    return { text: line.text, ...(line.page === undefined ? {} : { page: positive(line.page) }) };
  });
  const length = lines.reduce((n, line) => n + line.text.length, 0);
  if (length > 200000 || lines.map(l => l.text).join(' ').trim().split(/\s+/).length < 20) throw new Error('Provide at least 20 words and at most 200,000 characters. Split longer material into sections.');
  const pages = d.pages === undefined ? undefined : positive(d.pages);
  if (pages && lines.some(line => line.page !== undefined && line.page > pages)) throw new Error('Source page exceeds document length.');
  return { name: text(d.name, 255), lines, pages };
}

export const MAX_TOPICS = 8; // Original distill.py default.


export function parseTopicPlan(output: string, document: PlanDocument): StudyPlan {
  const raw = record(JSON.parse(output));
  const seen = new Set<string>();
  const segments = list(raw.topics, MAX_TOPICS).map((value): VideoSegment => {
    const topic = record(value), id = text(topic.id, 80);
    if (!/^[a-z0-9_]+$/.test(id) || seen.has(id)) throw new Error('Use unique snake_case topic IDs.');
    const requires = strings(topic.requires ?? [], MAX_TOPICS);
    if (new Set(requires).size !== requires.length || requires.some(id => !seen.has(id))) throw new Error('Prerequisites must name distinct earlier topics.');
    const keyIdeas = strings(topic.key_ideas, 100);
    if (!keyIdeas.length) throw new Error('Each topic needs key ideas.');
    seen.add(id);
    // Adapt the original response outside the prompt. Notes and free-text source
    // references are model-authored, not verified quotations or numeric ranges.
    return { id, title: text(topic.title, 200), text: text(topic.notes, 50000), minutes: 4,
      summary: text(topic.summary), whyVisual: text(topic.why_visual), keyIdeas, requires,
      sourceReference: text(topic.source_refs), sourceKind: 'notes' };
  });
  if (!segments.length) throw new Error('Provide at least one topic.');
  const title = text(raw.source_title, 200);
  return { version: 1, title, sourceName: document.name, sourcePages: document.pages,
    audience: text(raw.audience), assumed: strings(raw.assumed, 100),
    originalText: sourceMaterial(document), chapters: [{ id: 'chapter-1', title, segments }] };
}

export function sourceMaterial(document: PlanDocument): string {
  let page: number | undefined;
  return document.lines.map(line => {
    const marker = line.page !== undefined && line.page !== page ? `[Page ${line.page}]\n` : '';
    page = line.page;
    return marker + line.text;
  }).join('\n');
}

export async function generateStudyPlan(runner: AgentRunner, document: PlanDocument, signal: AbortSignal): Promise<StudyPlan> {
  const [system, format] = await Promise.all([scenegenPrompt('topics-system'), scenegenPrompt('topics-format')]);
  // Same template expansion and source delimiters as distill.py:plan_topics.
  const prompt = format.replace('{max_topics}', String(MAX_TOPICS)) + '\n\nSOURCE MATERIAL:\n<<<\n' + sourceMaterial(document) + '\n>>>';
  const output = await runner.run({ systemPrompt: system, prompt,
    signal, validate: async output => { parseTopicPlan(output, document); } });
  signal.throwIfAborted();
  return parseTopicPlan(output, document);
}
