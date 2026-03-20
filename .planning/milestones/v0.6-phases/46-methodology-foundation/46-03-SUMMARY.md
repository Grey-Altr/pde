---
phase: 46-methodology-foundation
plan: 03
subsystem: infra
tags: [methodology, bmad, paul, workflow, documentation, reference]

# Dependency graph
requires:
  - phase: 46-01
    provides: context-constitution pattern (project-context.md generation)
  - phase: 46-02
    provides: file-hash manifest (SHA256 tracking infrastructure)
provides:
  - references/workflow-methodology.md — PDE-native documentation of all v0.6 methodology patterns
  - Terminology mapping table for BMAD/PAUL contributor reference
affects: [phase-47, phase-48, phase-49, phase-50, phase-51, phase-52, all-v0.6-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Internal-only terminology mapping: raw framework jargon (BMAD/PAUL) confined to a marked internal table; user-facing sections use PDE terms only"
    - "Reference doc structure: Overview table → per-pattern deep dives → internal mapping appendix"

key-files:
  created:
    - references/workflow-methodology.md
    - tests/phase-46/workflow-methodology.test.mjs
  modified: []

key-decisions:
  - "BMAD and PAUL terms appear only in the Terminology Mapping table (marked [Internal use only]) — never in user-facing sections, error messages, or command output"
  - "Document covers all 6 methodology patterns introduced in v0.6 phases (46-50), giving planner agents a single reference for the conceptual foundation"

patterns-established:
  - "Internal-only terminology: use PDE native terms in all user-facing content; map to source framework concepts in a separate marked section"

requirements-completed: [FOUND-03]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 46 Plan 03: Workflow Methodology Reference Summary

**Methodology reference document mapping 8 BMAD/PAUL framework patterns to PDE-native terminology, with source jargon confined to an internal-only Terminology Mapping table**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T11:01:17Z
- **Completed:** 2026-03-19T11:03:19Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Created `references/workflow-methodology.md` with all 8 required sections and 153 lines
- Document covers all 6 methodology patterns for v0.6 (Context Constitution, Task-File Sharding, AC-First Planning, Post-Execution Reconciliation, Safe Framework Updates, Readiness Gating)
- BMAD/PAUL terms entirely absent from user-facing sections; appear only in the internal Terminology Mapping table
- 8 PDE terms mapped to their BMAD v6 and PAUL source concepts
- Test suite (5 tests, all passing) validates structure, terminology placement, table row count, and line count

## Task Commits

Each task was committed atomically:

1. **Task 1: Create references/workflow-methodology.md** - `0aec8b2` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `references/workflow-methodology.md` — Methodology reference document with all v0.6 patterns in PDE terminology
- `tests/phase-46/workflow-methodology.test.mjs` — Test suite validating document structure and terminology placement

## Decisions Made
- Followed the plan's prescribed content exactly; no deviations needed
- BMAD/PAUL terms are internal-only — this boundary is enforced at the document level by the [Internal use only] marker and the test that verifies no BMAD/PAUL terms appear before the Terminology Mapping section

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 46 complete: all three plans (46-01 context constitution, 46-02 file-hash manifest, 46-03 methodology reference) delivered
- Phase 47 (Story-File Sharding) can proceed — methodology foundation is documented
- The workflow-methodology.md document serves as the conceptual reference for all planner agents working on phases 47-52

---
*Phase: 46-methodology-foundation*
*Completed: 2026-03-19*
