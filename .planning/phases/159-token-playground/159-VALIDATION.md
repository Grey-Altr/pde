---
phase: 159
slug: token-playground
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 159-01-01 | 01 | 0 | RUI-04 | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | ✅ extend | ⬜ pending |
| 159-01-02 | 01 | 1 | RUI-04 | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | ✅ extend | ⬜ pending |
| 159-01-03 | 01 | 1 | RUI-04 | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | ✅ extend | ⬜ pending |
| 159-02-01 | 02 | 1 | RUI-05 | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | ✅ extend | ⬜ pending |
| 159-02-02 | 02 | 1 | RUI-05 | unit | `cd dashboard && npm test -- lib/__tests__/derive-cost.test.ts` | ✅ extend | ⬜ pending |
| 159-02-03 | 02 | 2 | RUI-04, RUI-05 | source | manual: CostMeter replaced by TokenPlayground | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/lib/__tests__/derive-cost.test.ts` — append `describe('deriveToolBreakdown', ...)` and `describe('deriveContextUsage', ...)` blocks (file exists; do not recreate)

*Existing test infrastructure covers all phase requirements. No new test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TokenPlayground renders correctly in session detail | RUI-04 | vitest runs in node (no jsdom) | Open dashboard session detail; verify per-agent table, context gauge, and cost summary render |
| Redis cost persists across page refresh | RUI-05 | Requires browser + Redis integration | Open session detail, observe cost, refresh page, verify cost restored |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
