---
phase: 203-change-tracking-event-bus
plan: 01
subsystem: infra
tags: [firecrawl, change-tracking, snapshot, diff, cache, workflow]

# Dependency graph
requires:
  - phase: 199-firecrawl-cache-module
    provides: writeSnapshot, readSnapshot, slugifyUrl, ensureCacheDir — all consumed by writeDiff and watch subcommand
  - phase: 198-firecrawl-foundation
    provides: probeFirecrawl, acquireFirecrawlSemaphore, incrementFirecrawlUsage — credit guard and semaphore used verbatim
provides:
  - writeDiff(url, diffText, linesChanged, previousScrapeAt, projectRoot) in firecrawl-cache.cjs — writes snapshots/{slug}-diff.md with header and fenced diff block
  - watch subcommand in workflows/firecrawl.md — baseline detection, changeTracking scrape, diff write, cost-gated JSON mode
affects: [phase-203-plan-02, future firecrawl integrations needing watch capability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Baseline-first watch pattern: readSnapshot null check gates changeTracking usage — no changeTracking on first call"
    - "TDD red-green for cache helpers: tests written before implementation, run to confirm RED, then GREEN"
    - "Diff file convention: snapshots/{slug}-diff.md separate from snapshot file {slug}.md"
    - "Cost gate for JSON diff mode: explicit --json-diff flag required, cost warning displayed before MCP call"

key-files:
  created:
    - tests/phase-203/test-watch-diff.cjs
  modified:
    - bin/lib/firecrawl-cache.cjs
    - workflows/firecrawl.md

key-decisions:
  - "writeDiff placed in firecrawl-cache.cjs (not inline bash) for testability and reuse across future plans"
  - "Git-diff mode (free) is default; JSON mode costs 5 extra credits/page and requires --json-diff opt-in"
  - "Diff files written to snapshots/ alongside baseline files — no separate diff directory"
  - "First watch call uses markdown-only scrape (no changeTracking) to establish baseline per Pitfall 3"
  - "linesChanged computed from unified diff line filter: startsWith(+/-) excluding +++ and --- markers"

patterns-established:
  - "Pattern: watch subcommand follows same credit-guard + semaphore + MCP + cache-write + semaphore-release structure as scrape"
  - "Pattern: writeDiff returns { slug, path, linesChanged } matching existing cache helper return shapes"

requirements-completed: [CHG-01]

# Metrics
duration: 3min
completed: 2026-03-31
---

# Phase 203 Plan 01: Watch Subcommand + writeDiff Helper Summary

**writeDiff() cache helper for snapshot diff files and /pde:firecrawl watch subcommand with baseline-first changeTracking, git-diff default (free), JSON mode opt-in with cost warning**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-31T05:39:16Z
- **Completed:** 2026-03-31T05:41:54Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `writeDiff()` to `firecrawl-cache.cjs` — writes `snapshots/{slug}-diff.md` with URL header, detection timestamp, lines changed, previous snapshot date, and fenced diff block; returns `{ slug, path, linesChanged }`
- 12 unit tests in `tests/phase-203/test-watch-diff.cjs` covering: writeDiff export, return shape, file path correctness, content structure (URL, linesChanged, previousScrapeAt, diff block), directory creation, and readSnapshot null behavior
- Added `watch` subcommand to `workflows/firecrawl.md` with baseline detection, first-call baseline establishment (markdown-only), subsequent-call changeTracking scrape (both formats required), all changeStatus branches, and cost-gated --json-diff mode

## Task Commits

Each task was committed atomically:

1. **Task 1: writeDiff() helper + unit tests (TDD red-green)** - `26842c1` (feat)
2. **Task 2: watch subcommand in workflows/firecrawl.md** - `1c88232` (feat)

**Plan metadata:** TBD (docs commit)

## Files Created/Modified

- `bin/lib/firecrawl-cache.cjs` — Added `writeDiff()` function and export
- `tests/phase-203/test-watch-diff.cjs` — 12 unit tests for writeDiff, readSnapshot, writeSnapshot round-trip
- `workflows/firecrawl.md` — Added watch routing entry, watch subcommand section, updated usage help + examples

## Decisions Made

- `writeDiff` placed in `firecrawl-cache.cjs` alongside `writeSnapshot`/`readSnapshot` for testability and consistent cache I/O pattern
- Git-diff mode (free) is the default; `--json-diff` is explicit opt-in with cost warning (5 extra credits/page)
- Diff files go to `snapshots/{slug}-diff.md` — same directory as baseline, distinguished by `-diff` suffix
- First watch call must use `formats: ["markdown"]` only (no changeTracking) per Pitfall 3 — changeTracking on first call always returns `changeStatus: "new"` with empty diff
- `linesChanged` computed inline from diff text line filter: `startsWith(+/-) && !startsWith(+++) && !startsWith(---)`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `writeDiff()` is exported and unit-tested; ready for use in Plan 02 event emission hooks
- watch subcommand documented and follows all existing patterns; ready for use
- CHG-01 requirement complete; CHG-02 (event emission) addressed in Plan 02

---
*Phase: 203-change-tracking-event-bus*
*Completed: 2026-03-31*
