const __narration=(()=>{const data=JSON.parse("{\"audioAssetId\":\"silent-torus-knot\",\"endMode\":\"hold\",\"durationSec\":20,\"words\":{}}");const get=(id,index)=>{if(!Object.hasOwn(data.words,id))throw new Error('Unknown narration word ID: '+id);return data.words[id][index];};return Object.freeze({audioAssetId:data.audioAssetId,endMode:data.endMode,durationSec:data.durationSec,start:id=>get(id,0),end:id=>get(id,1)});})();
export default scene({
  mode: '3d', orbit: false, background: Color.BLACK,
  audio: __narration.audioAssetId, end: __narration.endMode,
}, s => {
  const duration = __narration.durationSec;
  let cursor = 0;
  const play = (actions, dt) => {
    s.play(actions, { duration: dt, ease: 'linear' });
    cursor += dt;
  };
  const holdTo = time => {
    if (time > cursor) s.wait(time - cursor);
    cursor = time;
  };
  s.play(s.camera.to2D({ height: 8.7 }), { duration: 0 });

  // Exact idealized (2,3) embedding, with the torus in the XY plane.
  // The periodic endpoint is NOT duplicated in the closed swept tube.
  const R = 1.85, r = 0.75, samples = 480;
  const tau = 2 * Math.PI;
  const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const unit = a => {
    const length = Math.sqrt(dot(a, a));
    return a.map(x => x / length);
  };
  function sample(t) {
    const c = Math.cos(2*t), sn = Math.sin(2*t);
    const q = R + r*Math.cos(3*t);
    const dq = -3*r*Math.sin(3*t), ddq = -9*r*Math.cos(3*t);
    const p = [q*c, q*sn, r*Math.sin(3*t)];
    const velocity = [dq*c-2*q*sn, dq*sn+2*q*c, 3*r*Math.cos(3*t)];
    const acceleration = [(ddq-4*q)*c-4*dq*sn, (ddq-4*q)*sn+4*dq*c, -9*r*Math.sin(3*t)];
    const T = unit(velocity);
    const tangential = dot(acceleration, T);
    const N = unit(acceleration.map((x,i) => x-tangential*T[i]));
    const B = cross(T,N);
    // Nested Z-Y-X pivots realize the orthonormal matrix [T N B].
    // Lift the displayed origin toward the viewing side; retain the curve point.
    const lift = [Math.sin(0.35)*Math.cos(0.28), Math.sin(0.28), Math.cos(0.35)*Math.cos(0.28)].map(x => 1.05*x);
    return { p, offset: [dot(lift,T), dot(lift,N), dot(lift,B)], angles: [Math.atan2(N[2], B[2]), Math.atan2(-T[2], Math.hypot(T[0],T[1])), Math.atan2(T[1],T[0])] };
  }
  const states = [];
  for (let i=0; i<=samples; i++) {
    const state = sample(tau*i/samples);
    if (i) {
      for (let j=0; j<3; j++) {
        while (state.angles[j]-states[i-1].angles[j] > Math.PI) state.angles[j] -= tau;
        while (state.angles[j]-states[i-1].angles[j] < -Math.PI) state.angles[j] += tau;
      }
    }
    states.push(state);
  }

  let knot, carrier, pitchJoint, rollJoint, frameOrigin;
  s.view('knot-view', {
    rect: [0, 0, 1, 1], orbit: true, orbitHitTest: 'geometry',
    camera: { yaw: 0.35, pitch: 0.28, height: 8.7, distance: 15, target: [0, 0.2, 0] },
  }, v => {
    knot = v.tube('torus-knot', {
      points: states.slice(0,samples).map(state => state.p),
      closed: true, radius: 0.135, radialSegments: 16,
      fill: Color.BLUE, stroke: Color.NONE,
      material: { roughness: 0.86, specular: 0.18 },
    });
    const axes = [
      ['tangent', [0.86,0,0], Color.YELLOW],
      ['normal', [0,0.86,0], Color.GREEN],
      ['binormal', [0,0,0.86], Color.RED],
    ].map(([id, end, color]) => v.arrow3D('frame-'+id, {
      points: [[0,0,0],end], stroke: color, strokeWidth: 0.045,
    }));
    // The whole triad rotates rigidly: no interpolated endpoint lengths.
    frameOrigin = v.group('frame-origin', axes, { position: states[0].offset });
    rollJoint = v.group('frame-roll', [frameOrigin], { rotation: [states[0].angles[0],0,0] });
    pitchJoint = v.group('frame-pitch', [rollJoint], { rotation: [0,states[0].angles[1],0] });
    const bead = v.sphere('curve-point', {
      radius: 0.18, fill: Color.WHITE,
      material: { roughness: 0.8, specular: 0.12 },
    });
    const link = v.line3D('frame-link', { stroke: Color.GREY_B, strokeWidth: 0.022 });
    carrier = v.group('moving-frame', [bead,pitchJoint,link], {
      position: states[0].p, rotation: [0,0,states[0].angles[2]],
    });
    v.connect(link, bead, frameOrigin);
  });

  // Quiet fixed key stays upright and outside the model's swept silhouette.
  const key = [
    s.text('tangent-key', { text: 'T  tangent', position: [-1.95,-3.04], fontSize: 0.25, fill: Color.YELLOW }),
    s.text('normal-key', { text: 'N  normal', position: [0,-3.04], fontSize: 0.25, fill: Color.GREEN }),
    s.text('binormal-key', { text: 'B  binormal', position: [1.95,-3.04], fontSize: 0.25, fill: Color.RED }),
    s.text('model-note', { text: '(2,3) · idealized curve', position: [0,3.1], fontSize: 0.20, fill: Color.GREY_B }),
  ];
  play([knot.fadeIn(), carrier.fadeIn(), ...key.map(label => label.fadeIn())], duration*0.04);
  holdTo(duration*0.075);
  const operationEnd = duration*0.9;
  const operationStart = cursor;
  // Dense deterministic sampling follows the same centerline used by the tube.
  // Between samples, nested rotation interpolation preserves a rigid unit frame.
  for (let i=1; i<=samples; i++) {
    const state = states[i];
    const next = operationStart+(operationEnd-operationStart)*i/samples;
    play([
      carrier.moveTo(state.p),
      carrier.rotateTo([0,0,state.angles[2]]),
      pitchJoint.rotateTo([0,state.angles[1],0]),
      rollJoint.rotateTo([state.angles[0],0,0]),
      frameOrigin.moveTo(state.offset),
    ], next-cursor);
  }
  holdTo(duration);
});