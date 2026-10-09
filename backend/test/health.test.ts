import { afterEach, expect, test } from "bun:test";
import { createHandler } from "../src/server.js";

const originalRevision = process.env.APP_REVISION;
afterEach(() => {
  if (originalRevision === undefined) delete process.env.APP_REVISION;
  else process.env.APP_REVISION = originalRevision;
});

test("health check identifies the deployed revision", async () => {
  process.env.APP_REVISION = "a".repeat(40);
  const response = await createHandler()(new Request("http://localhost/healthz"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, revision: "a".repeat(40) });
});

test("local health checks remain valid without a deployment revision", async () => {
  delete process.env.APP_REVISION;
  const response = await createHandler()(new Request("http://localhost/healthz"));
  expect(await response.json()).toEqual({ ok: true });
});
