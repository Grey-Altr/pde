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
| 102-01-01 | 01 | 1 | EXEC-03 | unit | `node --test tests/phase-102/experiment-runner-boundaries.test.mjs` | W0 | pending |
| 102-01-01 | 01 | 1 | EXEC-04 | unit | `node --test tests/phase-102/experiment-runner-metric-eval.test.mjs` | W0 | pending |
| 102-01-01 | 01 | 1 | SELF-09 | unit | `node --test tests/phase-102/experiment-runner-jsonl.test.mjs` | W0 | pending |
| 102-01-01 | 01 | 1 | SELF-08 | unit | `node --test tests/phase-102/experiment-runner-diff.test.mjs` | W0 | pending |
| 102-02-01 | 02 | 2 | EXEC-02, SELF-06, SELF-07 | structural | `test -f agents/pde-experiment-runner.md` | W0 | pending |
| 102-02-02 | 02 | 2 | SELF-07 | unit | `node --test tests/phase-102/experiment-runner-pde-tools.test.mjs` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-102/experiment-runner-boundaries.test.mjs` — stubs for EXEC-03 (boundary enforcement)
- [ ] `tests/phase-102/experiment-runner-metric-eval.test.mjs` — stubs for EXEC-04 (metric eval with timeout)
- [ ] `tests/phase-102/experiment-runner-jsonl.test.mjs` — stubs for SELF-09 (JSONL write, tokens_used)
- [ ] `tests/phase-102/experiment-runner-diff.test.mjs` — stubs for SELF-08 (diff-based context)
- [ ] `tests/phase-102/experiment-runner-agent.test.mjs` — stubs for EXEC-02 (agent structure)
- [ ] `tests/phase-102/experiment-runner-pde-tools.test.mjs` — stubs for SELF-07 (subcommand dispatch)

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
