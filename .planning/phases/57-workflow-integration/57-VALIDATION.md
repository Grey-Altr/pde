---
phase: 57
slug: workflow-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 57 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | grep-based acceptance criteria (PDE convention — no test runner) |
| **Config file** | none |
| **Quick run command** | `node bin/pde-tools.cjs readiness check 57` |
| **Full suite command** | `grep "5.7\|Research Validation Gate" workflows/plan-phase.md && grep "run_integration_checks" workflows/check-readiness.md && grep "'B4'" bin/lib/readiness.cjs && grep "'B5'" bin/lib/readiness.cjs` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node bin/pde-tools.cjs readiness check 57`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 57-01-01 | 01 | 1 | RVAL-07, WIRE-01 | unit | `grep "RESEARCH-VALIDATION\|pde-research-validator" workflows/plan-phase.md` | W0 | pending |
| 57-01-02 | 01 | 1 | RVAL-08 | unit | `grep "contradicted_count\|unverifiable_count" workflows/plan-phase.md` | W0 | pending |
| 57-02-01 | 02 | 1 | WIRE-03, INTG-04 | unit | `grep "id: 'B4'\|id: 'B5'" bin/lib/readiness.cjs` | W0 | pending |
| 57-03-01 | 03 | 2 | WIRE-02, INTG-02 | unit | `grep "run_integration_checks\|Verification Artifacts" workflows/check-readiness.md` | W0 | pending |
| 57-03-02 | 03 | 2 | WIRE-04 | integration | `grep "Verification Artifacts\|RESEARCH-VALIDATION\|DEPENDENCY-GAPS" workflows/check-readiness.md` | W0 | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. All verification is grep-based against modified files. No new test infrastructure needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Step 5.7 spawns validator at correct pipeline position | WIRE-01 | Requires running full plan-phase workflow | Run `/gsd:plan-phase` on a phase with RESEARCH.md but no RESEARCH-VALIDATION.md; verify validator spawns before Step 5.5 |
| Blocking gate halts on contradicted claims | RVAL-08 | Requires agent producing contradicted results | Mock or use a phase with known contradicted research; verify AskUserQuestion appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
