import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.{cjs,mjs,js,ts}', 'tests/**/test-*.cjs'],
    globals: true,
    testTimeout: 15000,
    server: {
      deps: {
        // Force vitest to inline (bundle) zod together with CJS modules so
        // they share the same Zod class instances. Without this, vitest's ESM
        // transform causes _zod internal property mismatches when CJS modules
        // (bin/lib/**/*.cjs) use require('zod').
        inline: ['zod'],
      },
    },
  },
});
