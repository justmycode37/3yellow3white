import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  worker: { format: 'es' },
  // Keep QuickJS's URL-relative WASM beside its loader in development.
  optimizeDeps: { exclude: ['quickjs-emscripten', 'quickjs-emscripten-core', '@jitl/quickjs-wasmfile-debug-sync', '@jitl/quickjs-wasmfile-debug-asyncify', '@jitl/quickjs-wasmfile-release-sync', '@jitl/quickjs-wasmfile-release-asyncify'] },
  // The linked animlib package and its QuickJS WASM are outside this app root.
  server: { fs: { allow: [searchForWorkspaceRoot(process.cwd())] }, proxy: { '/api': 'http://localhost:8080' } },
  base: command === 'build' ? '/static/' : '/',
  build: { outDir: '../site', emptyOutDir: true },
}))
