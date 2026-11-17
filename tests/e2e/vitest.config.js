// E2E config: runs the real page (index.html + esbuild IIFE bundle of
// src/main.js) inside jsdom and drives a full playthrough through the DOM.
// Node environment on purpose — jsdom is constructed manually per test.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.e2e.test.js'],
    environment: 'node',
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
