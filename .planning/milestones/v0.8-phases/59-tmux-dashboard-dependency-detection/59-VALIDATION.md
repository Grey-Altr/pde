---
phase: 59
slug: tmux-dashboard-dependency-detection
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
updated: 2026-03-20
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
| **Estimated runtime** | ~1s (quick), ~5s (full with unit tests) |

---

## Sampling Rate

- **After every task commit:** Run `bash .planning/phases/59-tmux-dashboard-dependency-detection/validate-dashboard.sh --quick`
- **After every plan wave:** Run `bash .planning/phases/59-tmux-dashboard-dependency-detection/validate-dashboard.sh`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 59-01-01 | 01 | 1 | DEPS-01 | structural | `grep 'command -v tmux' bin/monitor-dashboard.sh` | ✅ green |
| 59-01-02 | 01 | 1 | DEPS-02 | structural | `grep -q 'uname' && grep -q 'brew' && grep -q 'apt-get' bin/monitor-dashboard.sh` | ✅ green |
| 59-01-03 | 01 | 1 | DEPS-03 | structural | `grep -q 'read -r CONSENT' bin/monitor-dashboard.sh` | ✅ green |
| 59-01-04 | 01 | 1 | TMUX-01 | structural | `grep -q 'pde-monitor' bin/monitor-dashboard.sh` | ✅ green |
| 59-01-05 | 01 | 1 | TMUX-08 | structural | `grep -q 'remain-on-exit' bin/monitor-dashboard.sh` | ✅ green |
| 59-01-06 | 01 | 1 | TMUX-09 | structural | `grep -q 'build_minimal_layout' && grep -q 'MIN_COLS=120' bin/monitor-dashboard.sh` | ✅ green |
| 59-01-07 | 01 | 1 | TMUX-10 | structural | `grep -q 'TMUX' && grep -q 'switch-client' bin/monitor-dashboard.sh` | ✅ green |
| 59-02-01 | 02 | 2 | TMUX-02 | structural+unit | `grep subagent_start bin/pane-agent-activity.sh` + fixture test | ✅ green |
| 59-02-02 | 02 | 2 | TMUX-03 | structural | `grep phase_started bin/pane-pipeline-progress.sh` | ✅ green |
| 59-02-03 | 02 | 2 | TMUX-04 | structural+unit | `grep file_path bin/pane-file-changes.sh` + fixture test | ✅ green |
| 59-02-04 | 02 | 2 | TMUX-05 | structural+unit | `grep session_start bin/pane-log-stream.sh` + fixture test | ✅ green |
| 59-03-01 | 03 | 2 | TMUX-06 | structural | `grep '~est.' bin/pane-token-meter.sh` | ✅ green |
| 59-03-02 | 03 | 2 | TMUX-07 | structural | `grep 'Orchestrator context (~estimated)' bin/pane-context-window.sh` | ✅ green |

*Status: ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 6-pane visual layout correct | TMUX-01 | Visual pane arrangement cannot be asserted programmatically | Launch `/pde:monitor` in 120x30+ terminal, verify 6 labeled panes visible |
| Install instructions display | DEPS-02 | Requires environment without tmux | Unset tmux from PATH, run `/pde:monitor`, verify platform-specific instructions shown |
| Panes persist after PDE op | TMUX-08 | Requires real PDE operation lifecycle | Run a PDE command, wait for completion, verify panes still show final output |
| Nested tmux switch-client | TMUX-10 | Requires live tmux session | Run `/pde:monitor` from inside existing tmux, verify switch-client behavior |

---

## Validation Audit 2026-03-20

| Metric | Count |
|--------|-------|
| Requirements | 13 |
| Structural checks | 13/13 PASS |
| Unit checks | 6/6 PASS |
| Total automated | 19/19 PASS |
| Manual-only | 4 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] All requirements covered (13/13 structural + 3 unit)
- [x] No watch-mode flags
- [x] Feedback latency < 15s (~5s full suite)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete — 19/19 PASS, Nyquist compliant
