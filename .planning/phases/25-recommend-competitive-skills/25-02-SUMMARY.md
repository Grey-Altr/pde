---
phase: 25-recommend-competitive-skills
plan: "02"
subsystem: strategy
tags: [competitive-analysis, skill, workflow, confidence-labels, porter-five-forces, svg, opportunity-highlights, mcp-integration]

# Dependency graph
requires:
  - phase: 25-recommend-competitive-skills
    provides: Phase context, research, and project infrastructure for competitive skill
provides:
  - "/pde:competitive command stub delegating to workflows/competitive.md"
  - "Full competitive landscape analysis workflow with 7-step pipeline"
  - "WebSearch MCP probe/degrade pattern for live competitor data"
  - "Structured Opportunity Highlights section (machine-readable contract for /pde:opportunity)"
  - "13-field coverage flag write pattern setting hasCompetitive: true"
affects:
  - "25-recommend-competitive-skills (opportunity skill reads Opportunity Highlights section)"
  - "Phase 26 (HIG) — hasCompetitive coverage flag will be set"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Confidence-labeled competitive claims (confirmed/inferred/unverified) on every factual competitor statement"
    - "WebSearch MCP probe-use-degrade pattern for live market data with training-knowledge fallback"
    - "Structured Opportunity Highlights numbered-list format as machine-readable downstream contract"
    - "13-field pass-through-all designCoverage write (coverage-check then manifest-set-top-level)"
    - "7-step skill pipeline (ensure-dirs, prereqs, MCP probe, analysis, write artifact, domain DESIGN-STATE, root DESIGN-STATE + manifest)"

key-files:
  created:
    - workflows/competitive.md
  modified:
    - commands/competitive.md

key-decisions:
  - "WebSearch MCP is enhancement-only: skill completes fully with training knowledge, all training-knowledge claims default to [inferred]"
  - "Opportunity Highlights MUST be structured numbered list with Source/Estimated reach/Competitive advantage sub-fields — prose is forbidden because /pde:opportunity parses this section"
  - "Porter's Five Forces included in standard and deep scopes; explicitly skipped in --quick with note to re-run --standard"
  - "Coverage flag name is hasCompetitive (not hasCompetitiveAnalysis) per Phase 24 canonical 13-field schema"
  - "Three scope modes: --quick (3 competitors, no Porter's), --standard (3-5 with Porter's, default), --deep (5-8+ with 3 positioning maps)"

patterns-established:
  - "Confidence label block defined early in Step 4 process section — executor applies to all subsequent claims"
  - "Per-cell confidence labels in feature comparison matrix (each cell: 'full [confirmed]' or 'partial [inferred]')"
  - "SVG positioning map axis selection guided by domain (software: Features/Simplicity; hardware: Precision/Cost)"

requirements-completed: [COMP-01, COMP-02, COMP-03]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 25 Plan 02: Competitive Skills Summary

**Full /pde:competitive skill with 7-step pipeline, three scope modes, WebSearch MCP probe/degrade, confidence-labeled claims, machine-readable Opportunity Highlights, and SVG positioning map**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T21:04:48Z
- **Completed:** 2026-03-16T21:07:49Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Built complete /pde:competitive workflow (workflows/competitive.md) with all 5 lint-required sections (purpose, skill_code, skill_domain, context_routing, process)
- Replaced commands/competitive.md stub with proper @workflows/competitive.md delegation pattern
- Implemented confidence labeling framework (confirmed/inferred/unverified) applied to every competitor claim, with WebSearch MCP graceful degradation
- Structured Opportunity Highlights contract with Source/Estimated reach/Competitive advantage fields that /pde:opportunity parses as candidate input
- 13-field pass-through-all coverage flag write setting hasCompetitive: true while preserving all other flags

## Task Commits

Each task was committed atomically:

1. **Task 1: Build /pde:competitive command and workflow** - `04287fd` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `workflows/competitive.md` - Full competitive analysis workflow with 7-step pipeline, scope modes, MCP integration, confidence labels, and Opportunity Highlights contract
- `commands/competitive.md` - Command stub updated to delegate to @workflows/competitive.md

## Decisions Made

- Used `hasCompetitive` (not `hasCompetitiveAnalysis`) matching Phase 24 canonical 13-field coverage schema
- WebSearch MCP is probe-use-degrade only — skill must complete with training knowledge; training-knowledge claims default to `[inferred]` not `[unverified]`
- Opportunity Highlights section uses structured numbered-list format (not prose) because /pde:opportunity relies on parsing `Source:`, `Estimated reach:`, and `Competitive advantage:` sub-fields
- Porter's Five Forces included at standard and deep scopes; --quick scope skips it with a note directing users to re-run with --standard
- Three competitor count targets: quick=3, standard=3-5, deep=5-8+

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The automated verification expression (`grep -c "purpose\|skill_code\|skill_domain\|context_routing\|process" workflows/competitive.md | grep -q "5"`) returns a false negative because `grep -c` counts matching lines (11 total, since each XML section tag appears twice: open + close), not unique section types. All 5 required sections are genuinely present — confirmed by individual section checks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- /pde:competitive command is ready for use by end users
- Opportunity Highlights section provides the machine-readable gap list that /pde:opportunity (Phase 26) will consume as candidate input
- hasCompetitive coverage flag write ensures the Phase 24 manifest schema stays consistent when competitive analysis is run

---
*Phase: 25-recommend-competitive-skills*
*Completed: 2026-03-16*

## Self-Check: PASSED

- workflows/competitive.md: FOUND
- commands/competitive.md: FOUND
- .planning/phases/25-recommend-competitive-skills/25-02-SUMMARY.md: FOUND
- Commit 04287fd: FOUND
