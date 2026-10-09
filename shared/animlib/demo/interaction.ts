import type { SceneSource } from '../src/types.js';

/** Open the demo with ?interactive to explore two independently controlled cameras. */
export const interactionSource: SceneSource = {
  id: 'interactive-views',
  source: String.raw`export default scene({ end: "hold", background: "BLACK" }, s => {
    const size = s.slider("size", { label: "Object size", default: 1, min: 0.5, max: 1.5, step: 0.05, position: [0.06, 0.12], width: 180 });
    const axes = s.toggle("axes", { label: "Show axes", default: true, position: [0.25, 0.12], width: 110 });
    let leftCamera;
    let rightCamera;
    function objects(v, prefix, color) {
      v.sphere(prefix + "-center", { radius: 0.45 * size, fill: color });
      v.sphere(prefix + "-satellite", { radius: 0.25 * size, position: [1.4, 0.5, 0.8], fill: "WHITE" });
      v.line3D(prefix + "-bond", { points: [[0,0,0], [1.4,0.5,0.8]], strokeWidth: 0.08 });
      if (axes) {
        v.arrow3D(prefix + "-x", { points: [[-2,0,0],[2,0,0]], stroke: "BLUE", strokeWidth: 0.035 });
        v.arrow3D(prefix + "-y", { points: [[0,-2,0],[0,2,0]], stroke: "GREEN", strokeWidth: 0.035 });
        v.arrow3D(prefix + "-z", { points: [[0,0,-2],[0,0,2]], stroke: "RED", strokeWidth: 0.035 });
      }
    }
    s.view("left", { rect: [0.04, 0.22, 0.44, 0.6], camera: { height: 5 } }, v => {
      objects(v, "left", "BLUE");
      leftCamera = v.camera;
    });
    s.view("right", { rect: [0.52, 0.22, 0.44, 0.6], camera: { height: 5, yaw: -0.6 } }, v => {
      objects(v, "right", "RED");
      rightCamera = v.camera;
    });
    s.text("title", { space: "screen", viewportOffset: [0, 0.43], text: "Explore in 3D", fontSize: 20, fill: "WHITE" });
    s.text("left-label", { space: "screen", viewportOffset: [-0.24, 0.26], text: "01 / CYAN", fontSize: 10, fill: "GREY" });
    s.text("right-label", { space: "screen", viewportOffset: [0.24, 0.26], text: "02 / CORAL", fontSize: 10, fill: "GREY_BROWN" });
    s.text("hint", { space: "screen", viewportOffset: [0, -0.36], text: "Drag to explore / each view rotates independently", fontSize: 12, fill: "GREY" });
    s.wait(3);
    s.play(leftCamera.animate({ yaw: 1.8, pitch: 0.2 }), { duration: 2 });
    s.wait(3);
    s.play(rightCamera.animate({ yaw: 0.8, pitch: 0.6 }), { duration: 2 });
    s.wait(4);
  });`,
};
