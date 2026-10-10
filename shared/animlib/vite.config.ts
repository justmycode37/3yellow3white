import { defineConfig, searchForWorkspaceRoot } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "demo",
  // QuickJS's WASM lives in the workspace's hoisted node_modules directory.
  server: { fs: { allow: [searchForWorkspaceRoot(fileURLToPath(new URL(".", import.meta.url)))] }, proxy: { "/api": process.env.NARRATION_API_TARGET ?? "http://127.0.0.1:8080" } },
  build: { outDir: "../dist/demo", emptyOutDir: false },
});
