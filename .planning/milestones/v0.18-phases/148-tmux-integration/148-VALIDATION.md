---
phase: 148
slug: tmux-integration
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-26
nyquist_audited: 2026-03-26
---

# Phase 148 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (globals: true in vitest.config.ts) |
| **Config file** | vitest.config.ts (project root) |
| **Quick run command** | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` |
| **Full suite command** | `npx vitest run tests/dispatcher/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/dispatcher/tmux-fanout.test.cjs`
- **After every plan wave:** Run `npx vitest run tests/dispatcher/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 148-01-01 | 01 | 0 | TMX-01 | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | Yes | ✅ green |
| 148-01-02 | 01 | 0 | TMX-04 | unit | `npx vitest run tests/dispatcher/tmux-cycle-session.test.cjs` | Yes | ✅ green |
| 148-02-01 | 02 | 1 | TMX-01 | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | Yes | ✅ green |
| 148-02-02 | 02 | 1 | TMX-02 | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | Yes | ✅ green |
| 148-02-03 | 02 | 1 | TMX-03 | unit | `npx vitest run tests/dispatcher/tmux-fanout.test.cjs` | Yes | ✅ green |
| 148-03-01 | 03 | 2 | TMX-02 | smoke | `npx vitest run tests/dispatcher/pane-agent-activity.test.cjs` | Yes | ✅ green |
| 148-03-02 | 03 | 2 | TMX-03 | smoke | `npx vitest run tests/dispatcher/pane-log-stream.test.cjs` | Yes | ✅ green |
| 148-03-03 | 03 | 2 | TMX-04 | smoke | `npx vitest run tests/dispatcher/pane-token-meter.test.cjs` | Yes | ✅ green |
| 148-03-04 | 03 | 2 | TMX-05 | smoke | `npx vitest run tests/dispatcher/pane-token-meter.test.cjs` | Yes | ✅ green |
| 148-cycle-01 | 02 | 1 | TMX-04 | unit | `npx vitest run tests/dispatcher/tmux-cycle-session.test.cjs` | Yes | ✅ green |
| 148-cycle-02 | 02 | 1 | TMX-05 | unit | `npx vitest run tests/dispatcher/tmux-cycle-session.test.cjs` | Yes | ✅ green |
| 148-04-01 | 04 | 3 | TMX-01 | manual | See manual verifications | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/dispatcher/tmux-fanout.test.cjs` — TMX-01, TMX-02, TMX-03 (8 tests green)
- [x] `tests/dispatcher/tmux-cycle-session.test.cjs` — TMX-04, TMX-05 (7 tests green)

## Plan 03 Nyquist Tests (added by auditor 2026-03-26)

- [x] `tests/dispatcher/pane-agent-activity.test.cjs` — TMX-02: [L]/[R] tags, ANSI color codes (10 tests green)
- [x] `tests/dispatcher/pane-log-stream.test.cjs` — TMX-03: [sid] prefix, per-session color (10 tests green)
- [x] `tests/dispatcher/pane-token-meter.test.cjs` — TMX-04/TMX-05: filter logic, MULTI_NDJSON_PATH, key bindings (13 tests green)

*Existing `aggregator.test.cjs` and `coordinator-smoke.test.cjs` provide regression coverage for the integration point — no new fixtures needed there.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pane bash scripts parse `_pde_session_id`, `_pde_color_index` correctly | TMX-01 | Requires tmux pane environment | `echo '{"event_type":"subagent_start","ts":"2026-01-01T12:00:00.000Z","agent_type":"planner","_pde_session_source":"L","_pde_color_index":0}' \| bash bin/pane-agent-activity.sh /dev/stdin` |
| Color prefixes render distinctly in tmux terminal | TMX-03 | Visual verification needed | Run monitor-dashboard.sh with 3+ sessions and confirm distinct colors |
| `s` key cycles session filter in token-meter pane | TMX-04 | Requires tmux keybinding | Press `s` in pane 5 during multi-session run |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s (bash script smoke tests use 1-2s sleep; JS unit tests < 1s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** green — Nyquist auditor 2026-03-26
