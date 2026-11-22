import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Library build: emits a single ESM bundle, with `pixi.js` kept external so the
 * consuming application controls which PixiJS version is loaded. Type
 * declarations are emitted separately by `tsc --project tsconfig.build.json`.
 */
export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['pixi.js'],
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
