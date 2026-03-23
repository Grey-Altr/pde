---
phase: 93-designcoverage-clobber-audit-secondary-workflow-stubs
plan: 02
subsystem: workflow-integrity
tags: [designCoverage, clobber-audit, nyquist, mockup, ideate, business-stub, INTG-01, INTG-08]

# Dependency graph
requires:
  - phase: 93-01
    provides: 11-assertion Nyquist test scaffold, recommend.md + iterate.md 20-field fixes
  - phase: 84-foundation
    provides: 20-field designCoverage schema (hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit added)
provides:
  - mockup.md upgraded to 20-field designCoverage write with business stub
  - ideate.md upgraded to 20-field designCoverage write
  - All 11 Nyquist tests GREEN — INTG-01 and INTG-08 fully satisfied
affects:
  - deploy.md consumers — hasLaunchKit no longer clobbered by mockup/ideate runs
  - Phase 93 complete — all 4 regression workflows now write 20-field designCoverage

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "20-field designCoverage read-before-set pattern: coverage-check → parse all 20 fields → write full 20-field JSON with owned flag set to true"
    - "Business product type stub placed immediately after experience stub in same structural context"

key-files:
  created: []
  modified:
    - workflows/mockup.md
    - workflows/ideate.md

key-decisions:
  - "mockup.md uses generic {current} placeholders for all 4 new fields — consistent with existing convention in that file"
  - "ideate.md uses generic {current} placeholders for all 4 new fields — consistent with existing convention in that file"
  - "Business stub placed after experience stub in mockup.md (line ~156) — same structural location as recommend.md and iterate.md stubs"
  - "Anti-pattern example in mockup.md (line ~1483) deliberately left untouched — it is prose documentation, not a real write call"

patterns-established:
  - "Phase 93 stub format: <!-- Business product type — Phase 93 stub: [description]. [Future path]. Current behavior: proceed with [fallback] path as temporary fallback for business product type. NEVER [prohibited action]. -->"

requirements-completed: [INTG-01, INTG-08]

# Metrics
duration: 2min
completed: 2026-03-23
---

# Phase 93 Plan 02: designCoverage Clobber Audit — Mockup + Ideate Summary

**20-field designCoverage clobber regression fixed in mockup.md and ideate.md, completing the INTG-01 audit across all 4 regression workflows with all 11 Nyquist tests GREEN**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-23T02:28:25Z
- **Completed:** 2026-03-23T02:30:09Z
- **Tasks:** 2
- **Files modified:** 2 (mockup.md, ideate.md)

## Accomplishments

- Fixed mockup.md 16-field clobber regression: parse prose updated from 16 to 20 flags, write call expanded by 4 fields, IMPORTANT note updated to "ALWAYS write all 20 fields"
- Added Business product type Phase 93 stub to mockup.md immediately after the experience stub (line ~155)
- Fixed ideate.md 16-field clobber regression: parse prose updated from 16 to 20 flags, write call expanded by 4 fields, IMPORTANT note updated to "ALWAYS write all 20 fields"
- Anti-pattern example in mockup.md at line ~1483 deliberately left untouched — prose documentation, not a real write call
- All 11 Nyquist tests GREEN: recommend x3, iterate x3, mockup x3, ideate x2

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix mockup.md — 20-field write + business stub** - `77c84dc` (feat)
2. **Task 2: Fix ideate.md — 20-field write** - `2d9b1b4` (feat)

## Files Created/Modified

- `workflows/mockup.md` — parse prose updated from 16 to 20 flags; write call expanded to 20 fields with generic {current} placeholders; IMPORTANT note updated to "20-field"; Business product type Phase 93 stub added after experience stub; anti-pattern example untouched
- `workflows/ideate.md` — parse prose updated from 16 to 20 flags; write call expanded to 20 fields with generic {current} placeholders; IMPORTANT note updated to "20-field"

## Decisions Made

- mockup.md and ideate.md both use generic `{current}` placeholder naming for all 4 new fields — consistent with each file's pre-existing convention
- Business stub in mockup.md placed at line ~155 (immediately after experience stub) — same structural context as recommend.md and iterate.md stubs established in Plan 01
- Anti-pattern example line in mockup.md (`manifest-set-top-level designCoverage.hasMockup true`) is prose documentation showing what NOT to do — deliberately not modified

## Verification Results

```
# tests 11
# suites 7
# pass 11
# fail 0
```

Additional structural checks:
- `grep -rn "write all 16 fields" workflows/ | wc -l` → 0 (confirmed: no workflow still says 16)
- `grep -l "hasLaunchKit" workflows/recommend.md workflows/iterate.md workflows/mockup.md workflows/ideate.md | wc -l` → 4
- `grep -l "Business product type" workflows/recommend.md workflows/iterate.md workflows/mockup.md | wc -l` → 3

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 93 is complete — all 4 regression workflows (recommend, iterate, mockup, ideate) now write all 20 designCoverage fields
- INTG-01 and INTG-08 requirements fully satisfied
- All 3 secondary workflows (recommend, iterate, mockup) have business product type Phase 93 stub comments
- deploy.md gate ("Launch kit not yet assembled") will no longer fire incorrectly after any of the 4 patched workflows run

---
*Phase: 93-designcoverage-clobber-audit-secondary-workflow-stubs*
*Completed: 2026-03-23*

## Self-Check: PASSED

- FOUND: `workflows/mockup.md`
- FOUND: `workflows/ideate.md`
- FOUND: `.planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/93-02-SUMMARY.md`
- FOUND: commit 77c84dc (mockup.md fix)
- FOUND: commit 2d9b1b4 (ideate.md fix)
- 11/11 Nyquist tests GREEN (all 7 suites pass)
