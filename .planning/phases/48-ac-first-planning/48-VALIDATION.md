---
phase: 48
slug: ac-first-planning
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 48 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | none — tests run directly with `node --test {file}` |
| **Quick run command** | `node --test tests/phase-48/*.test.mjs` |
| **Full suite command** | `node --test tests/phase-48/*.test.mjs && node --test tests/phase-47/*.test.mjs && node --test tests/phase-46/*.test.mjs` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/phase-48/sharding-ac.test.mjs`
- **After every plan wave:** Run `node --test tests/phase-48/*.test.mjs && node --test tests/phase-47/*.test.mjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 3 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 48-01-01 | 01 | 1 | PLAN-03 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ❌ W0 | ⬜ pending |
| 48-01-02 | 01 | 1 | PLAN-03 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ❌ W0 | ⬜ pending |
| 48-01-03 | 01 | 1 | PLAN-03 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ❌ W0 | ⬜ pending |
| 48-01-04 | 01 | 1 | PLAN-04 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ❌ W0 | ⬜ pending |
| 48-01-05 | 01 | 1 | PLAN-04 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ❌ W0 | ⬜ pending |
| 48-01-06 | 01 | 1 | PLAN-04 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ❌ W0 | ⬜ pending |
| 48-01-07 | 01 | 1 | PLAN-05 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ❌ W0 | ⬜ pending |
| 48-01-08 | 01 | 1 | PLAN-05 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ❌ W0 | ⬜ pending |
| 48-REG | 01 | 1 | PLAN-03,04 | regression | `node --test tests/phase-47/*.test.mjs` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase-48/sharding-ac.test.mjs` — stubs for PLAN-03, PLAN-04, PLAN-05
  - Synthetic PLAN.md with plan-level AC block + tasks with `<ac_refs>` and `<boundaries>`
  - Verifies task file content contains AC section, ac_refs header, conditional boundaries section
  - Verifies plan-level AC block not confused with per-task acceptance_criteria

*Framework install not needed — `node --test` is built-in, same as Phase 46/47*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Planner prompt generates AC block in correct BDD format | PLAN-03 | Output depends on LLM behavior | Run `/gsd:plan-phase` on a test phase, verify AC block appears before tasks |
| Executor refuses to mark task done without AC verification | PLAN-04 | Requires live executor agent run | Run `/gsd:execute-phase`, verify task completion checks AC refs |
| Executor logs warning when boundary paths are touched | PLAN-05 | Requires live executor agent run | Run executor on task with boundaries, verify warning output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
