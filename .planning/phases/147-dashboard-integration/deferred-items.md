# Deferred Items — Phase 147 Dashboard Integration

## Pre-existing Issues (Out of Scope)

### 1. `@serwist/next/worker` Missing Types
- **File:** `dashboard/app/sw.ts:2`
- **Error:** `Cannot find module '@serwist/next/worker' or its corresponding type declarations`
- **Status:** Pre-existing before Plan 05 (present in commit 0ee3e6b~)
- **Impact:** `npx next build` fails TypeScript check. Does not affect runtime dev server.
- **Resolution:** Install `@serwist/next` package or configure tsconfig to skip sw.ts from type checking.
- **Discovered during:** Plan 05 checkpoint build verification
