import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "demo",
  server: { fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] } },
  build: { outDir: "../dist/demo", emptyOutDir: false },
});
