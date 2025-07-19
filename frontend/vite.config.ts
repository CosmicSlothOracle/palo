import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 5000,
  },
  define: {
    // Provide an empty object for process.env so imported code that checks env vars does not crash in browser
    'process.env': {},
  },
  build: {
    // Build to docs directory for Netlify deployment
    outDir: '../docs/react-app',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html',
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  base: './',
});