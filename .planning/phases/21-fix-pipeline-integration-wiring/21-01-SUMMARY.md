---
phase: 21-fix-pipeline-integration-wiring
plan: 01
subsystem: pipeline
tags: [pde, design-pipeline, coverage, manifest, skill-invocation]

# Dependency graph
requires:
  - phase: 20-pipeline-orchestrator-pde-build
    provides: workflows/build.md orchestrator that invokes sub-skills via Skill()
  - phase: 18-iterate
    provides: hasIterate as 7th designCoverage field, iterate.md gold standard pattern
provides:
  - Skill tool wired into commands/build.md — /pde:build can now invoke sub-skills at runtime
  - All 4 upstream workflows (system, flows, wireframe, critique) write 7-field designCoverage preserving hasIterate
  - Both manifest JSON files carry hasIterate: false as default
affects: [20-pipeline-orchestrator-pde-build, 18-iterate, workflows/build.md]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "7-field designCoverage write: always read coverage-check, extract all 7 fields with {current}, merge only the skill's own flag to true"
    - "Canonical placeholder style: {current} (not {current_hasXxx}) in manifest-set-top-level commands"

key-files:
  created: []
  modified:
    - commands/build.md
    - workflows/system.md
    - workflows/flows.md
    - workflows/wireframe.md
    - workflows/critique.md
    - templates/design-manifest.json
    - .planning/design/design-manifest.json

key-decisions:
  - "MISS-01 closed: Skill added to commands/build.md allowed-tools — /pde:build can now invoke sub-skills at runtime"
  - "BRK-01 closed: All 4 upstream workflows (system, flows, wireframe, critique) now write all 7 designCoverage fields including hasIterate:{current}"
  - "FLW-BRK-01 closed: Both manifest JSON files (template and live) carry hasIterate: false as schema default"
  - "system.md also fixed: was missing hasHardwareSpec AND used {current_hasXxx} placeholder style — both corrected to canonical {current} style from iterate.md gold standard"

patterns-established:
  - "7-field coverage write: hasDesignSystem, hasFlows, hasWireframes, hasCritique, hasIterate, hasHandoff, hasHardwareSpec — always all 7 in canonical order"
  - "Placeholder style in manifest-set-top-level: {current} (not {current_hasXxx})"

requirements-completed: [ORC-01, ORC-03]

# Metrics
duration: 8min
completed: 2026-03-15
---

# Phase 21 Plan 01: Fix Pipeline Integration Wiring Summary

**Skill tool wired into /pde:build and all 4 upstream workflows patched to write 7-field designCoverage preserving hasIterate — two integration defects (MISS-01, BRK-01) closed**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-16T05:32:00Z
- **Completed:** 2026-03-16T05:40:01Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- MISS-01 closed: `Skill` added to `commands/build.md` allowed-tools — `/pde:build` can now invoke sub-skills via `Skill()` at runtime
- BRK-01 closed: All 4 upstream workflows (system, flows, wireframe, critique) updated from 5-6 field coverage writes to canonical 7-field writes including `hasIterate:{current}`
- FLW-BRK-01 closed: Both manifest JSON files carry `hasIterate: false` as schema default, so `coverage-check` always returns all 7 fields
- system.md also corrected from `{current_hasXxx}` placeholder style to canonical `{current}` style, and `hasHardwareSpec` added (was missing entirely)
- Regression guard confirmed: `workflows/build.md` has zero `manifest-set-top-level` calls (orchestrator stays read-only per ORC-03)

## Task Commits

1. **Task 1: Add Skill to build allowed-tools; add hasIterate to manifest defaults** - `0a12fb0` (fix)
2. **Task 2: Update 4 workflow coverage writes to 7 fields** - `ecaa771` (fix)

## Files Created/Modified

- `commands/build.md` - Added `Skill` to allowed-tools list (MISS-01)
- `templates/design-manifest.json` - Added `"hasIterate": false` to designCoverage object
- `.planning/design/design-manifest.json` - Added `"hasIterate": false` to live designCoverage object
- `workflows/system.md` - 7-field coverage write with `hasIterate:{current}` and `hasHardwareSpec:{current}`, canonical `{current}` placeholder style
- `workflows/flows.md` - Added `hasIterate:{current}` to field list and manifest-set-top-level command
- `workflows/wireframe.md` - Added `hasIterate:{current}`, prose updated from "six" to "seven" fields
- `workflows/critique.md` - Added `hasIterate:{current}`, prose updated from "six" to "seven" fields

## Decisions Made

- Kept `workflows/build.md` and `workflows/iterate.md` untouched — orchestrator is read-only by design (ORC-03), iterate.md already uses 7-field gold standard
- Used canonical 7-field order from iterate.md: hasDesignSystem, hasFlows, hasWireframes, hasCritique, hasIterate, hasHandoff, hasHardwareSpec
- system.md had two compounding bugs (missing hasHardwareSpec + wrong placeholder style) — both fixed in same task as they share the same command line

## Deviations from Plan

None - plan executed exactly as written. All edits matched the prescribed before/after text in the plan.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/pde:build` pipeline is now fully wired: orchestrator can invoke sub-skills AND re-running any upstream skill after `/pde:iterate` preserves `hasIterate: true`
- Phase 21 Plan 01 is the only plan in this phase — phase complete
- No blockers for next work

---
*Phase: 21-fix-pipeline-integration-wiring*
*Completed: 2026-03-15*
