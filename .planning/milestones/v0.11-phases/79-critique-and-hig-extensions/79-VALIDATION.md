---
phase: 79
slug: critique-and-hig-extensions
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
audited: 2026-03-21
---

# Phase 79 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node.js built-in) |
| **Config file** | none — uses node:test directly |
| **Quick run command** | `node --test tests/phase-79/critique-hig-extensions.test.mjs` |
| **Full suite command** | `node --test tests/phase-79/critique-hig-extensions.test.mjs` |
| **Estimated runtime** | ~55ms |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-79/critique-hig-extensions.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-79/critique-hig-extensions.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** <1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 79-01-01 | 01 | 1 | CRIT-01 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-01-02 | 01 | 1 | CRIT-02 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-01-03 | 01 | 1 | CRIT-03 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-01-04 | 01 | 1 | CRIT-04 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-01-05 | 01 | 1 | CRIT-05 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-01-06 | 01 | 1 | CRIT-06 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-01-07 | 01 | 1 | CRIT-07 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-01-08 | 01 | 1 | CRIT-08 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-02-01 | 02 | 2 | PHIG-01 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-02-02 | 02 | 2 | PHIG-02 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-02-03 | 02 | 2 | PHIG-03 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-02-04 | 02 | 2 | PHIG-04 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-02-05 | 02 | 2 | PHIG-05 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-02-06 | 02 | 2 | PHIG-06 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |
| 79-02-07 | 02 | 2 | PHIG-07 | structural | `node --test tests/phase-79/critique-hig-extensions.test.mjs` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Test stubs for CRIT-01 through CRIT-08 (critique perspective tests) — created in Plan 01 Task 1
- [x] Test stubs for PHIG-01 through PHIG-07 (physical HIG tests) — created in Plan 01 Task 1
- [x] Software-product regression tests (ELSE guard test CRIT-08b covers isolation)

*All Wave 0 requirements satisfied by `tests/phase-79/critique-hig-extensions.test.mjs`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Regulatory disclaimer readability | CRIT-08 | Visual inspection of tag placement | Review critique output to confirm `[VERIFY WITH LOCAL AUTHORITY]` appears inline with each regulatory value, not grouped |
| Software product isolation | CRIT-08 | Requires running both product types | Run critique + HIG for software product, confirm zero experience-specific output |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 1s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-21

---

## Validation Audit 2026-03-21

| Metric | Count |
|--------|-------|
| Requirements | 15 |
| Automated tests | 20 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Coverage | 100% |

**Test file:** `tests/phase-79/critique-hig-extensions.test.mjs`
**Framework:** node:test (20 tests, 5 describe blocks)
**Runtime:** ~55ms
**Regression:** Phase 74 tests 7/7 passing
