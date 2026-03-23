---
phase: 107-nyquist-coverage
plan: 01
subsystem: testing
tags: [nyquist, experiment-infrastructure, circuit-breakers, boundary-enforcement, regression-tests]

requires:
  - phase: 106-observability-event-bus
    provides: experiment event infrastructure (OBS-01/02)
  - phase: 105-researcher-empirical-mode
    provides: empirical researcher mode (RSRCH-01/02/03)
  - phase: 104-self-improvement-presets
    provides: nyquist-metric.cjs, --self/--skill presets (SELF-01/02/03)
  - phase: 103-orchestrator-command-circuit-breakers
    provides: experiment-report.cjs circuit breakers, optimize.md orchestrator
  - phase: 102-mutation-agent-metric-evaluation
    provides: experiment-runner.cjs boundary/metric eval helpers
  - phase: 100-git-state-machine
    provides: experiment.cjs git state machine
  - phase: 99-safety-boundaries
    provides: experiment-boundaries.md, LOCKED/OPTIMIZABLE markers

provides:
  - 62 structural Nyquist tests for v0.13 experiment infrastructure (INTG-01..04)
  - Regression guard confirming all pre-existing tests unaffected by v0.13 additions
  - Helper scripts for _evalMetric contract testing (timeout/crash/unparseable/ok)

affects:
  - future experiment phases
  - v0.13 milestone completion

tech-stack:
  added: []
  patterns:
    - "fileURLToPath(new URL()) for ROOT path in test files (handles spaces in directory names)"
    - "Helper scripts in tests/phase-NNN/helpers/ for _evalMetric contract testing"

key-files:
  created:
    - tests/phase-107/experiment-infrastructure.test.mjs
    - tests/phase-107/helpers/metric-ok.js
    - tests/phase-107/helpers/metric-crash.js
    - tests/phase-107/helpers/metric-unparseable.js
    - tests/phase-107/helpers/metric-slow.js
  modified: []

key-decisions:
  - "fileURLToPath instead of URL.pathname for ROOT: spaces in project path encode as %20, breaking spawnSync cwd and fs.readFileSync"
  - "Helper scripts over node --eval inline for _evalMetric tests: spawnSync splits on whitespace; inline code with quotes/newlines is unparseable without shell:true"
  - "<!-- LOCKED: ... --> format confirmed (not <!-- LOCKED -->): markers carry descriptive labels, tests check prefix not exact match"
  - "8 pre-existing test failures confirmed out-of-scope: TOOL_MAP count, manifest fields, wiring fixes from phases 40-83 — not introduced by v0.13"

requirements-completed: [INTG-01, INTG-02, INTG-03, INTG-04]

duration: 11min
completed: 2026-03-23
---

# Phase 107 Plan 01: Nyquist Coverage Summary

**62 structural regression tests covering v0.13 experiment infrastructure: boundary enforcement, circuit breaker precision, branch isolation, metric contract, and zero regressions in all 1185 pre-existing passing tests**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-23T14:00:10Z
- **Completed:** 2026-03-23T14:11:44Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created 62 new Nyquist tests in `tests/phase-107/experiment-infrastructure.test.mjs` — all pass
- Covers INTG-01 (nyquist-metric.cjs exit-0 + parseable float contract), INTG-02 (boundary-violation commits discarded), INTG-03 (experiment commits isolated from main branch), and INTG-04 (circuit breaker precision at exact K/M boundaries, reset safety, metric timeout)
- Confirmed zero regressions: full test suite runs 1193 tests, 1185 pass — 8 failures are pre-existing from phases 40-83 and unrelated to v0.13

## Task Commits

1. **Task 1: Create phase-107 test directory and Nyquist tests** - `303518b` (feat)

## Files Created/Modified

