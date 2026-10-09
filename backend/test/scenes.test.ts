import { expect, test } from "bun:test";
import { compileSource, evaluateScene, SceneSequence } from "animlib/core";
import type { Frame } from "animlib/core";

const first = `export default scene({}, s => {
  const x = s.slider('x', { min: 0, max: 5, default: 2 });
  const dot = s.circle('dot', { position: [x, 0] });
  s.keep(dot);
  s.play(s.camera.to3D({ yaw: 0.4 }), { duration: 1 });
});`;

const second = `export default scene({}, s => {
  s.text('caption', { text: 'The dot persists without being mentioned.' });
  s.wait(1);
});`;

const third = `export default scene({}, s => {
  const dot = s.previous.get('dot');
  const exiting = s.previous.exiting();
  s.play([dot.moveTo([0, 1]), exiting.fadeOut()], { duration: 1 });
  s.remove(exiting);
});`;

test("Bun computes serializable scene handoffs with the shared compiler", async () => {
  expect(typeof document).toBe("undefined");
  const a = await compileSource(first);
  const b = await compileSource(second, { previous: evaluateScene(a, a.duration) });
  const handoff: Frame = JSON.parse(JSON.stringify(evaluateScene(b, b.duration)));
  expect(handoff.elements.find(element => element.id === "dot")?.position).toEqual([2, 0, 0]);
  expect(handoff.elements.find(element => element.id === "caption")?.persistent).toBe(false);
  expect(handoff.camera.yaw).toBe(0.4);
  const c = await compileSource(third, { previous: handoff });
  const end = evaluateScene(c, c.duration);
  expect(end.elements.map(element => element.id)).toEqual(["dot"]);
  expect(end.elements[0].position).toEqual([0, 1, 0]);
});

test("Bun reconstructs sequence handoffs after upstream control changes", async () => {
  const sequence = new SceneSequence();
  try {
    const result = await sequence.submit({ type: "load", scenes: [{ id: "first", source: first }, { id: "second", source: second }] });
    expect(result).toMatchObject({ ok: true });
    await sequence.setControl("first", "x", 4);
    const handoff = sequence.frame(1, sequence.compiled[1].duration);
    expect(handoff.elements.find(element => element.id === "dot")?.position).toEqual([4, 0, 0]);
  } finally {
    sequence.dispose();
  }
});
