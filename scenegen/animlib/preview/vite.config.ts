import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// SCENEGEN_PREVIEW_DIR holds preview.json (written by `scenegen preview`).
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: process.env.SCENEGEN_PREVIEW_DIR,
  server: { fs: { allow: [fileURLToPath(new URL("../../..", import.meta.url))] }, port: 5199, strictPort: false },
});
