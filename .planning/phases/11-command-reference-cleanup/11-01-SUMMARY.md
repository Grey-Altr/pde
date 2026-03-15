---
phase: 11-command-reference-cleanup
plan: 01
subsystem: commands
tags: [command-stubs, design-pipeline, v2-planned, reference-hygiene]

# Dependency graph
requires:
  - phase: 03-workflow-commands
    provides: 34 existing command stubs and the stub pattern to follow
provides:
  - 21 new command stubs covering all previously dangling /pde: references
  - Zero dangling references in workflows/, references/, and templates/
  - Workflow-backed stubs for resume-work (-> resume-project.md) and debug (-> diagnose-issues.md)
  - v2 planned stubs for all design-pipeline commands (wireframe, system, critique, etc.)
affects: [all phases referencing design-pipeline commands, templates/design-milestone.md consumers]

# Tech tracking
tech-stack:
  added: []
  patterns: [v2-stub pattern with planned status notice, workflow-alias stub pattern]

key-files:
  created:
    - commands/resume-work.md
    - commands/debug.md
    - commands/discuss-milestone.md
    - commands/join-discord.md
    - commands/reapply-patches.md
    - commands/recommend.md
    - commands/wireframe.md
    - commands/system.md
    - commands/critique.md
    - commands/hig.md
    - commands/mockup.md
    - commands/handoff.md
    - commands/flows.md
    - commands/competitive.md
    - commands/opportunity.md
    - commands/hardware.md
    - commands/iterate.md
    - commands/brief.md
    - commands/setup.md
    - commands/test.md
    - commands/migrate.md
  modified: []

key-decisions:
  - "Workflow-backed stubs (resume-work, debug) use execution_context pointing to existing workflow files rather than duplicating logic"
  - "v2 stubs use inline process blocks (no execution_context) with explicit planned status notice to avoid referencing nonexistent workflow files"
  - "migrate stub added via audit deviation (Rule 2) - /pde:migrate referenced in templates/design-milestone.md was not in the original 20-stub plan"
  - "All 55 command stubs include all 7 allowed-tools including Task for subagent-spawning workflows"

patterns-established:
  - "Workflow-alias pattern: command stub with execution_context pointing to differently-named workflow (resume-work -> resume-project)"
  - "v2-planned pattern: process block only, no execution_context, includes planned status + related commands + doc reference"

requirements-completed: [CMD-01]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 11 Plan 01: Command Reference Cleanup Summary

**21 command stubs created (20 planned + 1 audit-discovered) bringing total to 55, with zero dangling /pde: references across workflows/, references/, and templates/**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-15T19:04:19Z
- **Completed:** 2026-03-15T19:06:48Z
- **Tasks:** 2
- **Files modified:** 21 created, 0 modified

## Accomplishments

- Created all 20 planned command stubs: 2 workflow-backed (resume-work, debug) and 18 v2 planned stubs covering the full design pipeline
- Cross-reference audit confirmed zero dangling /pde: references in workflows/ and references/
- Audit discovered one additional gap (migrate) in templates/ — created stub and closed it immediately
- All 55 command stubs now have valid pde:* frontmatter and all 7 allowed-tools including Task

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 20 command stubs in commands/** - `18a16a1` (feat)
2. **Task 2: Run cross-reference audit and fix remaining gaps** - `3431c7e` (feat)

**Plan metadata:** committed with docs(11-01) final commit

## Files Created/Modified

- `commands/resume-work.md` - Workflow-backed alias routing to workflows/resume-project.md
- `commands/debug.md` - Workflow-backed alias routing to workflows/diagnose-issues.md
- `commands/discuss-milestone.md` - v2 planned stub; suggests /pde:new-milestone as current alternative
- `commands/join-discord.md` - v2 planned stub; community Discord coming in v2
- `commands/reapply-patches.md` - v2 planned stub; suggests re-running /pde:update as current workaround
- `commands/recommend.md` - v2 planned stub; MCP/tool discovery for project context
- `commands/wireframe.md` - v2 planned stub; HTML/CSS wireframe generation
- `commands/system.md` - v2 planned stub; design system token generation
- `commands/critique.md` - v2 planned stub; multi-perspective design critique
- `commands/hig.md` - v2 planned stub; HIG and WCAG audit
- `commands/mockup.md` - v2 planned stub; high-fidelity interactive HTML/CSS mockups
- `commands/handoff.md` - v2 planned stub; developer handoff package with component APIs
- `commands/flows.md` - v2 planned stub; user flow Mermaid diagrams
- `commands/competitive.md` - v2 planned stub; competitive analysis
- `commands/opportunity.md` - v2 planned stub; RICE feature scoring
- `commands/hardware.md` - v2 planned stub; hardware spec with DFM analysis
- `commands/iterate.md` - v2 planned stub; revises artifacts from critique feedback
- `commands/brief.md` - v2 planned stub; structured product design brief
- `commands/setup.md` - v2 planned stub; installs/configures PDE dependencies and MCP servers
- `commands/test.md` - v2 planned stub; validates skill files against style rules
- `commands/migrate.md` - v2 planned stub (audit-discovered); project structure migration

## Decisions Made

- Workflow-backed stubs (resume-work, debug) use execution_context pointing to existing workflow files rather than duplicating logic — clean alias pattern
- v2 stubs intentionally omit execution_context to avoid referencing nonexistent workflow files; planned status is explicit in process block
- migrate stub added outside original plan scope after audit found /pde:migrate in templates/design-milestone.md — applied Rule 2 (missing critical) to close the gap

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added /pde:migrate stub discovered during audit**
- **Found during:** Task 2 (cross-reference audit)
- **Issue:** templates/design-milestone.md references /pde:migrate but it was not in the original 20-stub plan list; audit produced non-clean output
- **Fix:** Created commands/migrate.md as a v2 planned stub following the same pattern as other design-pipeline stubs
- **Files modified:** commands/migrate.md (created)
- **Verification:** Re-ran audit; templates/ comm -23 now produces zero output (clean)
- **Committed in:** 3431c7e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Necessary to achieve the plan's success criterion of zero dangling references. No scope creep — the stub follows the established v2 pattern exactly.

## Issues Encountered

- The `rg -oh` flag combination triggered ripgrep help output instead of matching — switched to `grep -roh` which works correctly in this environment. Audit results were identical.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All /pde: commands referenced in user-facing docs now have command stub entries
- Users following workflow guidance will not encounter "command not found" for any design-pipeline or utility commands
- Phase 11 plan 01 is the only plan in this phase — phase complete

---
*Phase: 11-command-reference-cleanup*
*Completed: 2026-03-15*
