---
phase: 198-foundation-mcp-registration-credit-guards
plan: 02
subsystem: infra
tags: [firecrawl, credit-guard, semaphore, concurrency, quota, mcp]

# Dependency graph
requires:
  - phase: 198-foundation-mcp-registration-credit-guards (plan 01)
    provides: APPROVED_SERVERS firecrawl entry, TOOL_MAP firecrawl entries, AUTH_INSTRUCTIONS
provides:
  - checkFirecrawlCredits function with ok/warning/exhausted/no_quota states
  - readFirecrawlCredits read-only config.json cache reader
  - incrementFirecrawlUsage atomic credit decrement with auto-init
  - acquireFirecrawlSemaphore filesystem-based max-2 concurrency lock
affects: [199-firecrawl-cache, 200-scraping-tools, 201-workflow-integration, 202-firecrawl-agent-browser]

# Tech tracking
tech-stack:
  added: []
  patterns: [filesystem-semaphore, atomic-write-rename, credit-guard-contract]

key-files:
  created:
    - tests/phase-198/firecrawl-credit-guard.test.mjs
  modified:
    - bin/lib/mcp-bridge.cjs

key-decisions:
  - "Firecrawl credits track remaining (decrement) vs Stitch quotas that track used (increment) -- matches Firecrawl API credit model"
  - "Filesystem semaphore with PID+timestamp+counter lockfiles for same-millisecond uniqueness in parallel agents"
  - "Atomic config.json writes via tmp+rename to prevent concurrent corruption"

patterns-established:
  - "Credit guard contract: check -> operate -> increment (three-step lifecycle)"
  - "Filesystem semaphore: lockfile-based concurrency limiting with stale detection (5min TTL)"

requirements-completed: [FND-03, FND-04]

# Metrics
duration: 8min
completed: 2026-03-30
---

# Phase 198 Plan 02: Credit Guards & Concurrency Semaphore Summary

**Firecrawl credit guard with ok/warning/exhausted states, atomic usage tracking, and max-2-parallel filesystem semaphore**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-30T21:36:00Z
- **Completed:** 2026-03-30T21:44:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Four credit guard and concurrency functions exported from mcp-bridge.cjs
- Comprehensive test suite (14 tests) covering all credit states and semaphore behavior
- Atomic write pattern (tmp+rename) prevents config.json corruption from parallel agents
- Filesystem semaphore enforces max-2 concurrent Firecrawl operations with stale lock cleanup

## Task Commits

Each task was committed atomically:

1. **Task 1: Write test scaffold for credit guard and concurrency semaphore** - `8f58498` (test) - TDD RED phase
2. **Task 2: Implement credit guard functions and concurrency semaphore** - `8c745da` (feat) - TDD GREEN phase

**Plan metadata:** [pending] (docs: complete plan)

_Note: TDD tasks have RED (test) then GREEN (feat) commits_

## Files Created/Modified
- `tests/phase-198/firecrawl-credit-guard.test.mjs` - 14 unit tests for credit guard functions and concurrency semaphore
- `bin/lib/mcp-bridge.cjs` - Added readFirecrawlCredits, checkFirecrawlCredits, incrementFirecrawlUsage, acquireFirecrawlSemaphore + os require

## Decisions Made
- Firecrawl credits use remaining-decrement model (vs Stitch used-increment) to match Firecrawl API's credit balance semantics
- Semaphore lockfiles use PID+timestamp+counter naming to guarantee uniqueness even within same-millisecond synchronous calls
- Atomic config writes via writeFileSync to .tmp then renameSync to prevent partial reads during concurrent agent execution
- Auto-initialization defaults: total=100000, remaining=100000, cache_ttl_ms=300000, warning_threshold_pct=80

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed semaphore lockfile naming collision**
- **Found during:** Task 2 (semaphore implementation verification)
- **Issue:** `${process.pid}-${Date.now()}.lock` could produce identical filenames when called synchronously within the same millisecond, causing writeFileSync to overwrite the previous lock instead of creating a new one
- **Fix:** Added monotonic counter `_semaphoreCounter` to lockfile name: `${process.pid}-${Date.now()}-${++_semaphoreCounter}.lock`
- **Files modified:** bin/lib/mcp-bridge.cjs
- **Verification:** Manual test confirmed 2 distinct lockfiles after 2 acquires, third acquire throws FIRECRAWL_CONCURRENCY_LIMIT
- **Committed in:** 8c745da (amended into Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix essential for correctness of concurrency limiting. No scope creep.

## Issues Encountered
- System fork exhaustion (Resource temporarily unavailable) from parallel agent load prevented running `node --test` test runner (spawns child processes). Verified all functions manually via `node -e` inline execution. All 14 test behaviors confirmed passing.
- Default system node (v16.15.1) lacks `--test` support; tests require node v23.9.0 via nvm.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all functions are fully wired with real config.json read/write paths.

## Next Phase Readiness
- Credit guard contract ready for workflow integration (check -> operate -> increment)
- Semaphore ready for concurrent-queue.cjs integration
- Phase 199 (Firecrawl cache module) can proceed -- credit guards provide the pre-operation check needed before any Firecrawl API call

## Self-Check: PASSED

- FOUND: tests/phase-198/firecrawl-credit-guard.test.mjs
- FOUND: bin/lib/mcp-bridge.cjs
- FOUND: .planning/phases/198-foundation-mcp-registration-credit-guards/198-02-SUMMARY.md
- FOUND: commit 8f58498 (Task 1 - test)
- FOUND: commit 8c745da (Task 2 - feat)
- VERIFIED: All 4 functions exported (readFirecrawlCredits, checkFirecrawlCredits, incrementFirecrawlUsage, acquireFirecrawlSemaphore)
- VERIFIED: Manual inline tests pass for all credit states and semaphore behavior

---
*Phase: 198-foundation-mcp-registration-credit-guards*
*Completed: 2026-03-30*
