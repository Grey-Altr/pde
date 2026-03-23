---
phase: 106
plan: 01
subsystem: observability
tags: [event-bus, tmux, dashboard, experiment, ndjson, OBS-01, OBS-02]
requires: [103-02]
provides: [experiment-events, experiment-pane]
affects: [event-bus.cjs, optimize.md, monitor-dashboard.sh]
tech-stack:
  added: []
  patterns: [EXPERIMENT_EVENTS Object.freeze, event-emit pde-tools subcommand reuse, tail -F NDJSON event stream]
key-files:
  created:
    - bin/pane-experiment.sh
  modified:
    - bin/lib/event-bus.cjs
    - workflows/optimize.md
    - bin/monitor-dashboard.sh
decisions:
  - Reuse existing event-emit pde-tools subcommand rather than creating new experiment-specific subcommand — avoids duplication, consistent with existing event architecture
  - EXPERIMENT_EVENTS as Object.freeze constant in event-bus.cjs — canonical names for downstream consumers (pane, tests)
  - 8th pane added to full layout only — minimal layout (2-pane) unchanged, preserving small-terminal degradation
  - Emit experiment.iteration on every iteration plus outcome-specific event (keep/discard/crash) — enables two consumption patterns (all iterations vs filtered by outcome)
requirements: [OBS-01, OBS-02]
one-liner: "6 experiment lifecycle event types on NDJSON bus + tmux experiment pane showing iteration, best metric, and keep/discard ratio"
metrics:
  duration: "144s"
  completed: "2026-03-23"
  tasks: 4
  files: 4
---

# Phase 106 Plan 01: Observability & Event Bus Summary

**One-liner:** 6 experiment lifecycle event types on NDJSON bus + tmux experiment pane showing iteration, best metric, and keep/discard ratio

## What Was Built

### EXPERIMENT_EVENTS constants (event-bus.cjs)

Added `EXPERIMENT_EVENTS` as an `Object.freeze` export containing all 6 event type strings:
- `experiment.start` — emitted when branch is initialized
- `experiment.iteration` — emitted on every iteration with metric_value and status
- `experiment.keep` — emitted when an iteration improves the metric
- `experiment.discard` — emitted when an iteration regresses the metric
- `experiment.crash` — emitted on CRASH or BOUNDARY_VIOLATION
- `experiment.complete` — emitted after loop exits (before report generation)

All events carry: `slug`, `iteration`, `metric_value`, `best_metric`, `status`, `budget_used`, `budget_total`

### Event emissions in optimize.md

Wired all 6 event types into the experiment workflow using the existing `pde-tools event-emit` subcommand:
- Step 5: `experiment.start` after branch init
- Step 7g2: `experiment.iteration` on every iteration, plus outcome-specific event
- After END LOOP: `experiment.complete`

### pane-experiment.sh

New tmux pane script that renders live experiment progress:
- Slug, running/complete status
- Iteration counter (current/total)
- Best metric value
- Keep/discard/crash counts + keep ratio percentage
- Remaining budget (budget_total - budget_used)
- Zero-state fallback: "No active experiment" message
- Full screen clear on `experiment.start`; incremental cursor-position updates thereafter

### monitor-dashboard.sh

Added P7 as 8th pane in `build_full_layout`:
- Label: "experiment"
- Runs `pane-experiment.sh` with the session NDJSON path
- `build_minimal_layout` (2-pane degraded mode) intentionally unchanged

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Reuse existing `event-emit` subcommand | Avoids duplication; consistent with Phase 62 workflow instrumentation pattern |
| EXPERIMENT_EVENTS Object.freeze in event-bus.cjs | Canonical string source for tests and downstream consumers |
| Emit both `experiment.iteration` + outcome event | Supports two consumption patterns without duplication |
| 8th pane in full layout only | Minimal layout (small terminals) stays at 2 panes — no regression |

## Deviations from Plan

None — plan executed exactly as described in ROADMAP Phase 106 specification.

## Requirements Satisfied

- OBS-01: Six experiment event types emitted on NDJSON event bus during live run
- OBS-02: tmux dashboard experiment pane showing iteration, best metric, keep/discard ratio, remaining budget

## Self-Check: PASSED

- [x] `bin/lib/event-bus.cjs` — EXPERIMENT_EVENTS exported, 6 event types defined
- [x] `workflows/optimize.md` — 6 event-emit calls wired at lifecycle points
- [x] `bin/pane-experiment.sh` — created, chmod +x, bash syntax OK
- [x] `bin/monitor-dashboard.sh` — P7 experiment pane added to build_full_layout
- [x] `node -e` verification of EXPERIMENT_EVENTS exports GREEN
- [x] `bash -n` syntax check of both shell scripts GREEN
- [x] 4 commits made (6e16758, d10f04a, 2f897fc, 906dd55)
