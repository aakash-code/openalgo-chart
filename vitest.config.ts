import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      css: true,
      include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}', 'tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],
      exclude: [
        'node_modules',
        'dist',
        'e2e',
        'src/__tests__/integration/**/*', // Playwright tests - run with npm run test:e2e
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx,js,jsx}'],
        exclude: [
          'src/**/*.d.ts',
          'src/**/*.test.{ts,tsx,js,jsx}',
          'src/**/*.spec.{ts,tsx,js,jsx}',
          'src/types/**/*',
          'src/main.jsx',
          'src/main.tsx',
        ],
        thresholds: {
          lines: 0,
          functions: 0,
          branches: 0,
          statements: 0,
        },
      },
      testTimeout: 10000,
      hookTimeout: 10000,
    },
  })
);
