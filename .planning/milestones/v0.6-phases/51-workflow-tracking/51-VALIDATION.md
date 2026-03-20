---
phase: 51
slug: workflow-tracking
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-19
updated: 2026-03-19
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
| 51-01-01 | 01 | 1 | TRCK-01 | unit | `node --test tests/phase-51/workflow-status.test.mjs` | yes | green |
| 51-01-02 | 01 | 1 | TRCK-01 | unit | `node --test tests/phase-51/workflow-status.test.mjs` | yes | green |
| 51-01-03 | 01 | 1 | TRCK-02 | unit | `node --test tests/phase-51/workflow-status.test.mjs` | yes | green |
| 51-02-01 | 02 | 2 | TRCK-02 | integration | `node --test tests/phase-51/workflow-status.test.mjs` | yes | green |
| 51-02-02 | 02 | 2 | TRCK-03 | unit | `node --test tests/phase-51/handoff.test.mjs` | yes | green |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [x] `tests/phase-51/workflow-status.test.mjs` — 10 tests for TRCK-01 and TRCK-02
- [x] `tests/phase-51/handoff.test.mjs` — 5 tests for TRCK-03
- [x] `bin/lib/tracking.cjs` — the library under test

*Existing infrastructure covers test framework — node:test already in use across phases 46-50.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| /pde:progress displays task-level status in active phase | TRCK-02 | Requires running orchestrator workflow end-to-end | Run /pde:progress during a sharded plan execution; verify task table appears |
| HANDOFF.md is readable and actionable for human developer | TRCK-03 | Subjective readability assessment | Read generated HANDOFF.md; verify a developer can resume without PLAN.md |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-19

---

## Validation Audit 2026-03-19

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Tests passing | 15/15 |
