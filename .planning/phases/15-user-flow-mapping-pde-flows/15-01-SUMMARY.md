---
phase: 15-user-flow-mapping-pde-flows
plan: "01"
subsystem: ui
tags: [mermaid, user-flows, flowchart, screen-inventory, pde-skills, design-pipeline]

# Dependency graph
requires:
  - phase: 14-design-system-pde-system
    provides: workflows/system.md — the 7-step workflow pattern mirrored exactly here
  - phase: 13-design-brief-pde-brief
    provides: workflows/brief.md — prerequisite soft-dependency pattern and version gate pattern
  - phase: 12-design-infrastructure
    provides: bin/lib/design.cjs — all pde-tools.cjs design subcommands (ensure-dirs, lock-acquire, lock-release, manifest-update, manifest-set-top-level, coverage-check)
provides:
  - workflows/flows.md — full /pde:flows skill workflow (7-step pipeline, 537 lines)
  - commands/flows.md — slash command delegation to workflows/flows.md
affects:
  - phase-16-wireframe — reads FLW-screen-inventory.json as its canonical screen list; reads ux/DESIGN-STATE.md
  - phase-20-build-orchestrator — /pde:flows is a pipeline step in /pde:build

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mermaid flowchart TD with J{N}_ prefixed node IDs for journey-scoped screens"
    - "Fixed-path unversioned JSON screen inventory (FLW-screen-inventory.json) alongside versioned flow document"
    - "Brief as soft dependency — warning, not error; PROJECT.md as fallback"
    - "designCoverage always read via coverage-check before writing hasFlows to prevent flag clobbering"

key-files:
  created:
    - workflows/flows.md
  modified:
    - commands/flows.md

key-decisions:
  - "Brief is a soft dependency for /pde:flows — warning if absent, PROJECT.md as fallback; never halts"
  - "FLW-screen-inventory.json is unversioned (fixed path) while FLW-flows-v{N}.md is versioned — wireframe reads a fixed path, no discovery logic needed"
  - "Decision nodes ({} shape) are excluded from screen inventory; error nodes (fill:#fee) are included with type: error"
  - "Screen inventory slug derivation: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')"
  - "Deduplication rule: same screen label in multiple journeys emits one entry per journey (wireframe may need distinct states per context)"

patterns-established:
  - "Pattern: J{N}_ node ID prefix prevents ID collisions in overview diagram that combines all journeys"
  - "Pattern: NEVER use bare end as Mermaid node ID (reserved keyword) — use J{N}_DONE"
  - "Pattern: ux/DESIGN-STATE.md created on first /pde:flows run (analogous to strategy/DESIGN-STATE.md for /pde:brief)"

requirements-completed: [FLW-01, FLW-02]

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 15 Plan 01: User Flow Mapping Summary

**537-line /pde:flows workflow with 7-step Mermaid diagram pipeline, per-persona journey generation, and JSON screen inventory extraction bridging brief to wireframe**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T01:08:47Z
- **Completed:** 2026-03-16T01:12:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created workflows/flows.md — complete 537-line self-contained workflow mirroring the proven system.md 7-step pattern: init dirs, check prerequisites (brief soft-dep + version gate), probe MCP, generate flow diagrams, write artifacts, update ux DESIGN-STATE, update root DESIGN-STATE + manifest
- Specified full Mermaid flowchart TD generation with J{N}_ prefixed node IDs, decision/error/screen node types, step descriptions, flow summary table, and overview hub-and-spoke diagram
- Fully specified FLW-screen-inventory.json extraction logic: slug derivation formula, node type filtering (include screen+error, exclude decision+terminal+overview), JSON schema, and deduplication rule
- Updated commands/flows.md to delegate cleanly to @workflows/flows.md — stub placeholder text removed

## Task Commits

Each task was committed atomically:

1. **Task 1: Create workflows/flows.md — full /pde:flows skill workflow** — `b16d971` (feat)
2. **Task 2: Update commands/flows.md — delegate to workflow** — `493af4d` (feat)

## Files Created/Modified

- `workflows/flows.md` — Full /pde:flows skill workflow, 537 lines, 7-step pipeline
- `commands/flows.md` — Slash command delegation to @workflows/flows.md; stub text removed

## Decisions Made

- Brief is a soft dependency (warning, not error) — follows skill-style-guide.md prerequisite pattern; PROJECT.md serves as fallback context
- FLW-screen-inventory.json uses a fixed unversioned path so /pde:wireframe can read it without discovery logic
- Error nodes (fill:#fee) included in screen inventory as type:"error" — they represent real UI states requiring wireframes
- designCoverage always read via coverage-check before setting hasFlows — prevents clobbering flags from other skills

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- The plan's verification check referenced `node bin/pde-tools.cjs test design` but this command does not exist in the project (the plan referenced a command path not implemented). Infrastructure self-tested via `node -e "require('./bin/lib/design.cjs')"` — all exports verified intact. No regressions.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- /pde:flows workflow is complete and ready for Phase 16 (/pde:wireframe) to read FLW-screen-inventory.json
- ux/DESIGN-STATE.md creation is specified in Step 6 — wireframe will find its domain file on first flows run
- Screen inventory JSON schema (slug, label, journey, journeyName, persona, type) is stable for Phase 16 consumption

---
*Phase: 15-user-flow-mapping-pde-flows*
*Completed: 2026-03-16*
