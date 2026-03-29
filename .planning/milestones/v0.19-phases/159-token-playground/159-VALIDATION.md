---
phase: 159
slug: token-playground
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
---

# Phase 159 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (latest) |
| **Config file** | `dashboard/vitest.config.ts` |
| **Quick run command** | `cd dashboard && npm test -- --reporter=verbose lib/__tests__/derive-cost.test.ts` |
| **Full suite command** | `cd dashboard && npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npm test -- --reporter=verbose lib/__tests__/derive-cost.test.ts`
- **After every plan wave:** Run `cd dashboard && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 159-01-01 | 01 | 0 | RUI-04 | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | ✅ extend | ✅ green |
| 159-01-02 | 01 | 1 | RUI-04 | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | ✅ extend | ✅ green |
| 159-01-03 | 01 | 1 | RUI-04 | unit | `cd dashboard && npm test -- lib/__tests__/actions.test.ts` | ✅ new | ✅ green |
| 159-02-01 | 02 | 1 | RUI-05 | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | ✅ extend | ✅ green |
| 159-02-02 | 02 | 1 | RUI-05 | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | ✅ extend | ✅ green |
| 159-02-03 | 02 | 2 | RUI-04, RUI-05 | source | manual: CostMeter replaced by TokenPlayground | N/A | ✅ verified |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `dashboard/lib/__tests__/derive-cost.test.ts` — `describe('deriveToolBreakdown')` (6 tests) and `describe('deriveContextUsage')` (4 tests) and `describe('displayCostUsd Math.max')` (3 tests)
- [x] `dashboard/lib/__tests__/actions.test.ts` — `describe('persistSessionCost')` (4 tests: pipeline, HINCRBY, key pattern, cost*10000)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TokenPlayground renders correctly in session detail | RUI-04 | vitest runs in node (no jsdom) | Open dashboard session detail; verify per-agent table, context gauge, and cost summary render |
| Redis cost persists across page refresh | RUI-05 | Requires browser + Redis integration | Open session detail, observe cost, refresh page, verify cost restored |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (2026-03-28)

---

## Validation Audit 2026-03-28

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 2 |
| Escalated | 0 |

**Tests added:** 7 (4 in actions.test.ts, 3 in derive-cost.test.ts)
**Suite total:** 310 tests, 0 failures
