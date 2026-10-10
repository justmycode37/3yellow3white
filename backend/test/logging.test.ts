import { expect, spyOn, test } from 'bun:test';
import { VideoService } from '../src/videos.js';
import { logStage } from '../src/logging.js';
import { NarrationService } from '../src/narration/service.js';
import { settingsFromEnv } from '../src/narration/elevenlabs.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('job logs correlate queue and completion without exposing request contents', async () => {
  const lines: string[] = [];
  const info = spyOn(console, 'info').mockImplementation(line => { lines.push(String(line)); });
  const service = new VideoService(':memory:', async () => null);
  try {
    const video = service.create('private-owner', 'private-key', {
      title: 'private-title', topic: 'private-topic', documents: [{ name: 'private-file', text: 'private-document' }],
    });
    for (let i = 0; i < 100 && service.get(video.id, 'private-owner')?.status !== 'complete'; i++) await Bun.sleep(10);
    expect(service.get(video.id, 'private-owner')?.status).toBe('complete');
    const records = lines.map(line => JSON.parse(line)).filter(record => record.videoId === video.id);
    expect(records.map(record => record.event)).toContain('video.queued');
    expect(records.map(record => record.event)).toContain('video.started');
    expect(records.at(-1)).toMatchObject({ event: 'video.completed', sceneCount: 0 });
    expect(records.at(-1).elapsedMs).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(records.at(-1).timestamp))).toBe(false);
    expect(lines.join('\n')).not.toContain('private-');
  } finally { await service.close(); info.mockRestore(); }
});

test('narration failures remain visible without leaking speech or provider secrets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aha-log-test-'));
  const lines: string[] = [];
  const info = spyOn(console, 'info').mockImplementation(line => { lines.push(String(line)); });
  const errors = spyOn(console, 'error').mockImplementation(line => { lines.push(String(line)); });
  const service = new NarrationService({ root, provider: {
    settings: settingsFromEnv({ ELEVENLABS_VOICE_ID: 'test' }),
    async synthesize() { throw new Error('private-provider-token'); },
  } });
  try {
    const job = await service.submit('private-owner', '# Secret\n\nNarration: Private lesson text.');
    await service.idle();
    expect((await service.get('private-owner', job.id)).status).toBe('failed');
    const records = lines.map(line => JSON.parse(line));
    expect(records.at(-1)).toMatchObject({ event: 'narration.failed', level: 'error', narrationId: job.id });
    expect(lines.join('\n')).not.toMatch(/private-provider-token|Private lesson text|private-owner/);
  } finally {
    await service.idle(); info.mockRestore(); errors.mockRestore();
    await rm(root, { recursive: true, force: true });
  }
});

test('logging failures cannot change a stage result or replace its original error', async () => {
  const info = spyOn(console, 'info').mockImplementation(() => { throw new Error('broken sink'); });
  const errors = spyOn(console, 'error').mockImplementation(() => { throw new Error('broken sink'); });
  try {
    expect(await logStage({ stage: 'scene' }, async () => 'result')).toBe('result');
    const original = new Error('private-provider-error');
    await expect(logStage({ stage: 'scene' }, async () => { throw original; })).rejects.toBe(original);
  } finally { info.mockRestore(); errors.mockRestore(); }
});

test('failed jobs log a safe code without provider errors or a false completion', async () => {
  const lines: string[] = [];
  const info = spyOn(console, 'info').mockImplementation(line => { lines.push(String(line)); });
  const errors = spyOn(console, 'error').mockImplementation((...args) => { lines.push(args.join(' ')); });
  const service = new VideoService(':memory:', async () => { throw new Error('Authorization: Bearer private-token'); });
  try {
    const video = service.create('owner', 'key', { title: 'Title', topic: 'Topic', documents: [] });
    for (let i = 0; i < 100 && service.get(video.id, 'owner')?.status !== 'failed'; i++) await Bun.sleep(10);
    expect(service.get(video.id, 'owner')?.status).toBe('failed');
    expect(lines.join('\n')).not.toContain('private-token');
    const records = lines.map(line => JSON.parse(line)).filter(record => record.videoId === video.id);
    expect(records.at(-1)).toMatchObject({ event: 'video.failed', level: 'error', code: 'GENERATION', sceneCount: 0 });
    expect(records.some(record => record.event === 'video.completed')).toBe(false);
  } finally { await service.close(); info.mockRestore(); errors.mockRestore(); }
});
