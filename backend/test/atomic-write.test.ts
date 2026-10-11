import { expect, test, spyOn } from 'bun:test';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { atomicWrite } from '../src/narration/service.js';

test('atomic replacement retries transient reader locks without removing destination', async () => {
  const root = await fs.mkdtemp(join(tmpdir(), 'aha-atomic-'));
  const path = join(root, 'state.json');
  await fs.writeFile(path, 'old');
  const rename = fs.rename;
  let attempts = 0;
  const stub = spyOn(fs, 'rename').mockImplementation(async (from, to) => {
    attempts++;
    expect(await fs.readFile(path, 'utf8')).toBe('old');
    if (attempts < 3) throw Object.assign(new Error('reader lock'), { code: 'EPERM' });
    return rename(from, to);
  });
  try {
    await atomicWrite(path, 'new');
    expect(await fs.readFile(path, 'utf8')).toBe('new');
    expect(attempts).toBe(3);
  } finally { stub.mockRestore(); await fs.rm(root, { recursive: true, force: true }); }
});

test('permanent replacement failure preserves prior state and removes its temporary file', async () => {
  const root = await fs.mkdtemp(join(tmpdir(), 'aha-atomic-'));
  const path = join(root, 'state.json');
  await fs.writeFile(path, 'old');
  const stub = spyOn(fs, 'rename').mockRejectedValue(Object.assign(new Error('invalid target'), { code: 'EINVAL' }));
  try {
    await expect(atomicWrite(path, 'new')).rejects.toThrow('invalid target');
    expect(await fs.readFile(path, 'utf8')).toBe('old');
    expect(await fs.readdir(root)).toEqual(['state.json']);
    expect(stub).toHaveBeenCalledTimes(1);
  } finally { stub.mockRestore(); await fs.rm(root, { recursive: true, force: true }); }
});
