import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  // Prevent Vite from pre-bundling MediaPipe — it loads its own WASM
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});

