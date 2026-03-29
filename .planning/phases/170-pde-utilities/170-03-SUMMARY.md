---
phase: 170-pde-utilities
plan: "03"
subsystem: pde-utilities-cli
tags: [cli, utils, mermaid, design-tokens, e2e-tests, handoff, pde-tools]
dependency_graph:
  requires: [170-01, 170-02]
  provides: [UTL-01, UTL-02, UTL-03, UTL-04, UTL-05, UTL-06, UTL-07, UTL-08]
  affects: [bin/pde-tools.cjs, commands/]
tech_stack:
  added: []
  patterns: [case-block-routing, args.indexOf-flag-parsing, lazy-require-in-case-block]
key_files:
  created:
    - commands/render-mermaid.md
    - commands/validate-tokens.md
    - commands/gen-tests.md
    - commands/verify-handoff.md
  modified:
    - bin/pde-tools.cjs
decisions:
  - "case 'utils' block inserted after case '3d' and before case 'phase-plan-index' — follows established media-then-utility ordering in pde-tools.cjs"
  - "UTL-04 (visual diff) confirmed already accessible via existing 'image diff' subcommand — no new wiring needed"
  - "gen-tests extracts mermaid blocks from markdown using regex — avoids full markdown parser dependency"
metrics:
  duration_minutes: 2
  completed_date: "2026-03-29"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 5
---

# Phase 170 Plan 03: Wire Utils into pde-tools.cjs + Skill Files Summary

**One-liner:** CLI router wired to four utility modules (mermaid, tokens, flow-tests, handoff-verifier) with complete /pde: command skill files — Phase 170 milestone capstone complete.

## What Was Built

### Task 1: case 'utils' block in pde-tools.cjs (commit: cb43398)

Added a 83-line `case 'utils'` block to the main switch statement in `bin/pde-tools.cjs`, inserted between `case '3d'` and `case 'phase-plan-index'`. The block follows the same `args.indexOf` flag-parsing pattern as `case 'image'` and `case '3d'`.

Four subcommands wired:
- `utils render-mermaid` — routes to `bin/lib/utils/mermaid-renderer.cjs::renderMermaid()`
- `utils validate-tokens` — routes to `bin/lib/utils/token-validator.cjs::runTokenValidation()`
- `utils gen-tests` — routes to `bin/lib/utils/flow-test-gen.cjs::{parseFlowchart, generateTestScaffold, findLatestFlowsFile}`
- `utils verify-handoff` — routes to `bin/lib/utils/handoff-verifier.cjs::{verifyHandoff, findLatestHandoffSpec}`

Running `node bin/pde-tools.cjs utils` without a subcommand prints usage with all four subcommand names.

### Task 2: Skill files for all /pde: utility commands (commit: 72bd5ca)

Four skill files created in `commands/` matching the format of `commands/3d.md`:

- `commands/render-mermaid.md` — mmdr/mmdc renderer docs with prerequisites, format options, examples
- `commands/validate-tokens.md` — DTCG/OKLCH/APCA validation docs with check table and token format reference
- `commands/gen-tests.md` — Playwright E2E skeleton generator with workflow guide and generated test format
- `commands/verify-handoff.md` — Gap report docs with status table (matched/missing/diverged) and workflow

UTL-04 (visual diff) confirmed already documented in `commands/visual-diff.md` via `image diff` subcommand — no additional skill file needed.

## Verification

All 68 Phase 170 tests pass:

```
Test Files  4 passed (4)
      Tests 68 passed (68)
   Duration 144ms
```

## Deviations from Plan

None — plan executed exactly as written.

Note: Worktree required a `git merge main` at plan start to pull in utility modules from plans 170-01 and 170-02, which had been committed to main but not yet merged into this worktree branch. This is expected parallel worktree behavior, not a deviation.

## Known Stubs

None. All four subcommands call real module functions. Skill files document actual CLI surface.

## UTL Requirements Coverage

| Requirement | Command | Status |
|-------------|---------|--------|
| UTL-01 | /pde:render-mermaid | Complete (plan 01 + this plan) |
| UTL-02 | /pde:validate-tokens | Complete (plan 01 + this plan) |
| UTL-03 | /pde:validate-tokens (APCA check) | Complete (plan 01 + this plan) |
| UTL-04 | /pde:visual-diff (image diff) | Complete (plan 166 + commands/visual-diff.md) |
| UTL-05 | /pde:gen-tests | Complete (plan 02 + this plan) |
| UTL-06 | /pde:gen-tests (auto-detect flows) | Complete (plan 02 + this plan) |
| UTL-07 | /pde:verify-handoff | Complete (plan 02 + this plan) |
| UTL-08 | /pde:verify-handoff (gap report) | Complete (plan 02 + this plan) |

All eight UTL requirements have corresponding /pde: command surface.

## Self-Check: PASSED

- [x] bin/pde-tools.cjs contains `case 'utils'` block — verified
- [x] commands/render-mermaid.md exists — verified
- [x] commands/validate-tokens.md exists — verified
- [x] commands/gen-tests.md exists — verified
- [x] commands/verify-handoff.md exists — verified
- [x] cb43398 commit exists — feat(170-03): wire utils subcommands
- [x] 72bd5ca commit exists — feat(170-03): add skill files
- [x] 68 tests pass in tests/phase-170/
