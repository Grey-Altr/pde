---
phase: 71-suggestion-engine
plan: 01
subsystem: idle-suggestions
tags: [cjs, node, suggestion-engine, ranking, tdd, tech-noir]

requires:
  - phase: 70-hook-integration-and-delivery-architecture
    provides: hook handler with placeholder block at lines 66-75, output file path pattern, event schema

provides:
  - bin/lib/idle-suggestions.cjs — phase-aware suggestion engine (generateSuggestions, rankSuggestions, classifyPhase)
  - hooks/tests/verify-phase-71.cjs — 17-test suite covering ENGN-01 through ENGN-06

affects:
  - 71-02 (hook handler integration — replaces placeholder with generateSuggestions call)
  - 72-suggestion-catalog (passes catalogPath to generateSuggestions)
  - 73-dashboard-pane (consumes suggestion markdown output)

tech-stack:
  added: []
  patterns:
    - "CATEGORY_PRIORITY with 0-based index: use !== undefined guard (0 is falsy in JS || operator)"
    - "3-file-read budget enforcement: STATE.md (1), ROADMAP.md (2), DESIGN-STATE.md OR manifest (3)"
    - "filePath on suggestion candidate rendered as // path suffix in output line"
    - "rankSuggestions returns blockChar on each shown item for test assertions without a separate lookup"

key-files:
  created:
    - bin/lib/idle-suggestions.cjs
    - hooks/tests/verify-phase-71.cjs
  modified: []

key-decisions:
  - "CATEGORY_PRIORITY blocker=0 sort fix: || 99 fails for 0 (falsy) — must use !== undefined ternary"
  - "filePath included in output line as '// {path}' suffix to satisfy ENGN-05 artifact visibility requirement"
  - "classifyPhase also exported (not just internal) to enable direct unit-test assertion without file fixtures"
  - "DESIGN-STATE.md detection is read 3 — if absent, falls through to readManifest (same slot)"

patterns-established:
  - "TDD RED commit before module exists: verifies tests actually fail, not just error out"
  - "Fixture directories via fs.mkdtempSync + fs.rmSync for hermetic unit tests"

requirements-completed: [ENGN-01, ENGN-02, ENGN-03, ENGN-04, ENGN-05, ENGN-06]

duration: 6min
completed: 2026-03-21
---

# Phase 71 Plan 01: Suggestion Engine Summary

**CJS suggestion engine with fixed-priority ranking, time-budget filtering, and tech-noir block-char output via TDD (17 tests, zero LLM calls, max 3 synchronous file reads)**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-21T06:38:11Z
- **Completed:** 2026-03-21T06:44:16Z
- **Tasks:** 1 (TDD: RED + GREEN + REFACTOR)
- **Files modified:** 2

## Accomplishments

- `bin/lib/idle-suggestions.cjs` built and passing all 17 tests — exports `generateSuggestions`, `rankSuggestions`, `classifyPhase`
- Full ENGN-01 through ENGN-06 coverage via fixture-based unit tests (no real STATE.md reads)
- Fixed a critical JS truthiness bug in CATEGORY_PRIORITY sort (`0 || 99` evaluates to 99, making blocker appear last instead of first)
- Engine returns formatted tech-noir markdown with all four category headers, block-char resumption encoding, 7-suggestion cap, and `cut:N` stats footer

## Task Commits

1. **Task 1 RED: test suite** - `3953df2` (test)
2. **Task 1 GREEN: engine module + test fixture fix** - `745794d` (feat)

## Files Created/Modified

- `/Users/greyaltaer/code/projects/Platform Development Engine/bin/lib/idle-suggestions.cjs` — phase-aware suggestion engine; exports `generateSuggestions`, `rankSuggestions`, `classifyPhase`; zero stdout, zero async, max 3 file reads
- `/Users/greyaltaer/code/projects/Platform Development Engine/hooks/tests/verify-phase-71.cjs` — 17-test manual runner covering all six ENGN requirements; uses `os.tmpdir()` fixture directories; follows Phase 70 PASS/FAIL pattern

## Decisions Made

- `CATEGORY_PRIORITY[x] !== undefined ? CATEGORY_PRIORITY[x] : 99` instead of `CATEGORY_PRIORITY[x] || 99` — zero is falsy in JavaScript so `blocker` (priority 0) was incorrectly treated as priority 99
- Artifact path rendered as `// {filePath}` suffix on the suggestion output line so ENGN-05 path visibility is satisfied without breaking format
- `classifyPhase` exported alongside `generateSuggestions` and `rankSuggestions` for direct unit-test assertions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CATEGORY_PRIORITY sort using falsy 0 with `|| 99`**
- **Found during:** Task 1 GREEN (first test run)
- **Issue:** `(CATEGORY_PRIORITY[a.category] || 99)` evaluates to 99 when category is 'blocker' (priority 0 is falsy), causing blockers to sort last instead of first
- **Fix:** Replaced `|| 99` with `!== undefined ? value : 99` ternary
- **Files modified:** bin/lib/idle-suggestions.cjs
- **Verification:** ENGN-03 tests pass; ranking confirmed via inline node debug
- **Committed in:** 745794d (Task 1 GREEN commit)

**2. [Rule 1 - Bug] Fixed ENGN-05 test fixture path: readManifest reads .planning/design/design-manifest.json**
- **Found during:** Task 1 GREEN (ENGN-05 failure)
- **Issue:** Test fixture wrote manifest to `tmpDir/design-manifest.json` but `readManifest(cwd)` reads from `cwd/.planning/design/design-manifest.json`
- **Fix:** Updated test fixture to create `.planning/design/` directory and write manifest there
- **Files modified:** hooks/tests/verify-phase-71.cjs
- **Verification:** ENGN-05 test passes with `wireframe.md` visible in output
- **Committed in:** 745794d (Task 1 GREEN commit)

**3. [Rule 2 - Missing Critical] Added filePath rendering in formatOutput**
- **Found during:** Task 1 GREEN (ENGN-05 output inspection)
- **Issue:** Plan specified artifact paths must appear in suggestions; formatOutput discarded filePath entirely
- **Fix:** Added `// {filePath}` suffix to suggestion output line when `s.filePath` is set
- **Files modified:** bin/lib/idle-suggestions.cjs
- **Verification:** ENGN-05 test asserts `output.includes('wireframe.md')` — passes
- **Committed in:** 745794d (Task 1 GREEN commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing critical)
**Impact on plan:** All three fixes required for correctness. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Engine module fully tested and ready for Plan 02 hook handler integration
- Plan 02 replaces the placeholder block in `hooks/idle-suggestions.cjs` lines 66-75 with `generateSuggestions({ cwd, event: lastMeaningful })` call
- `classifyPhase` is exported if Plan 02 tests need to assert classification directly

---
*Phase: 71-suggestion-engine*
*Completed: 2026-03-21*
