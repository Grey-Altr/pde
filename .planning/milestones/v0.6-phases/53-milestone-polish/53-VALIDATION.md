---
phase: 53
slug: milestone-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 53 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + grep (shell-based verification) |
| **Config file** | none — all checks are inline grep/read commands |
| **Quick run command** | `grep -n "workflow-methodology" .claude/get-shit-done/workflows/plan-phase.md` |
| **Full suite command** | `bash -c 'echo "=== SC1 ===" && grep -c "workflow-methodology" .claude/get-shit-done/workflows/plan-phase.md && echo "=== SC2 ===" && grep -c "<name>" .claude/get-shit-done/bin/gsd-tools.cjs && echo "=== SC3 ===" && grep -c "TASK_FILES" .claude/get-shit-done/bin/gsd-tools.cjs && echo "=== SC4 ===" && grep -c "cmdTrackingGenerateHandoff" .claude/get-shit-done/bin/gsd-tools.cjs && echo "=== SC5 ===" && grep -c "workflow-status" .claude/get-shit-done/agents/ -r && echo "=== SC6 ===" && ls .planning/phases/46-*/*-VALIDATION.md .planning/phases/52-*/*-VALIDATION.md 2>/dev/null'` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick grep for the specific file modified
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must confirm all 6 success criteria
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 53-01-01 | 01 | 1 | FOUND-03 | grep | `grep "workflow-methodology" .claude/get-shit-done/workflows/plan-phase.md` | N/A | ⬜ pending |
| 53-01-02 | 01 | 1 | TRCK-01 | grep | `grep "<name>" .claude/get-shit-done/bin/gsd-tools.cjs` | N/A | ⬜ pending |
| 53-01-03 | 01 | 1 | TRCK-01 | grep | `grep "TASK_TOTAL.*0" .claude/get-shit-done/bin/gsd-tools.cjs` | N/A | ⬜ pending |
| 53-01-04 | 01 | 1 | TRCK-03 | grep | `grep -c "cmdTrackingGenerateHandoff" .claude/get-shit-done/bin/gsd-tools.cjs` | N/A | ⬜ pending |
| 53-01-05 | 01 | 2 | TRCK-03 | grep | `grep "workflow-status" .claude/get-shit-done/agents/ -r` | N/A | ⬜ pending |
| 53-01-06 | 01 | 2 | FOUND-03 | file | `ls .planning/phases/46-*/*-VALIDATION.md .planning/phases/52-*/*-VALIDATION.md` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — all checks are grep/file-based.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have automated verify commands
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
