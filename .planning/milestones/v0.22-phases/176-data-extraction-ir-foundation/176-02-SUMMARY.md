---
phase: 176-data-extraction-ir-foundation
plan: 02
subsystem: presentation-ir
duration: 8min
completed: "2026-03-29"
tags: [ir-extraction, git-velocity, cost-timing, blockers, verification, research, decisions, tdd]
dependency-graph:
  requires: []
  provides: [EXT-05, EXT-06, EXT-07, EXT-08, EXT-09, EXT-10]
  affects: [176-03-PLAN.md]
tech-stack:
  added: []
  patterns:
    - "Deterministic extractor pattern: execGit-based git stats, no exec/shell injection"
    - "Unavailable sentinel: { unavailable: true, reason } for optional data sources"
    - "Empty array (not sentinel) for blockers/decisions when sections are empty"
    - "Phase directory walker: getAllPhaseDirs combines current + archived milestone dirs"
key-files:
  created:
    - bin/lib/presentation.cjs
    - tests/phase-176/presentation-ir.test.mjs
  modified: []
key-decisions:
  - "EXT-06 reads SUMMARY.md frontmatter duration fields — not /tmp NDJSON event files"
  - "Blockers/decisions return empty arrays (valid state), not unavailable sentinels"
  - "getArchivedPhaseDirs wrapped in try/catch so extraction works standalone without full core"
metrics:
  tasks_completed: 1
  files_created: 2
  files_modified: 0
  tests_passing: 29
  tests_failing: 0
---

# Phase 176 Plan 02: IR Extractor Functions EXT-05 to EXT-10 Summary

**One-liner:** Six deterministic IR extractors (git velocity, cost/timing, blockers, verification, research, decisions) using execGit and SUMMARY.md frontmatter, with 29 unit tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | Add failing tests for EXT-05 through EXT-10 | 50a5841 | tests/phase-176/presentation-ir.test.mjs |
| GREEN | Implement EXT-05 through EXT-10 extractor functions | 13b6547 | bin/lib/presentation.cjs |

## What Was Built

Six extractor functions appended to `bin/lib/presentation.cjs`:

**EXT-05: extractGitVelocity(cwd)**
Uses `execGit` with `log --pretty=format:%as`, `shortlog -sn`, and `log --stat` to return `{ total_commits, commits_last_30_days, contributors, estimated_loc_added }`. Returns `{ unavailable: true, reason }` when git log fails (not a git repo, no history).

**EXT-06: extractCostTiming(cwd)**
Walks all phase directories (current + archived) for `*-SUMMARY.md` files, parses `duration` frontmatter field (format: "27min"), returns `{ session_count, total_duration_min, phases_with_timing, average_phase_duration_min }`. Returns unavailable sentinel when zero SUMMARY files found. Does NOT read from `/tmp` or NDJSON event files.

**EXT-07: extractBlockers(cwd)**
Parses `### Blockers/Concerns` section in `STATE.md` for `- [Source]: text` lines. Classifies items containing "risk" or "concern" keywords as risks, others as blockers. Returns `{ blockers: [], risks: [] }` when section is empty or STATE.md is missing (empty arrays, NOT unavailable sentinel).

**EXT-08: extractVerification(cwd)**
Walks all phase directories for `*-VERIFICATION.md` files, counts `- [x]` (ac_pass) and `- [ ]` (ac_fail) checkboxes, detects `**Overall: ACHIEVED**` pattern. Returns `{ phases_verified, phases_achieved, phases_not_achieved, phases_missing_verification, results }`.

**EXT-09: extractResearch(cwd)**
Counts files in `.planning/research/` for project-level topics (filename -> topic name), walks phase dirs for `*-RESEARCH.md` files. Returns `{ project_research_files, topics, phase_research_count }`. Returns zeros when research/ dir doesn't exist.

**EXT-10: extractDecisions(cwd)**
Combines decisions from `STATE.md ### Decisions` section (`- [Source]: text` lines) and `key-decisions` arrays in SUMMARY.md frontmatter. Returns array of `{ phase, summary, rationale }`. Returns empty array (not unavailable) when no decisions found.

## Verification Results

```
Test Files  1 passed (1)
Tests       29 passed (29)
Duration    302ms
```

Acceptance criteria checks:
- `grep -c 'function extract' bin/lib/presentation.cjs` → 6 (PASS)
- `grep 'os.tmpdir\|pde-session' bin/lib/presentation.cjs` → 0 matches (PASS)
- `grep -c 'unavailable.*true' bin/lib/presentation.cjs` → 4 (PASS, git velocity + cost timing)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all six extractors are fully wired to real data sources (.planning/ artifacts and git history).

## Self-Check: PASSED
