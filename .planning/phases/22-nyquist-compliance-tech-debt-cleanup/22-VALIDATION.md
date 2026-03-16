---
phase: 22
slug: nyquist-compliance-tech-debt-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash grep assertions + Phase 20 test script (existing) |
| **Config file** | none — no test runner |
| **Quick run command** | `grep 'nyquist_compliant: true' .planning/phases/16-*/16-VALIDATION.md` |
| **Full suite command** | `bash .planning/phases/20-pipeline-orchestrator-pde-build/test_orc_gaps.sh && grep -l 'nyquist_compliant: true' .planning/phases/*/??*-VALIDATION.md \| wc -l` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's specific `grep` verification
- **After every plan wave:** Run full compliance count: `grep -rl 'nyquist_compliant: true' .planning/phases/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | SC-1a | structural | `grep 'nyquist_compliant: true' .planning/phases/16-wireframing-pde-wireframe/16-VALIDATION.md` | ✅ | ⬜ pending |
| 22-01-02 | 01 | 1 | SC-1b | structural | `grep 'nyquist_compliant: true' .planning/phases/17-design-critique-pde-critique/17-VALIDATION.md` | ✅ | ⬜ pending |
| 22-01-03 | 01 | 1 | SC-1c | structural | `grep 'nyquist_compliant: true' .planning/phases/18-critique-driven-iteration-pde-iterate/18-VALIDATION.md` | ✅ | ⬜ pending |
| 22-01-04 | 01 | 1 | SC-1d | structural | `grep 'nyquist_compliant: true' .planning/phases/20-pipeline-orchestrator-pde-build/20-VALIDATION.md` | ✅ | ⬜ pending |
| 22-01-05 | 01 | 1 | SC-2,SC-3 | structural | `grep 'INFRA-04' .planning/phases/13.2-*/13.2-01-SUMMARY.md && grep 'hasHandoff' workflows/handoff.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files or frameworks needed — all changes are documentation edits verified by grep assertions.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Overall compliance count = 12/12 | SC-4 | Aggregate check after all tasks | `grep -l 'nyquist_compliant: true' .planning/phases/*/??*-VALIDATION.md \| wc -l` (expect 12) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
