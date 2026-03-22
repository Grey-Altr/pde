---
phase: 74
slug: foundation-and-regression-infrastructure
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
verified: 2026-03-21
---

# Phase 74 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (Node.js built-in, v18+) |
| **Config file** | none — standalone .mjs files |
| **Quick run command** | `node --test tests/phase-74/experience-regression.test.mjs` |
| **Full suite command** | `node --test tests/phase-74/*.mjs && node --test tests/phase-64/manifest-schema.test.mjs` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-74/experience-regression.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-74/*.mjs && node --test tests/phase-64/manifest-schema.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 74-01-01 | 01 | 0 | FNDX-01, FNDX-02, FNDX-03, FNDX-04 | structural | `node --test tests/phase-74/experience-regression.test.mjs` | yes | green |
| 74-02-01 | 02 | 1 | FNDX-01 | structural | `node --test tests/phase-74/experience-regression.test.mjs` | yes | green |
| 74-02-02 | 02 | 1 | FNDX-02 | structural | `node --test tests/phase-74/experience-regression.test.mjs` | yes | green |
| 74-03-01 | 03 | 2 | FNDX-04 | structural | `node --test tests/phase-74/experience-regression.test.mjs` | yes | green |
| 74-03-02 | 03 | 2 | FNDX-02 | structural | `grep -rn "experience-disclaimer" workflows/` | yes | green |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [x] `tests/phase-74/experience-regression.test.mjs` — smoke matrix covering FNDX-01 (detection), FNDX-02 (branch sites), FNDX-03 (cross-type regression), FNDX-04 (sub-type metadata only)

*Wave 0 test must exist BEFORE any workflow edits — its failing state on clean repo verifies the pre-state.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Experience detection accuracy | FNDX-01 | Requires LLM classification of natural language prompt | Run `/pde:brief` with "underground techno night at a warehouse venue, 300 capacity" and verify `productType: "experience"` and `experienceSubType: "single-night"` in design-manifest.json |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — 2026-03-21 (7/7 tests pass, 4 suites: FNDX-01 3/3, FNDX-02 1/1, FNDX-03 2/2, FNDX-04 1/1)
