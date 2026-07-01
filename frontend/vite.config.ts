import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Proxy moi request /api sang backend Flask (AI YOLOv8) o cong 5001.
      // (Cong 5000 bi macOS AirPlay Receiver/ControlCenter chiem.)
      proxy: {
        '/api': {
          target: process.env.FIRE_API_URL || 'http://127.0.0.1:5001',
          changeOrigin: true,
        },
      },
    },
  };
});
