import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the built site works from a subdirectory. start.ng (and
  // most static hosts) may serve the game from a path, not the domain root —
  // absolute "/assets/..." URLs would 404 there.
  base: './',
  build: {
    outDir: 'dist',
    // Three.js is large, and a single-file bundle would be ~600kb. Splitting it
    // out lets the host cache it separately from the game code.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
