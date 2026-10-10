import type { PlannedLesson } from '../src/agents/planning.js';

type Beat = [title: string, speech: string, visual: string, carry: string[]];
function lesson(title: string, insight: string, example: string, entities: [string,string,string][], beats: Beat[]): PlannedLesson {
  return { schemaVersion: 1, markdown: `# ${title}\n\n` + beats.map(([name,speech,visual],i) => `## Beat ${i+1}: ${name}\n\nContent needed: ${visual}\n\nNarration: ${speech}\n\nPause: 2s`).join('\n\n'),
    plan: { audience: 'Curious beginner', prerequisites: ['Read simple labels'], learningGoal: insight, centralQuestion: title,
      keyInsight: insight, runningExample: example, misconceptions: ['Do not skip the causal inference or confuse represented quantities.'],
      entities: entities.map(([id,meaning,color])=>({id,meaning,color})), scenes: beats.map(([name,,visual,carry],i)=>({id:`beat-${i+1}`,purpose:name,
        whyNow:i===0?'Establish the concrete mechanism for the next scene.':'Derive the conclusion from the preceding end picture.',
        keyPoints:[visual],visualDescription:visual,endsWith:i===0?'Keep core objects for the next scene.':insight,carry,cleanup:[],
        sourceRefs:[{document:'request',location:'fixed benchmark explanation',supports:example}],interactions:[]})) } };
}

export const fixtures = {
  rna: lesson('How DNA becomes an RNA message','Explain complementary RNA synthesis and its direction without consuming DNA.',
    'Template 3′ TACGAT 5′ produces RNA 5′ AUGCUA 3′.',
    [['template','DNA template','TEAL'],['rna','Growing RNA','GREEN'],['polymerase','RNA polymerase active site','PURPLE']], [
      ['Copy by pairing','DNA stores a sequence. To copy this stretch, RNA polymerase opens a small region and uses one strand as a template. Here the template reads T, A, C, G, A, T. An RNA base pairs with each exposed DNA base: A pairs with T, U with A, G with C, and C with G. RNA uses U, not T.',
        'One DNA template labelled 3′ TACGAT 5′. A purple polymerase active region reveals complementary RNA bases at the active site as pairing is explained. Keep template and growing RNA distinct; nearby pairing cues, no text wall.', ['template','rna','polymerase']],
      ['Direction and release','Now follow the active site. Polymerase reads the template from its three-prime end toward its five-prime end. New bases attach to the growing RNA three-prime end, so RNA grows five-prime to three-prime. Our copy is A, U, G, C, U, A. The new RNA peels away. The DNA template remains: transcription copies information without using up the original.',
        'Continue the same molecules. Mark strand ends and reading/growth directions clearly: antiparallel strand labels, polymerase reads 3′→5′ and RNA grows 5′→3′. Finish AUGCUA then separate RNA from intact DNA. Do not imply opposing spatial travel along paired strands.', []]
    ]),
  binary: lesson('Why binary search can discard half','Explain how sorted order permits elimination and repeated halving.',
    'Sorted [3,7,12,18,23,31,42,56], target 23; lower midpoint choices 18,31,23.',
    [['array','Fixed sorted array','BLUE'],['window','Remaining search interval','TEAL']], [
      ['One comparison removes a range','Find twenty-three in this sorted row: three, seven, twelve, eighteen, twenty-three, thirty-one, forty-two, fifty-six. Check the lower of the two middle positions: eighteen. Twenty-three is larger. Because the row is sorted, every value to the left is also too small. We can rule out that entire half, including eighteen, with one comparison.',
        'One stationary row of eight labelled cells and target 23. Highlight lower midpoint 18, then dim 3,7,12,18 after comparison. Preserve all locations and values. Teal interval encloses surviving 23,31,42,56.', ['array','window']],
      ['Repeat in the surviving interval','Only twenty-three, thirty-one, forty-two, and fifty-six remain. Check their lower middle: thirty-one. Our target is smaller, so thirty-one and everything to its right are ruled out. The remaining value is twenty-three: found. Each comparison roughly halves the remaining choices. Doubling a large list therefore adds about one comparison, rather than doubling the work.',
        'Continue same eight cells. Compare 31 then eliminate 31,42,56; highlight found 23. Keep eliminated values dim and original positions. After concrete result, shrinking intervals show repeated halving and why doubling adds one step.', []]
    ]),
  derivative: lesson('Why the derivative of x squared is two x','Derive instantaneous area change from two strips and a vanishing corner.',
    'Positive x,h: (x+h)²−x²=2xh+h²; divide by h to get 2x+h, then let h→0.',
    [['square','Original x-by-x square','BLUE'],['strips','Two added x-by-h strips','TEAL'],['corner','Added h-by-h corner','GOLD']], [
      ['See the extra area','Let x be a positive side length. A square with side x has area x squared. Increase each side by a small positive amount h. The extra area splits into two thin strips, each with area x times h, and a little corner with area h squared. Together, those pieces account for all the change in area.',
        'One blue x-by-x square. Extend right and top by h. Two teal x-by-h strips and one gold h-by-h corner exactly tile added area. Length labels beside edges; earn area labels after pieces appear.', ['square','strips','corner']],
      ['From average to instantaneous','The average change in area per unit of side length is that added area divided by h. Each strip contributes x, and the corner contributes h: two x plus h. Now shrink h toward zero. The corner contribution vanishes, while the two strip contributions remain. The limiting rate is two x. That is why the derivative of x squared is two x.',
        'Continue prior square and regions. Connect each area to division by h: xh/h=x twice, h²/h=h. Shrink h proportionally. Earn 2x+h tending to 2x as narrated. Distinguish shrinking areas from normalized contributions; no final answer before derivation.', []]
    ])
} satisfies Record<string, PlannedLesson>;
