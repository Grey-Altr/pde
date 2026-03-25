---
phase: 137
slug: approval-gates
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 137 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | dashboard/vitest.config.ts |
| **Quick run command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd dashboard && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd dashboard && npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 137-01-01 | 01 | 1 | APR-03 | unit | `cd dashboard && npx vitest run lib/__tests__/approval.test.ts` | ❌ W0 | ⬜ pending |
| 137-01-02 | 01 | 1 | APR-01 | unit | `cd dashboard && npx vitest run lib/__tests__/approval.test.ts` | ❌ W0 | ⬜ pending |
| 137-02-01 | 02 | 1 | APR-02 | unit | `cd dashboard && npx vitest run lib/__tests__/approval-ui.test.ts` | ❌ W0 | ⬜ pending |
| 137-02-02 | 02 | 1 | APR-04 | unit | `cd dashboard && npx vitest run lib/__tests__/approval-response.test.ts` | ❌ W0 | ⬜ pending |
| 137-02-03 | 02 | 1 | APR-05 | unit | `cd dashboard && npx vitest run lib/__tests__/approval.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dashboard/lib/__tests__/approval.test.ts` — stubs for APR-01, APR-03, APR-05
- [ ] `dashboard/lib/__tests__/approval-response.test.ts` — stubs for APR-04

*Test framework already installed and configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Confirmation dialog prevents accidental taps | APR-02 | UI interaction requires visual verification | Tap approve, verify AlertDialog appears, tap outside, verify dialog stays open |
| Approval notification appears within seconds | APR-01 | End-to-end timing requires live relay | Trigger approval request from PDE, observe dashboard for notification appearance |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
