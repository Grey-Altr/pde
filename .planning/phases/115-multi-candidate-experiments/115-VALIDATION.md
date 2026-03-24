---
phase: 115
slug: multi-candidate-experiments
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 115 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js assert (CJS) |
| **Config file** | none — uses existing Nyquist test patterns |
| **Quick run command** | `node tests/nyquist/multi-candidate-tests.cjs` |
| **Full suite command** | `node tests/nyquist/multi-candidate-tests.cjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node tests/nyquist/multi-candidate-tests.cjs`
- **After every plan wave:** Run `node tests/nyquist/multi-candidate-tests.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 115-01-01 | 01 | 1 | MULTI-01 | structural | `grep -q 'candidates' references/experiment-schema.cjs` | ❌ W0 | ⬜ pending |
| 115-01-02 | 01 | 1 | MULTI-02 | structural | `grep -q '_resetToSha\|resetToSha' bin/experiment-runner.cjs` | ❌ W0 | ⬜ pending |
| 115-01-03 | 01 | 1 | MULTI-03 | structural | `grep -q 'candidates_evaluated\|candidates_scores' references/experiment-schema.cjs` | ❌ W0 | ⬜ pending |
| 115-02-01 | 02 | 1 | MULTI-04 | structural | `grep -q 'candidate' workflows/optimize.md` | ❌ W0 | ⬜ pending |
| 115-02-02 | 02 | 1 | MULTI-05 | unit | `node tests/nyquist/multi-candidate-tests.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/nyquist/multi-candidate-tests.cjs` — stubs for MULTI-01 through MULTI-05

*Existing Nyquist infrastructure covers test runner patterns.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| N/A | — | — | — |

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
