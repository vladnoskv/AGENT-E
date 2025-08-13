import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/dist/**',
        '**/build/**',
        '**/.git/**'
      ]
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./tests/setup.js']
  },
  esbuild: {
    target: 'node18'
  }
});