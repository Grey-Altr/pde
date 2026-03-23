---
phase: 100
slug: git-state-machine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 100 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (native Node.js test runner) |
| **Config file** | none — tests use node --test |
| **Quick run command** | `node --test tests/phase-100/` |
| **Full suite command** | `node --test tests/` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-100/`
- **After every plan wave:** Run `node --test tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 100-01-01 | 01 | 1 | GIT-01 | unit | `node --test tests/phase-100/experiment-state-machine.test.mjs` | W0 | pending |
| 100-01-02 | 01 | 1 | GIT-02, GIT-03 | unit | `node --test tests/phase-100/experiment-state-machine.test.mjs` | W0 | pending |
| 100-02-01 | 02 | 1 | GIT-04, GIT-05 | unit | `node --test tests/phase-100/experiment-dispatch.test.mjs` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-100/experiment-state-machine.test.mjs` — stubs for GIT-01, GIT-02, GIT-03 (state machine functions, reset safety, branch isolation)
- [ ] `tests/phase-100/experiment-dispatch.test.mjs` — stubs for GIT-04, GIT-05 (EXPERIMENT-BEST.json, subcommand dispatch)

*Existing test infrastructure (node:test) covers framework needs.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
