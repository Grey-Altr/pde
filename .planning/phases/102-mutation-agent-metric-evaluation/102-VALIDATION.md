---
phase: 102
slug: mutation-agent-metric-evaluation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 102 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (native Node.js test runner) |
| **Config file** | none — tests use node --test |
| **Quick run command** | `node --test tests/phase-102/` |
| **Full suite command** | `node --test tests/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-102/`
- **After every plan wave:** Run `node --test tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 102-01-01 | 01 | 1 | EXEC-02, EXEC-03 | unit | `node --test tests/phase-102/experiment-runner.test.mjs` | W0 | pending |
| 102-01-02 | 01 | 1 | EXEC-04, SELF-06 | unit | `node --test tests/phase-102/experiment-runner.test.mjs` | W0 | pending |
| 102-02-01 | 02 | 2 | SELF-07, SELF-08, SELF-09 | unit | `node --test tests/phase-102/experiment-runner-advanced.test.mjs` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-102/experiment-runner.test.mjs` — stubs for EXEC-02, EXEC-03, EXEC-04, SELF-06
- [ ] `tests/phase-102/experiment-runner-advanced.test.mjs` — stubs for SELF-07, SELF-08, SELF-09

*Existing test infrastructure (node:test) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agent definition produces valid structured JSON per iteration | EXEC-02 | Agent runs in Claude context, not unit-testable | Run pde-tools experiment with a test experiment.md, verify JSON output |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
