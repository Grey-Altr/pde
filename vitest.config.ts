import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.{cjs,mjs,js,ts}', 'tests/**/test-*.cjs'],
    globals: true,
    testTimeout: 15000,
  },
});
