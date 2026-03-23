---
phase: 98-prose-drift-ldp-glob-fix
plan: 01
subsystem: workflows
tags: [prose-drift, glob-patterns, designCoverage, 21-fields, hasDeployStaging, LDP, critique, competitive, opportunity, system, hig, handoff]

# Dependency graph
requires:
  - phase: 95-integration-wiring-fixes
    provides: hasDeployStaging as the 21st designCoverage field — runtime write commands already correct
  - phase: 97-consumer-glob-mismatch-fixes
    provides: STR/DPD/GTM glob fixes in critique.md, deploy.md, handoff.md — this phase finishes the remaining LDP glob fix

provides:
  - LDP-landing-page-v*.md glob in critique.md BIZ-3 (removing -spec stem) — QUAL-01 closed
  - All 6 workflow prose sections updated from "20 fields" to "21 fields" with hasDeployStaging — INTG-01, FOUND-02 closed
  - competitive.md and opportunity.md anti-pattern prose now say 21 fields with hasDeployStaging
  - system.md, critique.md, hig.md, and handoff.md prose field lists now include hasDeployStaging

affects: [v0.12-milestone-completion, critique, competitive, opportunity, system, hig, handoff]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prose-only fix pattern: update field counts and field lists in prose sentences without touching bash commands or runtime JSON objects"
    - "Consumer glob must match producer stem exactly: LDP-landing-page-v*.md (no -spec suffix)"

key-files:
  created: []
  modified:
    - workflows/critique.md
    - workflows/competitive.md
    - workflows/opportunity.md
    - workflows/system.md
    - workflows/hig.md
    - workflows/handoff.md

key-decisions:
  - "All 7 fixes are prose-only — runtime bash commands and JSON objects were already correct (hasDeployStaging added in Phase 95)"
  - "LDP glob fix is consumer-side only — wireframe.md producer writes LDP-landing-page-v{N}.md and was already correct"
  - "No new Nyquist tests needed — structural behavior unchanged; all 235 existing tests remain GREEN"
  - "hig.md also required updating the pass-all count sentence (19 other fields -> 20 other fields) and FULL 20-field -> 21-field JSON sentence"

patterns-established:
  - "When adding a new designCoverage field, update: (1) runtime write commands, (2) prose field counts, (3) prose field lists — all three must match"
  - "Tech debt audit should track both glob stems AND prose field counts as separate audit dimensions"

requirements-completed: [QUAL-01, INTG-01, FOUND-02]

gaps_closed:
  - LDP-glob-stem-mismatch
  - competitive-prose-20fields
  - opportunity-prose-20fields
  - system-prose-20fields
  - critique-prose-20fields
  - hig-prose-20fields
  - handoff-prose-20fields

# Metrics
duration: 6min
completed: 2026-03-23
---

# Phase 98 Plan 01: Prose Drift and LDP Glob Fix Summary

**7 tech debt closures: LDP glob -spec stem removed in critique.md BIZ-3 and 6 workflow prose sections updated from "20 fields" to "21 fields" with hasDeployStaging — all 235/235 Nyquist tests remain GREEN**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-23T07:10:47Z
- **Completed:** 2026-03-23T07:17:34Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Fixed critique.md BIZ-3 LDP glob from `LDP-landing-page-spec-v*.md` to `LDP-landing-page-v*.md` — pricing psychology evaluation now finds the LDP artifact produced by wireframe.md
- Updated competitive.md and opportunity.md anti-pattern prose: "fewer than 20 fields" -> "fewer than 21 fields", added hasDeployStaging to required field list
- Updated system.md prose: "twenty-field JSON object" -> "twenty-one-field JSON object", both prose sentences now include hasDeployStaging and correct field counts (twenty-one, twenty, twenty-one-field)
- Updated critique.md coverage prose: "ALL TWENTY current" -> "ALL TWENTY-ONE current", field list now includes hasDeployStaging
- Updated hig.md coverage prose: "ALL TWENTY current" -> "ALL TWENTY-ONE current", hasDeployStaging added, pass-all count updated (19 -> 20), JSON description updated (FULL 20 -> 21-field)
- Updated handoff.md coverage prose: "ALL twenty current" -> "ALL twenty-one current", hasDeployStaging added to field list
- Confirmed 235/235 Nyquist CJS tests GREEN — prose-only edits introduce zero structural regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix LDP glob stem in critique.md BIZ-3 (QUAL-01)** - `030e5f7` (fix)
2. **Task 2: Update 6 stale "20 fields" prose references to "21 fields" (INTG-01, FOUND-02)** - `e371d79` (fix)
3. **Task 3: Verify 235/235 Nyquist tests GREEN after edits** - (verification only, no commit)

## Files Created/Modified

- `workflows/critique.md` — LDP glob fixed at line 796 (removed -spec stem); prose updated at line 1224 (TWENTY -> TWENTY-ONE + hasDeployStaging)
- `workflows/competitive.md` — Anti-pattern prose at line 754: 20 -> 21 fields, hasDeployStaging added
- `workflows/opportunity.md` — Anti-pattern prose at line 584: 20 -> 21 fields, hasDeployStaging added
- `workflows/system.md` — Prose at lines 2169/2176: twenty -> twenty-one, hasDeployStaging added to both sentences
- `workflows/hig.md` — Prose at lines 853-854/856/858: TWENTY -> TWENTY-ONE, 19 -> 20 other fields, FULL 20 -> 21-field JSON, hasDeployStaging added
- `workflows/handoff.md` — Prose at line 1456: twenty -> twenty-one current flag values, hasDeployStaging added

## Decisions Made

- All 7 fixes are prose-only — the runtime bash commands and JSON objects (added in Phase 95) were already correct with 21 fields including hasDeployStaging
- LDP glob fix is consumer-side only — wireframe.md producer was already writing `LDP-landing-page-v{N}.md` (no -spec suffix)
- No new Nyquist tests needed — structural behavior is unchanged; existing 235 tests confirm no regressions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - the Nyquist test suite uses CJS test files in `.planning/phases/*/tests/` directories (not the `.mjs` files in `tests/phase-*/`). The 235-test count refers to those CJS tests. All 235 passed with 0 failures.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 7 v0.12 prose drift tech debt items closed (1 LDP glob + 6 field count prose references)
- critique.md BIZ-3 will now find LDP artifact for pricing psychology evaluation
- All 6 workflow anti-pattern/prose sections accurately describe the 21-field designCoverage schema
- 235/235 Nyquist suite GREEN — zero regressions
- v0.12 milestone requirements QUAL-01, INTG-01, FOUND-02 all satisfied
- Ready for v0.12 milestone archival

---
*Phase: 98-prose-drift-ldp-glob-fix*
*Completed: 2026-03-23*