- `tests/phase-107/experiment-infrastructure.test.mjs` - 62 structural assertions for INTG-01..04
- `tests/phase-107/helpers/metric-ok.js` - _evalMetric helper: exits 0, outputs 42.5
- `tests/phase-107/helpers/metric-crash.js` - _evalMetric helper: exits with code 1
- `tests/phase-107/helpers/metric-unparseable.js` - _evalMetric helper: outputs non-numeric string
- `tests/phase-107/helpers/metric-slow.js` - _evalMetric helper: sleeps 5s (for timeout test)
- `.planning/phases/107-nyquist-coverage/107-01-PLAN.md` - Plan file (created during execution)

## Decisions Made

- `fileURLToPath(new URL())` required for ROOT path: `new URL(...).pathname` returns URL-encoded path (`%20` for spaces), which breaks `fs.readFileSync` and `spawnSync cwd`
- Helper scripts in `tests/phase-107/helpers/` for `_evalMetric` tests: `spawnSync` in the runner splits command on whitespace without `shell:true`, so `node -e "..."` or `node --eval <code>` with embedded newlines fails; discrete `.js` files are the correct approach
- LOCKED/OPTIMIZABLE marker format confirmed as `<!-- LOCKED: ... -->` (not `<!-- LOCKED -->`): markers carry descriptive zone labels; tests check string prefix `<!-- LOCKED` to avoid format brittleness
- 8 pre-existing test failures logged as out-of-scope: TOOL_MAP entry count (phase 40), manifest field counts (phase 64), wiring fixes (phase 83), REQUIREMENTS.md artifact codes — none introduced by this plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ROOT path URL encoding causing fs/spawnSync failures**
- **Found during:** Task 1 (running tests for the first time)
- **Issue:** `new URL('../../', import.meta.url).pathname` produces URL-encoded path with `%20` for the space in `Platform Development Engine` — `fs.readFileSync` fails with ENOENT and `spawnSync` returns status null
- **Fix:** Changed to `fileURLToPath(new URL('../../', import.meta.url))` which decodes percent-encoding
- **Files modified:** `tests/phase-107/experiment-infrastructure.test.mjs`
- **Verification:** All production-file structural tests pass after fix
- **Committed in:** `303518b`

**2. [Rule 1 - Bug] `node --eval` inline code failing in _evalMetric tests**
- **Found during:** Task 1 (CRASH results for all _evalMetric test cases)
- **Issue:** `spawnSync` splits on whitespace to produce `[cmd, ...args]`, so `node --eval setTimeout(...)` passes `setTimeout(...)` as single unquoted arg; embedded `\n` from heredoc was stripped, causing syntax errors
- **Fix:** Created discrete helper scripts in `tests/phase-107/helpers/` that encode each test case as a proper `.js` file
- **Files modified:** `tests/phase-107/helpers/metric-{ok,crash,unparseable,slow}.js`
- **Verification:** All four _evalMetric contract tests pass (timeout/nonzero_exit/unparseable_metric/ok)
- **Committed in:** `303518b`

**3. [Rule 1 - Bug] `<!-- LOCKED -->` format incorrect — actual format is `<!-- LOCKED: ... -->`**
- **Found during:** Task 1 (LOCKED/OPTIMIZABLE marker tests failing)
- **Issue:** Tests expected exact `<!-- LOCKED -->` but workflow files use descriptive `<!-- LOCKED: zone description -->` format
- **Fix:** Changed assertions to check `content.includes('<!-- LOCKED')` prefix match
- **Files modified:** `tests/phase-107/experiment-infrastructure.test.mjs`
- **Verification:** All 14 workflow marker tests pass
- **Committed in:** `303518b`

---

**Total deviations:** 3 auto-fixed (3 Rule 1 bugs)
**Impact on plan:** All fixes necessary for tests to work correctly. No scope creep — same test coverage as planned.

## Issues Encountered

None beyond the deviations documented above.

## Next Phase Readiness

- Phase 107 complete — v0.13 AutoResearch milestone fully tested
- All INTG-01..04 requirements satisfied
- Zero regressions: 1185 pre-existing tests still passing
- v0.13 milestone ship criteria met: 62 new Nyquist assertions + zero regressions

---
*Phase: 107-nyquist-coverage*
*Completed: 2026-03-23*
