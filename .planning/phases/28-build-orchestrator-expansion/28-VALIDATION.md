---
phase: 28
slug: build-orchestrator-expansion
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-17
audited: 2026-03-17
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash structural tests (grep-based verification of markdown workflow files) |
| **Config file** | none — no test framework needed |
| **Quick run command** | `bash .planning/phases/28-build-orchestrator-expansion/test_build01_stages_table.sh` |
| **Full suite command** | `bash .planning/phases/28-build-orchestrator-expansion/test_build01_stages_table.sh && bash .planning/phases/28-build-orchestrator-expansion/test_build02_no_hardcoded_literals.sh && bash .planning/phases/28-build-orchestrator-expansion/test_build03_from_flag.sh` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run quick grep verification
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-01-T1 | 28-01 | W0 | BUILD-01 | structural/smoke | `bash .planning/phases/28-build-orchestrator-expansion/test_build01_stages_table.sh` | yes | green |
| 28-01-T1 | 28-01 | W0 | BUILD-02 | structural/smoke | `bash .planning/phases/28-build-orchestrator-expansion/test_build02_no_hardcoded_literals.sh` | yes | green |
| 28-01-T2 | 28-01 | W0 | BUILD-03 | structural/smoke | `bash .planning/phases/28-build-orchestrator-expansion/test_build03_from_flag.sh` | yes | green |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

All phase requirements are covered by bash structural tests. Tests grep `workflows/build.md` and `commands/build.md` for required structural patterns — no runtime code execution needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stage skip behavior at runtime | BUILD-03 | Requires live Skill() invocation trace | Run `/pde:build --from wireframe` in a real Claude session; verify stages 1-7 display as skipped |
| Dry-run with mixed state | BUILD-01 | Requires actual coverage-check JSON output | With some stages complete, run `/pde:build --dry-run`; verify complete/pending/skipped status mix |
| Invalid --from error UX | BUILD-03 | Confirms FROM_STAGE validation fires before Step 2 | Run `/pde:build --from bogus`; verify immediate halt with valid stage list before any I/O |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 1s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-03-17 — nyquist-auditor (all 3 gaps resolved, 50 tests passing)
