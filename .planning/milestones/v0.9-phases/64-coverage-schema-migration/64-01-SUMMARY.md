---
phase: 64-coverage-schema-migration
plan: 01
subsystem: design-pipeline
tags: [designCoverage, schema-migration, manifest, pass-through-all, stitch]

# Dependency graph
requires: []
provides:
  - "14-field designCoverage schema with hasStitchWireframes in all 13 pipeline skills"
  - "templates/design-manifest.json with 14-field schema as default for new projects"
  - ".planning/design/design-manifest.json brought from 7-field to 14-field"
  - "All 3 pressure-test fixtures updated to 14-field schema"
affects:
  - "65-mcp-bridge"
  - "66-wireframe-stitch"
  - "67-ideation-stitch"
  - "68-handoff-stitch"
  - "69-mockup-stitch"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pass-through-all pattern: every skill that writes designCoverage must include all N fields to prevent clobber via manifest-set-top-level flat object replacement"
    - "14-field canonical order: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes"

key-files:
  created: []
  modified:
    - "templates/design-manifest.json"
    - ".planning/design/design-manifest.json"
    - ".planning/pressure-test/fixture-greenfield/design/design-manifest.json"
    - ".planning/pressure-test/fixture-partial/design/design-manifest.json"
    - ".planning/pressure-test/fixture-rerun/design/design-manifest.json"
    - "workflows/wireframe.md"
    - "workflows/mockup.md"
    - "workflows/system.md"
    - "workflows/flows.md"
    - "workflows/critique.md"
    - "workflows/iterate.md"
    - "workflows/handoff.md"
    - "workflows/ideate.md"
    - "workflows/competitive.md"
    - "workflows/opportunity.md"
    - "workflows/hig.md"
    - "workflows/recommend.md"

key-decisions:
  - "hasStitchWireframes defaults to false everywhere in Phase 64 — wireframe.md will set it to true in Phase 66 only"
  - "recommend.md uses named placeholder convention ({current_hasStitchWireframes}) matching its existing pattern"
  - "brief.md left untouched — confirmed no manifest-set-top-level designCoverage call exists"
  - "Live manifest (.planning/design/design-manifest.json) migrated from 7-field to 14-field directly"
  - "handoff.md stale docstring on line 2 updated from 7 to 14 fields"

patterns-established:
  - "Field addition pattern: append new field after hasRecommendations in both JSON literals and prose field lists"
  - "Stale docstring correction: update prose field counts alongside code changes to prevent schema drift"

requirements-completed: [MCP-04]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 64 Plan 01: Coverage Schema Migration Summary

**designCoverage schema extended from 13 to 14 fields by adding hasStitchWireframes to all 12 pipeline skill workflow files, the manifest template, live manifest, and 3 pressure-test fixtures**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-20T22:16:19Z
- **Completed:** 2026-03-20T22:20:39Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- All 12 manifest-set-top-level designCoverage JSON literals extended from 13 to 14 fields (hasStitchWireframes added as last field with {current} pass-through)
- All 5 JSON manifest files (1 template + 1 live + 3 fixtures) updated with hasStitchWireframes: false
- Prose field counts updated from "thirteen" to "fourteen" in wireframe.md, critique.md, flows.md, handoff.md, iterate.md, system.md; field lists extended in all applicable skills
- handoff.md stale docstring (line 2) corrected from "7 designCoverage fields" to "14"
- recommend.md extended using named placeholder convention ({current_hasStitchWireframes})
- design.cjs self-test: 20/20 passed; full grep audit confirms 17 files; brief.md untouched; no hasStitchWireframes set to true

## Task Commits

Each task was committed atomically:

1. **Task 1: Update JSON manifests and fixtures with 14-field designCoverage** - `ae086d9` (feat)
2. **Task 2: Update all 13 workflow files with hasStitchWireframes pass-through** - `1ab0ec3` (feat)

## Files Created/Modified

- `templates/design-manifest.json` - Added hasStitchWireframes: false to 14-field schema
- `.planning/design/design-manifest.json` - Migrated from 7-field to 14-field schema
- `.planning/pressure-test/fixture-greenfield/design/design-manifest.json` - Added hasStitchWireframes: false
- `.planning/pressure-test/fixture-partial/design/design-manifest.json` - Added hasStitchWireframes: false (existing true flags preserved)
- `.planning/pressure-test/fixture-rerun/design/design-manifest.json` - Added hasStitchWireframes: false (existing true flags preserved)
- `workflows/wireframe.md` - JSON literal + prose updated (fourteen, hasStitchWireframes in field list)
- `workflows/mockup.md` - JSON literal + prose (14 flags, 14 fields in canonical order)
- `workflows/system.md` - JSON literal + prose (fourteen-field)
- `workflows/flows.md` - JSON literal + prose (fourteen fields)
- `workflows/critique.md` - JSON literal + prose (fourteen)
- `workflows/iterate.md` - JSON literal + prose (fourteen)
- `workflows/handoff.md` - JSON literal + prose (fourteen) + stale docstring line 2 fixed (7->14)
- `workflows/ideate.md` - JSON literal + canonical 14-field order list
- `workflows/competitive.md` - JSON literal + 14-flag field list
- `workflows/opportunity.md` - JSON literal + canonical 14-field order list
- `workflows/hig.md` - JSON literal + 14-flag field list
- `workflows/recommend.md` - JSON literal (named placeholder) + table row added + 13->14 field count

## Decisions Made

- `hasStitchWireframes` defaults to `false` everywhere in Phase 64. Only Phase 66 (wireframe-stitch) will set it to `true` — Phase 64 is schema extension only, not activation.
- `recommend.md` uses named placeholder convention (`{current_hasStitchWireframes}`) because the entire file uses that pattern. All other 11 skills use `{current}`.
- `brief.md` was explicitly not touched — confirmed via grep that it has no `manifest-set-top-level designCoverage` call. The architecture count of "13 skills" correctly excludes brief.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 65 (mcp-bridge) can proceed — designCoverage schema is now 14-field and stable
- Phase 66 (wireframe-stitch) can set `hasStitchWireframes: true` in its manifest-set-top-level call without risk of clobbering any other skill
- All downstream phases (67, 68, 69) inherently safe — every existing skill will pass hasStitchWireframes through unchanged

---
*Phase: 64-coverage-schema-migration*
*Completed: 2026-03-20*
