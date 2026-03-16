---
phase: 12-design-pipeline-infrastructure
plan: "01"
subsystem: infra
tags: [design-pipeline, dtcg, css-tokens, write-lock, manifest, cjs]

# Dependency graph
requires: []
provides:
  - "bin/lib/design.cjs: directory init, write-lock, DTCG-to-CSS, manifest CRUD, self-test"
  - ".planning/design/ with 6 domain subdirs, DESIGN-STATE.md, design-manifest.json"
  - "8 design subcommands in pde-tools.cjs (ensure-dirs through lock-release)"
affects:
  - 13-design-brief
  - 14-design-system
  - 15-design-flows
  - 16-design-wireframes
  - 17-design-critique
  - 18-design-iterate
  - 19-design-handoff
  - 20-design-orchestrator

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CommonJS module with embedded --self-test entry point (no jest/vitest)"
    - "DTCG token format: skip $ keys, recurse non-$ objects, emit --prefix-key on $value"
    - "Write-lock via DESIGN-STATE.md table row with ISO expiry timestamp"
    - "Template initialization: stripCommentKeys + clear example data on first run"

key-files:
  created:
    - bin/lib/design.cjs
    - .planning/design/DESIGN-STATE.md
    - .planning/design/design-manifest.json
  modified:
    - bin/pde-tools.cjs

key-decisions:
  - "No npm dependencies — zero-dep implementation using only Node.js builtins (fs, path, os, assert)"
  - "Write-lock uses ISO timestamp rows in DESIGN-STATE.md table (no separate lock file)"
  - "DOMAIN_DIRS = ['assets', 'strategy', 'ux', 'visual', 'review', 'handoff'] — 6 domains"
  - "WRITE_LOCK_TTL_MS = 60000 (60 seconds) — stale locks cleared automatically on next acquire"
  - "Manifest initialization strips all _comment keys and resets artifacts: {} and tokenDependencyMap: {}"

patterns-established:
  - "design.cjs follows exact module structure of state.cjs (cmd* wrappers, output() helper)"
  - "ensureDesignDirs is the entry point all phases 13-20 must call before any artifact work"
  - "acquireWriteLock must precede any DESIGN-STATE.md write; releaseWriteLock must follow"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, INFRA-04]

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 12 Plan 01: Design Pipeline Infrastructure Summary

**CommonJS design library (bin/lib/design.cjs) providing zero-dependency directory init, DTCG-to-CSS token conversion, 60s write-lock, and manifest CRUD — wired into pde-tools.cjs as 8 routed subcommands with 17-assertion self-test**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T21:10:33Z
- **Completed:** 2026-03-15T21:12:00Z
- **Tasks:** 2
- **Files modified:** 2 (created 1, modified 1)

## Accomplishments

- Created `bin/lib/design.cjs` with all 9 core exported functions and 8 cmd* router wrappers
- Self-test passes 17 assertions covering all four INFRA requirements with zero npm dependencies
- Wired 8 design subcommands (`ensure-dirs` through `lock-release`) into `bin/pde-tools.cjs`
- Initialized `.planning/design/` with 6 domain subdirs, `DESIGN-STATE.md`, and `design-manifest.json`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create bin/lib/design.cjs with all infrastructure functions and self-test** - `b223484` (feat)
2. **Task 2: Wire design subcommand router into pde-tools.cjs** - `11a0ed6` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `bin/lib/design.cjs` - Design pipeline infrastructure library: directory init, write-lock, DTCG-to-CSS, manifest CRUD, self-test
- `bin/pde-tools.cjs` - Added `case 'design':` block routing 8 subcommands + header docs section
- `.planning/design/DESIGN-STATE.md` - Initialized from template (side-effect of ensure-dirs verification)
- `.planning/design/design-manifest.json` - Initialized with _comment keys stripped, artifacts: {} (side-effect of verification)

## Decisions Made

- No npm dependencies: implemented DTCG token traversal, write-lock, and manifest CRUD using only Node.js builtins
- Write-lock stored as a table row in `DESIGN-STATE.md` (not a separate `.lock` file) to keep all state in a single human-readable location
- `WRITE_LOCK_TTL_MS = 60000` (60 seconds) with automatic stale-lock clearing on next `acquireWriteLock` call
- Template initialization uses `stripCommentKeys` (mutates in place) and resets example data to empty objects — safe to call multiple times (idempotent check on file existence)
- Self-test creates isolated `fs.mkdtempSync` temp directory and copies templates in, so it can run from any working directory

## Deviations from Plan

None - plan executed exactly as written. 17 tests passed (plan specified "15+" — 2 additional assertions added for releaseWriteLock round-trip and stale-lock clearing).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 13 (Design Brief) can begin immediately — `ensureDesignDirs` provides the foundation it needs
- Phases 14-20 all depend on this plan; all are now unblocked
- `node bin/pde-tools.cjs design ensure-dirs` verifies the full setup in one command

---
*Phase: 12-design-pipeline-infrastructure*
*Completed: 2026-03-15*
