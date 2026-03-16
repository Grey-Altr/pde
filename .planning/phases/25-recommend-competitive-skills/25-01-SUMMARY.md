---
phase: 25-recommend-competitive-skills
plan: 01
subsystem: design-skills
tags: [mcp, recommend, pde-skill, workflow, mcp-catalog, tool-discovery]

# Dependency graph
requires:
  - phase: 24-schema-migration-infrastructure
    provides: 13-field designCoverage schema with hasRecommendations flag
provides:
  - /pde:recommend command delegating to workflows/recommend.md
  - Full 7-step recommend skill workflow with inline MCP catalog, probe/degrade logic, context-tailored ranking, and hasRecommendations coverage flag write
affects:
  - 25-02-competitive (sister skill in same phase)
  - 27-ideation (Phase 27 calls recommend via Skill() invocation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline curated MCP catalog embedded in workflow (7 categories, ~25 tools)"
    - "13-field pass-through-all coverage pattern for designCoverage writes"
    - "mcp-compass + WebSearch + Sequential Thinking tri-probe with graceful degradation"
    - "Versioned artifact pattern: REC-recommendations-v{N}.md in .planning/design/strategy/"

key-files:
  created:
    - workflows/recommend.md
  modified:
    - commands/recommend.md

key-decisions:
  - "Inline catalog embedded directly in workflow file (7 categories) — ecosystem-catalog.json does not exist and was not created"
  - "hasRecommendations is the canonical flag name (not hasRecommend) — matches Phase 24 schema"
  - "mcp-compass degrades immediately (targeted MCP pattern); Sequential Thinking retries once (universal MCP pattern)"
  - "Skill callable from /pde:ideate via Skill() invocation — standalone and composable design"

patterns-established:
  - "Skill command stub: thin YAML frontmatter + @workflows/recommend.md delegation, no inline logic"
  - "Coverage write: always read coverage-check first, then manifest-set-top-level with full 13-field JSON"
  - "MCP probe order: mcp-compass first (targeted), WebSearch second (targeted), Sequential Thinking third (universal)"

requirements-completed: [REC-01, REC-02, REC-03]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 25 Plan 01: Recommend Skill Summary

**Standalone /pde:recommend skill with 7-category inline MCP catalog, tri-probe degradation (mcp-compass, WebSearch, Sequential Thinking), context-tailored ranking from PROJECT.md/package.json, and hasRecommendations coverage flag via 13-field pass-through-all pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T21:04:41Z
- **Completed:** 2026-03-16T21:08:33Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Replaced "Status: Planned" stub in `commands/recommend.md` with proper `@workflows/recommend.md` delegation
- Created `workflows/recommend.md` — full 637-line skill workflow with all 5 lint-required sections (purpose, skill_code REC, skill_domain strategy, context_routing, process)
- Inline catalog covers 7 categories (AI, design, code-quality, data, deployment, research, collaboration) with ~25 MCP/tool entries including install commands, stack signals, and relevance rules
- 7-step pipeline matching brief.md structure: init dirs → check prerequisites → probe MCPs → analyze context/rank → write artifact → update domain DESIGN-STATE → update root DESIGN-STATE + manifest
- Coverage flag write uses 13-field pass-through-all pattern with `hasRecommendations: true`

## Task Commits

Each task was committed atomically:

1. **Task 1: Build /pde:recommend command and workflow** - `08cde84` (feat)

**Plan metadata:** (committed below with SUMMARY.md)

## Files Created/Modified

- `commands/recommend.md` — Updated from stub to `@workflows/recommend.md` delegation
- `workflows/recommend.md` — Full recommend skill: 7-step pipeline, inline catalog, probe/degrade, 13-field coverage write

## Decisions Made

- Inline catalog embedded in workflow file (no external ecosystem-catalog.json) — matches research recommendation and avoids creating non-existent file dependencies
- Skill designed to be callable standalone or via Skill() from /pde:ideate — composable architecture for Phase 27 integration
- Coverage flag written via `coverage-check` read + full 13-field `manifest-set-top-level` — never dot-notation, always pass-through-all

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. The `grep -c` verification check returned 9 (not 5) because the pattern matched section tags appearing as both opening/closing pairs and within content, but manual verification confirmed all 5 lint-required sections (`<purpose>`, `<skill_code>`, `<skill_domain>`, `<context_routing>`, `<process>`) are present at line start.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- /pde:recommend skill is complete and lint-compliant
- Ready for Phase 25 Plan 02 (/pde:competitive skill)
- /pde:ideate (Phase 27) dependency satisfied — recommend exports callable interface via skill workflow
- hasRecommendations coverage flag write pattern in place for when skill is actually executed by users

---
*Phase: 25-recommend-competitive-skills*
*Completed: 2026-03-16*
