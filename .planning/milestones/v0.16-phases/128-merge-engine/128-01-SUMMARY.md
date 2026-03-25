---
phase: 128-merge-engine
plan: 01
subsystem: sync
tags: [context-sync, 3-way-merge, conflict-detection, ndjson, tdd]

# Dependency graph
requires:
  - phase: 126-sync-foundation
    provides: readStateFile, writeStateFile, computeLoopBreak — state file schema and hash comparison
  - phase: 127-reverse-parsers
    provides: parseMdcContent, parseSkillMd, parseDesignMd — reverse parsers producing partial IR
provides:
  - mergePartialIR(): field-level 3-way merge with 5-case resolution and planning-wins default
  - appendConflictLog(): NDJSON append to .planning/.sync-conflicts.log
  - parseMdcContent fix: pde-architecture.mdc now maps both Tech Stack and Architecture Conventions
  - SOURCE comment in both emitDesignMd paths (placeholder and full content)
  - 13 Nyquist tests covering all merge cases (CUR-04, AGR-04)
affects: [129-hook-integration, 130-antigravity-writeback, 131-mcp-writes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "3-way merge: base (lastIR snapshot) + editor partial + current .planning/ IR"
    - "planning-wins default: resolvedValue === planningValue on true conflict"
    - "NDJSON conflict log: appendConflictLog appends JSON lines to .sync-conflicts.log (non-fatal)"
    - "WRITABLE_FIELDS constant drives merge iteration: ['techStack','constraints','componentCatalog','designTokens']"

key-files:
  created:
    - tests/phase-128/test-merge-engine.cjs
  modified:
    - bin/lib/context-sync.cjs

key-decisions:
  - "Test 12 fixture corrected to .mdc canonical format: YAML frontmatter first, then PDE-GENERATED comment, then body (D-07 backward compat — no PDE:BEGIN/END markers in architecture file)"
  - "DRY sourceComment variable in emitDesignMd covers both placeholder and full content paths — grep count of 1 literal but both paths use it via variable (all tests GREEN)"
  - "mergePartialIR returns { merged, conflicts } — conflicts array passed to appendConflictLog by caller when planningDir is provided in opts"

patterns-established:
  - "mergePartialIR(base, editorPartial, currentIR, opts) — base=null on first run, editor wins"
  - "appendConflictLog(planningDir, entry) — non-fatal, stderr on error, never throws"
  - "Conflict entry shape: { field, baseValue, editorValue, planningValue, resolvedValue, policy, timestamp, source }"

requirements-completed: [CUR-04, AGR-04]

# Metrics
duration: 12min
completed: 2026-03-24
---

# Phase 128 Plan 01: Merge Engine Summary

**3-way field-level merge engine with conflict detection and NDJSON logging — mergePartialIR() + appendConflictLog() — plus parseMdcContent Architecture Conventions fix and canonical token SOURCE comment in both DESIGN.md output paths**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-24T19:56:56Z
- **Completed:** 2026-03-24T20:08:00Z
- **Tasks:** 2 (TDD: RED then GREEN)
- **Files modified:** 2

## Accomplishments

- mergePartialIR() resolves all 5 merge cases: editor-only, pde-only, both-same, true-conflict (planning-wins), neither-changed
- appendConflictLog() appends NDJSON to .planning/.sync-conflicts.log with all 8 required fields, non-fatal on error
- parseMdcContent for pde-architecture.mdc now extracts both techStack (Tech Stack section) AND constraints (Architecture Conventions section) — Finding 1 fixed
- emitDesignMd adds `<!-- SOURCE: design-manifest.json | DERIVE-ONLY -->` comment in both placeholder path and full content path (AGR-04 / Research F3)
- 13/13 phase-128 Nyquist tests GREEN, 25/25 phase-127 GREEN, 15/15 phase-126 GREEN — zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests (RED)** - `6468a93` (test)
2. **Task 2: Implement mergePartialIR, appendConflictLog, fixes (GREEN)** - `337ff44` (feat)

_Note: TDD tasks — test commit (RED) then feat commit (GREEN)_

## Files Created/Modified

- `tests/phase-128/test-merge-engine.cjs` - 13 Nyquist tests for CUR-04/AGR-04 (created)
- `bin/lib/context-sync.cjs` - mergePartialIR(), appendConflictLog(), WRITABLE_FIELDS, parseMdcContent fix, SOURCE comments, exports (modified)

## Decisions Made

- **Test 12 fixture format:** The plan's test fixture had the PDE-GENERATED comment before the YAML frontmatter, but the real .mdc format puts frontmatter first. Fixed the fixture to match canonical format. This is a Rule 1 auto-fix (bug in test fixture).
- **DRY sourceComment:** Used a single `const sourceComment` variable in emitDesignMd covering both paths, rather than duplicating the string literal. Both emitDesignMd paths tested GREEN (tests 11a and 11b).
- **null base handling:** First-run scenario (base=null) lets editor win for all provided fields — prevents blocking bidirectional sync on fresh projects.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect test fixture format for Test 12**
- **Found during:** Task 2 GREEN phase (test run)
- **Issue:** The plan's test fixture for Test 12 had `<!-- PDE-GENERATED -->` comment BEFORE the YAML frontmatter `---`, but parseMdcContent requires frontmatter first. The test returned null instead of a partial IR.
- **Fix:** Reordered fixture to match canonical .mdc format: frontmatter (`---`) first, then PDE-GENERATED comment, then body. Architecture file uses D-07 backward compat (no PDE:BEGIN/END markers).
- **Files modified:** tests/phase-128/test-merge-engine.cjs
- **Verification:** Test 13 passes GREEN after fix
- **Committed in:** `337ff44` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug in test fixture)
**Impact on plan:** Necessary correction — test fixture didn't match real file format. No scope creep.

## Issues Encountered

None beyond the test fixture format fix above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- mergePartialIR() and appendConflictLog() are ready for consumption by Phase 129 hook integration
- The merge engine handles all 5 cases correctly, including null base (first run)
- .planning/.sync-conflicts.log is write-path ready — Phase 129 hooks can pass planningDir to activate logging
- parseMdcContent Architecture Conventions fix means Cursor rule changes now flow to constraints field correctly

---
*Phase: 128-merge-engine*
*Completed: 2026-03-24*
