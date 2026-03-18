---
phase: 40-github-integration
plan: 03
subsystem: github-integration
tags: [github, mcp, brief, handoff, pull-request, workflow]

# Dependency graph
requires:
  - phase: 40-github-integration
    plan: 01
    provides: "mcp-bridge.cjs with TOOL_MAP entries for github:get-issue and github:create-pr"

provides:
  - "/pde:brief --from-github flag with GitHub issue pre-population workflow"
  - "/pde:handoff --create-prs flag with PR creation confirmation gate workflow"
  - "workflows/brief-from-github.md — multi-format issue URL parsing, integer coercion, [from GitHub #N] markers"
  - "workflows/handoff-create-prs.md — HND artifact discovery, branch prompting, write-back confirmation gate"

affects:
  - "40-github-integration"
  - "brief workflow — receives pre-populated context from brief-from-github.md"
  - "handoff workflow — PR creation delegates to handoff-create-prs.md"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sub-workflow delegation pattern: command routes flag to dedicated sub-workflow, which delegates back to main workflow after pre-processing"
    - "MCP write-back confirmation gate: show all details, prompt y/n, stop on non-yes — no GitHub write without explicit approval"
    - "Degraded-mode fallback: all GitHub-dependent workflows detect unavailability and fall back to base behavior without crashing"
    - "Integer coercion guard: issue_number always parseInt(n, 10) before MCP call — pitfall documented in research"

key-files:
  created:
    - "workflows/brief-from-github.md"
    - "workflows/handoff-create-prs.md"
  modified:
    - "commands/brief.md"
    - "commands/handoff.md"

key-decisions:
  - "--from-github sub-workflow delegates back to @workflows/brief.md after pre-population rather than reimplementing the brief pipeline — avoids duplication and ensures brief.md stays the single source of truth"
  - "brief-from-github.md parses three input formats (URL, bare number, owner/repo#number) with fallback to mcp-connections.json repo for bare numbers — makes the flag usable without a URL in connected repos"
  - "handoff-create-prs.md reads the latest HND-handoff-spec-v{N}.md automatically — user only needs to provide branch name, not re-specify the artifact"
  - "Confirmation gate uses strict y/yes case-insensitive check — any other response (n, no, empty, anything) triggers 'No PRs created.' with zero GitHub writes"

patterns-established:
  - "Sub-workflow delegation: command entry point detects flag, routes to dedicated sub-workflow; sub-workflow handles flag-specific logic then delegates to the main workflow for shared behavior"
  - "Write-back gate: confirmation prompt with explicit y/n before any MCP write operation (VAL-03 pattern)"
  - "MCP bridge lookup in workflows: always bridge.call('github:canonical-name') to resolve raw tool name, never hardcode mcp__github__* in workflow instructions"

requirements-completed: [GH-02, GH-03]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 40 Plan 03: GitHub Brief Pre-population and Handoff PR Creation Summary

**GitHub issue pre-population for /pde:brief (--from-github, GH-03) and confirmation-gated PR creation for /pde:handoff (--create-prs, GH-02) via dedicated sub-workflows with MCP bridge integration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T21:55:14Z
- **Completed:** 2026-03-18T21:57:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `workflows/brief-from-github.md` — fetches GitHub issue via `mcp__github__issue_read`, supports URL/bare-number/owner#repo formats, coerces issue_number to integer, pre-populates Problem Statement/Context/Constraints with `[from GitHub #N]` markers, degrades gracefully when GitHub unavailable
- Created `workflows/handoff-create-prs.md` — reads latest HND-handoff-spec, prompts for branch name and target branch, displays full PR details for confirmation, calls `mcp__github__create_pull_request` only after explicit y/yes, shows "No PRs created." on decline
- Updated `commands/brief.md` — added `--from-github` to argument-hint, `mcp__github__*` to allowed-tools, and flag-routing process logic
- Updated `commands/handoff.md` — added `--create-prs` to argument-hint, `mcp__github__*` to allowed-tools, and flag-routing process logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Create brief --from-github workflow and update brief command (GH-03)** - `0ef7e81` (feat)
2. **Task 2: Create handoff --create-prs workflow and update handoff command (GH-02)** - `70aa0de` (feat)

**Plan metadata:** (docs commit — this summary)

## Files Created/Modified

- `workflows/brief-from-github.md` — GitHub issue fetch → brief pre-population sub-workflow
- `workflows/handoff-create-prs.md` — HND artifact → PR creation with confirmation gate sub-workflow
- `commands/brief.md` — Added `--from-github` flag, `mcp__github__*` tools, routing logic
- `commands/handoff.md` — Added `--create-prs` flag, `mcp__github__*` tools, routing logic

## Decisions Made

- Sub-workflow delegation pattern: brief-from-github.md handles GitHub fetch then delegates to @workflows/brief.md rather than reimplementing the pipeline — keeps brief.md as the single source of truth for brief generation
- Three input formats supported for `--from-github`: full GitHub URL, bare issue number (uses mcp-connections.json repo), and `owner/repo#number` short form
- Confirmation gate uses strict y/yes (case-insensitive) — any non-yes response produces "No PRs created." with no MCP call
- Handoff PR creation auto-selects the latest HND-handoff-spec-v{N}.md — user only specifies branch name

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required beyond GitHub MCP connection (handled by Phase 40-01).

## Next Phase Readiness

- GH-02 and GH-03 requirements are complete
- Phase 40 has GH-01 (issue sync) and GH-04 (CI status) covered by Plans 40-02
- All four GitHub integration capabilities (GH-01 through GH-04) are now implemented
- Phase 40 GitHub integration is complete

---
*Phase: 40-github-integration*
*Completed: 2026-03-18*
