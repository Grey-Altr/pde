---
phase: 83
slug: cross-phase-wiring-fixes
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
---

# Phase 83 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, no install needed) |
| **Config file** | tests/pde-experience-regression.test.mjs |
| **Quick run command** | `node --test tests/pde-experience-regression.test.mjs` |
| **Full suite command** | `node --test tests/pde-experience-regression.test.mjs` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/pde-experience-regression.test.mjs`
- **After every plan wave:** Run `node --test tests/pde-experience-regression.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 83-01-01 | 01 | 1 | HDOF-06 | node:test | `node --test tests/phase-83/wiring-fixes.test.mjs` | existing | green |
| 83-01-02 | 01 | 1 | HDOF-06 | node:test | `node --test tests/phase-83/wiring-fixes.test.mjs` | existing | green |
| 83-01-03 | 01 | 1 | DSYS-06 | node:test | `node --test tests/phase-83/wiring-fixes.test.mjs` | existing | green |
| 83-01-04 | 01 | 1 | PRNT-04 | node:test | `node --test tests/phase-83/wiring-fixes.test.mjs` | existing | green |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. The node:test regression suite from Phase 74 already validates designCoverage field counts.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full pipeline preserves hasPrintCollateral | HDOF-06 | Requires running wireframe->critique->hig->handoff sequence | Run full experience pipeline, verify manifest hasPrintCollateral=true after each stage |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — 5/5 tests pass, all 3 requirements covered, 2026-03-21
