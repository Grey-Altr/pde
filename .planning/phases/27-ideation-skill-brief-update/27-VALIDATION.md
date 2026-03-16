---
phase: 27
slug: ideation-skill-brief-update
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | PDE `/pde:test` (skill lint + smoke tests) |
| **Config file** | none — tests defined in `references/tooling-patterns.md` and executed by `/pde:test` skill |
| **Quick run command** | `/pde:test ideate --lint` |
| **Full suite command** | `/pde:test ideate` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `/pde:test ideate --lint`
- **After every plan wave:** Run `/pde:test ideate`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | IDEAT-01 | smoke | `/pde:test ideate` | ❌ W0 | ⬜ pending |
| 27-01-02 | 01 | 1 | IDEAT-02 | smoke | `/pde:test ideate` + section check | ❌ W0 | ⬜ pending |
| 27-01-03 | 01 | 1 | IDEAT-03 | integration | Manual — check REC artifact + annotations | Manual | ⬜ pending |
| 27-01-04 | 01 | 1 | IDEAT-04 | integration | Manual — run brief after ideate, verify injection | Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `commands/ideate.md` — new command stub (no existing file)
- [ ] `workflows/ideate.md` — full two-pass workflow (no existing file)
- [ ] IDT row in `skill-registry.md` — LINT-010 requires this before lint passes

*Existing infrastructure covers test framework — `/pde:test` operational from Phase 26.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recommend invoked at checkpoint | IDEAT-03 | Skill() invocation cannot be lint-checked | Run `/pde:ideate`, verify REC artifact created and feasibility annotations present in converge output |
| Brief injects IDT/CMP/OPP context | IDEAT-04 | End-to-end integration across skills | Run `/pde:brief` after ideate, verify Problem Statement enrichment from IDT brief-seed |
| Brief works without upstream artifacts | IDEAT-04 | Regression path | Run `/pde:brief` with no IDT/CMP/OPP, verify same output as before with log note |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
