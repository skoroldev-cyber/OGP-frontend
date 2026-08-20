import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

const COMPRESSIBLE = /\.(js|mjs|json|css|html|svg|splinecode)$/i;
export default defineConfig({
  plugins: [
    react(),
    viteCompression({ algorithm: 'gzip', ext: '.gz', filter: COMPRESSIBLE }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', filter: COMPRESSIBLE }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('@splinetool')) return 'vendor-spline';

          if (id.includes('@react-three') || /node_modules[\\/]three[\\/]/.test(id)) {
            return 'vendor-three';
          }
          if (id.includes('gsap')) return 'vendor-gsap';
          if (id.includes('react-router')) return 'vendor-router';

          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';

          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
  },
});
