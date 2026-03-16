---
phase: 20
slug: pipeline-orchestrator-pde-build
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-16
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + grep (structural verification on markdown workflow files) |
| **Config file** | none — structural grep on workflow/command files |
| **Quick run command** | `grep -c "Skill(skill=" workflows/build.md` |
| **Full suite command** | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `grep -c "Skill(skill=" workflows/build.md`
- **After every plan wave:** Run `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh`
- **Before `/pde:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | ORC-01 | integration | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` | ✅ | ✅ green |
| 20-01-02 | 01 | 1 | ORC-02, ORC-03 | integration | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `.planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` — structural tests for ORC-01, ORC-02, ORC-03

*Existing infrastructure covers test execution — only the test script needs creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pipeline resumes from last complete stage after interruption | ORC-02 | Requires running /pde:build, interrupting mid-pipeline, then re-running — needs Claude inference | 1. Run /pde:build on a project with brief complete. 2. Interrupt after system stage. 3. Re-run /pde:build. 4. Verify system stage is skipped. |
| Human verification gates appear between stages | ORC-01 | Requires interactive mode and user response — cannot be tested structurally | 1. Set config.json mode to interactive. 2. Run /pde:build. 3. Verify AskUserQuestion prompts appear between stages. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete -- 2026-03-15

---

## Validation Audit 2026-03-15

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Full test suite (test_orc_gaps.sh) confirmed 34/34 passing. Wave 0 artifact (test_orc_gaps.sh) exists and passes. No gaps found.
