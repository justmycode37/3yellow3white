import { readFile } from 'node:fs/promises';
import { DOMParser } from '@xmldom/xmldom';
import type { Element } from '@xmldom/xmldom';
import { SVGPathData } from 'svg-pathdata';
import type { ThumbnailArtwork, ThumbnailPath } from '../../../shared/video/thumbnail.js';
import type { VideoRequest } from '../../../shared/video/contract.js';
import type { AgentRunner, AgentTask } from './runtime.js';
import { agentConfig } from './config.js';

export function thumbnailAgentConfig(env: Record<string, string | undefined> = process.env) {
  return { ...agentConfig(env), model: env.THUMBNAIL_MODEL ?? 'gpt-6.1-sol', thinking: 'low' as const };
}

const paints = new Set(['none', 'currentColor']);
const common = new Set(['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'transform']);

function transform(value: string): string {
  const number = '[-+]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:[eE][-+]?\\d+)?';
  const operation = new RegExp(`(translate|scale|rotate)\\s*\\(\\s*(${number}(?:[ ,]+${number})*)\\s*\\)`, 'g');
  let end = 0, count = 0;
  for (const match of value.matchAll(operation)) {
    if (value.slice(end, match.index).trim()) throw new Error('Invalid transform.');
    const values = match[2].split(/[ ,]+/).map(Number);
    if (!values.every(n => Number.isFinite(n) && Math.abs(n) <= 1000)
      || !(match[1] === 'rotate' ? [1, 3] : [1, 2]).includes(values.length)
      || (match[1] === 'scale' && values.some(n => Math.abs(n) > 10 || n === 0))) throw new Error('Invalid transform parameters.');
    end = match.index! + match[0].length; count++;
  }
  if (!count || count > 12 || value.slice(end).trim()) throw new Error('Only translate, scale and rotate transforms are allowed.');
  return value;
}

/** Parse untrusted SVG, reject unsupported features, and retain only typed geometry. */
export function parseThumbnailSVG(source: string): ThumbnailArtwork {
  if (!source.trim().startsWith('<svg') || source.length > 24_000 || /<!|<\?/.test(source)) throw new Error('Return one SVG under 24,000 characters, without declarations, comments or Markdown.');
  const document = new DOMParser({ onError: () => { throw new Error('Malformed SVG XML.'); } }).parseFromString(source, 'image/svg+xml');
  const root = document.documentElement;
  if (!root || root.tagName !== 'svg' || root.getAttribute('viewBox') !== '0 0 420 270') throw new Error('Use svg with viewBox="0 0 420 270".');
  for (let node = document.firstChild; node; node = node.nextSibling) {
    if (node !== root && (node.nodeType !== 3 || node.textContent?.trim())) throw new Error('Return exactly one SVG.');
  }
  const paths: ThumbnailPath[] = [];
  let commands = 0, nodes = 0;
  function visit(element: Element, inherited: Omit<ThumbnailPath, 'd'>, depth: number) {
    if (++nodes > 64 || depth > 6) throw new Error('Simplify the drawing: at most 64 elements and 6 nesting levels.');
    if (!['svg', 'g', 'path'].includes(element.tagName) || (element.tagName === 'svg' && element !== root)) throw new Error('Only the SVG root, g, and path elements are allowed.');
    const style = { ...inherited };
    for (let i = 0; i < element.attributes.length; i++) {
      const { name, value } = element.attributes.item(i)!;
      if (element === root && name === 'viewBox') continue;
      if (element === root && name === 'xmlns' && value === 'http://www.w3.org/2000/svg') continue;
      if (element.tagName === 'path' && name === 'd') continue;
      if (!common.has(name)) throw new Error(`Unsupported SVG attribute: ${name}.`);
      if (name === 'fill' || name === 'stroke') {
        if (!paints.has(value)) throw new Error('Use only none or currentColor for paints.');
        style[name] = value as ThumbnailPath['fill'];
      } else if (name === 'stroke-width') {
        if (!/^\d+(?:\.\d+)?$/.test(value) || Number(value) < 1 || Number(value) > 24) throw new Error('Stroke width must be between 1 and 24.');
        style.strokeWidth = Number(value);
      } else if (name === 'transform') style.transform = [inherited.transform, transform(value)].filter(Boolean).join(' ');
      else if (value !== 'round') throw new Error('Use round stroke caps and joins.');
    }
    if (element.tagName === 'path') {
      const d = element.getAttribute('d') ?? '';
      if (!/^[Mm]/.test(d.trim()) || d.length > 8000) throw new Error('Each path needs bounded, valid path data starting with M.');
      const parsed = new SVGPathData(d).commands;
      commands += parsed.length;
      if (!parsed.some(c => c.type !== SVGPathData.MOVE_TO && c.type !== SVGPathData.CLOSE_PATH)
        || commands > 500 || parsed.some(c => Object.values(c).some(v => typeof v === 'number' && (!Number.isFinite(v) || Math.abs(v) > 2000)))) throw new Error('Simplify path geometry; use finite coordinates within the canvas.');
      if (style.fill === 'none' && style.stroke === 'none') throw new Error('Paths must be visible.');
      paths.push({ d, ...style });
      if (paths.length > 32) throw new Error('Use at most 32 paths.');
    }
    for (let child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 3 && !child.textContent?.trim()) continue;
      if (child.nodeType !== 1 || element.tagName === 'path') throw new Error('Only groups and paths are allowed; no text or nested path children.');
      visit(child as Element, style, depth + 1);
    }
  }
  visit(root, { fill: 'none', stroke: 'currentColor', strokeWidth: 13 }, 0);
  if (!paths.length) throw new Error('Include a visible drawing.');
  return { styleVersion: 1, paths };
}

export async function thumbnailTask(request: VideoRequest, signal: AbortSignal, images?: AgentTask['images']): Promise<AgentTask> {
  const [style, examples] = await Promise.all([
    readFile(new URL('../../prompts/thumbnail.md', import.meta.url), 'utf8'),
    readFile(new URL('../../prompts/thumbnail-examples.json', import.meta.url), 'utf8'),
  ]);
  return {
    systemPrompt: `${style}\n\n## Existing app SVG examples\n${examples}`,
    prompt: `Draw the thumbnail for this lesson. Source excerpts may be truncated.\n${JSON.stringify({
      title: request.title, topic: request.topic.slice(0, 12_000),
      documents: request.documents.slice(0, 10).map(d => ({ name: d.name, excerpt: d.text.slice(0, 4000) })),
    })}`,
    images, signal,
    validate: async output => { parseThumbnailSVG(output); },
  };
}

export function createThumbnailGenerator(runner: AgentRunner) {
  return async (request: VideoRequest, context: { signal: AbortSignal; images?: AgentTask['images'] }) => {
    const source = await runner.run(await thumbnailTask(request, context.signal, context.images));
    return parseThumbnailSVG(source);
  };
}
