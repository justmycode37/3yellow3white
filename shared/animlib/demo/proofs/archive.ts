/** Run with Bun from the repository root after reviewing the current proofs. */
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dnaProof} from './dna';
import {engineProof} from './engine';
import {gradientProof} from './gradient';
import {minecraftProof} from './minecraft';

const destination=new URL('../../../../docs/demos/spatial-proofs/',import.meta.url);
mkdirSync(destination,{recursive:true});
const sha256=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const proofs=[dnaProof,engineProof,gradientProof,minecraftProof];
for(const proof of proofs)writeFileSync(new URL(`${proof.id}.js`,destination),proof.source);
const molecularInputs=['1BNA.pdb','DA.cif','DC.cif','DG.cif','DT.cif','dna.json'];
writeFileSync(new URL('provenance.json',destination),JSON.stringify({
  method:'Agent-authored standalone proofs using animlib; visual repairs follow first frame inspection. This is not an untouched production scene-generation benchmark.',
  proofs:proofs.map(proof=>({id:proof.id,title:proof.title,source:`${proof.id}.js`,sha256:sha256(proof.source),sourceBytes:Buffer.byteLength(proof.source),sampleTimes:proof.sampleTimes})),
  molecularInputs:molecularInputs.map(file=>({file,sha256:sha256(readFileSync(new URL(`./data/${file}`,import.meta.url)))})),
},null,2)+'\n');
console.log(`Archived ${proofs.length} scene sources and provenance.`);
