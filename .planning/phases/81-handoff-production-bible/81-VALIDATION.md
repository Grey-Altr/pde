---
phase: 81
slug: handoff-production-bible
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 81 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (existing project test runner) |
| **Config file** | `jest.config.mjs` |
| **Quick run command** | `npx jest tests/phase-81/ --bail` |
| **Full suite command** | `npx jest tests/phase-81/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest tests/phase-81/ --bail`
- **After every plan wave:** Run `npx jest tests/phase-81/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 81-01-01 | 01 | 1 | HDOF-01 | integration | `npx jest tests/phase-81/handoff-advance-doc.test.mjs` | W0 | pending |
| 81-01-02 | 01 | 1 | HDOF-02 | integration | `npx jest tests/phase-81/handoff-run-sheet.test.mjs` | W0 | pending |
| 81-01-03 | 01 | 1 | HDOF-03 | integration | `npx jest tests/phase-81/handoff-staffing-plan.test.mjs` | W0 | pending |
| 81-01-04 | 01 | 1 | HDOF-04 | integration | `npx jest tests/phase-81/handoff-budget-framework.test.mjs` | W0 | pending |
| 81-01-05 | 01 | 1 | HDOF-05 | integration | `npx jest tests/phase-81/handoff-post-event.test.mjs` | W0 | pending |
| 81-01-06 | 01 | 1 | HDOF-06 | integration | `npx jest tests/phase-81/handoff-print-spec.test.mjs` | W0 | pending |
| 81-02-01 | 02 | 1 | HDOF-01..06 | integration | `npx jest tests/phase-81/handoff-software-guard.test.mjs` | W0 | pending |
| 81-02-02 | 02 | 1 | HDOF-01..06 | integration | `npx jest tests/phase-81/handoff-hybrid-event.test.mjs` | W0 | pending |
| 81-02-03 | 02 | 1 | HDOF-02 | unit | `npx jest tests/phase-81/handoff-disclaimer.test.mjs` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-81/handoff-advance-doc.test.mjs` — stubs for HDOF-01 advance document generation
- [ ] `tests/phase-81/handoff-run-sheet.test.mjs` — stubs for HDOF-02 run sheet table format
- [ ] `tests/phase-81/handoff-staffing-plan.test.mjs` — stubs for HDOF-03 staffing plan
- [ ] `tests/phase-81/handoff-budget-framework.test.mjs` — stubs for HDOF-04 budget framework
- [ ] `tests/phase-81/handoff-post-event.test.mjs` — stubs for HDOF-05 post-event template
- [ ] `tests/phase-81/handoff-print-spec.test.mjs` — stubs for HDOF-06 print spec output
- [ ] `tests/phase-81/handoff-software-guard.test.mjs` — stubs for SC-4 software-only guard
- [ ] `tests/phase-81/handoff-hybrid-event.test.mjs` — stubs for SC-5 hybrid-event dual output
- [ ] `tests/phase-81/handoff-disclaimer.test.mjs` — stubs for SC-3 disclaimer verification

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production bible readability | HDOF-01..06 | Subjective document quality | Review generated BIB markdown for logical section ordering and completeness |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
