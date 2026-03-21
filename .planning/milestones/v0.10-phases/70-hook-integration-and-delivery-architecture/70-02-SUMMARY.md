---
phase: 70-hook-integration-and-delivery-architecture
plan: 02
subsystem: docs
tags: [getting-started, documentation, idle-suggestions, configuration, claude-code]

# Dependency graph
requires: []
provides:
  - "Getting Started documentation with messageIdleNotifThresholdMs: 5000 configuration for ~/.CLAUDE.json"
affects: [71-suggestion-engine, 73-tmux-pane-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Document user-configurable ~/.CLAUDE.json settings in Getting Started when they affect PDE behavior"]

key-files:
  created: []
  modified:
    - GETTING-STARTED.md

key-decisions:
  - "Section inserted after '## What's Next' and before '## Command Cheat Sheet' to maintain logical flow from usage guide to advanced config to reference"
  - "Explicitly names ~/.CLAUDE.json (not settings.json or .claude/settings.json) to prevent the common misconfiguration pitfall documented in RESEARCH.md"

patterns-established:
  - "Pattern: Any user-configurable ~/.CLAUDE.json setting that affects PDE behavior gets its own Optional section in GETTING-STARTED.md near the end of the usage guide"

requirements-completed:
  - DLVR-05

# Metrics
duration: 1min
completed: 2026-03-21
---

# Phase 70 Plan 02: Idle Suggestion Threshold Documentation Summary

**`messageIdleNotifThresholdMs: 5000` in `~/.CLAUDE.json` documented in Getting Started so users see idle suggestions in 5 seconds instead of 60**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-21T05:45:03Z
- **Completed:** 2026-03-21T05:45:47Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added "## Idle Suggestion Threshold (Optional)" section to GETTING-STARTED.md after "## What's Next" and before "## Command Cheat Sheet"
- Section documents the exact JSON key (`messageIdleNotifThresholdMs`), value (`5000`), and config file location (`~/.CLAUDE.json`) needed to reduce idle detection from 60 seconds to 5 seconds
- Explicitly distinguishes `~/.CLAUDE.json` (global Claude Code config) from `.claude/settings.json` (project config) to prevent the documented misconfiguration pitfall

## Task Commits

Each task was committed atomically:

1. **Task 1: Add idle suggestion threshold configuration to Getting Started** - `59ef417` (docs)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `GETTING-STARTED.md` - Added "## Idle Suggestion Threshold (Optional)" section with messageIdleNotifThresholdMs: 5000 JSON example and ~/.CLAUDE.json path clarification

## Decisions Made

- Section positioned after "## What's Next" (not at end after Command Cheat Sheet) to keep advanced configuration close to the usage guide rather than buried after the reference table
- Included the pane 7 and `/pde:suggestions` context to anchor why the threshold matters (surface condition for when suggestions appear)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DLVR-05 complete — Getting Started documentation is correct for the idle suggestion threshold
- Phase 70 Plan 01 (hook handler implementation: DLVR-01 through DLVR-04) is the sibling plan; both together satisfy the full Phase 70 delivery contract
- Phase 71 (suggestion engine content) can proceed — the delivery file path and user documentation are now established

---
*Phase: 70-hook-integration-and-delivery-architecture*
*Completed: 2026-03-21*
