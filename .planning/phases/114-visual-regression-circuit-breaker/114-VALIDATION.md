---
phase: 114
slug: visual-regression-circuit-breaker
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 114 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node 20) |
| **Config file** | none — run directly |
| **Quick run command** | `node --test tests/phase-114/visual-regression.test.mjs` |
| **Full suite command** | `node --test tests/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-114/visual-regression.test.mjs`
- **After every plan wave:** Run `node --test tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 114-01-01 | 01 | 1 | VRCB-01 | unit | `node --test tests/phase-114/visual-regression.test.mjs` | No — W0 | pending |
| 114-01-02 | 01 | 1 | VRCB-02 | unit | `node --test tests/phase-114/visual-regression.test.mjs` | No — W0 | pending |
| 114-01-03 | 01 | 1 | VRCB-03 | unit | `node --test tests/phase-114/visual-regression.test.mjs` | No — W0 | pending |
| 114-01-04 | 01 | 1 | VRCB-04 | unit | `node --test tests/phase-114/visual-regression.test.mjs` | No — W0 | pending |
| 114-02-01 | 02 | 2 | VRCB-05 | regression | `node --test tests/` | Yes — existing | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-114/` directory — must be created
- [ ] `tests/phase-114/visual-regression.test.mjs` — stubs for VRCB-01..05
- [ ] `bin/lib/visual-regression.cjs` — must exist before tests can import it

*Existing infrastructure covers test framework (node:test is built-in).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Playwright screenshot capture | VRCB-02 | Requires live Playwright MCP | Run experiment with visual_regression_guard: true, verify baseline PNG exists in /tmp/ |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
