---
phase: 48
slug: ac-first-planning
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-19
updated: 2026-03-19
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
| 48-01-01 | 01 | 1 | PLAN-03 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ✅ | ✅ green |
| 48-01-02 | 01 | 1 | PLAN-03 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ✅ | ✅ green |
| 48-01-03 | 01 | 1 | PLAN-03 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ✅ | ✅ green |
| 48-01-04 | 01 | 1 | PLAN-04 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ✅ | ✅ green |
| 48-01-05 | 01 | 1 | PLAN-04 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ✅ | ✅ green |
| 48-01-06 | 01 | 1 | PLAN-04 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ✅ | ✅ green |
| 48-01-07 | 01 | 1 | PLAN-05 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ✅ | ✅ green |
| 48-01-08 | 01 | 1 | PLAN-05 | unit | `node --test tests/phase-48/sharding-ac.test.mjs` | ✅ | ✅ green |
| 48-REG | 01 | 1 | PLAN-03,04 | regression | `node --test tests/phase-47/*.test.mjs` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/phase-48/sharding-ac.test.mjs` — 12 tests for PLAN-03, PLAN-04, PLAN-05 ✅
  - extractPlanAcBlock: 4 tests (plan-level extraction, empty, per-task exclusion, both)
  - buildTaskFileContent: 6 tests (AC section, ac_refs header, boundaries conditional)
  - shardPlan integration: 2 tests (Phase-48 plan with AC, pre-Phase-48 graceful degradation)

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 3s (measured: ~68ms)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved

---

## Validation Audit 2026-03-19

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Tests passing | 12/12 |
| Regression tests | 18/18 |

All plan-01 must-have truths covered by automated tests. Plan-02 truths are prompt-content verifications (manual-only — LLM behavior dependent).
