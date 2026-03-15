---
phase: 09-fix-runtime-crash
plan: 01
subsystem: ui
tags: [telemetry, commonjs, node-builtins, render, crash-fix]

# Dependency graph
requires:
  - phase: 07-rebranding-completeness
    provides: PDE-branded banner() call sites in workflows/ and lib/ui/ — source was correct, crash prevented rendering
provides:
  - lib/telemetry.cjs implementing the full 7-function API surface consumed by render.cjs
  - All 6 render.cjs commands (banner, splash, panel, progress, checkpoint, divider) execute without crash
  - BRAND-04 and BRAND-05 functionally satisfied — PDE UI banners now render at runtime
affects: [any phase that invokes render.cjs commands or workflow banner()/panel() calls]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zero-side-effect require: all file I/O inside function bodies, none at module load time"
    - "Lazy directory creation: fs.mkdirSync recursive on first write only"
    - "PDE_TEST_DIR env override: process.env.PDE_TEST_DIR || os.homedir() for test isolation"
    - "JSONL event log: append-only JSON lines, safe defaults on all read errors"

key-files:
  created:
    - lib/telemetry.cjs
  modified: []

key-decisions:
  - "Full implementation chosen over stub — render.cjs consent, track-*, and telemetry commands need real persistence, not no-ops"
  - "Authoritative skeleton from RESEARCH.md used verbatim — derived directly from render.cjs call site analysis"
  - "fileSize defaults to 0 (not undefined) to prevent NaN in render.cjs (status.fileSize / 1024).toFixed(1)"

patterns-established:
  - "Telemetry modules must never throw — all file operations catch errors and return safe defaults ([], false, 0)"
  - "Session ID cached in module-level variable — stable per process invocation, lazy-initialized via crypto.randomBytes"

requirements-completed: [BRAND-04, BRAND-05]

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 9 Plan 01: Fix Runtime Crash Summary

**Created lib/telemetry.cjs (127 lines, zero npm deps) resolving MODULE_NOT_FOUND crash that blocked all 6 render.cjs commands across 14 workflow files**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-15T07:00:41Z
- **Completed:** 2026-03-15T07:05:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Created lib/telemetry.cjs with complete 7-function API (getTrackingPlanVersion, checkConsent, saveConsent, getSessionId, appendEvent, readEvents, getStatus)
- Resolved MODULE_NOT_FOUND crash — `require('../telemetry.cjs')` in render.cjs now loads successfully
- All 6 render.cjs commands (banner, splash, panel, progress, checkpoint, divider) verified exit 0
- BRAND-04 and BRAND-05 now functionally satisfied — PDE-branded banners and splash screen render correctly at runtime
- Zero GSD strings in lib/telemetry.cjs confirmed

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lib/telemetry.cjs with full API surface** - `3228b55` (feat)
2. **Task 2: Verify render.cjs and all UI commands execute without crash** - (verification only, no additional files; covered by Task 1 commit)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `lib/telemetry.cjs` - Full telemetry module: consent persistence, JSONL event log, session ID, status reporting

## Decisions Made

- Used the complete authoritative skeleton from RESEARCH.md — derived directly from render.cjs call sites, HIGH confidence contract
- Implemented fully functional telemetry (not a stub) since render.cjs consent gates and track-* commands require real persistence to be useful
- fileSize always returns numeric 0 as default to avoid NaN in render.cjs `(status.fileSize / 1024).toFixed(1)`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — root cause was precisely identified in RESEARCH.md. File was created from the authoritative skeleton and passed all verifications on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 9 objective complete — all render.cjs commands functional
- BRAND-04 and BRAND-05 requirements fully satisfied at runtime (not just textual grep)
- All 14 workflow files using banner()/panel() will now render correctly
- No blockers for any subsequent phases

---
*Phase: 09-fix-runtime-crash*
*Completed: 2026-03-15*
