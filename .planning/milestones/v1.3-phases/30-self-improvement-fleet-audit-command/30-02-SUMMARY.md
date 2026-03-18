---
phase: 30-self-improvement-fleet-audit-command
plan: "02"
subsystem: audit
tags: [pde-audit, quality-auditor, skill-improver, skill-validator, fleet-orchestration, protected-files]

# Dependency graph
requires:
  - phase: 30-01
    provides: pde-quality-auditor, pde-skill-improver, pde-skill-validator agents and model profile entries
  - phase: 29-quality-infrastructure
    provides: quality-standards.md, tooling-patterns.md, protected-files.json, model-profiles.md

provides:
  - /pde:audit command invoker (commands/audit.md)
  - Full audit workflow with 3-agent sequential orchestration (workflows/audit.md)
  - --fix, --deep, --save-baseline, --category flag handling
  - .planning/audit-report.md output
  - .planning/audit-baseline.json baseline storage and delta computation
  - Protected-files guard enforcement at workflow level (double-check before apply)

affects:
  - Phase 31 (Skill Builder) — audit workflow establishes improvement loop pattern
  - Phase 32-37 (Design Elevation, Pressure Test) — /pde:audit provides self-improvement foundation
  - All future phases using fleet agents — sequential Task() orchestration pattern established

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Workflow-driven fleet orchestration: workflow spawns agents via Task(), agents never spawn other agents"
    - "Protected-files double guard: both the agent (pde-skill-improver) and the workflow (Step 4c) check protected-files.json before any write"
    - "Retry loop with hard cap: max 3 cycles per artifact, max 10 artifacts per run to prevent context exhaustion"
    - "Baseline delta pattern: audit-baseline.json stores scores + timestamp, delta computed on each audit run"

key-files:
  created:
    - commands/audit.md
    - workflows/audit.md
  modified: []

key-decisions:
  - "Workflow drives the loop — agents do not spawn other agents; each Task() is sequential (truism from research Pitfall 1)"
  - "Protected-files guard enforced at workflow level in addition to agent level — defense in depth since enforcement is prompt-only not OS-level"
  - "Improvement cycle capped at 3 per artifact and 10 artifacts per run — prevents infinite loops and context exhaustion (from research Pitfall 4)"
  - "Findings grouped by artifact (one improver Task per artifact group, not per finding) — matches pde-skill-improver constraint"

patterns-established:
  - "Command invoker pattern: commands/*.md frontmatter + @workflows/[name].md delegation in <process>"
  - "Audit workflow structure: 0-Initialize -> 1-Spawn Auditor -> 2-Report -> 3-Baseline -> 4-Fix Loop -> 5-Display"
  - "Sequential agent orchestration: wait for Task() return before spawning next agent"

requirements-completed: [AUDIT-01, AUDIT-05, AUDIT-06, AUDIT-07]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 30 Plan 02: /pde:audit Command and Fleet Orchestration Workflow Summary

**`/pde:audit` command invoker and sequential 3-agent workflow (auditor -> improver -> validator) with --fix/--deep/--save-baseline/--category flags, protected-files guard, and baseline delta tracking**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-18T00:47:50Z
- **Completed:** 2026-03-18T00:50:01Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- `/pde:audit` command invoker delegates to audit workflow with full flag documentation in argument-hint
- Full audit workflow orchestrates 3-agent fleet sequentially (workflow drives loop — no agent spawns another agent)
- Protected-files guard at workflow apply step (Step 4c) double-checks before writing any change
- Retry loop capped at 3 cycles per artifact, 10 artifacts per run to prevent context exhaustion
- Baseline delta computation: loads audit-baseline.json if it exists, computes overall health delta

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /pde:audit command invoker** - `fa91365` (feat)
2. **Task 2: Create audit workflow with 3-agent fleet orchestration** - `5305ceb` (feat)

## Files Created/Modified

- `commands/audit.md` — /pde:audit command invoker with frontmatter, argument-hint, and @workflows/audit.md delegation
- `workflows/audit.md` — Full 5-step orchestration workflow: initialize, spawn auditor, generate report, baseline handling, improvement loop (--fix), display summary

## Decisions Made

- Workflow drives the loop (not agents) — each Task() is sequential, awaiting return before spawning next. This is the established PDE orchestration pattern from research.
- Protected-files guard is enforced at both the workflow level (Step 4c) and the agent level (pde-skill-improver) — defense in depth required because Claude Code Write/Edit tools bypass bwrap sandbox (enforcement is prompt-only).
- Max 3 improvement cycles per artifact, max 10 artifacts per run — hard caps prevent infinite loops and context window exhaustion per research Pitfall 4.
- Grouped findings by artifact (one improver Task per artifact group) — matches pde-skill-improver's constraint of writing one proposal per artifact.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 30 complete: /pde:audit command and fleet orchestration workflow in place
- Phase 31 (Skill Builder) can proceed — the audit loop pattern and agent interfaces are stable
- Running /pde:audit --save-baseline after Phase 31 will establish the first quality baseline for delta tracking

---
*Phase: 30-self-improvement-fleet-audit-command*
*Completed: 2026-03-18*
