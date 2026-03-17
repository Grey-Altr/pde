---
phase: 27-ideation-skill-brief-update
plan: 02
subsystem: design-skills
tags: [pde, brief, ideation, upstream-context, IDT, CMP, OPP, workflow]

# Dependency graph
requires:
  - phase: 27-ideation-skill-brief-update
    provides: IDT artifact structure with Recommended Direction and Brief Seed sections
  - phase: 26-opportunity-mockup-hig-skills
    provides: OPP artifact with Now/Next/Later buckets
  - phase: 25-recommend-competitive-skills
    provides: CMP artifact with Gap Analysis and Opportunity Highlights

provides:
  - "workflows/brief.md with Sub-step 2c upstream context injection"
  - "Soft probes for IDT, CMP, OPP artifacts — all degrade gracefully"
  - "Step 5/7 enrichment logic consuming IDT_CONTEXT, CMP_CONTEXT, OPP_CONTEXT"
  - "Summary table Upstream context row showing injected artifacts"

affects:
  - "IDEAT-04 requirement fulfilled — ideation-to-brief handoff contract complete"
  - "Users running /pde:brief after /pde:ideate, /pde:competitive, /pde:opportunity get enriched output"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Soft upstream probe pattern: Glob + null context variable on miss + graceful degradation"
    - "Context injection at synthesis time: context variables read in sub-step, consumed in Step 5"

key-files:
  created: []
  modified:
    - workflows/brief.md

key-decisions:
  - "Sub-step 2c position: after version display line in Step 2/7, before Step 3/7 — probes happen before MCP overhead"
  - "IDT Brief Seed supersedes raw PROJECT.md problem description when both exist — ideation represents latest thinking"
  - "All three context variables (IDT_CONTEXT, CMP_CONTEXT, OPP_CONTEXT) set to null on miss — Step 5 falls through to PROJECT.md-only logic unchanged"
  - "Upstream context row added to Summary table for execution-time auditability"

patterns-established:
  - "Soft probe pattern: Glob → sort descending → read highest version → parse sections → store as *_CONTEXT"
  - "Null-context fallthrough: if variable is null, use existing generation logic unchanged — no special branches"

requirements-completed: [IDEAT-04]

# Metrics
duration: 2min
completed: 2026-03-16
---

# Phase 27 Plan 02: Ideation Skill Brief Update Summary

**Surgical three-edit update to workflows/brief.md: Sub-step 2c adds soft probes for IDT/CMP/OPP artifacts in Step 2/7, Step 5/7 enrichment block injects upstream context into six brief sections, Summary table gains Upstream context row**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T00:26:34Z
- **Completed:** 2026-03-17T00:28:24Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added Sub-step 2c with soft Glob probes for IDT-ideation-v*.md, CMP-competitive-v*.md, and OPP-opportunity-v*.md artifacts — all three degrade gracefully to null context on miss
- Added upstream context enrichment guidance to Step 5/7 covering Problem Statement, Target Users, Competitive Context, Key Assumptions, Scope Boundaries, and Constraints
- IDT Brief Seed supersedes PROJECT.md problem description when both present (latest ideation thinking wins)
- Summary table gains `| Upstream context |` row listing which artifacts were injected per run
- Existing Steps 1-7 pipeline, anti-patterns section, and `<purpose>` tag content all preserved unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add upstream context injection to brief workflow** - `08c3b47` (feat)

**Plan metadata:** see final commit below

## Files Created/Modified
- `workflows/brief.md` - Three additive edits: Sub-step 2c upstream probe block, Step 5/7 enrichment guidance, Summary table row

## Decisions Made
- Sub-step 2c placed after Step 2/7 version display line (before Step 3/7) so probes happen synchronously before MCP overhead — no checkpoint needed
- IDT Brief Seed supersedes raw PROJECT.md problem description when both exist — Brief Seed represents the most recent ideation thinking
- All null-context fallthrough handled by "if context variable is null, use existing generation logic unchanged" — zero new branches for the no-artifact path

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- IDEAT-04 complete — ideation-to-brief handoff contract fulfilled
- Phase 27 complete — all two plans done
- /pde:brief now enriches output when IDT/CMP/OPP artifacts exist; identical output when they do not

## Self-Check: PASSED
- workflows/brief.md: FOUND
- 27-02-SUMMARY.md: FOUND
- commit 08c3b47: FOUND

---
*Phase: 27-ideation-skill-brief-update*
*Completed: 2026-03-16*
