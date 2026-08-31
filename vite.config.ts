// Version: 2.0.0 | Updated: 2026-08-18 | By: Agent
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ZChart',
      fileName: 'zchart',
      formats: ['es'],
    },
    sourcemap: true,
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
