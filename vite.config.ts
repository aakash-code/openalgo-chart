import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression({ algorithm: 'gzip' })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@context': path.resolve(__dirname, './src/context'),
      '@types': path.resolve(__dirname, './src/types'),
      '@store': path.resolve(__dirname, './src/store'),
      '@constants': path.resolve(__dirname, './src/constants'),
    },
  },
  // Production build optimizations
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate heavy vendor libraries into their own chunks
          'vendor-chart': ['lightweight-charts'],
          'vendor-monaco': ['@monaco-editor/react'],
          'vendor-react': ['react', 'react-dom'],
          'vendor-zustand': ['zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  // Pre-bundle heavy dependencies for faster dev server startup
  optimizeDeps: {
    include: ['lightweight-charts', 'react', 'react-dom', 'zustand'],
  },
  server: {
    port: 5001,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if ('writeHead' in res) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend unavailable' }));
            }
          });
        },
      },
      '/ws': {
        target: 'ws://127.0.0.1:8765',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if ('destroy' in res) res.destroy();
          });
        },
      },
      '/npl-time': {
        target: 'https://www.nplindia.in',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/npl-time/, '/cgi-bin/ntp_client'),
        secure: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if ('writeHead' in res) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'NTP unavailable' }));
            }
          });
        },
      },
    },
  },
});
