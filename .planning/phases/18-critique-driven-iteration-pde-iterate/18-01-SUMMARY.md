---
phase: 18-critique-driven-iteration-pde-iterate
plan: "01"
subsystem: design-pipeline
tags: [pde, iterate, critique, wireframes, design-system, convergence, mcp]

requires:
  - phase: 17-design-critique-pde-critique
    provides: "workflows/critique.md producing CRT-critique-v{N}.md with Action List checkboxes and What Works table for iterate to consume"
  - phase: 16-wireframe-generation-pde-wireframe
    provides: "WFR-{screen}.html wireframes that iterate reads as source and never overwrites"
  - phase: 12-design-infra
    provides: "pde-tools.cjs design subcommands: ensure-dirs, lock-acquire/release, manifest-update, coverage-check, manifest-set-top-level"

provides:
  - "workflows/iterate.md — full 7-step /pde:iterate skill workflow (558 lines)"
  - "commands/iterate.md — delegation stub wired to @workflows/iterate.md with MCP tool access"
  - "hasIterate coverage flag introduced as seventh field in designCoverage object"

affects: [19-handoff, 20-build-orchestrator, design-pipeline-integration]

tech-stack:
  added: []
  patterns:
    - "Critique-driven iteration: reads CRT-critique-v{N}.md Action List checkboxes, applies open findings as targeted edits, produces versioned WFR-{screen}-v{N}.html — originals frozen"
    - "Independent version counters: wireframe version per-screen (WFR-{screen}-v{N}.html) and changelog version (ITR-changelog-v{N}.md) globbed independently — never assumed synchronized"
    - "What Works prefix-match guard: finding Location path prefix-matched against What Works elements; conflicts → defer with documented reason"
    - "Convergence assessment on run 3+: counts remaining critical/major open findings, cross-references deferred finding IDs between current and previous changelog for repeat-deferral detection"
    - "hasIterate introduced via read-before-set: coverage-check reads all 6 existing flags before manifest-set-top-level writes 7-field object with hasIterate: true"

key-files:
  created:
    - workflows/iterate.md
  modified:
    - commands/iterate.md

key-decisions:
  - "What Works parsed from live CRT file only (not from templates/critique-report.md — template lacks the section)"
  - "Wireframe version counter and changelog version counter are independent — glob separately per Step 2e and 2f"
  - "hasIterate introduced as seventh field in designCoverage via read-before-set pattern — Phase 19/20 can gate on it"
  - "Effort gate: findings with effort=significant AND structural redesign suggestion → defer (iterate is for surgical corrections, not architecture)"
  - "Open Critique Items DESIGN-STATE columns are Item/Source/Severity/Status (not ID) — matched to design-state-domain.md schema"

patterns-established:
  - "Convergence threshold: 0 critical + 0 major = PASS (handoff-ready); 0 critical + 1-2 major = WARN (further iteration); 1+ critical OR 3+ major = FAIL (redesign needed)"
  - "Repeat-deferral detection: cross-reference finding IDs between current and previous changelog Deferred sections"

requirements-completed: [ITR-01, ITR-02]

duration: 4min
completed: 2026-03-16
---

# Phase 18 Plan 01: Critique-Driven Iteration Summary

**558-line /pde:iterate workflow with versioned wireframe output, structured change logs, What Works preservation guard, and convergence checklist on run 3+ using coverage-check read-before-set to introduce hasIterate as seventh design coverage flag**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T03:35:21Z
- **Completed:** 2026-03-16T03:39:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `workflows/iterate.md` (558 lines) — full 7-step /pde:iterate skill workflow following the established PDE pattern from critique.md, with versioned wireframe output (originals never overwritten), structured change log format, What Works prefix-match guard, MCP Sequential Thinking conflict resolution, and convergence assessment on run 3+
- Updated `commands/iterate.md` — replaced "Planned -- available in PDE v2" stub with delegation pattern matching commands/critique.md; added `mcp__sequential-thinking__*` to allowed-tools; set argument-hint to supported flags
- Introduced `hasIterate` as the seventh field in `designCoverage` via the read-before-set pattern — prevents clobbering flags from other skills (critique, wireframe, flows, system)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create workflows/iterate.md** - `821d0d9` (feat)
2. **Task 2: Update commands/iterate.md** - `37ed962` (feat)

## Files Created/Modified

- `workflows/iterate.md` — Full 7-step /pde:iterate skill workflow (558 lines): Step 1 ensure-dirs, Step 2 critique discovery + action list parsing + What Works parsing + wireframe matching + independent version gates, Step 3 MCP probe, Step 4 findings application with What Works guard and conflict resolution, Step 5 write outputs under lock, Step 6 ux/DESIGN-STATE update, Step 7 root DESIGN-STATE + manifest + hasIterate coverage flag + convergence assessment
- `commands/iterate.md` — Delegation stub updated: description, argument-hint, mcp__sequential-thinking__* in allowed-tools, @workflows/iterate.md delegation in process section; "Planned -- available in PDE v2" stub language fully removed

## Decisions Made

- What Works section must be parsed from the live generated `CRT-critique-v{N}.md` file, not from `templates/critique-report.md` (the template lacks this section — it is inserted at runtime by workflows/critique.md)
- Wireframe version counter (per-screen) and changelog version counter are independent; both must be globbed separately in Steps 2e and 2f to avoid version collision on partial runs
- `hasIterate` is introduced as the seventh field via read-before-set; the live manifest currently only has six fields (hasDesignSystem, hasFlows, hasWireframes, hasCritique, hasHandoff, hasHardwareSpec)
- Effort gate: findings with `effort: significant` AND structural redesign language in Suggestion are deferred — /pde:iterate is for targeted surgical corrections, not architectural changes
- Open Critique Items table in ux/DESIGN-STATE.md uses `Item, Source, Severity, Status` column names (from design-state-domain.md schema) — not `ID`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- /pde:iterate skill is fully wired: commands/iterate.md delegates to workflows/iterate.md
- Phase 19 (handoff): can check `hasIterate` coverage flag to detect whether iteration occurred before handoff
- Phase 20 (build orchestrator): /pde:iterate is now a first-class pipeline step; the skill follows the same delegation pattern as critique, wireframe, flows, system, and brief
- Design pipeline is complete through iteration: brief → system → flows → wireframe → critique → iterate → (handoff pending)

---
*Phase: 18-critique-driven-iteration-pde-iterate*
*Completed: 2026-03-16*
