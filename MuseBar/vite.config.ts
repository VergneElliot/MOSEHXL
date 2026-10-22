import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      // Cashier PCs may run older Chromium; CRA previously transpiled to ES5.
      targets: ['defaults', 'not dead', 'chrome >= 49', 'firefox >= 52', 'safari >= 10'],
    }),
    VitePWA({
      // Existing public/manifest.webmanifest — do not generate a second one.
      manifest: false,
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: [
        'favicon.ico',
        'favicon-32.png',
        'apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'manifest.webmanifest',
      ],
      workbox: {
        // Static shell only. Hashed assets update via new SW revision.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
        globIgnores: ['**/*.map'],
        navigateFallback: '/index.html',
        // Never SPA-fallback API (or other non-app paths).
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
        // No CacheFirst/StaleWhileRevalidate for APIs — fiscal/auth must hit the network.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@mosehxl/types': path.resolve(__dirname, 'packages/types/src/index.ts'),
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Vendor code changes rarely; keeping it in its own chunks lets cashier PCs reuse the
        // cached copy across app releases and keeps the app chunk under Rollup's 500 kB warning.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
            return 'vendor-react';
          }
          if (/node_modules\/@mui\/icons-material\//.test(id)) return 'vendor-mui-icons';
          if (/node_modules\/(@mui|@emotion)\//.test(id)) return 'vendor-mui';
          if (/node_modules\/(i18next|react-i18next)\//.test(id)) return 'vendor-i18n';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/index.tsx', 'src/setupTests.ts'],
      // Vitest flat thresholds (not Jest's `global` key). Baseline ~2026-09-02; ratchet +5% lines/quarter.
      thresholds: {
        lines: 1,
        statements: 1,
        branches: 60,
        functions: 60,
      },
    },
  },
});
