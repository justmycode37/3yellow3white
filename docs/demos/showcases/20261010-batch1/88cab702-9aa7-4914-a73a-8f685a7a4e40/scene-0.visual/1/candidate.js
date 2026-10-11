const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-gyroscope\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({ mode: '2d', orbit: false, background: Color.BLACK, audio: __narration.audioAssetId, end: __narration.endMode }, s => {
  const D = __narration.durationSec;
  let cursor = 0;
  const wait = duration => { s.wait(duration); cursor += duration; };
  const play = (actions, duration) => { s.play(actions, { duration, ease: 'linear' }); cursor += duration; };
  s.play(s.camera.to2D({ height: 8 }), { duration: 0 });
  s.text('motion-description', { text: 'Idealized prescribed precession', position: [0, 2.95], fontSize: 0.34, fill: Color.WHITE });
  const note = s.text('model-status', { text: 'Kinematic model - not torque-integrated', position: [0, -2.95], fontSize: 0.25, fill: Color.GREY_B });
  let rotor, precession, model;
  const metal = { metalness: 0.75, roughness: 0.46 };
  const angle = Math.PI / 3;
  const axleLength = 3.25;
  const tipRadius = axleLength * Math.sin(angle);
  const tipHeight = axleLength * Math.cos(angle);
  s.view('gyro-view', {
    rect: [0, 0.15, 1, 0.7], orbit: true, orbitHitTest: 'geometry',
    camera: { yaw: 0.42, pitch: 0.23, height: 6.6, distance: 15, target: [0, 0.5, 0], perspective: 0.35 }
  }, v => {
    model = v;
    // A fixed bearing at the origin; all moving transforms share that pivot.
    v.cylinder('support-foot', { radius: 0.78, height: 0.18, position: [0, -1.89, 0], fill: Color.GREY_D, material: metal });
    v.cylinder('foot-inset', { radius: 0.55, height: 0.055, position: [0, -1.775, 0], fill: Color.GREY_B, material: metal });
    v.cone('support-pedestal', { radius: 0.26, height: 1.62, position: [0, -0.95, 0], fill: Color.GREY_C, material: metal, radialSegments: 40 });
    v.cylinder('bearing-cup', { radius: 0.21, height: 0.15, position: [0, -0.15, 0], fill: Color.GREY_B, material: metal });
    const pivot = v.sphere('fixed-pivot', { radius: 0.145, fill: Color.WHITE, material: { metalness: 0.5, roughness: 0.5 } });
    const pivotLabel = v.text('pivot-label', { text: 'Fixed pivot', position: [-1.1, -0.56, 0], billboard: true, fontSize: 0.24, fill: Color.WHITE });
    v.attach(pivotLabel, pivot, { offset: [-1.1, -0.56, 0] });
    const leaderStart = v.sphere('pivot-leader-anchor', { radius: 0.001, position: [-0.47, -0.34, 0], opacity: 0 });
    const leader = v.line3D('pivot-leader', { stroke: Color.GREY_B, strokeWidth: 0.014 });
    v.connect(leader, leaderStart, pivot, { endpoints: 'surface' });
    // Quiet vertical reference: precession is about this stationary axis.
    for (let i = 0; i < 9; i++) {
      v.line3D('vertical-reference-' + i, { points: [[0, 0.25 + i * 0.26, 0], [0, 0.37 + i * 0.26, 0]], stroke: { color: Color.GREY_B, opacity: 0.35 }, strokeWidth: 0.012 });
    }
    const spinningParts = [];
    spinningParts.push(v.torus('rotor-heavy-rim', { radius: 0.92, tubeRadius: 0.145, radialSegments: 80, tubularSegments: 16, fill: Color.GOLD, material: metal }));
    // Machined annular side faces: a substantial rim, not a filled icon disk.
    function annulus(id, y, inner, outer, color) {
      const vertices = [], triangles = [];
      const N = 72;
      for (let j = 0; j < N; j++) {
        const a = j * 2 * Math.PI / N;
        vertices.push([inner * Math.cos(a), y, inner * Math.sin(a)], [outer * Math.cos(a), y, outer * Math.sin(a)]);
      }
      for (let j = 0; j < N; j++) {
        const a = 2 * j, b = 2 * ((j + 1) % N);
        triangles.push([a, b, a + 1], [a + 1, b, b + 1]);
      }
      return v.mesh(id, { vertices, triangles, shading: 'flat', fill: color, stroke: Color.NONE, material: metal });
    }
    spinningParts.push(annulus('rim-front-face', 0.115, 0.81, 1.015, Color.GOLD));
    spinningParts.push(annulus('rim-rear-face', -0.115, 0.81, 1.015, Color.GOLD));
    spinningParts.push(v.cylinder('rotor-hub', { radius: 0.235, height: 0.43, radialSegments: 40, fill: Color.GREY_B, material: metal }));
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      spinningParts.push(v.box('rotor-spoke-' + i, { width: 0.66, height: 0.13, depth: 0.115, position: [0.52 * Math.cos(a), 0, -0.52 * Math.sin(a)], rotation: [0, a, 0], fill: i === 0 ? Color.BLUE : Color.GREY_B, material: metal }));
      spinningParts.push(v.cylinder('rim-fastener-' + i, { radius: 0.037, height: 0.035, position: [0.92 * Math.cos(a), 0.145, -0.92 * Math.sin(a)], radialSegments: 12, fill: Color.GREY_A, material: metal }));
    }
    spinningParts.push(v.box('rotor-index-mark', { width: 0.19, height: 0.026, depth: 0.11, position: [0.91, 0.147, 0], fill: Color.BLUE }));
    rotor = v.group('spinning-rotor', spinningParts, { position: [0, 2.04, 0] });
    const axle = v.cylinder('axle', { radius: 0.072, height: axleLength, position: [0, axleLength / 2, 0], radialSegments: 28, fill: Color.GREY_A, material: metal });
    const collars = [-1, 1].map((sign, i) => v.cylinder('axle-collar-' + i, { radius: 0.14, height: 0.1, position: [0, 2.04 + sign * 0.29, 0], fill: Color.GREY_D, material: metal }));
    const endCap = v.sphere('axle-tip', { radius: 0.084, position: [0, axleLength, 0], fill: Color.GREY_A, material: metal });
    const momentum = v.arrow3D('angular-momentum', { points: [[0, 3.4, 0], [0, 4.07, 0]], stroke: Color.BLUE, strokeWidth: 0.04 });
    const lAnchor = v.sphere('momentum-label-anchor', { radius: 0.001, opacity: 0, position: [0, 4.08, 0] });
    // The spin-direction arc is attached to the axle frame, not the spinning wheel.
    const spinPoints = [];
    for (let i = 0; i <= 32; i++) {
      const a = -0.4 + i / 32 * 1.45 * Math.PI;
      spinPoints.push([0.48 * Math.cos(a), 2.34, -0.48 * Math.sin(a)]);
    }
    const spinArc = v.path('spin-direction-arc', { points: spinPoints, stroke: Color.BLUE, strokeWidth: 0.026, strokeProfile: 'round', fill: Color.NONE });
    const a = -0.4 + 1.45 * Math.PI;
    const spinHead = v.arrow3D('spin-direction-head', { points: [spinPoints[32], [0.48 * Math.cos(a + 0.4), 2.34, -0.48 * Math.sin(a + 0.4)]], stroke: Color.BLUE, strokeWidth: 0.026 });
    const tilted = v.group('tilted-axle-assembly', [rotor, axle, ...collars, endCap, momentum, lAnchor, spinArc, spinHead], { rotation: [0, 0, -angle] });
    precession = v.group('precession-about-fixed-pivot', [tilted]);
    const L = v.latex('momentum-label', { tex: 'L', fontSize: 0.29, fill: Color.BLUE, billboard: true });
    v.attach(L, lAnchor, { offset: [0, 0.2, 0] });
  });
  wait(D * 0.05);
  // First establish axial spin alone; then carry the same spinning assembly
  // around the vertical axis. All lengths and the tilt remain invariant.
  play(rotor.rotateTo([0, 4 * Math.PI, 0]), D * 0.1);
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * 2 * Math.PI;
    const b = a + 0.065;
    model.line3D('precession-locus-' + i, { points: [[tipRadius * Math.cos(a), tipHeight, -tipRadius * Math.sin(a)], [tipRadius * Math.cos(b), tipHeight, -tipRadius * Math.sin(b)]], stroke: { color: Color.WHITE, opacity: 0.35 }, strokeWidth: 0.014 });
  }
  const sweep = [];
  for (let i = 0; i <= 18; i++) {
    const a = 1.1 + i / 18 * 0.65;
    sweep.push([tipRadius * Math.cos(a), tipHeight, -tipRadius * Math.sin(a)]);
  }
  model.path('precession-direction-arc', { points: sweep, stroke: Color.WHITE, strokeWidth: 0.026, strokeProfile: 'round', fill: Color.NONE });
  model.arrow3D('precession-direction-head', { points: [sweep[18], [tipRadius * Math.cos(1.9), tipHeight, -tipRadius * Math.sin(1.9)]], stroke: Color.WHITE, strokeWidth: 0.026 });
  play([rotor.rotateTo([0, 34 * Math.PI, 0]), precession.rotateTo([0, 2 * Math.PI, 0])], D * 0.75);
  play(note.morphTo({ kind: 'text', text: 'Frozen for inspection - kinematic model', fontSize: 0.25 }), 0);
  wait(D - cursor);
});