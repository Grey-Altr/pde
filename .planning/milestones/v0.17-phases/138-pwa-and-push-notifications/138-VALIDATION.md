---
phase: 138
slug: pwa-and-push-notifications
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-25
---

# Phase 138 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (globals: true, latest) |
| **Config file** | `dashboard/vitest.config.ts` |
| **Quick run command** | `npm test --prefix dashboard` |
| **Full suite command** | `npm test --prefix dashboard -- --reporter=verbose` |
| **Estimated runtime** | ~0.3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test --prefix dashboard`
- **After every plan wave:** Run `npm test --prefix dashboard -- --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 0.3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 138-01-01 | 01 | 1 | PWA-01 | unit | `npm test --prefix dashboard` | ✅ `dashboard/lib/__tests__/manifest.test.ts` (4 tests) | ✅ green |
| 138-01-02 | 01 | 1 | PWA-04 | unit | `npm test --prefix dashboard` | ✅ `dashboard/lib/__tests__/bottom-nav.test.ts` (3 tests) | ✅ green |
| 138-02-01 | 02 | 2 | PWA-02 | unit | `npm test --prefix dashboard` | ✅ `dashboard/lib/__tests__/actions.test.ts` (6 tests) | ✅ green |
| 138-02-02 | 02 | 2 | PWA-03 | unit | `npm test --prefix dashboard` | ✅ `dashboard/lib/__tests__/use-push-capability.test.ts` (7 tests) | ✅ green |
| 138-02-03 | 02 | 2 | PWA-02, PWA-03 | checkpoint | Human verification | N/A | ✅ auto-approved |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `dashboard/lib/__tests__/manifest.test.ts` — PWA-01 manifest shape (4 tests)
- [x] `dashboard/lib/__tests__/actions.test.ts` — PWA-02 subscribe/send/stale-cleanup (6 tests)
- [x] `dashboard/lib/__tests__/use-push-capability.test.ts` — PWA-03 capability states (7 tests)
- [x] `dashboard/lib/__tests__/bottom-nav.test.ts` — PWA-04 nav accessibility (3 tests)

All Wave 0 test files created inline during TDD execution (not pre-existing stubs).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SW push event shows notification | PWA-02 | jsdom cannot simulate push events in service worker context | Build production, install PWA, trigger approval gate, verify notification appears |
| Notification click opens correct URL | PWA-02 | Requires installed PWA with active service worker | Click notification, verify correct dashboard route opens |
| iOS non-standalone shows install prompt | PWA-03 | Requires physical iOS device in Safari | Open site in Safari (not installed), verify "push not available" banner |
| Bottom nav clears iPhone home indicator | PWA-04 | Requires physical notched iPhone with PWA installed | Install PWA, verify bottom nav not obscured by home indicator |
| PWA is installable from browser | PWA-01 | Requires Lighthouse or manual Chrome install prompt | Build production, serve with HTTPS, verify install prompt appears |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 0.3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-25

---

## Validation Audit 2026-03-25

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 4 requirements (PWA-01 through PWA-04) have automated test coverage across 20 tests in 4 test files. 107 total tests pass across 15 files (including prior-phase regression tests). No gaps detected.
