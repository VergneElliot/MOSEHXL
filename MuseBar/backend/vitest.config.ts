import { defineConfig } from 'vitest/config';

const runRealDbProject = process.env.RUN_REAL_DB_TESTS === 'true';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/integration/real-db/**/*.test.ts'],
    setupFiles: ['src/test/setupEnv.ts'],
    pool: 'forks',
    ...(runRealDbProject
      ? {
          projects: [
            {
              test: {
                name: 'real-db',
                environment: 'node',
                include: ['src/integration/real-db/**/*.test.ts'],
                setupFiles: ['src/test/setupEnv.ts'],
                pool: 'forks',
                testTimeout: 60000,
              },
            },
          ],
        }
      : {}),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/integration/real-db/**/*.test.ts',
        'src/test/**',
        'src/docs/**',
      ],
    },
  },
});
