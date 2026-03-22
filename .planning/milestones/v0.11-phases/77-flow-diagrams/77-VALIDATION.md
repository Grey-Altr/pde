---
phase: 77
slug: flow-diagrams
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
---

# Phase 77 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none — existing test infrastructure |
| **Quick run command** | `node --test tests/experience-flows.test.mjs` |
| **Full suite command** | `node --test tests/experience-flows.test.mjs tests/experience-regression.test.mjs tests/manifest-schema.test.mjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/experience-flows.test.mjs`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 77-01-01 | 01 | 0 | FLOW-01 | unit | `node --test tests/phase-77/experience-flows.test.mjs` | yes | green |
| 77-01-02 | 01 | 1 | FLOW-01 | unit | `node --test tests/phase-77/experience-flows.test.mjs` | yes | green |
| 77-01-03 | 01 | 1 | FLOW-02 | unit | `node --test tests/phase-77/experience-flows.test.mjs` | yes | green |
| 77-01-04 | 01 | 1 | FLOW-03 | unit | `node --test tests/phase-77/experience-flows.test.mjs` | yes | green |
| 77-02-01 | 02 | 1 | FLOW-04 | unit | `node --test tests/phase-77/experience-flows.test.mjs` | yes | green |
| 77-02-02 | 02 | 1 | FLOW-01 | unit | `node --test tests/phase-77/experience-flows.test.mjs` | yes | green |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [x] `tests/phase-77/experience-flows.test.mjs` — stubs for FLOW-01, FLOW-02, FLOW-03, FLOW-04
- [x] Shared fixtures for experience product type detection

*Existing infrastructure covers regression and manifest schema requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mermaid diagram renders correctly | FLOW-01 | Visual rendering quality | Open generated .md in VS Code Mermaid preview |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — 2026-03-21 (11/11 assertions green, all FLOW-01 through FLOW-04 covered)
