---
phase: 105
slug: researcher-empirical-mode
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 105 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (native Node.js test runner) |
| **Config file** | none — tests use node --test |
| **Quick run command** | `node --test tests/phase-105/` |
| **Full suite command** | `node --test tests/` |
| **Estimated runtime** | ~10 seconds |

---

## Wave 0 Requirements

- [ ] `tests/phase-105/researcher-empirical-agent.test.mjs` — stubs for RSRCH-01
- [ ] `tests/phase-105/researcher-empirical-routing.test.mjs` — stubs for RSRCH-02
- [ ] `tests/phase-105/researcher-empirical-output.test.mjs` — stubs for RSRCH-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Empirical researcher runs experiments end-to-end | RSRCH-01 | Requires Claude agent runtime | Run plan-phase on an experiment phase, verify empirical mode activates |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
