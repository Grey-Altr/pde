---
phase: 79
slug: critique-and-hig-extensions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 79 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (existing PDE test suite) |
| **Config file** | `jest.config.js` or equivalent in test dirs |
| **Quick run command** | `node tests/run-phase-tests.cjs 79` |
| **Full suite command** | `node tests/run-phase-tests.cjs 79 --full` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node tests/run-phase-tests.cjs 79`
- **After every plan wave:** Run `node tests/run-phase-tests.cjs 79 --full`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 79-01-01 | 01 | 1 | CRIT-01 | integration | `grep -c "safety" critique-output.md` | ❌ W0 | ⬜ pending |
| 79-01-02 | 01 | 1 | CRIT-02 | integration | `grep -c "accessibility" critique-output.md` | ❌ W0 | ⬜ pending |
| 79-01-03 | 01 | 1 | CRIT-03 | integration | `grep -c "operations" critique-output.md` | ❌ W0 | ⬜ pending |
| 79-01-04 | 01 | 1 | CRIT-04 | integration | `grep -c "sustainability" critique-output.md` | ❌ W0 | ⬜ pending |
| 79-01-05 | 01 | 1 | CRIT-05 | integration | `grep -c "licensing" critique-output.md` | ❌ W0 | ⬜ pending |
| 79-01-06 | 01 | 1 | CRIT-06 | integration | `grep -c "financial" critique-output.md` | ❌ W0 | ⬜ pending |
| 79-01-07 | 01 | 1 | CRIT-07 | integration | `grep -c "community" critique-output.md` | ❌ W0 | ⬜ pending |
| 79-01-08 | 01 | 1 | CRIT-08 | unit | `grep -c "VERIFY WITH LOCAL AUTHORITY" critique-output.md` | ❌ W0 | ⬜ pending |
| 79-02-01 | 02 | 2 | PHIG-01 | integration | `grep -c "wayfinding" hig-output.md` | ❌ W0 | ⬜ pending |
| 79-02-02 | 02 | 2 | PHIG-02 | integration | `grep -c "acoustic" hig-output.md` | ❌ W0 | ⬜ pending |
| 79-02-03 | 02 | 2 | PHIG-03 | integration | `grep -c "queue" hig-output.md` | ❌ W0 | ⬜ pending |
| 79-02-04 | 02 | 2 | PHIG-04 | integration | `grep -c "transaction" hig-output.md` | ❌ W0 | ⬜ pending |
| 79-02-05 | 02 | 2 | PHIG-05 | integration | `grep -c "toilet" hig-output.md` | ❌ W0 | ⬜ pending |
| 79-02-06 | 02 | 2 | PHIG-06 | integration | `grep -c "hydration" hig-output.md` | ❌ W0 | ⬜ pending |
| 79-02-07 | 02 | 2 | PHIG-07 | integration | `grep -c "first.aid" hig-output.md` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for CRIT-01 through CRIT-08 (critique perspective tests)
- [ ] Test stubs for PHIG-01 through PHIG-07 (physical HIG tests)
- [ ] Software-product regression tests (no experience-specific output)

*Existing infrastructure covers framework installation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Regulatory disclaimer readability | CRIT-08 | Visual inspection of tag placement | Review critique output to confirm `[VERIFY WITH LOCAL AUTHORITY]` appears inline with each regulatory value, not grouped |
| Software product isolation | CRIT-08 | Requires running both product types | Run critique + HIG for software product, confirm zero experience-specific output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
