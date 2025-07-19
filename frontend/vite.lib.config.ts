import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
  },
  build: {
    lib: {
      entry: 'src/mountEvents.tsx',
      name: 'KosgeEvents',
      formats: ['iife'],
      fileName: () => 'kosge-events.js',
    },
    outDir: 'public',
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
});