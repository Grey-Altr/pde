---
phase: 155
slug: retry-documentation-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 155 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (latest) |
| **Config file** | `dashboard/vitest.config.ts` |
| **Quick run command** | `cd dashboard && npm test` |
| **Full suite command** | `cd dashboard && npm test -- --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

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
| 155-01-01 | 01 | 1 | INT-RETRY-STUB | source-inspection | `cd dashboard && npm test` | ✅ `__tests__/failure-card.test.ts` | ⬜ pending |
| 155-01-02 | 01 | 1 | INT-PDE-REMOTE-DOC | source-inspection | `cd dashboard && npm test` | ❌ W0 | ⬜ pending |
| 155-01-03 | 01 | 1 | INT-PDE-REMOTE-DOC | source-inspection | `grep PDE_REMOTE packages/dispatcher/lib/coordinator.cjs` | ❌ W0 (optional) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New assertions in `dashboard/__tests__/failure-card.test.ts` — Retry button has `aria-disabled` or `title` attribute
- [ ] New assertion for `.env.example` containing `PDE_REMOTE` — can be in existing test or standalone

*Existing infrastructure (Vitest, 217 tests, 29 files) covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tooltip visible on hover over disabled Retry button | INT-RETRY-STUB | Browser rendering needed | Load dashboard, navigate to a failed session, hover Retry button |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
