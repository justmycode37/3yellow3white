// Counterbalance topic order; each topic runs its two conditions sequentially.
const conditions = [
  ['rna', ['reference-repeat', 'validated-reference'], ['baseline-repeat', 'text']],
  ['binary', ['baseline-repeat', 'text'], ['reference-repeat', 'validated-reference']],
  ['derivative', ['reference-repeat', 'validated-reference'], ['baseline-repeat', 'text']],
] as const;
await Promise.all(conditions.map(async ([topic,...runs])=>{
  for(const [variant,mode] of runs){
    const child=Bun.spawn([process.execPath,`${import.meta.dir}/scene-speed.ts`,'run',variant,'gpt-6-astra',mode,'full',topic],{stdout:'inherit',stderr:'inherit',env:process.env});
    const code=await child.exited;if(code!==0)process.exitCode=1;
  }
}));
