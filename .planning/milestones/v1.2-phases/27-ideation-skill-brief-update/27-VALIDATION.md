---
phase: 27
slug: ideation-skill-brief-update
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-16
updated: 2026-03-17
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash structural tests (grep-based markdown workflow verification) |
| **Config file** | none |
| **Quick run command** | `bash .planning/phases/27-ideation-skill-brief-update/test_ideat01_command_and_workflow_structure.sh` |
| **Full suite command** | `for f in .planning/phases/27-ideation-skill-brief-update/test_ideat0*.sh; do bash "$f"; done` |
| **Estimated runtime** | <5 seconds |

---

## Sampling Rate

- **After every task commit:** Run IDEAT-01 test
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** <5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File | Status |
|---------|------|------|-------------|-----------|-------------------|------|--------|
| 27-01-01 | 01 | 1 | IDEAT-01 | structural | `bash .planning/phases/27-ideation-skill-brief-update/test_ideat01_command_and_workflow_structure.sh` | test_ideat01_command_and_workflow_structure.sh | green |
| 27-01-02 | 01 | 1 | IDEAT-02 | structural | `bash .planning/phases/27-ideation-skill-brief-update/test_ideat02_converge_scoring_rubric.sh` | test_ideat02_converge_scoring_rubric.sh | green |
| 27-01-03 | 01 | 1 | IDEAT-03 | structural | `bash .planning/phases/27-ideation-skill-brief-update/test_ideat03_skill_invocation.sh` | test_ideat03_skill_invocation.sh | green |
| 27-01-04 | 01 | 1 | IDEAT-04 | structural | `bash .planning/phases/27-ideation-skill-brief-update/test_ideat04_brief_seed_and_upstream_injection.sh` | test_ideat04_brief_seed_and_upstream_injection.sh | green |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [x] `commands/ideate.md` — exists (created in plan 01 task 1)
- [x] `workflows/ideate.md` — full two-pass workflow (534 lines, created in plan 01 task 2)
- [x] IDT row in `skill-registry.md` — confirmed at line 20

---

## Nyquist Gap Fill (2026-03-17)

Gaps filled by gsd-nyquist-auditor. All four gaps resolved with structural bash tests on first run.

| Gap | Tests | Pass/Total | Result |
|-----|-------|-----------|--------|
| IDEAT-01 (MISSING) | test_ideat01_command_and_workflow_structure.sh | 21/21 | green |
| IDEAT-02 (MISSING) | test_ideat02_converge_scoring_rubric.sh | 11/11 | green |
| IDEAT-03 (structural portion; runtime remains manual) | test_ideat03_skill_invocation.sh | 6/6 | green |
| IDEAT-04 (PARTIAL) | test_ideat04_brief_seed_and_upstream_injection.sh | 24/24 | green |

Total: 62 assertions, 62 passed, 0 failed.

---

## Manual-Only Verifications (Residual)

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recommend invoked at runtime checkpoint | IDEAT-03 | Skill() invocation produces runtime REC artifact — cannot verify without execution | Run `/pde:ideate`, verify REC artifact created and feasibility annotations present in converge output |
| Brief injects IDT/CMP/OPP context at runtime | IDEAT-04 | End-to-end integration across live skill runs | Run `/pde:brief` after ideate, verify Problem Statement enrichment from IDT brief-seed |
| Brief works without upstream artifacts | IDEAT-04 | Regression path (null-context fallthrough) | Run `/pde:brief` with no IDT/CMP/OPP, verify identical output + log note |

---

## Validation Sign-Off

- [x] All tasks have automated structural test or documented manual-only rationale
- [x] Sampling continuity: all 4 tasks have automated commands
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** green — 2026-03-17 (gsd-nyquist-auditor)
