const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-attention\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const until = f => { const t = D * f; if (t > cursor) s.wait(t - cursor); cursor = t; };
  const playTo = (f, actions) => { const t = D * f; s.play(actions, { duration: t - cursor, ease: 'smooth' }); cursor = t; };
  s.play(s.camera.to2D({ height: 10, target: [0, 0, 0] }), { duration: 0 });
  const Q = [[1,0],[0,1],[1,1]];
  const K = [[1,0],[0,1],[-1,0]];
  const V = [[2,0],[0,2],[-1,1]];
  const scores = Q.map(q => K.map(k => q[0]*k[0]+q[1]*k[1]));
  const A = scores.map(row => { const e = row.map(x => Math.exp(x)); const z = e.reduce((a,b)=>a+b,0); return e.map(x=>x/z); });
  const colors = [Color.BLUE, Color.TEAL, Color.PURPLE];
  const ys = [1.45, 0.55, -0.35];
  const lx = [-3.55,-2.15,-0.75], rx = [1.6,3,4.4];
  const tex = (id, value, position, size = 0.34, fill = Color.WHITE) => s.latex(id, { tex: value, position, fontSize: size, fill });
  const note = s.text('example-note', { text: 'Toy vectors; unscaled dot products', position: [0,3.65], fontSize: 0.27, fill: Color.GREY_B });
  const scoreTitle = tex('score-title', 'QK^{\\mathsf T}', [-2.15,3], 0.46);
  const weightTitle = tex('weight-title', 'A=\\operatorname{softmax}_{\\rm row}(QK^{\\mathsf T})', [3,3], 0.37);
  const inputLabels = [];
  const columnLabels = [];
  for(let j=0;j<3;j++) {
    inputLabels.push(tex('key-'+j, `k_${j+1}=(${K[j].join(',')})`, [lx[j],2.25], 0.27, colors[j]));
    columnLabels.push(tex('weight-key-'+j, `k_${j+1}`, [rx[j],2.25], 0.31, colors[j]));
  }
  for(let i=0;i<3;i++) inputLabels.push(tex('query-'+i, `q_${i+1}=(${Q[i].join(',')})`, [-5.18,ys[i]], 0.29, i===0?Color.GOLD:Color.WHITE));
  const scoreCells = [], weightCells = [];
  for(let i=0;i<3;i++) {
    scoreCells[i]=[]; weightCells[i]=[];
    for(let j=0;j<3;j++) {
      const box = s.rectangle(`score-box-${i}-${j}`, { width: 1.24, height: 0.73, fill: {color: Color.GREY_B, opacity: 0.08 + 0.06*(scores[i][j]+1)}, stroke: Color.GREY_D, strokeWidth: 0.018 });
      const n = tex(`score-number-${i}-${j}`, String(scores[i][j]), [0,0], 0.4);
      scoreCells[i][j]=s.group(`score-cell-${i}-${j}`, [box,n], { position: [lx[j],ys[i]], opacity: 0 });
      const wb = s.rectangle(`weight-box-${i}-${j}`, { width: 1.24, height: 0.73, fill: {color: colors[j], opacity: 0.10 + 0.65*A[i][j]}, stroke: {color: colors[j], opacity:0.65}, strokeWidth: 0.022 });
      const wn = tex(`weight-number-${i}-${j}`, A[i][j].toFixed(3), [0,0], 0.34);
      weightCells[i][j]=s.group(`weight-cell-${i}-${j}`, [wb,wn], {position:[rx[j],ys[i]], opacity:0});
    }
  }
  const scoreSelect = s.rectangle('score-row-selection', { position:[-2.15,ys[0]], width:4.23,height:0.86,fill:Color.NONE,stroke:Color.GOLD,strokeWidth:0.035,opacity:0 });
  const selected = s.rectangle('selected-attention-row', { position:[3,ys[0]],width:4.23,height:0.86,fill:Color.NONE,stroke:Color.GOLD,strokeWidth:0.035,opacity:0 });
  const rowArrows=[];
  for(let i=0;i<3;i++) {
    const a=s.circle('score-port-'+i,{position:[0.02,ys[i]],radius:0.01,opacity:0});
    const b=s.circle('weight-port-'+i,{position:[0.86,ys[i]],radius:0.01,opacity:0});
    const line=s.arrow('row-softmax-'+i,{stroke:i===0?Color.GOLD:Color.GREY_B,strokeWidth:0.025,opacity:0});
    s.connect(line,a,b);
    rowArrows.push(line);
  }
  playTo(0.05, [note.fadeIn(), scoreTitle.fadeIn(), weightTitle.fadeIn(), ...inputLabels.map(x=>x.fadeIn()), ...columnLabels.map(x=>x.fadeIn())]);
  playTo(0.11, scoreCells.flat().map(x=>x.fadeIn()));
  const dotExample = tex('dot-example', 'q_1\\cdot k_3=(1)(-1)+(0)(0)=-1', [0,-1.7], 0.42);
  playTo(0.15,[scoreSelect.fadeIn(),dotExample.fadeIn()]);
  until(0.19);
  playTo(0.21,[dotExample.fadeOut()]);
  s.remove(dotExample);
  const normalization = tex('normalization', 'a_{1j}=\\frac{e^{s_{1j}}}{e^1+e^0+e^{-1}}', [0,-1.8], 0.48);
  playTo(0.25,[normalization.fadeIn(),rowArrows[0].fadeIn(),...weightCells[0].map(x=>x.fadeIn()),selected.fadeIn()]);
  playTo(0.30,[rowArrows[1].fadeIn(),...weightCells[1].map(x=>x.fadeIn())]);
  playTo(0.35,[rowArrows[2].fadeIn(),...weightCells[2].map(x=>x.fadeIn())]);
  const sum = tex('row-sum', '\\sum_j a_{ij}=1', [3,-1.25], 0.35);
  playTo(0.38,[sum.fadeIn()]);
  until(0.44);
  const obsolete = [scoreTitle,weightTitle,...inputLabels,...columnLabels,...scoreCells.flat(),...weightCells[1],...weightCells[2],...rowArrows,scoreSelect,normalization,sum];
  playTo(0.49, obsolete.map(x=>x.fadeOut()));
  obsolete.forEach(x=>s.remove(x));
  playTo(0.54,[...weightCells[0].map((x,j)=>x.moveTo([-2+2*j,2.1])), selected.moveTo([0,2.1]),selected.morphTo({kind:'rectangle',width:5.6,height:0.9})]);
  const rowTitle = tex('selected-row-title', 'a_1=\\operatorname{softmax}(1,0,-1)', [0,3.0], 0.43, Color.GOLD);
  playTo(0.56,[rowTitle.fadeIn()]);
  const origin=[-1.5,-1.8];
  const unit=1.5;
  const weighted=V.map((v,j)=>v.map(x=>unit*A[0][j]*x));
  const total=V.reduce((out,v,j)=>[out[0]+A[0][j]*v[0],out[1]+A[0][j]*v[1]],[0,0]);
  const axes=[];
  axes.push(s.line('value-axis-x',{points:[[-3.35,origin[1]],[2,origin[1]]],stroke:Color.GREY_D,strokeWidth:0.018,opacity:0}));
  axes.push(s.line('value-axis-y',{points:[[origin[0],-2.25],[origin[0],1.4]],stroke:Color.GREY_D,strokeWidth:0.018,opacity:0}));
  const tickLabels=[];
  for(let n=-1;n<=2;n++) {
    if(n!==0) {
      axes.push(s.line('x-tick-'+n,{points:[[origin[0]+unit*n,origin[1]-0.065],[origin[0]+unit*n,origin[1]+0.065]],stroke:Color.GREY_C,strokeWidth:0.017,opacity:0}));
      tickLabels.push(tex('x-tick-label-'+n,String(n),[origin[0]+unit*n,origin[1]-0.27],0.23,Color.GREY_B));
    }
  }
  const vectors=[], tips=[], arrows=[], valueLabels=[];
  for(let j=0;j<3;j++) {
    const tail=s.circle('value-tail-'+j,{radius:0.015,opacity:0});
    const tip=s.circle('value-tip-'+j,{radius:0.015,position:[unit*V[j][0],unit*V[j][1]],opacity:0});
    const arrow=s.arrow('value-vector-'+j,{stroke:colors[j],strokeWidth:0.055,opacity:0});
    const group=s.group('value-assembly-'+j,[tail,tip,arrow],{position:origin});
    s.connect(arrow,tail,tip);
    vectors.push(group); tips.push(tip); arrows.push(arrow);
    valueLabels.push(tex('value-label-'+j,`v_${j+1}=(${V[j].join(',')})`,[-3.6+3.6*j,-3.05],0.4,colors[j]));
  }
  playTo(0.61,[...axes.map(x=>x.fadeIn()),...tickLabels.map(x=>x.fadeIn()),...arrows.map(x=>x.fadeIn()),...valueLabels.map(x=>x.fadeIn())]);
  until(0.65);
  playTo(0.72,[...tips.map((tip,j)=>tip.moveTo(weighted[j])),...valueLabels.map((label,j)=>label.morphTo({kind:'latex',tex:`${A[0][j].toFixed(3)}\\,(${V[j].join(',')})`,fontSize:0.4},{map:{}}))]);
  until(0.75);
  const secondOrigin=[origin[0]+weighted[0][0],origin[1]+weighted[0][1]];
  const thirdOrigin=[secondOrigin[0]+weighted[1][0],secondOrigin[1]+weighted[1][1]];
  playTo(0.81,[vectors[1].moveTo(secondOrigin),vectors[2].moveTo(thirdOrigin)]);
  const start=s.circle('output-tail',{position:origin,radius:0.045,fill:Color.GOLD,stroke:Color.NONE});
  const finish=s.circle('output-tip',{position:origin,radius:0.055,fill:Color.GOLD,stroke:Color.NONE});
  const result=s.arrow('mixed-vector',{stroke:Color.GOLD,strokeWidth:0.06});
  s.connect(result,start,finish);
  const resultFormula=tex('mix-rule','o_1=\\sum_j a_{1j}v_j',[3.65,0.2],0.4,Color.GOLD);
  const resultNumber=tex('mix-result',`\\approx(${total.map(x=>x.toFixed(3)).join(',')})`,[3.65,-0.55],0.43,Color.GOLD);
  const port=s.circle('selected-row-port',{position:[2.85,2.1],radius:0.01,opacity:0});
  s.attach(port,selected,{offset:[2.85,0,0]});
  const formulaPort=s.circle('mix-formula-port',{position:[3.65,0.75],radius:0.01,opacity:0});
  s.attach(formulaPort,resultFormula,{offset:[0,0.55,0]});
  const relation=s.arrow('selected-row-to-mix',{stroke:{color:Color.GOLD,opacity:0.65},strokeWidth:0.023,opacity:0});
  s.connect(relation,port,formulaPort);
  playTo(0.875,[finish.moveTo([origin[0]+unit*total[0],origin[1]+unit*total[1]]),resultFormula.fadeIn(),resultNumber.fadeIn(),relation.fadeIn()]);
  const outputLabel=tex('output-vector-label','o_1',[-0.45,-0.93],0.38,Color.GOLD);
  playTo(0.9,[outputLabel.fadeIn()]);
  until(1);
});