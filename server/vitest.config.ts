import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // Every file shares one test database and truncates it, so files must not run in parallel
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
