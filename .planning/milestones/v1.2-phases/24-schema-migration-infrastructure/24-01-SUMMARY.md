---
phase: 24-schema-migration-infrastructure
plan: 01
subsystem: infra
tags: [design-manifest, schema, coverage-flags, directory-structure]

# Dependency graph
requires: []
provides:
  - 13-field designCoverage schema in templates/design-manifest.json (adds hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations)
  - ux/mockups directory created by ensureDesignDirs (DOMAIN_DIRS now 8 entries)
affects:
  - 25-recommend-competitive-skills
  - 26-hig-audit-skill
  - 27-ideation-skill
  - 28-opportunity-skill
  - all skills that write designCoverage flags into the manifest

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "designCoverage flags canonically ordered: existing 7 first, then 6 new v1.2 flags"
    - "DOMAIN_DIRS uses fs.mkdirSync with recursive: true — nested paths (ux/mockups) work automatically"

key-files:
  created: []
  modified:
    - templates/design-manifest.json
    - bin/lib/design.cjs

key-decisions:
  - "hasBrief excluded from designCoverage — brief completion tracked via artifacts.BRF presence, not a flag"
  - "ux/mockups placed after ux in DOMAIN_DIRS so parent directory exists before subdirectory is created"

patterns-established:
  - "New v1.2 coverage flags appended after existing v1.0 flags to preserve backward compatibility"
  - "Self-test label reflects actual DOMAIN_DIRS count — update label whenever array changes"

requirements-completed: [INFRA-02, INFRA-03]

# Metrics
duration: 2min
completed: 2026-03-16
---

# Phase 24 Plan 01: Schema Migration & Infrastructure — Manifest Extension Summary

**13-field designCoverage schema template and ux/mockups output directory providing the v1.2 schema foundation for all downstream design skills**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-16T20:41:04Z
- **Completed:** 2026-03-16T20:42:27Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Extended templates/design-manifest.json designCoverage from 7 to 13 flags in canonical order
- Added ux/mockups to DOMAIN_DIRS in bin/lib/design.cjs (8 directories total)
- Updated self-test label to match new directory count — all 20 tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend manifest template and design.cjs infrastructure** - `1d5cd42` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `templates/design-manifest.json` - designCoverage block extended from 7 to 13 flags; adds hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations
- `bin/lib/design.cjs` - DOMAIN_DIRS updated to include ux/mockups; self-test label updated to "8 domain subdirectories (including ux/mockups)"

## Decisions Made
- `hasBrief` intentionally excluded — brief completion is tracked via `artifacts.BRF` presence, not a coverage flag (as specified in plan)
- `ux/mockups` placed immediately after `ux` in DOMAIN_DIRS — ordering ensures parent directory created before child

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Schema foundation complete — all v1.2 skills can now write their respective coverage flags into a manifest initialized from this template
- ux/mockups directory will be created on `design ensure-dirs` — Phase 26 HIG audit mockup output path is ready
- Phase 25 (recommend/competitive) can proceed; its skills will write hasCompetitive and hasRecommendations flags

---
*Phase: 24-schema-migration-infrastructure*
*Completed: 2026-03-16*

## Self-Check: PASSED

- FOUND: templates/design-manifest.json
- FOUND: bin/lib/design.cjs
- FOUND: .planning/phases/24-schema-migration-infrastructure/24-01-SUMMARY.md
- FOUND commit: 1d5cd42
