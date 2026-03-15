---
phase: 5
slug: agent-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash scripts + grep audits + pde-tools CLI |
| **Config file** | none — verification is CLI-based |
| **Quick run command** | `grep -r "gsd-" bin/ workflows/ 2>/dev/null \| wc -l` |
| **Full suite command** | `node bin/pde-tools.cjs resolve-model pde-planner quality && node bin/pde-tools.cjs init plan-phase 1` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick grep audit
- **After every plan wave:** Run full suite command
- **Before `/pde:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | AGNT-01 | audit | `grep -r "gsd-" bin/ workflows/ \| wc -l` | ✅ | ⬜ pending |
| 05-01-02 | 01 | 1 | AGNT-05 | audit | `grep -rn "gsd" bin/ workflows/ --include="*.md" --include="*.cjs" \| grep -v "pde"` | ✅ | ⬜ pending |
| 05-02-01 | 02 | 1 | AGNT-01 | unit | `node bin/pde-tools.cjs resolve-model pde-planner quality` | ✅ | ⬜ pending |
| 05-02-02 | 02 | 1 | AGNT-04 | unit | `node bin/pde-tools.cjs resolve-model pde-executor balanced` | ✅ | ⬜ pending |
| 05-03-01 | 03 | 2 | AGNT-02 | integration | manual — spawn multi-wave execute-phase | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 2 | AGNT-03 | smoke | `node bin/pde-tools.cjs init plan-phase 1` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing infrastructure covers all phase requirements — no new test framework needed
- [ ] `pde-tools.cjs` CLI already provides `resolve-model` and `init` commands for verification

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Parallel wave execution | AGNT-02 | Requires live Claude Code Task() spawning | Run `/pde:execute-phase` on a phase with 2+ plans in wave 1, observe concurrent completion |
| Research gating | AGNT-03 | Requires live workflow invocation | Set `workflow.research: false`, run `/pde:plan-phase`, verify no researcher agent spawned |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
