---
phase: 103
slug: orchestrator-command-circuit-breakers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 103 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (native Node.js test runner) |
| **Config file** | none — tests use node --test |
| **Quick run command** | `node --test tests/phase-103/` |
| **Full suite command** | `node --test tests/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-103/`
- **After every plan wave:** Run `node --test tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 103-01-01 | 01 | 1 | BREAK-01..05, SELF-04, SELF-05 | unit | `node --test tests/phase-103/experiment-report.test.mjs` | W0 | pending |
| 103-02-01 | 02 | 2 | CMD-01, CMD-02, CMD-04 | structural | `test -f commands/optimize.md && test -f workflows/optimize.md` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-103/experiment-report.test.mjs` — stubs for REPORT.md generation, circuit breaker logic
- [ ] `tests/phase-103/experiment-orchestrator.test.mjs` — stubs for concurrency check, cost estimate

*Existing test infrastructure (node:test) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full experiment loop with agent iteration | CMD-01 | Requires Claude agent runtime | Run /pde:optimize with test experiment.md, verify loop completes |
| Promotion diff approval flow | CMD-04 | Requires interactive user input | Run experiment, verify diff display and approval prompt |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
