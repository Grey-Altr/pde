---
phase: 61-token-context-metering
plan: "01"
subsystem: monitoring
tags: [token-metering, cost-estimation, tmux, bash, node, model-profiles]

# Dependency graph
requires:
  - phase: 59-tmux-dashboard-dependency-detection
    provides: pane-token-meter.sh stub, pane-context-window.sh stub, tmux dashboard layout
  - phase: 60-session-archival
    provides: validate-archival.sh pattern, NDJSON event stream infrastructure
provides:
  - Live token/cost meter pane using chars/4 heuristic with per-model pricing
  - validate-metering.sh with 8 automated checks for TOKN-01, TOKN-02, TOKN-03
affects: [61-02-context-window-pane, dashboard-observability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "chars/4 heuristic for token estimation — all estimates labeled '~est.' (TOKN-01)"
    - "70/30 input/output split for cost estimation"
    - "Node.js for float math — no bc usage"
    - "Cost subprocess spawned every 5 events, not per-event"
    - "PLUGIN_ROOT resolution via CLAUDE_PLUGIN_ROOT env or dirname fallback"

key-files:
  created:
    - bin/pane-token-meter.sh
    - .planning/phases/61-token-context-metering/validate-metering.sh
  modified:
    - bin/pane-token-meter.sh

key-decisions:
  - "chars/4 heuristic proxy labeled ~est. per TOKN-01 — tokenx 1.3.0 vendoring deferred pending empirical validation"
  - "Inline PRICING table in pane-token-meter.sh (not read from external file) — single startup node invocation resolves model tier from model-profiles.cjs, pricing is stable enough for inline constants"
  - "Node.js cost subprocess spawned every 5 events — avoids per-event subprocess overhead while keeping display responsive"
  - "validate-metering.sh --quick flag skips unit checks 7-8 for fast structural validation in CI"

patterns-established:
  - "Validation scripts follow validate-archival.sh pattern: set -uo pipefail, check() helper, PASS_COUNT/FAIL_COUNT, PHASE XX VALIDATION: N/M PASS summary"
  - "All token/cost display values must carry (~est.) suffix — bare numeric cost display is forbidden"

requirements-completed: [TOKN-01, TOKN-02]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 61 Plan 01: Token/Cost Meter Summary

**Live token/cost pane with chars/4 heuristic, per-model pricing from model-profiles.cjs, and 8-check Nyquist validation suite — 8/8 PASS**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T19:15:11Z
- **Completed:** 2026-03-20T19:16:33Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced pane-token-meter.sh stub: live accumulator with chars/4 heuristic, ~est. labels on every numeric value, per-model PRICING table (opus $5/$25, sonnet $3/$15, haiku $1/$5), cost via Node.js 70/30 split
- Model tier resolved at startup from model-profiles.cjs via config.json model_profile (defaults to balanced/sonnet)
- Created validate-metering.sh with 8 checks: 6 structural grep checks + 2 inline Node.js unit checks; --quick flag for fast structural-only runs

## Task Commits

Each task was committed atomically:

1. **Task 1: Create validate-metering.sh (Wave 0)** - `e9899dd` (feat)
2. **Task 2: Replace pane-token-meter.sh stub** - `58a3259` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `bin/pane-token-meter.sh` - Live token/cost meter: chars/4 accumulator, per-model PRICING, ~est. on all values, scope disclaimer
- `.planning/phases/61-token-context-metering/validate-metering.sh` - 8-check Nyquist validation for TOKN-01, TOKN-02, TOKN-03

## Decisions Made

- Inline PRICING table in pane-token-meter.sh rather than a separate config file — pricing is stable enough for inline constants and avoids an extra read at runtime
- Node.js cost subprocess spawned every 5 events to avoid per-event subprocess overhead; display stays responsive for typical session event rates
- validate-metering.sh --quick flag skips Node.js unit checks for fast CI structural validation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01 complete: TOKN-01 and TOKN-02 delivered, validation infrastructure ready
- Plan 02 (context window pane) can now run validate-metering.sh to verify TOKN-03 structural checks (TOKN03-A, TOKN03-B already PASS against existing pane-context-window.sh stub)
- TOKN03-C (context percentage calculation) passing confirms math is correct for Plan 02 implementation

---
*Phase: 61-token-context-metering*
*Completed: 2026-03-20*
