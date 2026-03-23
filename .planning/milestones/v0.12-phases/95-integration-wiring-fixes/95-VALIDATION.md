---
phase: 95
slug: integration-wiring-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 95 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js assert (existing test-regression-matrix.cjs) |
| **Config file** | `.planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs` |
| **Quick run command** | `node .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs` |
| **Full suite command** | `node .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs`
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 95-01-01 | 01 | 1 | KIT-03, DEPLOY-04, DEPLOY-06 | grep | `grep "OTR-outreach-sequences-v" workflows/deploy.md` | N/A | ⬜ pending |
| 95-01-02 | 01 | 1 | BRIEF-03, KIT-01 | grep | `grep "BTH-thesis-v" workflows/handoff.md workflows/wireframe.md workflows/critique.md` | N/A | ⬜ pending |
| 95-01-03 | 01 | 1 | DEPLOY-09 | grep | `grep "hasDeployStaging" workflows/deploy.md` | N/A | ⬜ pending |
| 95-01-04 | 01 | 1 | KIT-01 | grep | `grep "business-track.md" workflows/handoff.md` | N/A | ⬜ pending |
| 95-01-05 | 01 | 1 | INTG-02-07 | test | `node .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
