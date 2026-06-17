import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    passWithNoTests: true,
    poolMatchGlobs: [
      // isolated-vm uses native Node addons; sandbox tests need isolated forks.
      ['**/sandbox.test.ts', 'forks'],
    ],
    poolOptions: {
      forks: {
        // Run sandbox tests in a single forked process to avoid cross-fork
        // structured-clone serialization of native ivm objects after isolate timeouts.
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
