---
phase: 171-security-architecture-discovery-foundation
plan: 03
subsystem: cli
tags: [app-discovery, cli-wiring, design-apps, blender, gimp, inkscape]

requires:
  - phase: 171-01
    provides: "app-discovery.cjs with five-tier probe and APP_CATALOG"
  - phase: 171-02
    provides: "app-registry.cjs with approval state machine"
provides:
  - "pde-tools app discover|probe|list|approve CLI subcommands"
  - "references/app-integrations.md known design app catalog (DISC-06)"
affects: [172-core-app-wrappers, 173-mcp-bridge, 174-cli-wrap-skill]

tech-stack:
  added: []
  patterns: ["CLI subcommand routing via nested switch in pde-tools.cjs"]

key-files:
  created: ["references/app-integrations.md"]
  modified: ["bin/pde-tools.cjs"]

key-decisions:
  - "Registry path defaults to .planning/app-registry.json relative to cwd"
  - "Discover writes pending entries automatically; approve is separate explicit step"

patterns-established:
  - "App subcommand pattern: case 'app' with nested switch for sub-subcommands"

requirements-completed: [DISC-06]

duration: 3min
completed: 2026-03-29
---

# Phase 171 Plan 03: CLI Wiring + App Catalog Summary

**pde-tools app subcommands wired for discover/probe/list/approve with known design app catalog documenting Blender, GIMP, and Inkscape**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T09:01:24Z
- **Completed:** 2026-03-29T09:04:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Wired four app subcommands (discover, probe, list, approve) into pde-tools.cjs routing to app-discovery.cjs and app-registry.cjs
- Created comprehensive known design app catalog at references/app-integrations.md covering Blender, GIMP, Inkscape with bundle IDs, pip status, executionMode, discovery hints, and GIMP 3.x breaking changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Add pde-tools app subcommand routing** - `2f38ad0` (feat)
2. **Task 2: Create references/app-integrations.md** - `a8647de` (feat)

## Files Created/Modified
- `bin/pde-tools.cjs` - Added case 'app' block with discover/probe/list/approve subcommands and help text
- `references/app-integrations.md` - Known design app catalog for DISC-06 with Blender, GIMP, Inkscape documentation

## Decisions Made
- Registry path defaults to `.planning/app-registry.json` relative to cwd - consistent with other planning artifacts
- Discover automatically writes pending entries; approve is a separate explicit step for security

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 171 plans complete (01: discovery, 02: registry, 03: CLI wiring + catalog)
- Phase 172 can now build app wrappers using the discovery/registry infrastructure
- Phase 173 MCP bridge can reference approved registry entries

---
*Phase: 171-security-architecture-discovery-foundation*
*Completed: 2026-03-29*
