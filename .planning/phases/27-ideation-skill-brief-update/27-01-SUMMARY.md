---
phase: 27-ideation-skill-brief-update
plan: 01
subsystem: strategy
tags: [ideation, diverge-converge, skill, workflow, mcp, pde]

requires:
  - phase: 25-recommend-competitive-skills
    provides: REC skill callable via Skill() invocation from ideation workflow
  - phase: 26-opportunity-mockup-hig-skills
    provides: OPP skill artifact as soft dependency for enriching diverge pass
provides:
  - /pde:ideate command stub at commands/ideate.md delegating to workflow
  - Full two-pass diverge-converge ideation workflow at workflows/ideate.md
  - IDT row in skill-registry.md for LINT-010 compliance (14th entry)
affects:
  - pde:brief (IDT artifact Brief Seed section enables direct consumption)
  - skill-registry (IDT row added, 14 total entries)
  - phase 27 follow-on plans (brief update)

tech-stack:
  added: []
  patterns:
    - "Two-pass diverge-converge structure prevents premature convergence (single-pass collapse anti-pattern)"
    - "Skill() invocation pattern for composable sub-skill calls (vs Task() which causes Issue #686)"
    - "Intermediate artifact write between diverge and converge provides status transition audit trail"
    - "Brief Seed section in IDT artifact enables direct /pde:brief consumption by exact heading parse"

key-files:
  created:
    - commands/ideate.md
    - workflows/ideate.md
  modified:
    - skill-registry.md

key-decisions:
  - "IDT skill uses Skill() not Task() to invoke recommend — Task() causes Issue #686 nested-agent freeze"
  - "ZERO evaluative language enforced in diverge pass with explicit banned word list"
  - "Minimum 5 directions required in diverge to prevent premature narrowing"
  - "IDT artifact transitions through two statuses: diverge-complete then ideation-complete"
  - "Brief Seed section uses exact templates/brief-seed.md field schema for /pde:brief downstream parsing"
  - "hasIdeation coverage flag written via 13-field pass-through-all pattern (canonical order)"

patterns-established:
  - "Two-pass ideation: diverge (neutral language, 5+ directions) then converge (3-dimension scoring, explicit recommendation)"
  - "Recommend checkpoint at diverge-converge transition surfaces tooling feasibility before scoring"

requirements-completed: [IDEAT-01, IDEAT-02, IDEAT-03]

duration: 8min
completed: 2026-03-16
---

# Phase 27 Plan 01: Ideation Skill Brief Update Summary

**/pde:ideate command with two-pass diverge-converge workflow, automatic recommend invocation via Skill(), IDT artifact with Brief Seed section, and 13-field hasIdeation coverage flag**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-16T22:11:06Z
- **Completed:** 2026-03-16T22:19:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `commands/ideate.md` thin command stub with YAML frontmatter and @workflow delegation pattern matching competitive.md
- Created `workflows/ideate.md` as a full v1.2 lint-compliant workflow with all 8 required sections (purpose, skill_code, skill_domain, context_routing, required_reading, flags, process, output)
- Implemented the two-pass structure: Pass 1 Diverge enforces zero evaluative language with banned word list and minimum 5 directions; Pass 2 Converge scores on Goal Alignment/Feasibility/Distinctiveness 0-3 rubric
- Added Skill("pde:recommend", "--quick") invocation at diverge-converge checkpoint (Issue #686 NEVER Task() documented twice)
- IDT artifact transitions from diverge-complete to ideation-complete status with Brief Seed section containing all 9 fields from templates/brief-seed.md schema
- Added IDT row to skill-registry.md as the 14th entry for LINT-010 compliance

## Task Commits

1. **Task 1: Create /pde:ideate command stub and add IDT to skill registry** - `5f1055c` (feat)
2. **Task 2: Create /pde:ideate workflow with two-pass diverge-converge pipeline** - `c6fa77c` (feat)

## Files Created/Modified

- `commands/ideate.md` - Thin command stub: YAML frontmatter with pde:ideate name, 7 allowed-tools, @workflows/ideate.md + @references/skill-style-guide.md delegation
- `workflows/ideate.md` - Full 7-step ideation pipeline: init dirs, prerequisites+version, MCP probe, diverge pass, recommend checkpoint, converge+brief seed, DESIGN-STATE+manifest update
- `skill-registry.md` - Added IDT row as 14th data entry: `| IDT | /pde:ideate | workflows/ideate.md | strategy | active |`

## Decisions Made

- IDT uses Skill("pde:recommend", "--quick") not Task() — Task() causes Issue #686 nested-agent freeze; recommend is designed as composable (established in Phase 25)
- Diverge pass enforces ZERO evaluative language with explicit banned word list ("best", "recommended", "superior", "most promising", "strongest", "optimal", "ideal", "preferred") to prevent single-pass collapse anti-pattern
- Three-dimension scoring rubric (Goal Alignment, Feasibility, Distinctiveness) uses 0-3 scale consistent with strategy-frameworks.md scoring vocabulary
- Brief Seed section uses exact templates/brief-seed.md field schema to enable /pde:brief direct consumption by heading parse
- 13-field pass-through-all pattern for designCoverage sets hasIdeation=true in canonical order matching Phase 24 schema

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- /pde:ideate command and workflow complete; IDT registered in skill registry
- All 3 requirements (IDEAT-01, IDEAT-02, IDEAT-03) satisfied
- Ready for Phase 27 Plan 02 (brief update if applicable) or milestone completion

---
*Phase: 27-ideation-skill-brief-update*
*Completed: 2026-03-16*

## Self-Check: PASSED

- commands/ideate.md: FOUND
- workflows/ideate.md: FOUND
- skill-registry.md: FOUND
- 27-01-SUMMARY.md: FOUND
- commit 5f1055c: FOUND
- commit c6fa77c: FOUND
