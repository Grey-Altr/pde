---
phase: 52
slug: agent-enhancements
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-19
---

# Phase 52 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + grep (CLI validation for markdown/skill/agent files) |
| **Config file** | none — all validation via shell commands |
| **Quick run command** | `grep -l "pde-analyst" .claude/agents/*.md` |
| **Full suite command** | `bash -c 'test -f .planning/agent-memory/executor/memories.md && test -f .planning/agent-memory/planner/memories.md && test -f .planning/agent-memory/debugger/memories.md && test -f .planning/agent-memory/verifier/memories.md && echo PASS || echo FAIL'` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick grep validation on modified files
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 52-02-01 | 02 | 1 | AGNT-01 | grep | `grep -q "assumptions" .claude/skills/pde-list-phase-assumptions/SKILL.md` | yes | green |
| 52-03-01 | 03 | 1 | AGNT-02 | file | `test -f .claude/agents/pde-analyst.md` | yes | green |
| 52-03-02 | 03 | 1 | AGNT-03 | grep | `grep -q "analyst" .claude/skills/pde-brief/SKILL.md` | yes | green |
| 52-04-01 | 04 | 2 | AGNT-04 | file | `test -d .planning/agent-memory/executor` | yes | green |
| 52-01-01 | 01 | 2 | AGNT-05 | grep | `grep -q "50" .claude/get-shit-done/bin/memory.cjs 2>/dev/null || grep -q "MEMORY_CAP\|MAX_ENTRIES\|50" .claude/get-shit-done/bin/*.cjs` | yes | green |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — no new test framework needed. All validation is file-existence and grep-based.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Multi-round analyst interview flow | AGNT-02 | Interactive AskUserQuestion loop cannot be automated | Invoke /pde:new-project on test project, verify analyst asks probing questions and produces structured brief |
| Assumptions gate blocks planning | AGNT-01 | Requires user confirmation interaction | Run /pde:plan-phase on a phase, verify assumptions are shown and user must confirm before planner spawns |
| Memory loaded at agent spawn | AGNT-04 | Requires agent execution with existing memories | Pre-populate memories.md, spawn executor, verify agent prompt includes memory content |

*All other behaviors have automated verification via file checks and grep.*

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 2s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** Phase 53 polish
