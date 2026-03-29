---
phase: 171-security-architecture-discovery-foundation
plan: 02
subsystem: security
tags: [registry, approval-gate, sha256, state-machine, dependency-injection]

requires:
  - phase: none
    provides: standalone module - no prior phase dependencies
provides:
  - "App approval registry with pending/approved/rejected state machine"
  - "SHA-256 binary hash verification at approval time"
  - "checkApproved guard with actionable CLI error messages"
  - "Registry CRUD: loadRegistry, saveRegistry, addPendingEntry, approveEntry, rejectEntry, getEntry, listEntries"
affects: [171-03, 172-gimp-wrapper, 173-mcp-bridge, 174-cli-wrap-skill]

tech-stack:
  added: []
  patterns: ["_fns dependency injection for fs/crypto mocking", "Two-tier approval state machine (pending/approved/rejected)", "SHA-256 hash at approval time only (not discovery)"]

key-files:
  created:
    - bin/lib/app-registry.cjs
    - tests/phase-171/app-registry.test.mjs
  modified: []

key-decisions:
  - "SHA-256 computed at approval time only - discovery-time hashing expensive for 200MB+ binaries"
  - "checkApproved checks mock executionMode before status - mock apps are never invokable regardless of approval"
  - "Registry stored at .planning/app-registry.json - separate from cli-anything/registry.json"

patterns-established:
  - "Two-tier approval: every discovered app starts pending, only human-approved + hash-verified entries are executable"
  - "_fns injection pattern for all fs/crypto operations enables zero-I/O unit testing"

requirements-completed: [DISC-02]

duration: 2min
completed: 2026-03-29
---

# Phase 171 Plan 02: App Registry Summary

**Two-tier approval registry with pending/approved/rejected state machine, SHA-256 hash verification at approval time, and checkApproved guard with actionable CLI error messages**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-29T08:55:15Z
- **Completed:** 2026-03-29T08:57:09Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Full registry CRUD module (9 exported functions) with state machine transitions
- SHA-256 binary hash computed only at approval time (not discovery) for performance with large binaries
- checkApproved guard throws actionable errors with exact CLI commands for resolution
- 14 unit tests all passing with complete _fns dependency injection (zero real I/O)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create test scaffold for app-registry** - `9403847` (test)
2. **Task 2: Implement app-registry.cjs** - `c18863b` (feat)

## Files Created/Modified
- `bin/lib/app-registry.cjs` - Registry CRUD, state transitions, SHA-256 verification, approval guard (9 exports)
- `tests/phase-171/app-registry.test.mjs` - 14 unit tests covering all registry operations with mocked I/O

## Decisions Made
- SHA-256 computed at approval time only - large binaries (Blender 200MB+) make discovery-time hashing impractical
- checkApproved checks mock executionMode before status check - mock apps should never be invokable
- Registry file at .planning/app-registry.json, distinct from .planning/cli-anything/registry.json (different schemas and lifecycles)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all functions fully implemented with no placeholder logic.

## Next Phase Readiness
- app-registry.cjs ready for use by app-discovery.cjs (plan 01) and pde-tools CLI routes
- checkApproved guard ready to be called before any subprocess invocation in wrapper phases

## Self-Check: PASSED

- [x] bin/lib/app-registry.cjs exists
- [x] tests/phase-171/app-registry.test.mjs exists
- [x] Commit 9403847 exists
- [x] Commit c18863b exists

---
*Phase: 171-security-architecture-discovery-foundation*
*Completed: 2026-03-29*
