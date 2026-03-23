---
phase: 101
slug: experiment-schema-state-directory
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 101 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (native Node.js test runner) |
| **Config file** | none — tests use node --test |
| **Quick run command** | `node --test tests/phase-101/` |
| **Full suite command** | `node --test tests/` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-101/`
- **After every plan wave:** Run `node --test tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 101-01-01 | 01 | 1 | EXEC-01 | unit | `node --test tests/phase-101/experiment-schema.test.mjs` | W0 | pending |
| 101-01-02 | 01 | 1 | EXEC-05, OBS-03, OBS-04 | unit | `node --test tests/phase-101/experiment-dirs.test.mjs` | W0 | pending |
| 101-01-03 | 01 | 1 | EXEC-06, CMD-03 | unit | `node --test tests/phase-101/experiment-config.test.mjs` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-101/experiment-schema.test.mjs` — stubs for EXEC-01 (schema parsing, validation errors)
- [ ] `tests/phase-101/experiment-dirs.test.mjs` — stubs for EXEC-05, OBS-03, OBS-04 (directory creation)
- [ ] `tests/phase-101/experiment-config.test.mjs` — stubs for EXEC-06, CMD-03 (config defaults, phase type)

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
