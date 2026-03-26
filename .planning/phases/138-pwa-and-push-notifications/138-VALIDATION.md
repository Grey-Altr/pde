---
phase: 138
slug: pwa-and-push-notifications
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test --prefix dashboard`
- **After every plan wave:** Run `npm test --prefix dashboard -- --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 138-01-01 | 01 | 1 | PWA-01 | unit | `npm test --prefix dashboard` | ❌ W0 | ⬜ pending |
| 138-01-02 | 01 | 1 | PWA-01 | unit | `npm test --prefix dashboard` | ❌ W0 | ⬜ pending |
| 138-02-01 | 02 | 1 | PWA-02 | unit | `npm test --prefix dashboard` | ❌ W0 | ⬜ pending |
| 138-02-02 | 02 | 1 | PWA-02 | unit | `npm test --prefix dashboard` | ❌ W0 | ⬜ pending |
| 138-02-03 | 02 | 1 | PWA-02 | unit | `npm test --prefix dashboard` | ❌ W0 | ⬜ pending |
| 138-03-01 | 03 | 2 | PWA-03 | unit | `npm test --prefix dashboard` | ❌ W0 | ⬜ pending |
| 138-03-02 | 03 | 2 | PWA-03 | unit | `npm test --prefix dashboard` | ❌ W0 | ⬜ pending |
| 138-04-01 | 04 | 2 | PWA-04 | unit | `npm test --prefix dashboard` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/__tests__/pwa/manifest.test.ts` — stubs for PWA-01 manifest shape
- [ ] `dashboard/__tests__/pwa/actions.test.ts` — stubs for PWA-02 subscribe/send/stale-cleanup
- [ ] `dashboard/__tests__/pwa/use-push-capability.test.ts` — stubs for PWA-03 capability states
- [ ] `dashboard/__tests__/pwa/bottom-nav.test.ts` — stubs for PWA-04 nav accessibility

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
