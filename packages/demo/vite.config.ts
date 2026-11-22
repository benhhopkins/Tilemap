import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const coreSrc = fileURLToPath(new URL('../core/src/index.ts', import.meta.url));

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    watch: {
      // WSL mounts the Windows filesystem over 9p/drvfs, where inotify events
      // never fire. Set VITE_USE_POLLING=1 to make hot reload work from /mnt/c.
      usePolling: process.env.VITE_USE_POLLING === '1',
      interval: 300,
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  resolve: {
    // Build the core package from source so edits hot-reload with no rebuild.
    alias: {
      '@pixitilemap/core': coreSrc,
    },
  },
});
