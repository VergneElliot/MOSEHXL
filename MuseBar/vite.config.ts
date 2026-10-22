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
      // Wave-2 Slice D: business-logic denominator only (no heavy UI .tsx trees).
      // Still includes src/components/**/*.ts helpers; excludes containers/pages.
      include: [
        'src/utils/**/*.{ts,tsx}',
        'src/contexts/**/*.ts',
        'src/hooks/**/*.{ts,tsx}',
        'src/services/**/*.{ts,tsx}',
        'src/components/**/*.ts',
        'src/i18n/**/*.ts',
        'src/pwa/**/*.ts',
        'src/config/**/*.ts',
      ],
      exclude: [
        'src/index.tsx',
        'src/setupTests.ts',
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/__tests__/**',
        'src/components/**/*.tsx',
        'src/pages/**',
        // Test-only helpers must not dilute the business-logic denominator.
        'src/utils/testing/**',
      ],
      // Vitest flat thresholds + glob keys (Vitest 3). Overall = measured−3 (wave-2 ~20.4% → 18).
      // Pure-module globs ≥80% aggregate (not perFile). Avoid `{ts,tsx}` braces in keys — micromatch
      // mis-resolves them and the threshold then applies to the wrong file set.
      // Never lower these floors (PLAN 564 / Slice E).
      thresholds: {
        lines: 18,
        statements: 18,
        branches: 60,
        functions: 60,
        'src/utils/**/*.ts': {
          lines: 80,
          statements: 80,
          branches: 70,
          functions: 80,
        },
        'src/contexts/*Policy.ts': {
          lines: 80,
          statements: 80,
          branches: 70,
          functions: 80,
        },
        'src/contexts/pinSessions*.ts': {
          lines: 80,
          statements: 80,
          branches: 70,
          functions: 80,
        },
        'src/contexts/pinActorFromVerify.ts': {
          lines: 80,
          statements: 80,
          branches: 70,
          functions: 80,
        },
        'src/**/*Draft*.ts': {
          lines: 80,
          statements: 80,
          branches: 70,
          functions: 80,
        },
        'src/**/*Totals*.ts': {
          lines: 80,
          statements: 80,
          branches: 70,
          functions: 80,
        },
        'src/components/POS/PaymentDialog/split*.ts': {
          lines: 80,
          statements: 80,
          branches: 70,
          functions: 80,
        },
        'src/components/Administration/adminSectionAccess.ts': {
          lines: 80,
          statements: 80,
          branches: 70,
          functions: 80,
        },
        'src/components/Closure/closurePreviewTotals.ts': {
          lines: 80,
          statements: 80,
          branches: 70,
          functions: 80,
        },
        'src/components/Public/publicReservationHours.ts': {
          lines: 80,
          statements: 80,
          branches: 70,
          functions: 80,
        },
        'src/services/api/floorTicketMappers.ts': {
          lines: 80,
          statements: 80,
          // Measured branches ~67.7% after Slice D; keep margin under 80 lines floor.
          branches: 65,
          functions: 80,
        },
        'src/hooks/usePOSOrderTotals.ts': {
          lines: 80,
          statements: 80,
          branches: 70,
          functions: 80,
        },
        'src/components/POS/posContainerItems.ts': {
          lines: 80,
          statements: 80,
          branches: 70,
          functions: 80,
        },
      },
    },
  },
});
