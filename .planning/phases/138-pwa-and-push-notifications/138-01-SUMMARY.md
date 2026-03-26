---
phase: 138-pwa-and-push-notifications
plan: "01"
subsystem: dashboard
tags: [pwa, serwist, service-worker, bottom-nav, mobile, turbopack]
requirements-completed: [PWA-01, PWA-04]

dependency_graph:
  requires: []
  provides:
    - PWA web manifest at /manifest.webmanifest (display: standalone)
    - Serwist service worker compiled via @serwist/turbopack route at /serwist/sw.js
    - Offline shell caching via Serwist precacheEntries
    - Bottom tab navigation (Sessions, Settings) with safe-area iOS support
    - Standalone CSS @custom-variant for PWA-specific styles
  affects:
    - dashboard/app/layout.tsx (viewport + manifest + BottomNav + SwRegister)
    - dashboard/next.config.ts (withSerwist wrapper)
    - dashboard/app/page.tsx (bottom padding)
    - dashboard/app/sessions/[id]/session-detail-client.tsx (bottom padding)

tech_stack:
  added:
    - "@serwist/turbopack@9.5.7 — Turbopack-native service worker via esbuild + route handler"
    - "serwist@9.5.7 — Core SW runtime with precaching, runtime caching, push handlers"
    - "esbuild — Peer dep for @serwist/turbopack SW compilation"
    - "web-push@3.6.7 — Server-side VAPID push delivery (pre-installed for Plan 02)"
    - "@types/web-push@3.6.4 — TypeScript types for web-push"
  patterns:
    - "@serwist/turbopack createSerwistRoute for Turbopack-compatible SW (not @serwist/next)"
    - "Next.js built-in app/manifest.ts auto-served at /manifest.webmanifest"
    - "Viewport export with viewportFit: cover enables env(safe-area-inset-bottom) on iOS"
    - "SW registered at /serwist/sw.js (Turbopack route) not /sw.js (legacy public/)"
    - "@custom-variant standalone { @media (display-mode: standalone) } for Tailwind v4"

key_files:
  created:
    - dashboard/app/manifest.ts
    - dashboard/app/sw.ts
    - dashboard/app/serwist/[path]/route.ts
    - dashboard/components/pwa/sw-register.tsx
    - dashboard/components/layout/bottom-nav.tsx
    - dashboard/public/icon-192x192.png
    - dashboard/public/icon-512x512.png
    - dashboard/public/icon-maskable-512x512.png
    - dashboard/lib/__tests__/manifest.test.ts
    - dashboard/lib/__tests__/bottom-nav.test.ts
  modified:
    - dashboard/next.config.ts (wrapped with withSerwist)
    - dashboard/app/layout.tsx (viewport, metadata, BottomNav, SwRegister)
    - dashboard/app/globals.css (standalone @custom-variant)
    - dashboard/app/page.tsx (pb-24 md:pb-12)
    - dashboard/app/sessions/[id]/session-detail-client.tsx (pb-24 md:pb-12)
    - dashboard/package.json (5 new deps)

decisions:
  - "Use @serwist/turbopack (not @serwist/next) — this project uses Turbopack; they are different packages with different internals"
  - "Register SW at /serwist/sw.js not /sw.js — Turbopack arch serves from dynamic route handler not public/"
  - "web-push pre-installed in Plan 01 so Plan 02 has no separate install step"
  - "Generated minimal valid PNG icons via Node.js zlib deflate (no canvas dep needed)"

metrics:
  duration_minutes: 12
  completed_date: "2026-03-26"
  tasks_completed: 2
  tasks_total: 2
  files_created: 10
  files_modified: 5
---

# Phase 138 Plan 01: PWA Foundation and Mobile Navigation Summary

Serwist service worker with Turbopack (esbuild) compilation, Next.js built-in manifest, three PWA icons, bottom tab navigation with iOS safe-area support, and SW registration component.

## What Was Built

