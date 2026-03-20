---
phase: 61-token-context-metering
plan: "02"
subsystem: observability
tags: [tmux, bash, context-window, token-metering, ndjson, model-profiles]

requires:
  - phase: 61-token-context-metering-01
    provides: NDJSON event stream, chars/4 heuristic pattern established
  - phase: 59-tmux-dashboard-dependency-detection
    provides: monitor-dashboard.sh build_full_layout, pane-context-window.sh stub

provides:
  - Live context window utilization pane with visual progress bar and percentage
  - Orchestrator-scoped context label per TOKN-03 requirement
  - Model-aware context window sizing (haiku=200k, opus/sonnet=1M) from model-profiles.cjs
  - monitor-dashboard.sh patch: NDJSON path forwarded to context window pane

affects: [phase-62, tmux-dashboard, context-metering]

tech-stack:
  added: []
  patterns:
    - "Model-aware context window resolution: node -e requiring model-profiles.cjs at pane startup"
    - "Pure-bash visual bar: string concatenation loop building '#' and space chars (no external tools)"
    - "ANSI cursor repositioning (\\033[4;1H\\033[J) for in-place pane refresh"
    - "Backward-compatible script arg: no-arg invocation falls back to static display + sleep 60"

key-files:
  created: []
  modified:
    - bin/pane-context-window.sh
    - bin/monitor-dashboard.sh

key-decisions:
  - "Context window pane uses chars/4 heuristic from NDJSON line length — same approach as pane-token-meter.sh for consistency"
  - "Context window size resolved once at pane startup via node -e (not on each event) — avoids subprocess overhead in tail loop"
  - "PLUGIN_ROOT resolved from CLAUDE_PLUGIN_ROOT env var with dirname fallback — matches existing pane pattern"

patterns-established:
  - "Pane startup: resolve config once via node -e, then enter tail -F loop (no per-event Node.js calls)"
  - "All estimated values labeled '(~est.)' — TOKN-01/03 compliance"
  - "Scope disclaimer 'orchestrator only (not subagents)' mandatory in all context window displays"

requirements-completed: [TOKN-03]

duration: 3min
completed: 2026-03-20
---

# Phase 61 Plan 02: Token Context Metering — Context Window Pane Summary

**Live context window utilization pane with visual bar, orchestrator-scoped label, and model-aware sizing (haiku=200k, sonnet/opus=1M) driven by NDJSON stream**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T19:13:00Z
- **Completed:** 2026-03-20T19:16:10Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced pane-context-window.sh stub with live tail -F accumulator loop displaying percentage and visual bar
- Context window size is model-aware: reads model_profile from config.json, resolves pde-executor tier from model-profiles.cjs, maps haiku to 200k and opus/sonnet to 1M
- Patched monitor-dashboard.sh build_full_layout() to pass `${ndjson}` to pane-context-window.sh, delivering live event data

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace pane-context-window.sh with live context utilization display** - `e31e743` (feat)
2. **Task 2: Patch monitor-dashboard.sh to pass NDJSON to context window pane** - `c0c1377` (feat)

## Files Created/Modified

- `bin/pane-context-window.sh` — Full replacement: live NDJSON accumulator, visual bar, percentage, scope disclaimer, model-aware context window size
- `bin/monitor-dashboard.sh` — One-line patch: added `'${ndjson}'` arg to P3 send-keys in build_full_layout()

## Decisions Made

- Context window size resolved once at startup via `node -e` (not per-event) to avoid subprocess overhead inside the tail loop
- PLUGIN_ROOT resolved from `CLAUDE_PLUGIN_ROOT` env var with `dirname "$0"/..` fallback — matches the pattern established by other pane scripts
- Backward-compatible no-arg path uses `while true; do sleep 60; done` — preserves Phase 59 compatibility when launched without NDJSON

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Context window pane now live, delivering TOKN-03
- Phase 61 complete: both TOKN-01 (token meter) and TOKN-03 (context window) delivered
- Phase 62 can consume NDJSON stream for semantic workflow events (phase/wave/plan events for pipeline progress pane)

---
*Phase: 61-token-context-metering*
*Completed: 2026-03-20*
