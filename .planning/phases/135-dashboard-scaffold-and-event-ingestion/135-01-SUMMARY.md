---
phase: 135-dashboard-scaffold-and-event-ingestion
plan: 01
subsystem: ui
tags: [nextjs, clerk, upstash-redis, shadcn, tailwind, vitest, zod, geist, turbopack]

requires:
  - phase: 134-relay-protocol-transport
    provides: WireEnvelopeSchema CJS definition in bin/lib/relay-protocol.cjs (mirrored here as TS)

provides:
  - Standalone Next.js 16 app in dashboard/ with its own package.json
  - Clerk proxy.ts protecting all routes, /sign-in and /api/ingest public
  - Upstash Redis singleton (lib/redis.ts)
  - Bearer token auth helper (lib/auth.ts)
  - TypeScript WireEnvelopeSchema mirror (lib/wire-schema.ts, zod v4)
  - Session status derivation (lib/session-status.ts)
  - shadcn/ui Card, Badge, ScrollArea, Skeleton components
  - Geist Sans + Mono fonts, dark mode default via ThemeProvider
  - vitest configured with 12 passing unit tests
  - .env.example documenting all required env vars

affects: [135-02-PLAN, 135-03-PLAN, 135-04-PLAN]

tech-stack:
  added:
    - next@16.2.1 (App Router, Turbopack)
    - @clerk/nextjs@latest (proxy.ts auth pattern)
    - @upstash/redis@latest (HTTP Redis client)
    - zod@latest (v4 — z.record requires two args)
    - geist@latest (GeistSans, GeistMono from geist/font/*)
    - next-themes (ThemeProvider dark mode)
    - shadcn/ui 4.1.0 (Card, Badge, ScrollArea, Skeleton, Button)
    - tailwindcss@v4 + @tailwindcss/postcss
    - vitest@4.1.1 + @vitejs/plugin-react
    - tw-animate-css (inlined — Turbopack CSS @import workaround)
  patterns:
    - "Standalone app pattern: dashboard/ has own package.json, not a workspace package"
    - "proxy.ts (not middleware.ts) — Next.js 16 rename, clerkMiddleware default export"
    - "Inlined CSS for Turbopack: shadcn/dist/tailwind.css content inlined to avoid @import resolution failure"
    - "turbopack.root in next.config.ts to fix multi-lockfile workspace root detection"
    - "zod v4 z.record(z.string(), z.unknown()) — two-arg form required"

key-files:
  created:
    - dashboard/package.json
    - dashboard/tsconfig.json
    - dashboard/next.config.ts
    - dashboard/vercel.json
    - dashboard/proxy.ts
    - dashboard/app/layout.tsx
    - dashboard/app/globals.css
    - dashboard/app/page.tsx
    - dashboard/app/sign-in/[[...sign-in]]/page.tsx
    - dashboard/components/theme-provider.tsx
    - dashboard/components.json
    - dashboard/components/ui/card.tsx
    - dashboard/components/ui/badge.tsx
    - dashboard/components/ui/scroll-area.tsx
    - dashboard/components/ui/skeleton.tsx
    - dashboard/lib/redis.ts
    - dashboard/lib/auth.ts
    - dashboard/lib/wire-schema.ts
    - dashboard/lib/session-status.ts
    - dashboard/vitest.config.ts
    - dashboard/lib/__tests__/wire-schema.test.ts
    - dashboard/lib/__tests__/session-status.test.ts
    - dashboard/lib/__tests__/auth.test.ts
    - dashboard/.env.example
    - dashboard/.gitignore
  modified: []

key-decisions:
  - "Inline shadcn/dist/tailwind.css content into globals.css — Turbopack build mode cannot resolve CSS @import from node_modules (no PostCSS pipeline in build)"
  - "Set turbopack.root in next.config.ts — multi-lockfile repo (root + dashboard/) caused Turbopack to resolve CSS from wrong root"
  - "zod v4 z.record() requires two arguments — z.record(z.string(), z.unknown()) instead of z.record(z.unknown())"
  - "Remove embedded .git dir from dashboard/ — npm install or shadcn init created one, causing git submodule warning"

patterns-established:
  - "Turbopack CSS @import workaround: inline node_modules CSS content rather than @import for Turbopack builds"
  - "proxy.ts pattern: clerkMiddleware + createRouteMatcher, /api/ingest always public for relay ingestion"
  - "Wire schema mirroring: re-declare zod schema in TS rather than importing across CJS/ESM boundary"

requirements-completed: [DSH-01, DSH-05]

duration: 25min
completed: 2026-03-25
---

# Phase 135 Plan 01: Dashboard Scaffold and Event Ingestion Summary

**Next.js 16 dashboard scaffolded in dashboard/ with Clerk proxy.ts auth, Upstash Redis singleton, zod v4 WireEnvelopeSchema mirror, session status derivation, shadcn/ui components, Geist fonts, and 12 passing vitest unit tests**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-25T16:05:00Z
- **Completed:** 2026-03-25T16:30:00Z
- **Tasks:** 2 of 2
- **Files modified:** 25

## Accomplishments

- Standalone Next.js 16 app in `dashboard/` with all production dependencies installed
- Clerk `proxy.ts` protects all routes; `/sign-in` and `/api/ingest` are public
- Shared library layer: Redis singleton, Bearer token validator, WireEnvelopeSchema (TypeScript mirror of relay-protocol.cjs), session status derivation
- 12 vitest unit tests passing across wire-schema, session-status, and auth modules

## Task Commits

Each task was committed atomically:

1. **Task 1: Next.js 16 scaffold with deps, shadcn/ui, Clerk, Geist** — `fd2dfca` (feat)
2. **Task 2: Shared libs, Clerk proxy, vitest with passing tests** — `eb7115f` (feat)

## Files Created/Modified

- `dashboard/package.json` — Standalone Next.js 16 app, all deps including vitest
- `dashboard/next.config.ts` — turbopack.root fix for multi-lockfile repo
- `dashboard/vercel.json` — fluid:true for Fluid Compute SSE support
- `dashboard/proxy.ts` — Clerk middleware protecting all routes except /sign-in and /api/ingest
- `dashboard/app/layout.tsx` — ClerkProvider, GeistSans/Mono variables, ThemeProvider dark default
- `dashboard/app/globals.css` — Tailwind v4, shadcn CSS tokens (oklch), keyframes inlined
- `dashboard/components/theme-provider.tsx` — NextThemesProvider wrapper
- `dashboard/components/ui/{card,badge,scroll-area,skeleton}.tsx` — shadcn/ui components
- `dashboard/lib/redis.ts` — Upstash Redis singleton
- `dashboard/lib/auth.ts` — validateRelayToken Bearer token helper
- `dashboard/lib/wire-schema.ts` — TypeScript WireEnvelopeSchema (zod v4)
- `dashboard/lib/session-status.ts` — deriveStatus (active/idle/error/complete)
- `dashboard/vitest.config.ts` — globals:true, node environment, @/ alias
- `dashboard/lib/__tests__/*.test.ts` — 12 unit tests

## Decisions Made

- Inlined `shadcn/dist/tailwind.css` content into `globals.css` — Turbopack build mode cannot resolve CSS `@import` from `node_modules` even with explicit subpaths; the CSS content (95 lines of keyframes and custom variants) is inlined directly
- Set `turbopack.root` in `next.config.ts` — this repo has two `package-lock.json` files (root + dashboard/), causing Turbopack to detect the wrong root and prefix all CSS module paths incorrectly
- `zod v4` changes `z.record()` to require two arguments — fixed `z.record(z.unknown())` to `z.record(z.string(), z.unknown())` in wire-schema.ts
- Removed embedded `.git` from `dashboard/` — shadcn init created a git repo inside dashboard, causing git submodule warning; removed with `git rm --cached -f`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Turbopack CSS @import resolution failure for node_modules**
- **Found during:** Task 1 (Next.js build verification)
- **Issue:** shadcn init added `@import "tw-animate-css"` and `@import "shadcn/tailwind.css"` to globals.css. Turbopack build mode cannot resolve CSS `@import` from node_modules packages, even with explicit subpaths.
- **Fix:** Inlined `shadcn/dist/tailwind.css` content (95 lines: accordion keyframes + shadcn custom variants) directly into globals.css. Removed `tw-animate-css` import entirely (package has 0 bytes CSS content).
- **Files modified:** `dashboard/app/globals.css`
- **Verification:** `npx next build` exits 0
- **Committed in:** fd2dfca (Task 1 commit)

**2. [Rule 3 - Blocking] turbopack.root needed for multi-lockfile repo**
- **Found during:** Task 1 (first build attempt)
- **Issue:** Repo has both `/package-lock.json` and `/dashboard/package-lock.json`. Turbopack detected the root incorrectly, prefixing CSS module paths with `./dashboard/` causing module-not-found errors.
- **Fix:** Added `turbopack: { root: path.resolve(__dirname) }` to `next.config.ts`
- **Files modified:** `dashboard/next.config.ts`
- **Verification:** `npx next build` path prefix changed from `./dashboard/app/globals.css` to `./app/globals.css`
- **Committed in:** fd2dfca (Task 1 commit)

**3. [Rule 1 - Bug] zod v4 z.record() requires two arguments**
- **Found during:** Task 2 (TypeScript type check during next build)
- **Issue:** `z.record(z.unknown())` fails in zod v4 — type error "Expected 2-3 arguments, but got 1"
- **Fix:** Changed to `z.record(z.string(), z.unknown())`
- **Files modified:** `dashboard/lib/wire-schema.ts`
- **Verification:** Build passes TypeScript check, all 4 wire-schema tests still pass
- **Committed in:** eb7115f (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All auto-fixes essential for build to succeed. No scope creep.

## Issues Encountered

- shadcn init modified `app/layout.tsx` to add a conflicting `Geist` import from `next/font/google` — reverted to plan-specified pattern using `geist` package with `geist/font/sans` and `geist/font/mono` imports
- shadcn init created an embedded `.git` directory inside `dashboard/` — removed and re-staged files as regular tracked files

## User Setup Required

External services require manual configuration before the dashboard can authenticate or receive events:

- **Clerk:** Create application at clerk.com, set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- **Upstash Redis:** Provision via Vercel Marketplace, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- **Relay token:** Generate with `openssl rand -hex 32`, set `PDE_RELAY_TOKEN` in Vercel env vars and local PDE env

See `.env.example` for all required variables.

## Next Phase Readiness

Plans 02-04 can proceed:
- Plan 02: `/api/ingest` Route Handler uses `redis.ts`, `auth.ts`, `wire-schema.ts` — all present
- Plan 03: SSE streaming uses `redis.ts` — present
- Plan 04: UI pages use `shadcn/ui` components and `session-status.ts` — all present

No blockers for subsequent plans. User will need to configure external services (Clerk, Upstash, relay token) before deploying to Vercel.

---
*Phase: 135-dashboard-scaffold-and-event-ingestion*
*Completed: 2026-03-25*
