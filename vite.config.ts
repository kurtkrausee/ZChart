import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      // Vite versteht relative Pfade mittlerweile von ganz allein!
      entry: 'src/index.ts', 
      name: 'zchart',
      fileName: 'index',
      formats: ['es']
    }
  }
});