---
phase: 189-technical-debt-cleanup
plan: 02
subsystem: infra
tags: [eslint, eslint-plugin-n, static-analysis, cjs, lint]

requires:
  - phase: 186-test-infrastructure
    provides: clean test signal required before static analysis tooling is reliable

provides:
  - ESLint 10 flat config for all CJS source files (bin/, lib/, packages/)
  - Zero-error lint baseline with 144 catalogued no-unused-vars warnings
  - Documented exceptions file with warning categorization for future cleanup

affects: [future-code-changes, ci-pipeline, developer-workflow]

tech-stack:
  added: [eslint@10.1.0, "@eslint/js@10.0.1", eslint-plugin-n@17.24.0]
  patterns:
    - ESLint 10 flat config (eslint.config.mjs) with CJS sourceType and explicit Node 20 globals
    - Web API globals (fetch, Blob, FormData, etc.) declared for Node 18+ compatibility

key-files:
  created:
    - eslint.config.mjs
    - .planning/phases/189-technical-debt-cleanup/189-eslint-exceptions.md
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "ESLint 10 flat config (eslint.config.mjs) required — no .eslintrc support in ESLint 10"
  - "Web API globals (fetch, Blob, FormData, Headers, Request, Response, AbortController, TextEncoder, etc.) added to languageOptions.globals — these are Node 20 builtins, not suppressions"
  - "no-unused-vars set to warn (not error) — 144 warnings surfaced as future cleanup signal without blocking CI"
  - "Clean pass achieved with zero eslint-disable suppressions in any source file"

patterns-established:
  - "CJS ESLint config pattern: sourceType: commonjs with explicit Node.js + Web API globals"
  - "eslint-plugin-n for require() path validation in Node.js CJS codebase"

requirements-completed: [DEB-04]

duration: 3min
completed: 2026-03-30
---

# Phase 189 Plan 02: ESLint Setup Summary

**ESLint 10 flat config with eslint-plugin-n configured for 123 CJS files; zero errors on first clean pass after adding missing Node 20 Web API globals**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T09:07:21Z
- **Completed:** 2026-03-30T09:10:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Installed eslint@10.1.0, @eslint/js@10.0.1, eslint-plugin-n@17.24.0 as devDependencies
- Created `eslint.config.mjs` with CJS sourceType, Node.js globals, and Web API globals for Node 20
- Achieved `npx eslint bin lib packages --no-warn-ignored` exit 0 with 0 errors, 144 warnings
- Created `189-eslint-exceptions.md` documenting the clean pass and categorizing all 144 warnings for future cleanup

## Task Commits

1. **Task 1: Install ESLint devDependencies and create flat config** - `92b35d8` (chore)
2. **Task 2: Run ESLint, fix real errors, document exceptions** - `245f1d4` (chore)

## Files Created/Modified

- `eslint.config.mjs` - ESLint 10 flat config for all CJS source files
- `package.json` - Added eslint, @eslint/js, eslint-plugin-n devDependencies
- `package-lock.json` - Updated lockfile with 69 new packages
- `.planning/phases/189-technical-debt-cleanup/189-eslint-exceptions.md` - Documents clean pass and 144 warning categories

## Decisions Made

- Used ESLint 10 flat config format (`eslint.config.mjs`) — `.eslintrc.*` is removed in ESLint 10
- Added Web API globals (`fetch`, `Blob`, `FormData`, `Headers`, `Request`, `Response`, `AbortController`, `AbortSignal`, `TextEncoder`, `TextDecoder`, `ReadableStream`, `WritableStream`, `TransformStream`) — these are valid Node 20 builtins, not suppressions
- Set `no-unused-vars` to `warn` not `error` — 144 warnings catalogued as future cleanup signal; blocking CI on warnings would be counterproductive given the first-run volume

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added Node 20 Web API globals to ESLint config**
- **Found during:** Task 2 (first ESLint run)
- **Issue:** Plan's config template did not include `fetch`, `Blob`, `FormData` and other Web API globals available in Node 18+. First run produced 10 `no-undef` errors across 5 files.
- **Fix:** Added 13 Web API globals (`fetch`, `Blob`, `FormData`, `AbortController`, `AbortSignal`, `TextEncoder`, `TextDecoder`, `ReadableStream`, `WritableStream`, `TransformStream`, `Headers`, `Request`, `Response`) to `languageOptions.globals` in `eslint.config.mjs`.
- **Files modified:** `eslint.config.mjs`
- **Verification:** Re-run shows 0 errors after adding globals
- **Committed in:** `245f1d4` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical config)
**Impact on plan:** Necessary to achieve clean pass. Globals are correct Node 20 declarations, not rule suppressions. No scope creep.

## Issues Encountered

None beyond the missing globals addressed above.

## Next Phase Readiness

- ESLint baseline is established; future code changes in `bin/`, `lib/`, `packages/` can be validated against consistent lint rules
- 144 `no-unused-vars` warnings catalogued in `189-eslint-exceptions.md` as candidates for a future cleanup pass
- `n/no-missing-require` produced 0 errors — all `require()` calls resolve correctly
- Existing test suite: 100 files pass / 2 pre-existing failures (phase-134, phase-177) unrelated to this plan

---
*Phase: 189-technical-debt-cleanup*
*Completed: 2026-03-30*
