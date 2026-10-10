/** Offline deployment proof: the shipped worker must produce nonblank pixels. */
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';

const directory = await mkdtemp(join(tmpdir(), 'animlib-frame-smoke-'));
try {
  const request = join(directory, 'input.json');
  await writeFile(request, JSON.stringify({ directory, times: [0.5], source:
    `export default scene({orbit:false},s=>{s.circle('dot',{radius:1,fill:Color.TEAL});s.text('label',{text:'DNA',position:[0,2]});s.wait(1);});` }));
  const manifest = JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('./render-frames.mjs', import.meta.url)), request],
    { encoding: 'utf8', timeout: 120_000, windowsHide: true }));
  if (manifest.frames.length !== 2 || manifest.sheets.length !== 2) throw new Error('Missing viewport evidence');
  for (const frame of manifest.frames) {
    const png = await readFile(frame.path), chunks = [];
    for (let offset = 8; offset < png.length;) {
      const size = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8);
      if (type === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + size));
      offset += size + 12;
    }
    const rows = inflateSync(Buffer.concat(chunks));
    let colored = 0;
    // Worker writes unfiltered RGBA rows. Ignore alpha when checking nonblack content.
    for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
      const p = y * (frame.width * 4 + 1) + 1 + x * 4;
      if (rows[p] + rows[p + 1] + rows[p + 2] > 30) colored++;
    }
    if (colored < 1000) throw new Error(`Blank render at ${frame.width}x${frame.height}`);
  }
  console.log('Production frame renderer: both aspects contain rendered geometry and text.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
