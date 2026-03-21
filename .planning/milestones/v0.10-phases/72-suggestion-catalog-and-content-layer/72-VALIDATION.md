---
phase: 72
slug: suggestion-catalog-and-content-layer
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
---

# Phase 72 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:assert` (CJS runner, matching Phase 70/71 pattern) |
| **Config file** | none — standalone CJS test files |
| **Quick run command** | `node hooks/tests/verify-phase-72.cjs` |
| **Full suite command** | `node hooks/tests/verify-phase-70.cjs && node hooks/tests/verify-phase-71.cjs && node hooks/tests/verify-phase-72.cjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node hooks/tests/verify-phase-72.cjs`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 72-01-01 | 01 | 1 | CONT-01, CONT-02, CONT-03, CONT-05, CONT-06 | unit | `node hooks/tests/verify-phase-72.cjs` | ✅ | ✅ green |
| 72-01-02 | 01 | 1 | CONT-01, CONT-02, CONT-05 | integration | `node hooks/tests/verify-phase-72.cjs` | ✅ | ✅ green |
| 72-02-01 | 02 | 1 | CONT-04 | integration | `grep -c "context-notes" workflows/plan-phase.md && grep -c "context-notes" workflows/brief.md && test -f .planning/context-notes/README.md` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `hooks/tests/verify-phase-72.cjs` — CJS test runner for catalog parser, engine integration, DESIGN-STATE extraction, and suggestion output validation (9 tests, all passing)

*Created during Plan 72-01 Task 1. All 9 tests green.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| idle-catalog.md is human-readable and editable | CONT-01 | Subjective readability | Open file, verify sections are clear with time/cost labels |
| Context notes appear in planner output | CONT-04 | Requires full pipeline run | Place .md in context-notes/, run /pde:plan, check planner prompt |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-21

---

## Validation Audit 2026-03-21

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 6 CONT requirements covered by `verify-phase-72.cjs` (9 tests, 9 passing). VALIDATION.md finalized from draft during milestone audit.
