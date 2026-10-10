import { defineConfig, searchForWorkspaceRoot } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "demo",
  // QuickJS's WASM lives in the workspace's hoisted node_modules directory.
  server: { fs: { allow: [searchForWorkspaceRoot(fileURLToPath(new URL(".", import.meta.url)))] }, proxy: { "/api": process.env.NARRATION_API_TARGET ?? "http://127.0.0.1:8080" } },
  build: { outDir: "../dist/demo", emptyOutDir: false, rollupOptions: { input: {
    main: fileURLToPath(new URL('./demo/index.html', import.meta.url)),
    behaviors: fileURLToPath(new URL('./demo/behaviors.html', import.meta.url)),
    quality: fileURLToPath(new URL('./demo/quality.html', import.meta.url)),
    plant: fileURLToPath(new URL('./demo/plant.html', import.meta.url)),
    spatial: fileURLToPath(new URL('./demo/spatial.html', import.meta.url)),
  } } },
});
