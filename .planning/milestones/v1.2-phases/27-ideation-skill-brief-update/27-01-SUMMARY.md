---
phase: 27-ideation-skill-brief-update
plan: 01
subsystem: strategy
tags: [ideation, diverge-converge, skill-registry, IDT, pde-ideate, brief-seed, mcp-integration]

# Dependency graph
requires:
  - phase: 25-recommend-competitive-skills
    provides: /pde:recommend skill (Skill() invocation contract for recommend checkpoint)
  - phase: 26-opportunity-mockup-hig-skills
    provides: OPP artifacts (soft dependency for direction enrichment)
provides:
  - commands/ideate.md — thin command stub delegating to workflows/ideate.md
  - workflows/ideate.md — full two-pass diverge-converge ideation pipeline (534 lines)
  - skill-registry.md IDT row — LINT-010 compliance entry for /pde:ideate
affects: [27-02-brief-update, 28-build-orchestrator-expansion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-pass diverge-converge ideation: ZERO evaluative language in diverge, 0-3 rubric scoring in converge"
    - "Skill() invocation over Task() for sub-skill composition (avoids Issue #686)"
    - "Intermediate artifact write pattern: diverge-complete status before converge, ideation-complete after"
    - "Brief Seed section: 9-field schema matching templates/brief-seed.md for /pde:brief consumption"
    - "Soft upstream probe: Glob + null context variable on miss + graceful degradation"

key-files:
  created:
    - commands/ideate.md
    - workflows/ideate.md
  modified:
    - skill-registry.md

key-decisions:
  - "IDT uses Skill() not Task() to invoke recommend at diverge-converge checkpoint — same anti-#686 pattern as /pde:build"
  - "Diverge pass enforces explicit banned word list: best, recommended, superior, most promising, strongest, optimal, ideal, preferred"
  - "IDT artifact must write intermediate diverge-complete state before Skill() recommend invocation — creates audit trail"
  - "Brief Seed uses exact 9-field schema from templates/brief-seed.md: Problem Statement, Product Type, Platform, Target Users, Scope Boundaries, Constraints, Key Decisions, Risk Register, Next Steps"
  - "13-field pass-through-all coverage: coverage-check first, then manifest-set-top-level with full JSON setting hasIdeation=true"

patterns-established:
  - "Soft upstream probe: Glob → read most recent version → parse relevant section → set context variable (null if not found)"
  - "Recommend checkpoint at diverge-converge transition via Skill('pde:recommend', '--quick')"
  - "Anti-Patterns section in every workflow documents critical constraints and Issue #686 guard"

requirements-completed: [IDEAT-01, IDEAT-02, IDEAT-03]

# Metrics
duration: 5min
completed: 2026-03-17
---

# Phase 27 Plan 01: Ideation Skill Summary

**Two-pass diverge-converge /pde:ideate workflow with Skill() recommend checkpoint, zero-evaluative-language diverge, 0-3 scoring rubric, 9-field Brief Seed, and IDT skill registry entry**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-16T17:20:00Z
- **Completed:** 2026-03-16T17:23:37Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `commands/ideate.md` as thin stub delegating to `workflows/ideate.md` with all 7 allowed tools
- Created `workflows/ideate.md` as full v1.2 lint-compliant workflow (534 lines) with all 8 required sections
- Added IDT row to `skill-registry.md` as 14th data entry for LINT-010 compliance
- Implemented two-pass ideation: diverge (minimum 5 directions, zero evaluative language) then converge (Goal Alignment/Feasibility/Distinctiveness 0-3 rubric)
- Wired Skill("pde:recommend", "--quick") at diverge-converge checkpoint with explicit NEVER Task() anti-pattern guard
- Intermediate IDT artifact write at diverge-complete before converge begins
- Brief Seed section using exact 9-field schema from templates/brief-seed.md
- 13-field pass-through-all coverage update setting hasIdeation=true

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /pde:ideate command stub and add IDT to skill registry** - `5f1055c` (feat)
2. **Task 2: Create /pde:ideate workflow with two-pass diverge-converge pipeline** - `c6fa77c` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `commands/ideate.md` — Thin command stub: `name: pde:ideate`, 7 allowed tools, delegates to `@workflows/ideate.md` and `@references/skill-style-guide.md`
- `workflows/ideate.md` — Full 7-step pipeline: init dirs, prerequisites+version, MCP probe, diverge (5+ directions), recommend checkpoint, converge (scoring+brief seed), DESIGN-STATE+manifest update
- `skill-registry.md` — Added `| IDT | /pde:ideate | workflows/ideate.md | strategy | active |` as 14th data row

## Decisions Made
- IDT uses Skill() not Task() to invoke recommend at the diverge-converge checkpoint — consistent with /pde:build anti-#686 pattern
- Diverge pass bans 8 evaluative words explicitly: best, recommended, superior, most promising, strongest, optimal, ideal, preferred
- IDT artifact must transition through diverge-complete status before converge — creates two-write audit trail
- Brief Seed section follows exact templates/brief-seed.md field order for downstream /pde:brief parsing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /pde:ideate command stub and full workflow committed and verified
- IDT registered in skill-registry.md (LINT-010 compliant)
- Brief Seed section wired to templates/brief-seed.md schema for Phase 27 Plan 02 consumption
- Ready for Phase 27 Plan 02: Update /pde:brief with soft upstream context injection (IDT/CMP/OPP)

---
*Phase: 27-ideation-skill-brief-update*
*Completed: 2026-03-17*
