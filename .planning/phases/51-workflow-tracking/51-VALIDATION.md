---
phase: 51
slug: workflow-tracking
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 51 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, used in phases 46-50) |
| **Config file** | none — invoked directly |
| **Quick run command** | `node --test tests/phase-51/*.test.mjs` |
| **Full suite command** | `node --test tests/phase-51/*.test.mjs && node --test tests/phase-47/*.test.mjs && node --test tests/phase-50/*.test.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-51/*.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-51/*.test.mjs && node --test tests/phase-47/*.test.mjs && node --test tests/phase-50/*.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 51-01-01 | 01 | 1 | TRCK-01 | unit | `node --test tests/phase-51/workflow-status.test.mjs` | W0 | pending |
| 51-01-02 | 01 | 1 | TRCK-01 | unit | `node --test tests/phase-51/workflow-status.test.mjs` | W0 | pending |
| 51-01-03 | 01 | 1 | TRCK-02 | unit | `node --test tests/phase-51/workflow-status.test.mjs` | W0 | pending |
| 51-02-01 | 02 | 2 | TRCK-02 | integration | `node --test tests/phase-51/workflow-status.test.mjs` | W0 | pending |
| 51-02-02 | 02 | 2 | TRCK-03 | unit | `node --test tests/phase-51/handoff.test.mjs` | W0 | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-51/workflow-status.test.mjs` — stubs for TRCK-01 and TRCK-02
- [ ] `tests/phase-51/handoff.test.mjs` — stubs for TRCK-03
- [ ] `bin/lib/tracking.cjs` — the library under test

*Existing infrastructure covers test framework — node:test already in use across phases 46-50.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| /pde:progress displays task-level status in active phase | TRCK-02 | Requires running orchestrator workflow end-to-end | Run /pde:progress during a sharded plan execution; verify task table appears |
| HANDOFF.md is readable and actionable for human developer | TRCK-03 | Subjective readability assessment | Read generated HANDOFF.md; verify a developer can resume without PLAN.md |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
