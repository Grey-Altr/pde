---
phase: 115-multi-candidate-experiments
plan: "02"
subsystem: experiment-orchestrator
tags: [multi-candidate, optimize, workflow, candidate-loop, reset-to-sha, nyquist]

# Dependency graph
requires:
  - phase: 115-01
    provides: reset-to-sha subcommand, candidates field parsing, extended JSONL schema (candidates_evaluated, candidates_scores, best_candidate_index)
provides:
  - optimize.md Step 7 multi-candidate loop (candidateCount N dispatches per iteration)
  - Argmax/argmin candidate selection with reset-to-sha promotion
  - DISCARD and all-crash reset paths to iterationBaselineSha
  - JSONL rows extended with candidates_evaluated, candidates_scores, best_candidate_index
  - MULTI-05 structural Nyquist tests (6 tests)
affects: [phase-116, experiment-runner-agent, pde-optimize-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns: [multi-candidate-loop, sequential-commit-reset, argmax-argmin-selection, iteration-baseline-sha-pattern]

key-files:
  created: []
  modified:
    - workflows/optimize.md
    - tests/phase-115/multi-candidate.test.mjs

key-decisions:
  - "Circuit breakers apply per-iteration (after selection phase) not per-candidate — partial batch success does not fire BREAK-03"
  - "DISCARD reset uses iterationBaselineSha not candidateSha — best candidate is discarded if worse than historical best"
  - "All-crash path resets to iterationBaselineSha even after individual candidate CRASH resets — explicit safety net"
  - "BREAK-05 circuit breaker updated to reference iterationStatus not status — no behavioral change, just variable rename"

patterns-established:
  - "iterationBaselineSha captured before candidate loop — enables multi-candidate clean-start resets"
  - "candidateResults array collects all N outcomes before selection phase"
  - "Surviving candidates filter: metric_value !== null — null marks crashed candidates"

requirements-completed: [MULTI-05]

# Metrics
duration: ~5min
completed: 2026-03-24
---

# Phase 115 Plan 02: Multi-Candidate Orchestrator Integration Summary

**Multi-candidate loop wired into optimize.md Step 7: N candidates dispatched per iteration, argmax/argmin selection promotes the best via reset-to-sha, DISCARD/all-crash paths reset to iteration baseline, and JSONL rows include candidates_evaluated, candidates_scores, and best_candidate_index.**

## Performance

- **Duration:** ~5 minutes
- **Started:** 2026-03-24T01:00:00Z
- **Completed:** 2026-03-24T01:05:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Replaced single Task() dispatch in optimize.md Step 7 with N-candidate loop using candidateCount (from experiment.md `candidates` field, default 3)
- Added candidate selection phase: argmax/argmin over surviving candidates, reset-to-sha to winner, DISCARD if worse than historical best
- Extended JSONL row writes to include candidates_evaluated, candidates_scores array, and best_candidate_index
- Added 6 MULTI-05 structural Nyquist tests — total test count now 20/20 green

## Task Commits

Each task was committed atomically:

1. **Task 1: Add candidate loop to optimize.md Step 7 and MULTI-05 Nyquist tests** - `0f77c29` (feat)

## Files Created/Modified

- `workflows/optimize.md` — Step 1 now stores candidateCount; Step 7d-7f replaced with N-candidate loop, selection phase, and updated event/JSONL writes; BREAK-05 circuit breaker updated to use iterationStatus
- `tests/phase-115/multi-candidate.test.mjs` — Added MULTI-05 describe block with 6 structural tests for optimize.md content

## Decisions Made

- Circuit breakers apply per-iteration after selection, not per-candidate — BREAK-03 consecutiveFailures increments once per iteration outcome (KEEP/DISCARD/CRASH), never per individual candidate failure
- DISCARD path resets to iterationBaselineSha (not to the best candidate SHA that was already promoted to) — prevents candidate commits from persisting on the branch when no improvement was found
- All-crash handling resets to iterationBaselineSha explicitly even though individual candidate CRASH paths already reset — belt-and-suspenders for corrupt state prevention

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed BREAK-05 circuit breaker variable reference from `status` to `iterationStatus`**

- **Found during:** Task 1 — while rewriting Step 7, old `status` variable was superseded by `iterationStatus` from the selection phase
- **Issue:** BREAK-05 condition read `AND status is not "CRASH"` but `status` no longer exists in Step 7 context post-refactor
- **Fix:** Updated BREAK-05 condition to reference `iterationStatus` — identical behavior, correct variable name
- **Files modified:** workflows/optimize.md
- **Verification:** Textual review; structural tests pass
- **Committed in:** 0f77c29 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Necessary for correctness — variable name mismatch in circuit breaker check would have caused incorrect BREAK-05 evaluation. No scope creep.

## Issues Encountered

Pre-existing: phase-114 test `JSONL_ROW_FIELDS has 11 fields (9 original + 2 new)` fails (26/27) because Plan 01 extended the schema to 14 fields. This failure predates our changes — confirmed by stash-and-retest. Out of scope per deviation rules.

## Known Stubs

None — optimize.md candidate loop is fully specified prose. candidateCount=1 reduces to single-candidate behavior (loop executes once, selection phase trivially picks the only candidate).

## Next Phase Readiness

- Multi-candidate loop complete: Plans 01 and 02 together deliver all MULTI-01 through MULTI-05 requirements
- Phase 116 can use candidateCount > 1 experiments immediately by adding `candidates: N` to experiment.md frontmatter
- Existing templates without a `candidates` field will default to N=3 — operators who want single-candidate mode should add `candidates: 1`

---
*Phase: 115-multi-candidate-experiments*
*Completed: 2026-03-24*
