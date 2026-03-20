---
phase: 59
slug: tmux-dashboard-dependency-detection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 59 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + Node.js assert (zero deps, matches Phase 58 pattern) |
| **Config file** | none — inline validation via bash script |
| **Quick run command** | `bash .planning/phases/59-tmux-dashboard-dependency-detection/validate-dashboard.sh --quick` |
| **Full suite command** | `bash .planning/phases/59-tmux-dashboard-dependency-detection/validate-dashboard.sh` |
| **Estimated runtime** | ~5 seconds (unit), ~15 seconds (full with tmux integration) |

---

## Sampling Rate

- **After every task commit:** Run `bash .planning/phases/59-tmux-dashboard-dependency-detection/validate-dashboard.sh --quick`
- **After every plan wave:** Run `bash .planning/phases/59-tmux-dashboard-dependency-detection/validate-dashboard.sh`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 59-01-01 | 01 | 0 | DEPS-01 | unit | `command -v tmux && echo PASS` | ❌ W0 | ⬜ pending |
| 59-01-02 | 01 | 0 | DEPS-02 | unit | `bash bin/monitor-dashboard.sh --detect-pm` | ❌ W0 | ⬜ pending |
| 59-01-03 | 01 | 0 | DEPS-03 | unit | `echo "n" \| bash bin/monitor-dashboard.sh --dry-run-install` | ❌ W0 | ⬜ pending |
| 59-02-01 | 02 | 1 | TMUX-01 | integration | `tmux has-session -t pde-monitor && echo PASS` | ❌ W0 | ⬜ pending |
| 59-02-02 | 02 | 1 | TMUX-08 | structural | `tmux show-window-options -t pde-monitor \| grep remain-on-exit` | ❌ W0 | ⬜ pending |
| 59-02-03 | 02 | 1 | TMUX-09 | unit | Run with `COLS=80 ROWS=24` env override, check pane count | ❌ W0 | ⬜ pending |
| 59-02-04 | 02 | 1 | TMUX-10 | unit | `TMUX="" bash script --dry-run` vs `TMUX="x" bash script --dry-run` | ❌ W0 | ⬜ pending |
| 59-03-01 | 03 | 2 | TMUX-02..07 | unit | Feed fixture NDJSON through each pane script, check output | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `validate-dashboard.sh` — full validation script with --quick flag
- [ ] `tests/phase-59/fixtures/` — sample NDJSON event fixtures
- [ ] tmux availability guard — skip integration tests if tmux absent or `$CI` set
- [ ] Graceful skip for sandbox environments where tmux socket creation is blocked

*Note: All tests are new — no existing infrastructure for tmux validation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 6-pane visual layout correct | TMUX-01 | Visual pane arrangement cannot be asserted programmatically | Launch `/pde:monitor` in 120x30+ terminal, verify 6 labeled panes visible |
| Install instructions display | DEPS-02 | Requires environment without tmux | Unset tmux from PATH, run `/pde:monitor`, verify platform-specific instructions shown |
| Panes persist after PDE op | TMUX-08 | Requires real PDE operation lifecycle | Run a PDE command, wait for completion, verify panes still show final output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
