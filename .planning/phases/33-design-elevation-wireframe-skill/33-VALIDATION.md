---
phase: 33
slug: design-elevation-wireframe-skill
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + grep (pattern matching in HTML output) |
| **Config file** | none — tests are inline bash assertions |
| **Quick run command** | `bash tests/phase-33/quick-check.sh` |
| **Full suite command** | `bash tests/phase-33/full-suite.sh` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash tests/phase-33/quick-check.sh`
- **After every plan wave:** Run `bash tests/phase-33/full-suite.sh`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 33-01-01 | 01 | 0 | ALL | infrastructure | `test -d tests/phase-33` | ❌ W0 | ⬜ pending |
| 33-02-01 | 02 | 1 | WIRE-01 | grep | `grep -q 'GRID:' fixture.html` | ❌ W0 | ⬜ pending |
| 33-02-02 | 02 | 1 | WIRE-02 | grep | `grep -q 'VISUAL-WEIGHT:' fixture.html` | ❌ W0 | ⬜ pending |
| 33-02-03 | 02 | 1 | WIRE-03 | grep | `grep -q 'ASYMMETRY:' fixture.html` | ❌ W0 | ⬜ pending |
| 33-02-04 | 02 | 1 | WIRE-04 | grep | `grep -q 'VIEWPORT:' fixture.html` | ❌ W0 | ⬜ pending |
| 33-02-05 | 02 | 1 | WIRE-05 | grep | `grep -q 'PRIORITY:' fixture.html` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-33/` — test directory with fixture wireframes
- [ ] `tests/phase-33/quick-check.sh` — fast grep checks for composition annotations
- [ ] `tests/phase-33/full-suite.sh` — comprehensive validation of all WIRE requirements

*Wave 0 plan creates test infrastructure and fixture files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual weight annotation accuracy | WIRE-02 | Subjective design judgment | Review annotation claims against actual layout |
| Asymmetry purpose quality | WIRE-03 | Requires design evaluation | Verify documented purpose is meaningful, not arbitrary |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
