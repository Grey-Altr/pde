---
phase: 20
slug: pipeline-orchestrator-pde-build
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 20-01-01 | 01 | 1 | ORC-01 | integration | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 1 | ORC-02, ORC-03 | integration | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh` — structural tests for ORC-01, ORC-02, ORC-03

*Existing infrastructure covers test execution — only the test script needs creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pipeline resumes from last complete stage after interruption | ORC-02 | Requires running /pde:build, interrupting mid-pipeline, then re-running — needs Claude inference | 1. Run /pde:build on a project with brief complete. 2. Interrupt after system stage. 3. Re-run /pde:build. 4. Verify system stage is skipped. |
| Human verification gates appear between stages | ORC-01 | Requires interactive mode and user response — cannot be tested structurally | 1. Set config.json mode to interactive. 2. Run /pde:build. 3. Verify AskUserQuestion prompts appear between stages. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
