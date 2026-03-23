---
phase: 93-designcoverage-clobber-audit-secondary-workflow-stubs
plan: 01
subsystem: workflow-integrity
tags: [designCoverage, clobber-audit, nyquist, recommend, iterate, business-stub, INTG-01, INTG-08]

# Dependency graph
requires:
  - phase: 84-foundation
    provides: 20-field designCoverage schema (hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit added)
  - phase: 89-wireframe-stage-launch-artifacts
    provides: hasLaunchKit flag written by handoff.md — this plan prevents recommend/iterate from clobbering it
provides:
  - 11-assertion Nyquist test scaffold covering INTG-01 (4 workflows) and INTG-08 (3 stubs)
  - recommend.md upgraded to 20-field designCoverage write with per-field {current_hasFieldName} placeholders
  - iterate.md upgraded to 20-field designCoverage write with generic {current} placeholders
  - Business product type Phase 93 stub comments in recommend.md and iterate.md
affects:
  - 93-02 (mockup.md + ideate.md fixes — same test file, 5 remaining RED assertions)
  - deploy.md consumers — hasLaunchKit no longer clobbered by recommend/iterate runs

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "20-field designCoverage read-before-set pattern: coverage-check → parse all 20 fields → write full 20-field JSON with owned flag set to true"
    - "Business product type stub placed immediately after experience stub in same structural context"
    - "INTG-08 per-file presence assertion (not global count equality) — build.md 7-vs-0 gap is architectural"

key-files:
  created:
    - .planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs
  modified:
    - workflows/recommend.md
    - workflows/iterate.md

key-decisions:
  - "INTG-08 implemented as per-file presence checks, not global businessMode/businessTrack count equality — build.md's 7-vs-0 gap is intentional (orchestrator gates Stage 14 on BM but never branches on track)"
  - "recommend.md uses per-field placeholder names ({current_hasBusinessThesis}) consistent with existing {current_hasFieldName} convention in that file"
  - "iterate.md uses generic {current} placeholder for all 4 new fields, consistent with existing convention in that file"

patterns-established:
  - "Phase 93 stub format: <!-- Business product type — Phase 93 stub: [description]. [Future path]. Current behavior: proceed with [fallback] path as temporary fallback for business product type. -->"

requirements-completed: [INTG-01, INTG-08]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 93 Plan 01: designCoverage Clobber Audit — Recommend + Iterate Summary

**20-field designCoverage clobber regression fixed in recommend.md and iterate.md, preventing hasLaunchKit destruction when /pde:recommend or /pde:iterate runs after business-mode handoff**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-23T02:20:19Z
- **Completed:** 2026-03-23T02:23:31Z
- **Tasks:** 3
- **Files modified:** 3 (test file created, 2 workflows patched)

## Accomplishments

- Created 11-assertion Nyquist test scaffold (test-clobber-audit.cjs) covering INTG-01 (4 workflows x 2 assertions) and INTG-08 (3 stubs x 1 assertion)
- Fixed recommend.md 16-field clobber regression: expanded parsing table by 4 rows, write call by 4 fields, IMPORTANT note updated to "20-field JSON object"
- Fixed iterate.md 16-field clobber regression: prose updated from "ALL sixteen" to "ALL twenty", write call expanded to 20 fields
- Added Business product type Phase 93 stub comments to both recommend.md and iterate.md immediately after their experience stubs
- 6 of 11 Nyquist tests GREEN (recommend x3, iterate x3); 5 remaining (mockup x3, ideate x2) deferred to Plan 02

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Nyquist test scaffold for INTG-01 and INTG-08** - `c97474b` (test)
2. **Task 2: Fix recommend.md — 20-field write + business stub** - `7349955` (feat)
3. **Task 3: Fix iterate.md — 20-field write + business stub** - `f98a261` (feat)

## Files Created/Modified

- `.planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs` — 11-assertion Nyquist test scaffold: INTG-01 (4 workflows × 2 assertions) + INTG-08 (3 business stubs × 1 assertion); all RED before fixes, 6 GREEN after Plan 01
- `workflows/recommend.md` — parsing table expanded from 16 to 20 rows; write call expanded to 20 fields with per-field {current_hasFieldName} placeholders; IMPORTANT note updated to "20-field JSON object"; Business product type Phase 93 stub added after experience stub
- `workflows/iterate.md` — prose updated from "ALL sixteen" to "ALL twenty" (4 new field names in list); write call expanded from 16 to 20 fields; Business product type Phase 93 stub added after experience stub

## Decisions Made

- INTG-08 tests use per-file string presence (`content.includes('<!-- Business product type — Phase 93 stub')`) rather than global grep count equality. The literal count test (60 businessMode vs 40 businessTrack across all workflows/) cannot pass because build.md has 7 businessMode refs with 0 businessTrack refs by design — the orchestrator gates Stage 14 on businessMode but never branches on businessTrack.
- recommend.md 4 new fields use `{current_hasBusinessThesis}` etc. (per-field naming) to match existing convention in that file. iterate.md uses `{current}` (generic) to match its existing convention. Test only checks for field name presence, not placeholder variable names.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- The PostToolUse validation hook flagged CJS module imports in test-clobber-audit.cjs as "workflow sandbox errors". This is a false positive — `.cjs` files are CommonJS Node.js test scripts, not PDE workflow files. The established Phase 87 precedent (test-flows-sbp.cjs) uses the identical CJS import pattern without issue. File is correct as written.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 02 can fix mockup.md and ideate.md using the same test file (5 remaining RED assertions)
- recommend.md and iterate.md are now safe to run after business-mode handoff — hasLaunchKit preserved
- deploy.md gate ("Launch kit not yet assembled") will no longer fire incorrectly after recommend/iterate runs

---
*Phase: 93-designcoverage-clobber-audit-secondary-workflow-stubs*
*Completed: 2026-03-23*

## Self-Check: PASSED

- FOUND: `.planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs`
- FOUND: commit c97474b (test scaffold)
- FOUND: commit 7349955 (recommend.md fix)
- FOUND: commit f98a261 (iterate.md fix)
- 6/11 Nyquist tests GREEN (recommend x3, iterate x3) — matches expected plan outcome