**Task 1: Serwist + PWA Manifest + Icons**

- Installed `@serwist/turbopack`, `serwist`, `esbuild` (devDeps) and `web-push`, `@types/web-push` (deps, pre-installed for Plan 02)
- `dashboard/app/manifest.ts` — Next.js built-in route returning `MetadataRoute.Manifest` with `display: "standalone"`, `background_color: "#09090b"`, `theme_color: "#09090b"`, and 3 icon entries
- `dashboard/app/sw.ts` — Serwist service worker source with precaching via `self.__SW_MANIFEST`, `defaultCache` runtime caching, plus push/notificationclick event handlers for Plan 02 push notifications
- `dashboard/app/serwist/[path]/route.ts` — `createSerwistRoute` handler pointing to `swSrc: "app/sw.ts"` and precaching `/` and `/sign-in`
- `dashboard/next.config.ts` — wrapped with `withSerwist` from `@serwist/turbopack`
- Three PNG icons in `dashboard/public/` (192x192, 512x512, maskable 512x512) using Node.js zlib deflate — minimal valid PNGs sufficient for installability

**Task 2: Layout, Navigation, CSS**

- `dashboard/app/layout.tsx` — Added `Viewport` export with `viewportFit: "cover"` (critical for iOS safe-area), updated `metadata` with `manifest` and `appleWebApp`, imported and rendered `<BottomNav />` inside `ThemeProvider` and `<SwRegister />` in `body`
- `dashboard/components/pwa/sw-register.tsx` — Client component using `useEffect` to register at `/serwist/sw.js` (Turbopack dynamic route URL)
- `dashboard/components/layout/bottom-nav.tsx` — Fixed bottom nav with Sessions (Activity icon, href="/") and Settings (Settings icon, href="/settings") tabs. `md:hidden` hides on desktop. `min-h-[44px] min-w-[44px]` meets 44px touch target requirement. `style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}` clears iPhone home indicator
- `dashboard/app/globals.css` — Added `@custom-variant standalone { @media (display-mode: standalone) }` for Tailwind v4 PWA-specific styles
- `dashboard/app/page.tsx` and `session-detail-client.tsx` — Added `pb-24 md:pb-12` bottom padding (96px mobile clearance for 64px nav + safe area, restored to 48px on desktop)

## Test Results

```
Test Files: 13 passed (13)
Tests:      94 passed (94)
```

New tests added:
- `manifest.test.ts` — 4 tests covering PWA metadata shape, icon sizes, theme colors, maskable icon
- `bottom-nav.test.ts` — 3 tests covering tab configuration (smoke tests)

## Deviations from Plan

**[Rule 3 - Blocking] npm install required before tests could run**

- **Found during:** Task 1 TDD RED step
- **Issue:** Dashboard directory had no `node_modules` — `@vitejs/plugin-react` missing, causing vitest config to fail to load
- **Fix:** Ran `npm install` from `dashboard/` before proceeding with Serwist install
- **Files modified:** `dashboard/package-lock.json`
- **Commit:** 7b94712

No other deviations — plan executed as specified.

## Known Stubs

None — all manifest data is real, icons are valid PNGs, SW registration is wired to the actual Turbopack route.

## Self-Check: PASSED

Files exist:
- dashboard/app/manifest.ts: FOUND
- dashboard/app/sw.ts: FOUND
- dashboard/app/serwist/[path]/route.ts: FOUND
- dashboard/components/pwa/sw-register.tsx: FOUND
- dashboard/components/layout/bottom-nav.tsx: FOUND
- dashboard/public/icon-192x192.png: FOUND
- dashboard/public/icon-512x512.png: FOUND
- dashboard/public/icon-maskable-512x512.png: FOUND

Commits:
- 7b94712: feat(138-01): install Serwist + create PWA manifest, service worker, icons, and Turbopack route
- 66db8b5: feat(138-01): add PWA viewport metadata, SW registration, bottom tab nav, and standalone CSS
