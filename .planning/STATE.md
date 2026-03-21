---
pde_state_version: 1.0
milestone: v0.11
milestone_name: Experience Product Type
status: active
stopped_at: null
last_updated: "2026-03-21"
progress:
  total_phases: 9
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** Any user can go from idea to shipped product through a single platform that handles the full development lifecycle.
**Current focus:** v0.11 Phase 74 — Foundation and Regression Infrastructure

## Current Position

Phase: 74 of 82 (Foundation and Regression Infrastructure)
Plan: — of TBD
Status: Ready to plan
Last activity: 2026-03-21 — Roadmap created for v0.11 Experience Product Type (9 phases, 48 requirements)

Progress: [░░░░░░░░░░] 0% (0/9 phases complete)

## Performance Metrics

**Prior milestone reference:**

- v0.10: 4 phases, 8 plans, 107 files, 56 commits (~4 hours)
- v0.9: 6 phases, 12 plans, 91 files, 76 commits (~6 hours)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Key architectural constraints locked for this milestone:

- Sub-types (single-night, multi-day, recurring-series, installation, hybrid-event) are metadata attributes on the manifest, not structural pipeline branches — established in Phase 74, irreversible
- Experience tokens live in SYS-experience-tokens.json, never merged into SYS-tokens.json — established in Phase 76, irreversible
- All experience behavior lives as conditional blocks in existing workflow files — no new workflow files (preserves --from stage resumption)
- Every regulatory value in critique and handoff output must carry [VERIFY WITH LOCAL AUTHORITY] inline tag — established in Phase 74 disclaimer block
- Print artifacts are framed as composition reference guides, not production print files — "print-ready" phrase prohibited without prepress disclaimer

### Phase Ordering Rationale

- Phase 74 before all: regression infrastructure and two irreversible architecture decisions must precede any workflow modifications
- Phase 75 before Phase 76: token generation is parametrized by brief data (venue capacity drives spatial tokens, vibe drives lighting palette)
- Phase 76 before Phase 77: flow diagrams consume design tokens for zone color annotations
- Phase 77 before Phase 78: floor plan requires spatial flow as layout rationale; timeline requires temporal flow
- Phase 78 before Phase 79: critique and HIG review the floor plan — no layout means no safety review
- Phase 79 and Phase 80 before Phase 81: HIG checklist and flyer artifacts are referenced sections in the production bible
- Phase 82 last: all modifications complete before full regression validation runs
- Phase 80 depends on Phase 76 (tokens), not Phase 79 — print runs in parallel with critique/HIG

### Pending Todos

- Run /pde:connect stitch --confirm with valid STITCH_API_KEY to execute MCP-05 live tool name gate and update TOOL_MAP markers to TOOL_MAP_VERIFIED

### Blockers/Concerns

- Research flag: SVG spatial generation quality for floor plans is empirically unvalidated — generate 2-3 example floor plans early in Phase 78 before committing to prompt architecture
- Research flag: CSS @page browser compatibility (Chrome reliable, Firefox/Safari partial) — test print-to-PDF in Chrome before finalizing print artifact spec
- Research flag: Multi-stage festival gantt legibility above ~20 items — explicit manifest naming convention for multi-stage TML artifacts needed in Phase 77

## Session Continuity

Last session: 2026-03-21
Stopped at: Roadmap created — ready to plan Phase 74
Resume file: None

Next action: Run /pde:plan-phase 74
