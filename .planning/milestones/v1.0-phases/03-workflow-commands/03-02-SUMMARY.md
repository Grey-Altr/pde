---
phase: 03-workflow-commands
plan: 02
subsystem: commands
tags: [commands, slash-commands, claude-code, CLAUDE_PLUGIN_ROOT, plugin]

# Dependency graph
requires:
  - phase: 03-workflow-commands
    provides: workflows/ (34 files) with CLAUDE_PLUGIN_ROOT-portable paths

provides:
  - commands/ (34 .md files) registering all /pde: slash commands in Claude Code
  - Two-tier delegation from commands/ -> workflows/ via CLAUDE_PLUGIN_ROOT

affects: [04-agents-rebrand, 05-templates-rebrand, distribution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Command stub template: YAML frontmatter with name: pde:command-name, description, argument-hint, allowed-tools"
    - "Two-tier delegation: @${CLAUDE_PLUGIN_ROOT}/workflows/name.md in execution_context"
    - "All stubs include Task in allowed-tools for subagent-spawning workflow support"

key-files:
  created:
    - commands/new-project.md
    - commands/plan-phase.md
    - commands/execute-phase.md
    - commands/execute-plan.md
    - commands/verify-work.md
    - commands/verify-phase.md
    - commands/progress.md
    - commands/quick.md
    - commands/help.md
    - commands/discuss-phase.md
    - commands/map-codebase.md
    - commands/new-milestone.md
    - commands/complete-milestone.md
    - commands/audit-milestone.md
    - commands/research-phase.md
    - commands/discovery-phase.md
    - commands/add-phase.md
    - commands/remove-phase.md
    - commands/insert-phase.md
    - commands/validate-phase.md
    - commands/add-tests.md
    - commands/add-todo.md
    - commands/check-todos.md
    - commands/cleanup.md
    - commands/diagnose-issues.md
    - commands/health.md
    - commands/list-phase-assumptions.md
    - commands/pause-work.md
    - commands/plan-milestone-gaps.md
    - commands/resume-project.md
    - commands/set-profile.md
    - commands/settings.md
    - commands/transition.md
    - commands/update.md
  modified: []

key-decisions:
  - "Two-tier delegation (command -> workflow) used in plugin repo vs three-tier (command -> skill -> workflow) in personal installation — skills/ layer omitted as plugin ships its own workflows"
  - "All 34 workflows registered as user-facing /pde: commands — the ~29 figure in CMD-01 was approximate; all 34 satisfy the requirement"
  - "Task tool included in all command stubs — required for workflows that spawn subagents, harmless for those that do not"

patterns-established:
  - "Command stub pattern: thin YAML frontmatter + two-liner process body referencing CLAUDE_PLUGIN_ROOT workflow"
  - "1:1 mapping between commands/ and workflows/ — every workflow has exactly one command stub"

requirements-completed: [CMD-01, CMD-02, CMD-03, CMD-04, CMD-05, CMD-06, CMD-07, CMD-08, CMD-09, CMD-10, CMD-11, CMD-12, CMD-13]

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 03 Plan 02: Workflow Commands - Command Stubs Summary

**34 thin command stub files registered in commands/ using pde: prefix and two-tier CLAUDE_PLUGIN_ROOT delegation, making all /pde: slash commands discoverable in Claude Code**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-15T02:40:00Z
- **Completed:** 2026-03-15T02:45:00Z
- **Tasks:** 2
- **Files modified:** 34 files (all in commands/)

## Accomplishments

- commands/ directory created with 34 .md stub files
- All stubs use `name: pde:command-name` prefix for correct /pde: slash command registration
- Two-tier delegation to @${CLAUDE_PLUGIN_ROOT}/workflows/name.md (not three-tier via skills/)
- Plugin validates cleanly with claude plugin validate .
- 1:1 mapping confirmed between commands/ and workflows/ — both directions verified

## Task Commits

Each task was committed atomically:

1. **Task 1: Create all 34 command stub files** - `29ba287` (feat)
2. **Task 2: Validate plugin structure and run full grep audit** - `7e2552f` (chore)

**Plan metadata:** _(pending docs commit)_

## Files Created/Modified

- `commands/new-project.md` - /pde:new-project slash command registration
- `commands/plan-phase.md` - /pde:plan-phase slash command registration
- `commands/execute-phase.md` - /pde:execute-phase slash command registration
- `commands/execute-plan.md` - /pde:execute-plan slash command registration
- `commands/verify-work.md` - /pde:verify-work slash command registration
- `commands/verify-phase.md` - /pde:verify-phase slash command registration
- `commands/progress.md` - /pde:progress slash command registration
- `commands/quick.md` - /pde:quick slash command registration
- `commands/help.md` - /pde:help slash command registration
- `commands/discuss-phase.md` - /pde:discuss-phase slash command registration
- `commands/map-codebase.md` - /pde:map-codebase slash command registration
- `commands/new-milestone.md` - /pde:new-milestone slash command registration
- `commands/complete-milestone.md` - /pde:complete-milestone slash command registration
- `commands/audit-milestone.md` - /pde:audit-milestone slash command registration
- `commands/research-phase.md` - /pde:research-phase slash command registration
- `commands/discovery-phase.md` - /pde:discovery-phase slash command registration
- `commands/add-phase.md` - /pde:add-phase slash command registration
- `commands/remove-phase.md` - /pde:remove-phase slash command registration
- `commands/insert-phase.md` - /pde:insert-phase slash command registration
- `commands/validate-phase.md` - /pde:validate-phase slash command registration
- `commands/add-tests.md` - /pde:add-tests slash command registration
- `commands/add-todo.md` - /pde:add-todo slash command registration
- `commands/check-todos.md` - /pde:check-todos slash command registration
- `commands/cleanup.md` - /pde:cleanup slash command registration
- `commands/diagnose-issues.md` - /pde:diagnose-issues slash command registration
- `commands/health.md` - /pde:health slash command registration
- `commands/list-phase-assumptions.md` - /pde:list-phase-assumptions slash command registration
- `commands/pause-work.md` - /pde:pause-work slash command registration
- `commands/plan-milestone-gaps.md` - /pde:plan-milestone-gaps slash command registration
- `commands/resume-project.md` - /pde:resume-project slash command registration
- `commands/set-profile.md` - /pde:set-profile slash command registration
- `commands/settings.md` - /pde:settings slash command registration
- `commands/transition.md` - /pde:transition slash command registration
- `commands/update.md` - /pde:update slash command registration

## Decisions Made

- **Two-tier delegation:** Plugin repo command stubs skip the skills/ middle tier — they go directly from command to workflow. The personal installation uses skills/ as a dispatch layer, but the plugin ships its own workflows, making skills/ redundant.
- **All 34 registered:** CMD-01 referenced ~29 commands; all 34 workflows are user-facing and satisfy the requirement. The ~29 count was approximate.
- **Task tool in all stubs:** Including Task in every stub's allowed-tools is harmless overhead for workflows that don't spawn subagents, and required for those that do (execute-phase, execute-plan, map-codebase, etc.).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The plan's Task 2 grep audit finds 5 results in the raw output (4 lines in update.md, 1 in splash.cjs). These are pre-existing approved patterns from Phase 03-01: update.md uses runtime dynamic discovery across AI editor directories (intentionally retained per 03-01 decision), and splash.cjs uses CLAUDE_PLUGIN_ROOT with HOME fallback (graceful degradation, also approved). Zero new violations introduced by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 34 /pde: slash commands are now registered and discoverable in Claude Code
- commands/ -> workflows/ two-tier chain is complete and validated
- Phase 04 (agents rebrand) can proceed
- Plugin ready for end-to-end testing once distributed via GitHub

## Self-Check: PASSED

- commands/new-project.md: FOUND
- commands/execute-phase.md: FOUND
- commands/help.md: FOUND
- commands/progress.md: FOUND
- commands/update.md: FOUND
- Commit 29ba287: FOUND (feat - 34 command stubs)
- Commit 7e2552f: FOUND (chore - validation)

---
*Phase: 03-workflow-commands*
*Completed: 2026-03-14*
