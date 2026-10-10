/** Reproducible host preprocessing; run after npm run build. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createMolecularEnvelope} from '../dist/core.js';
const [input,output,sigmaText,isoText,resolutionText='12']=process.argv.slice(2);
if(!input||!output||!sigmaText||!isoText){console.error('Usage: node tools/prepare-molecular-envelope.mjs input.json output.json sigma isoLevel [resolution]');process.exit(1);}
const inputBytes=await readFile(input),data=JSON.parse(inputBytes.toString('utf8'));
if(data.format!=='animlib-molecule-v1'||data.units!=='angstrom')throw new Error('Expected prepared animlib molecular data in angstroms');
const positions=data.chains.flatMap(c=>c.positions);
const parameters={sigma:Number(sigmaText),isoLevel:Number(isoText),resolution:Number(resolutionText),smoothingIterations:6,smoothing:'Taubin lambda=0.5, mu=-0.53; area-weighted final normals',kernel:'max(0, exp(-r²/(2 sigma²)) - exp(-8))',supportSigma:4,coordinateDecimals:3,normalDecimals:3};
const mesh=createMolecularEnvelope({...parameters,positions,origin:data.center});
const geometry=JSON.parse(JSON.stringify(mesh,(_,v)=>typeof v==='number'?Math.round(v*1000)/1000:v));
const bounds={min:[0,1,2].map(j=>Math.min(...geometry.vertices.map(v=>v[j]))),max:[0,1,2].map(j=>Math.max(...geometry.vertices.map(v=>v[j])))};
const result={format:'animlib-envelope-v1',units:'angstrom',origin:data.center,geometry,bounds,parameters,
  provenance:{...data.provenance,preparedDataSha256:createHash('sha256').update(inputBytes).digest('hex'),inputSelection:data.selection,inputSites:positions.length/3,
    approximation:'Schematic Gaussian density envelope around deposited positions; not a solvent-accessible or atomic surface. No site subsampling.'}};
await writeFile(output,JSON.stringify(result));
console.log(JSON.stringify({output,sites:positions.length/3,vertices:geometry.vertices.length,triangles:geometry.triangles.length,geometryBytes:JSON.stringify(geometry).length,bounds}));
