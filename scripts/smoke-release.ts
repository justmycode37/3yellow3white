import assert from "node:assert/strict";
import { createHandler } from "../backend/src/server.js";
import { compileSource, evaluateScene } from "animlib/core";
import { buildStorylineMessages } from "../backend/src/storyline-prompt.js";
import { parseStoryline } from "../backend/src/narration/markdown.js";

const revision = (await Bun.file(new URL("../REVISION", import.meta.url)).text()).trim();
assert.equal(process.env.APP_REVISION, revision);
const guidance = (await buildStorylineMessages("Release verification"))[0].content;
assert(guidance.includes("PRODUCTION HANDOFF"), "Storyline guidance is missing from the release");
assert.equal(parseStoryline("Narration: A working release.").beats.length, 1);
const scene = await compileSource(`export default scene({}, s => {
  const dot = s.circle('dot', { position: [2, 0] });
  s.keep(dot); s.wait(1);
});`);
assert.deepEqual(evaluateScene(scene, 1).elements[0].position, [2, 0, 0]);
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: createHandler() });
try {
  const response = await fetch(new URL("/healthz", server.url));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, revision });
  for (const route of ["/", "/plan", "/settings", "/watch/demo"]) {
    const page = await fetch(new URL(route, server.url));
    assert.equal(page.status, 200, route);
    const html = await page.text();
    const assets = [...html.matchAll(/(?:src|href)="(\/static\/[^\"]+)"/g)];
    assert(assets.length > 0, `${route}: missing built assets`);
    for (const [, path] of assets) {
      const asset = await fetch(new URL(path, server.url));
      assert.equal(asset.status, 200, path);
      await asset.arrayBuffer();
    }
  }
  console.log(`Release smoke check passed: ${revision}`);
} finally {
  server.stop(true);
}
