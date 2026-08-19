import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

// One Global People frontend build.
// Deployment target is a static host (Verpex) fronted by a CDN; the API lives elsewhere.

/**
 * What gets a pre-compressed `.br` / `.gz` sibling.
 *
 * Deliberately not the plugin default: that omits `.splinecode`, and the Spline scenes are the
 * largest assets in the build. Images stay out — webp and avif are already compressed, and a
 * second pass costs build time to save nothing.
 */
const COMPRESSIBLE = /\.(js|mjs|json|css|html|svg|splinecode)$/i;
export default defineConfig({
  plugins: [
    react(),
    // The default filter covers js/css/json/html. `.splinecode` is added because the
    // invitation scene is 4 MB and is by a wide margin the heaviest thing the app serves:
    // it is msgpack rather than text, so gzip barely moves it, but brotli takes it to
    // roughly 1 MB. Leaving it out meant shipping the uncompressed 4 MB.
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
    // Textures and audio must stay as separate cacheable files — never inlined as data URIs.
    assetsInlineLimit: 0,
    sourcemap: false,
    rollupOptions: {
      output: {
        /**
         * Name only what is worth naming, and never use a catch-all.
         *
         * A catch-all `return 'vendor'` is what put 4.37 MB of Spline runtime on the landing
         * page's critical path. `scheduler` is a react-dom dependency whose path contains
         * neither "react" nor any other test above it, so it fell into `vendor` — and because
         * react-dom imports it statically, the whole chunk became a static import of
         * `vendor-react`, which `index` imports statically in turn. Every visitor downloaded
         * the entire 3D runtime before the first frame of darkness, in weave mode too, where
         * it is never used at all. §2.14 budgets the opening critical path at 600 KB gzip.
         *
         * Two rules follow, and they are the whole of the fix:
         *
         *   1. Anything large and conditionally loaded gets its OWN chunk, so nothing else can
         *      be grouped with it and drag it in.
         *   2. Everything unmatched returns `undefined` — Rollup then places it by its real
         *      import graph, which is the behaviour that cannot produce this class of bug.
         *
         * Verify with: does `vendor-react` statically import anything heavy? It must not.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // Lazy by construction: only `SplineEntrance` imports it, and only when the Spline
          // entrance is the selected threshold. Isolated so it stays that way.
          if (id.includes('@splinetool')) return 'vendor-spline';

          if (id.includes('@react-three') || /node_modules[\\/]three[\\/]/.test(id)) {
            return 'vendor-three';
          }
          if (id.includes('gsap')) return 'vendor-gsap';
          if (id.includes('react-router')) return 'vendor-router';

          // `scheduler` belongs with React: it is react-dom's runtime dependency, and the
          // omission that started all of this.
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
