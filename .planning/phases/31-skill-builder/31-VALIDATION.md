---
phase: 31
slug: skill-builder
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bash test scripts (`.test_*.sh` pattern, established in Phase 29-30) |
| **Config file** | None — standalone shell scripts |
| **Quick run command** | `bash .planning/phases/31-skill-builder/test_skill04_validation_gate.sh` |
| **Full suite command** | `for f in .planning/phases/31-skill-builder/test_skill*.sh; do bash "$f"; done` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bash .planning/phases/31-skill-builder/test_skill04_validation_gate.sh`
- **After every plan wave:** Run `for f in .planning/phases/31-skill-builder/test_skill*.sh; do bash "$f"; done`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | SKILL-01 | smoke/integration | `bash .../test_skill01_create_mode.sh` | ❌ W0 | ⬜ pending |
| 31-01-02 | 01 | 1 | SKILL-02 | smoke/integration | `bash .../test_skill02_improve_mode.sh` | ❌ W0 | ⬜ pending |
| 31-01-03 | 01 | 1 | SKILL-03 | smoke/integration | `bash .../test_skill03_eval_mode.sh` | ❌ W0 | ⬜ pending |
| 31-01-04 | 01 | 1 | SKILL-04 | integration | `bash .../test_skill04_validation_gate.sh` | ❌ W0 | ⬜ pending |
| 31-01-05 | 01 | 1 | SKILL-05 | content | `bash .../test_skill05_reference_loading.sh` | ❌ W0 | ⬜ pending |
| 31-01-06 | 01 | 1 | SKILL-06 | path-guard | `bash .../test_skill06_path_sandboxing.sh` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test_skill01_create_mode.sh` — stubs for SKILL-01: command file exists, workflow exists, IMP registered in skill-registry, agents exist
- [ ] `test_skill02_improve_mode.sh` — stubs for SKILL-02: --rewrite flag documented in workflow, improve mode diff output format
- [ ] `test_skill03_eval_mode.sh` — stubs for SKILL-03: pde-design-quality-evaluator agent exists, returns JSON with dimension keys
- [ ] `test_skill04_validation_gate.sh` — stubs for SKILL-04: workflow calls validate-skill, retry loop logic present
- [ ] `test_skill05_reference_loading.sh` — stubs for SKILL-05: pde-skill-builder agent has required_reading for both references
- [ ] `test_skill06_path_sandboxing.sh` — stubs for SKILL-06: workflow has protected-files check, bin/ and .claude/ not in allowed paths

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end create produces valid skill | SKILL-01 + SKILL-04 | Requires LLM generation + validation loop | Run `/pde:improve create "test skill"`, verify output passes validate-skill |
| Improve mode preserves existing content | SKILL-02 | Requires LLM judgment about additive changes | Run `/pde:improve improve` on existing skill, diff before/after |
| Eval produces actionable rubric scores | SKILL-03 | Requires LLM evaluation quality | Run `/pde:improve eval` on a known skill, verify dimension coverage |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
