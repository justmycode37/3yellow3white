/** Offline preprocessing; never fetch or parse deposited files inside a scene. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { importPDB } from '../dist/core.js';

const [input, output, source, selection='residues', chainList] = process.argv.slice(2);
if (!input || !output || !source) {
  console.error('Usage: node tools/prepare-molecule.mjs input.pdb output.json provenance-url [residues|heavy-atoms] [A,B,...]');
  process.exit(1);
}
const bytes=await readFile(input);
const result=importPDB(bytes.toString('utf8'),{source,selection,...(chainList?{chains:chainList.split(',')}: {})});
result.provenance.sha256=createHash('sha256').update(bytes).digest('hex');
await writeFile(output,JSON.stringify(result));
console.log(JSON.stringify({output,chains:result.chains.length,sites:result.chains.reduce((n,c)=>n+c.positions.length/3,0),source,sha256:result.provenance.sha256}));
