---
phase: 183-auto-generation
plan: 01
subsystem: config
tags: [presentations, auto-generation, config, workflow, lifecycle]

requires:
  - phase: 182-remaining-cluster-b-personas
    provides: 15-persona suite complete; render() supports all persona slugs; pde-tools presentation render CLI wired
  - phase: 177-command-interface-workflow-shell
    provides: pde-tools CLI dispatch; presentation subcommand routing; workflow shell pattern

provides:
  - presentations.auto_generate config key registered (boolean toggle for auto-generation)
  - presentations.auto_generate_personas config key registered (JSON array of persona slugs)
  - auto_generate_presentations step in execute-phase.md (fires after update_project_md, before offer_next)
  - auto_generate_presentations step in complete-milestone.md (fires after git_commit_milestone, before offer_next)

affects:
  - 183-auto-generation
  - execute-phase workflow
  - complete-milestone workflow

tech-stack:
  added: []
  patterns:
    - "Config gate pattern: pde-tools config-get ... 2>/dev/null || echo 'false' for silent fallback"
    - "Non-blocking shell loop: persona render failures echo error and continue, never abort workflow"
    - "TDD cycle: test file written before config change; RED confirmed; GREEN applied; 9/9 passing"

key-files:
  created:
    - tests/phase-183/auto-generate.test.mjs
  modified:
    - bin/lib/config.cjs
    - workflows/execute-phase.md
    - workflows/complete-milestone.md

key-decisions:
  - "presentations.auto_generate defaults to false (opt-in) — config-get exits 1 when unset, workflow fallback provides 'false', so auto-generation never fires unless explicitly enabled"
  - "auto_generate_presentations step positioned after all completion/archival steps and before offer_next — IR reflects final phase/milestone state at generation time"
  - "JSON persona array parsed via node -e pipe in bash to avoid jq dependency — fallback to executive-summary,project-manager on parse error"
  - "CLAUDE_PLUGIN_ROOT used for render command in step (not hard-coded path) — matches present.md convention"

patterns-established:
  - "Workflow config gate: check config key with 2>/dev/null fallback before running optional enrichment steps"
  - "Non-blocking step: log failures with echo, never exit non-zero from optional enrichment steps"

requirements-completed: [AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05]

duration: 7min
completed: 2026-03-29
---

# Phase 183 Plan 01: Auto-Generation Wiring Summary

**presentations.auto_generate config toggle and auto_generate_presentations lifecycle hooks wired to phase-complete and milestone-complete workflows with non-blocking persona rendering**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-29T21:05:00Z
- **Completed:** 2026-03-29T21:12:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Registered `presentations.auto_generate` and `presentations.auto_generate_personas` in VALID_CONFIG_KEYS with Phase 183 inline comments
- Added `auto_generate_presentations` step to `workflows/execute-phase.md` at correct position (after update_project_md, before offer_next)
- Added `auto_generate_presentations` step to `workflows/complete-milestone.md` at correct position (after git_commit_milestone, before offer_next)
- 9 unit tests covering set/get/fallback/invalid-key rejection pass (TDD cycle: RED confirmed, GREEN applied)

## Task Commits

Each task was committed atomically:

1. **Task 1: Register config keys and write unit tests** - `1d0ccdb` (feat + test, TDD)
2. **Task 2: Add auto-generation step to execute-phase.md and complete-milestone.md** - `d17df61` (feat)

**Plan metadata:** (final commit below)

## Files Created/Modified

- `bin/lib/config.cjs` - Added `presentations.auto_generate` and `presentations.auto_generate_personas` to VALID_CONFIG_KEYS
- `tests/phase-183/auto-generate.test.mjs` - 9 unit tests for config key registration and gate logic
- `workflows/execute-phase.md` - `auto_generate_presentations` step inserted between update_project_md and offer_next
- `workflows/complete-milestone.md` - `auto_generate_presentations` step inserted between git_commit_milestone and offer_next

## Decisions Made

- **opt-in default**: `presentations.auto_generate` is opt-in (config-get exits 1 when not set; workflow catches with `|| echo "false"` fallback). Auto-generation never fires on existing projects unless explicitly enabled.
- **CLAUDE_PLUGIN_ROOT for render command**: Workflow steps use `${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs` matching the established pattern in present.md, not a hard-coded absolute path.
- **JSON array via node -e pipe**: Persona array parsed in bash using a Node.js one-liner pipe to avoid jq dependency, with fallback to `executive-summary,project-manager` on parse error.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auto-generation infrastructure complete; phase 183 follow-on plans (if any) can rely on these config keys
- `presentations.auto_generate` can be enabled per-project via: `node bin/pde-tools.cjs config-set presentations.auto_generate true`
- Default persona set (executive-summary, project-manager) overridable via `presentations.auto_generate_personas`

## Self-Check: PASSED

- bin/lib/config.cjs: FOUND
- tests/phase-183/auto-generate.test.mjs: FOUND
- workflows/execute-phase.md: FOUND
- workflows/complete-milestone.md: FOUND
- .planning/phases/183-auto-generation/183-01-SUMMARY.md: FOUND
- Commit 1d0ccdb: FOUND
- Commit d17df61: FOUND

---
*Phase: 183-auto-generation*
*Completed: 2026-03-29*
