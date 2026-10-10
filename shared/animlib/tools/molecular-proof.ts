/** Run with the repository's Bun; the actual rendering worker runs in Node/Dawn. */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { molecularSources } from '../demo/molecular-scenes.js';

const root=resolve(process.argv[2]??'data/molecular-smooth-proof-repaired');
await mkdir(root,{recursive:true});
for(const source of molecularSources) {
  const input=resolve(root,`${source.id}.json`);
  await writeFile(input,JSON.stringify({source:source.source,times:[0],directory:resolve(root,source.id)}));
  const result=spawnSync('node',['shared/animlib/tools/render-frames.mjs',input],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status??1);
}
