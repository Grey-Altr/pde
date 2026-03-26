---
phase: 138-pwa-and-push-notifications
plan: "02"
subsystem: dashboard
tags: [pwa, push-notifications, web-push, vapid, server-actions, capability-detection, settings]
completed: "2026-03-25"
duration: "~5 minutes"

dependency-graph:
  requires:
    - "138-01 (Serwist service worker, manifest, bottom nav)"
    - "dashboard/lib/redis.ts (Upstash Redis client)"
    - "dashboard/app/api/ingest/route.ts (ingest pipeline)"
  provides:
    - "dashboard/lib/push.ts — server-side VAPID web-push config"
    - "dashboard/app/actions.ts — subscribeUser / unsubscribeUser / sendPushToOwner Server Actions"
    - "dashboard/hooks/use-push-subscription.ts — PushCapability type + usePushCapability hook"
    - "dashboard/components/pwa/push-manager.tsx — Subscribe/Unsubscribe UI"
    - "dashboard/components/pwa/push-status-banner.tsx — fallback banner for unsupported platforms"
    - "dashboard/components/pwa/install-prompt.tsx — iOS install instructions"
    - "dashboard/app/settings/page.tsx — Settings page with push subscription controls"
  affects:
    - "dashboard/app/api/ingest/route.ts (push triggers added)"

tech-stack:
  added:
    - "web-push@3.6.7 — server-side VAPID push delivery"
    - "@types/web-push@3.6.4 — TypeScript types"
  patterns:
    - "Server Actions with 'use server' directive for subscribeUser/unsubscribeUser/sendPushToOwner"
    - "Dynamic import of Server Actions in route handler to avoid loading web-push on every request"
    - "Pure function capability detection for testability without jsdom complexity"
    - "TDD RED/GREEN: failing tests committed before implementation"

key-files:
  created:
    - dashboard/lib/push.ts
    - dashboard/app/actions.ts
    - dashboard/hooks/use-push-subscription.ts
    - dashboard/components/pwa/install-prompt.tsx
    - dashboard/components/pwa/push-status-banner.tsx
    - dashboard/components/pwa/push-manager.tsx
    - dashboard/app/settings/page.tsx
    - dashboard/lib/__tests__/actions.test.ts
    - dashboard/lib/__tests__/use-push-capability.test.ts
  modified:
    - dashboard/app/api/ingest/route.ts
    - dashboard/package.json

decisions:
  - "Dynamic import sendPushToOwner in ingest route — avoids loading web-push module on every ingest request when push not configured"
  - "VAPID setVapidDetails guarded by env var presence — app does not crash during dev/test without keys"
  - "requestPermission() called directly in handleSubscribe onClick — iOS silently ignores calls outside user gesture"
  - "Stale subscription cleanup on 410/404 — prevents indefinite delivery failures to expired endpoints"
  - "Pure function capability detection (detectCapability) extracted for unit testing — avoids jsdom serviceWorker mock complexity"

requirements-completed:
  - PWA-02
  - PWA-03

metrics:
  duration: "~5 minutes"
  completed: "2026-03-25"
  tasks: 3
  files_created: 9
  files_modified: 2
  tests_added: 13
  tests_total: 100
---

# Phase 138 Plan 02: Web Push Notifications and Settings Page Summary

**One-liner:** VAPID web-push pipeline from ingest events to device notifications with Server Actions, capability detection, and Settings page with iOS graceful degradation.

## What Was Built

### Push Server Infrastructure

**`dashboard/lib/push.ts`** — Configures web-push with VAPID details at module load, guarded by env var presence so the app runs in dev/test without keys.

**`dashboard/app/actions.ts`** — Three Server Actions:
- `subscribeUser(sub)` — stores PushSubscriptionJSON in Redis at `push:sub:owner`
- `unsubscribeUser()` — removes subscription from Redis
- `sendPushToOwner(payload)` — reads subscription, calls webpush.sendNotification, handles 410/404 stale cleanup

**`dashboard/app/api/ingest/route.ts`** — Extended with push trigger loop (Step 5b) that fires after pipeline exec. Uses dynamic import to avoid loading web-push on every ingest request.

### Capability Detection

**`dashboard/hooks/use-push-subscription.ts`** — Client hook exporting `PushCapability` type and `usePushCapability()` function. Detects: `not-supported` (no serviceWorker/PushManager), `not-installed` (iOS non-standalone), `permission-denied`, `supported`.

### UI Components

**`dashboard/components/pwa/push-manager.tsx`** — Subscribe/Unsubscribe card with 44px touch targets. `Notification.requestPermission()` called directly in click handler (iOS requirement). Uses `urlBase64ToUint8Array` helper for VAPID key conversion.

**`dashboard/components/pwa/push-status-banner.tsx`** — Amber-tinted Card shown for all non-supported states. Messages for not-supported, not-installed, permission-denied. Returns null when capability is "supported".

**`dashboard/components/pwa/install-prompt.tsx`** — iOS-specific installation guide with three ordered steps (Share → Add to Home Screen → Add).

**`dashboard/app/settings/page.tsx`** — Settings page with capability-gated rendering: PushManager for supported, InstallPrompt + PushStatusBanner for not-installed, PushStatusBanner only for other unsupported states.

## Test Results

13 test files, 100 tests — all passing.

New tests added:
- `lib/__tests__/actions.test.ts` — 6 tests covering subscribeUser, unsubscribeUser, sendPushToOwner (no-subscription, success, 410 cleanup, 404 cleanup)
- `lib/__tests__/use-push-capability.test.ts` — 7 tests covering all PushCapability states via pure detectCapability function

## Deviations from Plan

None — plan executed exactly as written.

The vi.mock() hoisting warnings in actions.test.ts are Vitest informational warnings, not errors, and do not affect test behavior. The mocks work correctly via hoisting.

## Task 3 Checkpoint

Auto-approved (--auto mode): Visual verification skipped. All acceptance criteria verified programmatically.

## Known Stubs

None — all components wire to real data (Redis via Server Actions, capability detection via Web APIs).

VAPID keys (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY) are required env vars for push to function in production. The guard in push.ts ensures the app runs without them in dev.

## Self-Check

Files created/modified:

- [x] dashboard/lib/push.ts — exists
- [x] dashboard/app/actions.ts — exists
- [x] dashboard/hooks/use-push-subscription.ts — exists
- [x] dashboard/components/pwa/install-prompt.tsx — exists
- [x] dashboard/components/pwa/push-status-banner.tsx — exists
- [x] dashboard/components/pwa/push-manager.tsx — exists
- [x] dashboard/app/settings/page.tsx — exists
- [x] dashboard/lib/__tests__/actions.test.ts — exists
- [x] dashboard/lib/__tests__/use-push-capability.test.ts — exists

Commits:
- 74ad1c6 — test(138-02): add failing tests
- 37d97e7 — feat(138-02): implement push server lib, Server Actions, capability hook, and ingest trigger
- c97740e — feat(138-02): create push UI components and Settings page
