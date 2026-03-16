---
phase: 26-opportunity-mockup-hig-skills
plan: 01
subsystem: skills
tags: [pde, opportunity, rice, skill-registry, workflow, strategy]

requires: []
provides:
  - RICE-based opportunity scoring workflow with interactive input and sensitivity analysis
  - /pde:opportunity command delegating to workflows/opportunity.md
  - skill-registry.md with all 13 PDE skill codes for LINT-010 compliance
affects:
  - 26-02 (mockup skill — LINT-010 now available for skill code validation)
  - 26-03 (hig skill — LINT-010 now available)
  - Phase 27 (ideate — consumes OPP artifact for concept scoring)

tech-stack:
  added: []
  patterns:
    - "OPP skill follows v1.2 section order (purpose, skill_code, skill_domain, context_routing, required_reading, flags, process, output)"
    - "Competitive artifact pre-population: parse CMP ## Opportunity Highlights > ### Top Opportunities numbered list"
    - "Sensitivity analysis: recompute ALL candidates per scenario to produce rank deltas (not just score deltas)"
    - "Now/Next/Later bucketing: top 30% + Effort <= M for Now; top 60% or Effort > M for Next; rest + fragile for Later"
    - "13-field pass-through-all coverage pattern: coverage-check before every manifest-set-top-level write"
    - "lock-acquire pde-opportunity before root DESIGN-STATE writes; always lock-release even on error"

key-files:
  created:
    - commands/opportunity.md
    - workflows/opportunity.md
    - skill-registry.md
  modified: []

key-decisions:
  - "OPP skill uses only Sequential Thinking MCP (not WebSearch or mcp-compass) — opportunity scoring relies on user-provided estimates, not live market data"
  - "Sensitivity analysis computes rank changes across all candidates per scenario — rank delta is relative to re-sorted full list, not just individual score change"
  - "skill-registry.md placed at project root — matches PDE-004 health check path (${CLAUDE_PLUGIN_ROOT}/skill-registry.md)"
  - "Now/Next/Later fragile items: candidates flagged fragile in sensitivity analysis always land in Later regardless of score"

patterns-established:
  - "OPP workflow: 7-step pipeline matching competitive.md v1.2 structural pattern"
  - "Candidate pre-population: competitive artifact is soft dependency, graceful degradation to interactive input"

requirements-completed: [OPP-01, OPP-02, OPP-03]

duration: 8min
completed: 2026-03-16
---

# Phase 26 Plan 01: Opportunity Skill and Skill Registry Summary

**RICE opportunity scoring workflow with competitive pre-population, rank-change sensitivity analysis, Now/Next/Later buckets, and complete 13-skill registry for LINT-010 compliance**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-16T21:54:00Z
- **Completed:** 2026-03-16T22:01:53Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Built `/pde:opportunity` workflow (workflows/opportunity.md) with full 7-step RICE scoring pipeline, interactive 7-dimension collection, and sensitivity analysis with rank changes
- Replaced opportunity.md command stub with clean workflow delegation to `@workflows/opportunity.md`
- Created skill-registry.md at project root with all 13 PDE skill codes, satisfying LINT-010 requirement for all current and future phase skills

## Task Commits

Each task was committed atomically:

1. **Task 1: Build /pde:opportunity command and workflow** - `1ae36cc` (feat)
2. **Task 2: Create skill-registry.md with all 13 PDE skill codes** - `a6d6487` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `commands/opportunity.md` - Replaced stub `<process>` body with `@workflows/opportunity.md` + `@references/skill-style-guide.md` delegation; YAML frontmatter preserved exactly
- `workflows/opportunity.md` - Full v1.2 lint-compliant RICE opportunity scoring workflow: purpose, skill_code OPP, skill_domain strategy, context_routing (CMP pre-population + PROJECT.md hard requirement), required_reading, flags (--dry-run, --quick, --verbose, --no-mcp, --no-sequential-thinking, --force), 7-step process, output
- `skill-registry.md` - 13-entry registry mapping skill codes (BRF, FLW, SYS, WFR, MCK, CRT, HIG, ITR, HND, HDW, CMP, OPP, REC) to workflow files for LINT-010 compliance

## Decisions Made

- OPP skill uses only Sequential Thinking MCP for enhanced scoring calibration — WebSearch and mcp-compass have no role in opportunity scoring since all estimates are user-provided
- Sensitivity analysis computes rank changes for ALL candidates per scenario (not just the candidate being varied) — this is the correct interpretation required for meaningful fragility analysis
- Fragile items (rank drops >= 2 under any single perturbation) are always bucketed to Later regardless of their base score
- skill-registry.md lives at project root matching PDE-004 health check expectation (`${CLAUDE_PLUGIN_ROOT}/skill-registry.md`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/pde:opportunity` command and workflow ready for use
- `skill-registry.md` unblocks LINT-010 compliance for all Phase 26 skills (MCK, HIG) and all future phases
- Phase 26 Plan 02 (mockup skill) and Plan 03 (HIG skill) can now proceed

---
*Phase: 26-opportunity-mockup-hig-skills*
*Completed: 2026-03-16*
