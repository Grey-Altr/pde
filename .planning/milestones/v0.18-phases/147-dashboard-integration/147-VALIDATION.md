---
phase: 147
slug: dashboard-integration
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-26
audited: 2026-03-27
---

# Phase 147 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | dashboard/vitest.config.ts |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~1 second |
| **Total tests** | 205 (27 files) |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File | Status |
|---------|------|------|-------------|-----------|-------------------|------|--------|
| P01-T1 | 01 | 1 | DSH-01 | unit | `npx vitest run session-source` | session-source.test.ts | ✅ green |
| P01-T1 | 01 | 1 | DSH-03 | unit | `npx vitest run session-colors` | session-colors.test.ts | ✅ green |
| P01-T1 | 01 | 1 | DSH-09 | unit | `npx vitest run session-source` | session-source.test.ts | ✅ green |
| P01-T2 | 01 | 1 | DSH-09 | unit | `npx vitest run progress-variant` | progress-variant.test.ts | ✅ green |
| P02-T1 | 02 | 2 | DSH-05 | unit | `npx vitest run aggregate-status` | aggregate-status.test.ts | ✅ green |
| P02-T2 | 02 | 2 | DSH-04 | unit | `npx vitest run derive-variant` | derive-variant.test.ts | ✅ green |
| P02-T2 | 02 | 2 | DSH-08 | unit | `npx vitest run extract-last-event-types` | extract-last-event-types.test.ts | ✅ green |
| P03-T1 | 03 | 2 | DSH-02 | source-inspection | `npx vitest run event-log-filter` | event-log-filter.test.ts | ✅ green |
| P03-T1 | 03 | 2 | DSH-03 | source-inspection | `npx vitest run event-log-session-tags` | event-log-session-tags.test.ts | ✅ green |
| P03-T2 | 03 | 2 | DSH-06 | source-inspection | `npx vitest run failure-card` | failure-card.test.ts | ✅ green |
| P03-T2 | 03 | 2 | DSH-07 | unit | `npx vitest run hardening` | hardening.test.ts | ✅ green |
| P05-T1 | 05 | 3 | DSH-11 | source-inspection | `npx vitest run page-wiring` | page-wiring.test.ts | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Test stubs for DSH-01 through DSH-13
- [x] Shared test fixtures for session data, event streams

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Responsive layout breakpoints (phone/tablet/laptop) | DSH-10, DSH-12 | Visual layout verification | Resize browser to 375px, 768px, 1280px — verify bottom tabs, 2x2 grid, 7-pane grid |
| Keyboard shortcuts (1-7, s/a, f, Esc) | DSH-13 | Requires live keyboard input | Focus dashboard, press 1-7 to switch panes, s/a to cycle sessions, f to expand, Esc to collapse |
| Animated progress bars (speed variations) | DSH-08 | Visual animation timing | Observe striped bars: normal speed executing, slow waiting, static failed |
| 44px touch targets on failure cards | DSH-06 | Touch interaction | Use mobile device or Chrome DevTools touch emulation |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** passed

---

## Validation Audit 2026-03-27

| Metric | Count |
|--------|-------|
| Gaps found | 5 |
| Resolved | 5 |
| Escalated | 0 |

**Tests added:** event-log-filter.test.ts, event-log-session-tags.test.ts, derive-variant.test.ts, extract-last-event-types.test.ts, page-wiring.test.ts

**Implementation changes:** Exported `deriveVariant` from multi-phase-progress.tsx and `extractLastEventTypes` from action-chevron.tsx (export-only, no logic changes).
