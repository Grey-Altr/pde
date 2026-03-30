---
phase: 188
plan: "03"
subsystem: pde-tools-cli
tags: [health-command, consistency-check, vitest, tdd, milestone-verification]
one-liner: "pde-tools health consistency subcommand that cross-checks REQUIREMENTS.md checkboxes against ROADMAP.md phase completion states for any milestone version"

dependency_graph:
  requires:
    - bin/lib/verify.cjs (existing verify module)
    - bin/lib/core.cjs (output, error helpers)
    - bin/lib/frontmatter.cjs (extractFrontmatter)
    - .planning/milestones/{version}-REQUIREMENTS.md
    - .planning/milestones/{version}-ROADMAP.md
    - .planning/STATE.md (milestone fallback)
  provides:
    - bin/lib/verify.cjs#cmdHealthConsistency
    - bin/pde-tools.cjs case 'health'
    - tests/phase-188/health-consistency.test.mjs
  affects:
    - pde-tools CLI (adds new top-level 'health' command)

tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN cycle (vitest)
    - Structured JSON output via output() from core.cjs
    - process.exit mocking in vitest tests

key_files:
  created:
    - tests/phase-188/health-consistency.test.mjs
  modified:
    - bin/lib/verify.cjs
    - bin/pde-tools.cjs

decisions:
  - "Added cmdHealthConsistency to verify.cjs (not a new health.cjs module) — simpler, consistent with cmdValidateConsistency pattern"
  - "Two-pass regex for requirement parsing: match line first, then extract Phase number from rest-of-line — more robust than single greedy pattern"
  - "Tests mock process.exit (no-op replacement) since output() in core.cjs always calls process.exit(0)"

metrics:
  duration_seconds: 219
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 188 Plan 03: Health Consistency Command Summary

**One-liner:** pde-tools health consistency subcommand that cross-checks REQUIREMENTS.md checkboxes against ROADMAP.md phase completion states for any milestone version

## What Was Built

Implemented the `pde-tools health consistency [version]` CLI subcommand (requirement VER-03) as a new top-level `health` command in pde-tools.cjs routing to `cmdHealthConsistency` in `bin/lib/verify.cjs`.

The command:
- Reads `.planning/milestones/{version}-REQUIREMENTS.md` and `.planning/milestones/{version}-ROADMAP.md`
- Parses requirement checkboxes and roadmap phase completion states
- Cross-references: if a ROADMAP phase is `[x]` complete but the mapped requirement is `[ ]` unchecked, reports a `requirement_not_checked` mismatch; inverse is `phase_not_complete`
- Falls back to `STATE.md` `milestone:` field when no version argument is provided
- Returns structured error (not uncaught throw) for unknown versions

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Create test scaffold | d5d4138 | tests/phase-188/health-consistency.test.mjs |
| 2 (GREEN) | Implement cmdHealthConsistency + wire CLI | 0a21746 | bin/lib/verify.cjs, bin/pde-tools.cjs, tests/phase-188/health-consistency.test.mjs |

## Verification Results

```
node bin/pde-tools.cjs health consistency v0.22 --raw
→ {"version":"v0.22","passed":true,"mismatches":[],"warnings":[]}

node bin/pde-tools.cjs health consistency --raw
→ {"version":"v0.23","passed":false,"error":"Requirements file not found...","mismatches":[],"warnings":[]}

npx vitest run tests/phase-188/health-consistency.test.mjs
→ 6/6 tests pass
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test helper needed process.exit mock**
- **Found during:** Task 2 (GREEN phase, first test run)
- **Issue:** `output()` in `core.cjs` always calls `process.exit(0)` after writing output. The `captureOutput` helper in the test file captured stdout but didn't mock `process.exit`, causing vitest to report "process.exit unexpectedly called" errors.
- **Fix:** Added `process.exit = () => {}` no-op mock inside `captureOutput` helper, restoring original after each call.
- **Files modified:** `tests/phase-188/health-consistency.test.mjs`
- **Commit:** 0a21746

**2. [Rule 1 - Bug] Requirement regex didn't capture Phase number**
- **Found during:** Task 2 (GREEN phase, Test 4 mismatch detection)
- **Issue:** Initial regex `- \[([ xX])\] \*\*([A-Z]+-\d+)\*\*.*?(?:\*\(Phase (\d+))?` — the `.*?` (lazy) stopped before consuming the Phase number, leaving capture group 3 empty. All requirements got `phase: null`.
- **Fix:** Switched to two-pass approach: match full line with `- \[([ xX])\] \*\*([A-Z]+-\d+)\*\*(.*)$` then extract `Phase (\d+)` from the captured rest-of-line string.
- **Files modified:** `bin/lib/verify.cjs`
- **Commit:** 0a21746

## Known Stubs

None — the command reads real milestone files. For `v0.23` (current milestone), the REQUIREMENTS.md doesn't exist yet (milestone in progress), so it returns a structured `error` field. This is correct behavior, not a stub.

## Self-Check: PASSED

- FOUND: tests/phase-188/health-consistency.test.mjs
- FOUND: bin/lib/verify.cjs
- FOUND: bin/pde-tools.cjs
- FOUND commit: d5d4138 (test scaffold)
- FOUND commit: 0a21746 (implementation)
