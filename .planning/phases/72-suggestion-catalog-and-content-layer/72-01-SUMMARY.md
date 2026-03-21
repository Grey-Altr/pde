---
phase: 72-suggestion-catalog-and-content-layer
plan: 01
subsystem: idle-suggestions
tags: [idle-suggestions, catalog, design-state, suggestion-engine, node-cjs]

requires:
  - phase: 71-suggestion-engine
    provides: generateSuggestions with catalogPath param stub, STATIC_THINK fallback, gatherCandidates structure

provides:
  - ".planning/idle-catalog.md with 6 phase sections (research, plan, execute, design, validation, default)"
  - "parseCatalog() reading catalog by phaseType and emitting source:catalog candidates"
  - "extractDesignStateIncompleteItems() producing per-item think candidates from DESIGN-STATE.md"
  - "hooks/idle-suggestions.cjs passes catalogPath to generateSuggestions"
  - "hooks/tests/verify-phase-72.cjs with 9 tests covering CONT-01/02/03/05/06"

affects: [72-02-plan, plan-phase-workflow, brief-workflow]

tech-stack:
  added: []
  patterns:
    - "Catalog parser: inline line-scanner with lookahead for label lines; always pushes entry with defaults if label absent"
    - "DESIGN-STATE extraction: regex /^[-*]\\s+\\[\\s\\]\\s+(.+)/ for per-item text extraction"
    - "Catalog as STATIC_THINK replacement: parseCatalog returns null when absent; thinkSource falls back to STATIC_THINK"

key-files:
  created:
    - .planning/idle-catalog.md
    - hooks/tests/verify-phase-72.cjs
  modified:
    - bin/lib/idle-suggestions.cjs
    - hooks/idle-suggestions.cjs

key-decisions:
  - "DESIGN-STATE items reclassified from category:review to category:think — per-item judgment calls are think-priority (3), not review-priority (2)"
  - "extractDesignStateIncompleteItems replaces checkDesignState as file read 3 — else-if checkDesignState preserved as generic fallback when items array is empty but file exists"
  - "Catalog has 6 sections not 7 — no review section in catalog (review is dynamically-generated from design-manifest.json, not catalog-authored)"

patterns-established:
  - "Catalog-driven think entries: parseCatalog(catalogPath, phaseType) → thinkSource, fallback to STATIC_THINK when null"
  - "Per-item DESIGN-STATE extraction: extractDesignStateIncompleteItems(cwd) reads file once and returns text array"

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-05, CONT-06]

duration: 3min
completed: 2026-03-21
---

# Phase 72 Plan 01: Suggestion Catalog and Content Layer Summary

**Human-editable markdown catalog (.planning/idle-catalog.md) wired into the suggestion engine via parseCatalog(), replacing STATIC_THINK with phase-specific entries and upgrading DESIGN-STATE detection to per-item think candidates**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-21T07:20:02Z
- **Completed:** 2026-03-21T07:22:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `.planning/idle-catalog.md` with 6 phase sections (research, plan, execute, design, validation, default), each with 3-5 labeled entries, every section containing at least one question
- Implemented `parseCatalog()` and `extractDesignStateIncompleteItems()` in `bin/lib/idle-suggestions.cjs`, replacing the `STATIC_THINK` unconditional push with catalog-sourced entries
- Upgraded DESIGN-STATE.md detection from a single generic "review: incomplete design stages" entry to per-item `think` candidates using actual item text
- Wired `catalogPath` through `hooks/idle-suggestions.cjs` to `generateSuggestions`
- All 9 Phase 72 tests pass; all 17 Phase 71 tests still pass (zero regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create test scaffold and wire catalogPath in hook handler** - `69e10af` (feat)
2. **Task 2: Create idle-catalog.md and implement catalog parser + DESIGN-STATE extraction** - `56d0898` (feat)

## Files Created/Modified

- `.planning/idle-catalog.md` — Human-editable suggestion catalog with 6 phase sections and labeled entries
- `hooks/tests/verify-phase-72.cjs` — 9-test suite covering CONT-01/02/03/05/06 requirements
- `bin/lib/idle-suggestions.cjs` — Added parseCatalog(), extractDesignStateIncompleteItems(); modified gatherCandidates DESIGN-STATE block and STATIC_THINK push
- `hooks/idle-suggestions.cjs` — Added catalogPath construction and passing to generateSuggestions

## Decisions Made

- DESIGN-STATE items reclassified from `category:review` to `category:think` — per-item judgment calls belong in think-priority (3), not review-priority (2). The original Phase 71 implementation placed them in review for visual grouping; CONT-05 specifies "low-urgency decision prompts" which semantically maps to think.
- `extractDesignStateIncompleteItems` replaces `checkDesignState` as the primary file read 3 path. The `else if checkDesignState(cwd)` branch is preserved as a generic fallback for when the file exists but no `[ ]` items are found (edge case: DESIGN-STATE.md with only `[x]` checked items).
- Catalog has 6 sections, not 7 — no `## review` section. The `review` category in the engine output is reserved exclusively for dynamically-generated artifact paths from design-manifest.json. Including a catalog `## review` section would mislead users and conflict with the architecture contract from the research notes.

## Deviations from Plan

None — plan executed exactly as written. Test count is 9 (vs. plan's "at least 8") — one additional test added organically when writing CONT-06 verification.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 72 Plan 01 complete — catalog-driven suggestion engine fully operational
- Phase 72 Plan 02 ready to begin: context-notes directory initialization and plan-phase workflow injection (CONT-04)
- No blockers

## Self-Check: PASSED

- FOUND: .planning/idle-catalog.md
- FOUND: hooks/tests/verify-phase-72.cjs
- FOUND: bin/lib/idle-suggestions.cjs
- FOUND: hooks/idle-suggestions.cjs
- FOUND: 72-01-SUMMARY.md
- FOUND: commit 69e10af (task 1)
- FOUND: commit 56d0898 (task 2)
- 9/9 Phase 72 tests pass
- 17/17 Phase 71 tests pass (zero regressions)

---
*Phase: 72-suggestion-catalog-and-content-layer*
*Completed: 2026-03-21*
