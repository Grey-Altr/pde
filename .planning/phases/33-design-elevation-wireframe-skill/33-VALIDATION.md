---
phase: 33
slug: design-elevation-wireframe-skill
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-17
validated: 2026-03-18
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + grep (pattern matching against skill file) |
| **Config file** | none — tests are inline bash assertions |
| **Quick run command** | `for f in .planning/phases/33-design-elevation-wireframe-skill/test_wire*.sh; do bash "$f"; done` |
| **Full suite command** | `for f in .planning/phases/33-design-elevation-wireframe-skill/test_wire*.sh; do bash "$f"; done` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run all 5 test scripts
- **After every plan wave:** Run all 5 test scripts
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Script | Checks | Status |
|---------|------|------|-------------|-------------|--------|--------|
| 33-01-T1 | 01 | 0 | ALL | test_wire*.sh (5 scripts) | 41 total | ✅ green |
| 33-01-T2 | 01 | 1 | WIRE-01 | test_wire01_grid_system.sh | 10/10 | ✅ green |
| 33-01-T2 | 01 | 1 | WIRE-02 | test_wire02_visual_weight.sh | 8/8 | ✅ green |
| 33-01-T2 | 01 | 1 | WIRE-03 | test_wire03_asymmetry.sh | 5/5 | ✅ green |
| 33-01-T2 | 01 | 1 | WIRE-04 | test_wire04_viewport.sh | 10/10 | ✅ green |
| 33-01-T2 | 01 | 1 | WIRE-05 | test_wire05_hierarchy.sh | 8/8 | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `test_wire01_grid_system.sh` — WIRE-01 grid system checks (10 assertions)
- [x] `test_wire02_visual_weight.sh` — WIRE-02 visual weight checks (8 assertions)
- [x] `test_wire03_asymmetry.sh` — WIRE-03 asymmetry checks (5 assertions)
- [x] `test_wire04_viewport.sh` — WIRE-04 viewport strategy checks (10 assertions)
- [x] `test_wire05_hierarchy.sh` — WIRE-05 content hierarchy checks (8 assertions)

*All test scripts created in Task 1 (Wave 0), verified green after Task 2.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual weight annotation accuracy | WIRE-02 | Subjective design judgment | Review annotation claims against actual layout |
| Asymmetry purpose quality | WIRE-03 | Requires design evaluation | Verify documented purpose is meaningful, not arbitrary |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-18

---

## Validation Audit 2026-03-18

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Total checks | 41 |
| All green | yes |
