---
phase: 96
slug: 21-field-cascade-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 96 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js test runner (node --test) |
| **Config file** | tests/nyquist/test-foundation.cjs, tests/nyquist/test-regression-matrix.cjs |
| **Quick run command** | `node --test tests/nyquist/test-foundation.cjs` |
| **Full suite command** | `node --test tests/nyquist/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/nyquist/test-foundation.cjs`
- **After every plan wave:** Run `node --test tests/nyquist/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 96-01-01 | 01 | 1 | FOUND-02 | structural | `node --test tests/nyquist/test-foundation.cjs` | existing | pending |
| 96-01-02 | 01 | 1 | INTG-01 | structural | `grep -c 'hasDeployStaging' skills/recommend.md` | existing | pending |
| 96-01-03 | 01 | 1 | INTG-01 | structural | `grep -c 'hasDeployStaging' skills/ideate.md` | existing | pending |
| 96-01-04 | 01 | 1 | INTG-01 | structural | `grep -c 'hasDeployStaging' skills/iterate.md` | existing | pending |
| 96-01-05 | 01 | 1 | INTG-01 | structural | `grep -c 'hasDeployStaging' skills/mockup.md` | existing | pending |
| 96-01-06 | 01 | 1 | FOUND-02, INTG-01 | regression | `node --test tests/nyquist/` | existing | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework or fixtures needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| --from re-run preserves hasDeployStaging | INTG-01 | Requires full pipeline simulation | Run `build --from recommend` after deploy stage, verify DESIGN-STATE.md retains hasDeployStaging: true |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
