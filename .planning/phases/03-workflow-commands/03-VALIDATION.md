---
phase: 3
slug: workflow-commands
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Shell grep checks + `claude plugin validate .` + live invocation |
| **Config file** | None — no test runner needed |
| **Quick run command** | `grep -rn "greyaltaer\|\.claude/pde\|HOME.*pde" workflows/ commands/ && echo FAIL \|\| echo PASS` |
| **Full suite command** | All automated checks in Per-Task Verification Map below |
| **Estimated runtime** | ~5 seconds (grep checks) + manual smoke tests |

---

## Sampling Rate

- **After every task commit:** Run `grep -rn "greyaltaer\|\.claude/pde\|HOME.*pde" workflows/ commands/ && echo FAIL || echo PASS`
- **After every plan wave:** Run full suite — all automated checks below
- **Before `/gsd:verify-work`:** Full suite must be green + `/pde:progress` live smoke test
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | CMD-01 | smoke | `test -d workflows && echo PASS \|\| echo FAIL` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | CMD-01 | smoke | `test -d commands && echo PASS \|\| echo FAIL` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | CMD-01 | smoke | `test -d lib/ui && echo PASS \|\| echo FAIL` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | CMD-02..13 | regression | `grep -rn "greyaltaer\|\.claude/pde\|HOME.*pde" workflows/ && echo FAIL \|\| echo PASS` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 1 | CMD-01 | unit | `grep "^name:" commands/*.md \| grep -v "pde:" && echo FAIL \|\| echo PASS` | ❌ W0 | ⬜ pending |
| 03-01-06 | 01 | 1 | CMD-01 | integration | `claude plugin validate .` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | CMD-02 | manual | Invoke `/pde:new-project` in Claude Code | N/A | ⬜ pending |
| 03-02-02 | 02 | 2 | CMD-03 | manual | Invoke `/pde:plan-phase 1` in Claude Code | N/A | ⬜ pending |
| 03-02-03 | 02 | 2 | CMD-04 | manual | Invoke `/pde:execute-phase 1` in Claude Code | N/A | ⬜ pending |
| 03-02-04 | 02 | 2 | CMD-09 | manual | Invoke `/pde:verify-work` in Claude Code | N/A | ⬜ pending |
| 03-03-01 | 03 | 2 | CMD-05 | smoke | Invoke `/pde:progress` — pde-tools.cjs must resolve | N/A | ⬜ pending |
| 03-03-02 | 03 | 2 | CMD-06 | manual | Invoke `/pde:quick` in Claude Code | N/A | ⬜ pending |
| 03-03-03 | 03 | 2 | CMD-07 | smoke | Invoke `/pde:help` — must render command list | N/A | ⬜ pending |
| 03-03-04 | 03 | 2 | CMD-08 | manual | Invoke `/pde:discuss-phase` in Claude Code | N/A | ⬜ pending |
| 03-03-05 | 03 | 2 | CMD-10 | manual | Invoke `/pde:map-codebase` in Claude Code | N/A | ⬜ pending |
| 03-04-01 | 04 | 2 | CMD-11 | manual | Invoke `/pde:new-milestone` in Claude Code | N/A | ⬜ pending |
| 03-04-02 | 04 | 2 | CMD-12 | manual | Invoke `/pde:complete-milestone` in Claude Code | N/A | ⬜ pending |
| 03-04-03 | 04 | 2 | CMD-13 | manual | Invoke `/pde:audit-milestone` in Claude Code | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `workflows/` directory — copy all 34 workflow files from `~/.claude/pde/workflows/` and apply path replacement
- [ ] `commands/` directory — create 34 command stub files with `pde:` name prefix
- [ ] `lib/ui/` directory — copy 5 files from `~/.claude/pde/lib/ui/`
- [ ] `references/` directory — copy from `~/.claude/pde/references/`
- [ ] `templates/` directory — copy from `~/.claude/pde/templates/`

*(No test framework install needed — all verification is grep + claude CLI + live invocation)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/pde:new-project` initializes project | CMD-02 | Requires interactive Claude Code session | Invoke in test project, verify questioning + research + requirements + roadmap created |
| `/pde:plan-phase` creates PLAN.md | CMD-03 | Requires interactive Claude Code session | Invoke `/pde:plan-phase 1`, verify PLAN.md created |
| `/pde:execute-phase` runs plans | CMD-04 | Requires interactive Claude Code session | Invoke `/pde:execute-phase 1`, verify plan execution |
| `/pde:verify-work` validates features | CMD-09 | Requires interactive Claude Code session | Invoke after execute-phase, verify validation |
| `/pde:progress` shows state | CMD-05 | Requires CLAUDE_PLUGIN_ROOT expansion in bash | Invoke, verify pde-tools.cjs resolves |
| `/pde:help` lists commands | CMD-07 | Requires Claude Code command palette | Invoke, verify all commands listed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
