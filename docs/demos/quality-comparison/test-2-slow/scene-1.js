const __narration=(()=>{const data={audioAssetId:'d633346a367b1852125e5af608ee2c628884bc839be6e460fb79172b2b0ce27f.beat-2',endMode:'hold',durationSec:26.3345,words:{1:[0.012,0.186],2:[0.255,0.499],3:[0.557,0.639],4:[0.697,1.033],5:[1.068,1.451],6:[1.707,2.368],7:[2.438,2.694],8:[2.74,2.821],9:[2.868,3.332],10:[3.355,3.483],11:[3.529,3.646],12:[3.68,4.261],13:[4.319,4.609],14:[4.853,5.166],15:[5.213,5.329],16:[5.375,5.944],17:[5.979,6.258],18:[6.815,7.024],19:[7.094,7.454],20:[7.5,7.825],21:[7.895,7.953],22:[8.011,8.081],23:[8.127,8.44],24:[8.522,8.963],25:[9.033,9.625],26:[9.671,9.95],27:[10.275,10.426],28:[10.542,10.96],29:[11.018,11.273],30:[11.331,11.923],31:[11.958,12.016],32:[12.086,12.794],33:[13.015,13.177],34:[13.235,13.514],35:[13.572,13.665],36:[13.746,13.955],37:[14.199,14.443],38:[14.594,14.837],39:[15.081,15.255],40:[15.499,15.743],41:[15.894,16.219],42:[16.834,16.95],43:[17.032,17.217],44:[17.333,17.728],45:[17.798,18.1],46:[18.146,18.564],47:[18.889,19.005],48:[19.063,19.446],49:[19.493,19.957],50:[20.004,20.538],51:[20.828,21.49],52:[21.559,21.908],53:[21.954,22.488],54:[22.535,22.825],55:[22.895,23.162],56:[23.22,23.324],57:[23.382,23.452],58:[23.522,23.986]}};const get=(id,index)=>{const n=id.replace('beat-2.u1.w','');if(!Object.hasOwn(data.words,n))throw new Error('Unknown narration word ID: '+id);return data.words[n][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const start = n => __narration.start('beat-2.u1.w' + n);
  const end = n => __narration.end('beat-2.u1.w' + n);
  let cursor = 0;
  const until = t => { if (t > cursor) s.wait(t - cursor); cursor = t; };
  const playTo = (t, actions) => { s.play(actions, { duration: t - cursor, ease: 'smooth' }); cursor = t; };
  const template = s.previous.get('template');
  const rna = s.previous.get('rna');
  const polymerase = s.previous.get('polymerase');
  const dnaLabel = s.previous.get('DNA-label');
  const rnaLabel = s.previous.get('RNA-label');
  const tb = [], rb = [], tl = [], rl = [], pairs = [], backbones = [];
  for (let i = 0; i < 6; i++) {
    tb.push(s.previous.get('template-base-' + i));
    rb.push(s.previous.get('rna-base-' + i));
    tl.push(s.previous.get('template-letter-' + i));
    rl.push(s.previous.get('rna-letter-' + i));
    pairs.push(s.previous.get('rna-template-pair-' + i));
    s.attach(tl[i], tb[i], { offset: [0, 0, 0] });
    s.attach(rl[i], rb[i], { offset: [0, 0, 0] });
    s.connect(pairs[i], tb[i], rb[i], { endpoints: 'surface' });
    if (i > 0) {
      s.connect(s.previous.get('template-backbone-' + i), tb[i-1], tb[i], { endpoints: 'surface' });
      backbones[i] = s.previous.get('rna-backbone-' + i);
      s.connect(backbones[i], rb[i-1], rb[i], { endpoints: 'surface' });
    }
  }
  s.attach(s.previous.get('template-3prime'), tb[0], { offset: [-0.775, 0, 0] });
  s.attach(s.previous.get('template-5prime'), tb[5], { offset: [0.775, 0, 0] });
  let five, three, tip, readArrow, growArrow;
  // Preserve the evaluated flat close-up: a direction comparison is planar.
  s.view('transcription-view', {
    rect: [0.06, 0.14, 0.88, 0.7], orbit: true, orbitHitTest: 'geometry',
    camera: { yaw: 0, pitch: 0, target: [0,0,0], height: 6.2, distance: 15, perspective: 0 }
  }, v => {
    tip = v.sphere('rna-growing-tip', { radius: 0.01, position: [0.525,-0.8,0], opacity: 0 });
    five = v.text('rna-5prime', { text: '5′', fontSize: 0.4, fill: Color.GREEN, position: [-3.4,-0.8,0], billboard: true, opacity: 0 });
    three = v.text('rna-3prime', { text: '3′', fontSize: 0.4, fill: Color.GREEN, position: [0.525,-1.75,0], billboard: true, opacity: 0 });
    v.attach(five, rb[0], { offset: [-0.775,0,0] });
    v.attach(three, tip, { offset: [0,-0.95,0] });
    readArrow = v.arrow('template-reading-direction', { points: [[-2.625,1.95,0],[2.625,1.95,0]], stroke: Color.TEAL, strokeWidth: 0.055, opacity: 0 });
    growArrow = v.arrow('rna-growth-direction', { points: [[-2.625,-2.2,0],[1.575,-2.2,0]], stroke: Color.GREEN, strokeWidth: 0.055, opacity: 0 });
  });
  // No new RNA is exposed during the initial direction inspection.
  until(start(1));
  playTo(end(5), [s.camera.to2D({height: 8}), dnaLabel.moveTo([0,2.4,0]), rnaLabel.moveTo([0,-2.5,0]), five.fadeIn(), three.fadeIn()]);
  until(start(7));
  playTo(end(9), [readArrow.fadeIn()]);
  until(start(14));
  playTo(end(17), [polymerase.moveTo([1.575,0,0])]);
  until(start(20));
  playTo(end(24), [rb[4].fadeIn(), rl[4].fadeIn(), backbones[4].fadeIn(), pairs[4].fadeIn(), tip.moveTo([1.575,-0.8,0])]);
  until(start(28));
  playTo(end(28), [growArrow.fadeIn()]);
  until(start(29));
  playTo(end(30), [polymerase.moveTo([2.625,0,0])]);
  until(start(31));
  playTo(end(32), [rb[5].fadeIn(), rl[5].fadeIn(), backbones[5].fadeIn(), pairs[5].fadeIn(), tip.moveTo([2.625,-0.8,0]), growArrow.morphTo({kind: 'arrow', points: [[-2.625,-2.2,0],[2.625,-2.2,0]]})]);
  // Read the actual strand, not a duplicate sequence in a text panel.
  for (let i = 0; i < 6; i++) {
    const w = 36 + i;
    until(start(w));
    const mid = (start(w) + end(w)) / 2;
    playTo(mid, [rl[i].scaleTo(1.2)]);
    playTo(end(w), [rl[i].scaleTo(1)]);
  }
  until(start(42));
  playTo(start(44), [readArrow.fadeOut(), growArrow.fadeOut()]);
  until(start(44));
  playTo(end(44), [...pairs.map(p => p.fadeOut()), polymerase.fadeOut()]);
  pairs.forEach(p => s.remove(p));
  s.remove(polymerase);
  s.remove(readArrow);
  s.remove(growArrow);
  until(start(45));
  // A rigid translation preserves all RNA backbone lengths during release.
  playTo(end(46), [rna.moveTo([0,-0.65,0.8]), tip.moveTo([2.625,-1.45,0.8])]);
  until(__narration.durationSec);
});