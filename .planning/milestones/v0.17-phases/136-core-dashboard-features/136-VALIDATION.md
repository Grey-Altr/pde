---
phase: 136
slug: core-dashboard-features
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-25
validated: 2026-03-25
---

# Phase 136 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (~4.x) |
| **Config file** | `dashboard/vitest.config.ts` |
| **Quick run command** | `cd dashboard && npm test` |
| **Full suite command** | `cd dashboard && npm test -- --reporter=verbose` |
| **Estimated runtime** | ~250ms |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npm test`
- **After every plan wave:** Run `cd dashboard && npm test -- --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 136-01-01 | 01 | 1 | MON-01, MON-02, MON-03 | setup | `ls dashboard/components/ui/progress.tsx dashboard/components/ui/tabs.tsx dashboard/components/ui/separator.tsx` | ✅ | ✅ green |
| 136-01-02 | 01 | 1 | MON-01 | unit | `cd dashboard && npm test -- --reporter=verbose` | ✅ | ✅ green |
| 136-01-02 | 01 | 1 | MON-02 | unit | `cd dashboard && npm test -- --reporter=verbose` | ✅ | ✅ green |
| 136-01-02 | 01 | 1 | MON-03 | unit | `cd dashboard && npm test -- --reporter=verbose` | ✅ | ✅ green |
| 136-02-01 | 02 | 2 | MON-01, MON-02 | unit+grep | `grep "raw.phase" dashboard/lib/queries.ts && cd dashboard && npm test` | ✅ | ✅ green |
| 136-02-02 | 02 | 2 | MON-01, MON-02, MON-03, MON-04, MON-05 | grep | `grep -l "PhaseProgress\|CostMeter\|EventLog" dashboard/components/*.tsx` | ✅ | ✅ green |
| 136-02-03 | 02 | 2 | MON-01, MON-02, MON-03, MON-04, MON-05 | grep+unit | `grep "PhaseProgress" dashboard/components/session-detail.tsx && cd dashboard && npm test` | ✅ | ✅ green |
| 136-02-04 | 02 | 2 | MON-05 | build | `cd dashboard && npm run build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `dashboard/lib/__tests__/derive-progress.test.ts` — 6 unit tests for MON-01 deriveProgress
- [x] `dashboard/lib/__tests__/derive-cost.test.ts` — 11 unit tests for MON-02 deriveCost, formatTokens, formatCost
- [x] `dashboard/lib/__tests__/event-filters.test.ts` — 12 unit tests for MON-03 filterEvents
- [x] `dashboard/components/ui/progress.tsx` — installed via `npx shadcn@latest add progress`
- [x] `dashboard/components/ui/tabs.tsx` — installed via `npx shadcn@latest add tabs`
- [x] `dashboard/components/ui/separator.tsx` — installed via `npx shadcn@latest add separator`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Touch targets >= 44px on mobile | MON-05 | Vitest uses node env, no jsdom rendering | Inspect filter tab buttons in browser DevTools; verify computed min-height >= 44px |
| Reconnecting badge visible on disconnect | MON-04 | Requires network condition simulation | Disable network in DevTools; verify "reconnecting..." badge appears; re-enable and verify recovery |
| Auto-scroll lock in event log | MON-03 | Requires interactive scroll behavior | Scroll up in event log; verify new events don't auto-scroll; scroll to bottom; verify auto-scroll resumes |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-25

---

## Validation Audit 2026-03-25

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total tests (automated) | 54 (8 test files) |
| Phase 136 new tests | 29 (3 test files) |
| Manual-only items | 3 |
| Requirements covered (automated) | MON-01, MON-02, MON-03 |
| Requirements covered (manual) | MON-03 (scroll), MON-04, MON-05 |

All automated verification commands pass. No gaps to fill — pure utility functions (deriveProgress, deriveCost, filterEvents, formatTokens, formatCost) have full unit test coverage. UI behavioral items (touch targets, reconnection visual, auto-scroll) are correctly classified as manual-only due to Vitest running in node environment without DOM rendering.
