---
phase: 96-21-field-cascade-fix
plan: 01
subsystem: designCoverage schema + workflow cascade
tags: [designCoverage, 21-field, hasDeployStaging, FOUND-02, INTG-01, test-fix, cascade-fix]
dependency_graph:
  requires:
    - Phase 92 deploy.md (owns hasDeployStaging:true write)
    - Phase 95 (added 21st field to manifest + 9 primary workflows)
    - Phase 93 (clobber audit test infrastructure)
    - Phase 94 (Nyquist regression matrix)
  provides:
    - FOUND-02 test asserting exactly 21 designCoverage fields
    - 4 secondary workflows with hasDeployStaging pass-through
    - test-clobber-audit.cjs with TWENTY_ONE_FIELDS constant
  affects:
    - Full Nyquist suite (19/19 + 11/11 + 46/46 = 76 tests green)
    - build --from recommend/ideate/iterate/mockup cascade safety
tech_stack:
  added: []
  patterns:
    - hasDeployStaging pass-through: all secondary workflows use {current}/{current_hasDeployStaging}, never :true
    - TWENTY_ONE_FIELDS constant replaces TWENTY_FIELDS in clobber audit test
key_files:
  modified:
    - .planning/phases/84-foundation/tests/test-foundation.cjs (FOUND-02 assertion 20→21)
    - workflows/recommend.md (table row + 21-field JSON blob + prose)
    - workflows/ideate.md (field list + 21-field JSON blob + prose)
    - workflows/iterate.md (field list + 21-field JSON blob + prose)
    - workflows/mockup.md (field list + 21-field JSON blob + prose)
    - .planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs (TWENTY_ONE_FIELDS)
decisions:
  - hasDeployStaging is always {current}/{current_hasDeployStaging} in secondary workflows — only deploy.md writes :true
  - TWENTY_ONE_FIELDS constant name in clobber audit test mirrors the count semantics explicitly
metrics:
  duration: ~8 minutes
  completed: 2026-03-23
  tasks_completed: 2
  files_modified: 6
  commits: 2
one_liner: "21-field designCoverage cascade fix: FOUND-02 test updated 20→21, hasDeployStaging pass-through added to recommend/ideate/iterate/mockup, clobber audit renamed to TWENTY_ONE_FIELDS — 76 tests green"
---

# Phase 96 Plan 01: 21-Field Cascade Fix Summary

## What Was Done

Fixed the last 2 open v0.12 requirement gaps by propagating the 21st designCoverage field (`hasDeployStaging`) through the 4 secondary workflow files and updating the FOUND-02 test assertion from 20 to 21 fields.

**Root cause:** Phase 95 added `hasDeployStaging` as the 21st field to `templates/design-manifest.json` and 9 primary/medium workflows (brief, competitive, opportunity, flows, system, wireframe, critique, handoff, deploy). Four secondary workflows (recommend, ideate, iterate, mockup) and the FOUND-02 test assertion were not updated, leaving a clobber vector: running `build --from recommend` after deploy would silently drop `hasDeployStaging` from the manifest.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix FOUND-02 test assertion — 20 to 21 fields | f9b205d | test-foundation.cjs |
| 2 | Add hasDeployStaging to 4 secondary workflows + clobber audit | cc24e48 | recommend.md, ideate.md, iterate.md, mockup.md, test-clobber-audit.cjs |

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| test-foundation.cjs (FOUND-02) | 19/19 | PASS |
| test-clobber-audit.cjs (INTG-01) | 11/11 | PASS |
| test-regression-matrix.cjs (INTG-07) | 46/46 | PASS |

## Deviations from Plan

None — plan executed exactly as written.

## Key Changes Per File

**test-foundation.cjs:**
- File header comment: `20 designCoverage fields (16 existing + 4 new)` → `21 designCoverage fields (16 existing + 5 new)`
- Describe title: `FOUND-02: 20 designCoverage fields` → `FOUND-02: 21 designCoverage fields`
- `NEW_4` → `NEW_5` with `hasDeployStaging` as 5th element
- All `for (const field of NEW_4)` → `NEW_5`
- `all 4 new designCoverage field names` → `all 5 new designCoverage field names`
- `4 new fields appear AFTER hasProductionBible` → `5 new fields appear AFTER hasProductionBible`
- Count assertion: `20` → `21` with updated error message

**recommend.md:**
- Added `| hasDeployStaging | false |` row to coverage table
- JSON blob: appended `,"hasDeployStaging":{current_hasDeployStaging}` before closing `}'`
- Prose: `20-field JSON` → `21-field JSON` (2 occurrences)

**ideate.md:**
- `Extract all 20 flags` → `Extract all 21 flags`
- Canonical order list: appended `, hasDeployStaging`
- JSON blob: appended `,"hasDeployStaging":{current}` before closing `}'`
- IMPORTANT note: `ALWAYS write all 20 fields` → `ALWAYS write all 21 fields`, canonical list updated

**iterate.md:**
- `ALL twenty current flag values` → `ALL twenty-one current flag values`, list updated
- `preserving all other nineteen values` → `twenty values`
- `full merged twenty-field object` → `twenty-one-field object`
- JSON blob: appended `,"hasDeployStaging":{current}` before closing `}'`

**mockup.md:**
- `Extract all 20 flags` → `Extract all 21 flags`
- Field list: appended `, hasDeployStaging`
- JSON blob: appended `,"hasDeployStaging":{current}` before closing `}'`
- IMPORTANT note: `ALWAYS write all 20 fields` → `ALWAYS write all 21 fields`, canonical list updated

**test-clobber-audit.cjs:**
- File header: `write 20 designCoverage fields` → `write 21 designCoverage fields`
- `TWENTY_FIELDS` → `TWENTY_ONE_FIELDS` (constant name + all references)
- Added `'hasDeployStaging'` as 21st element
- All describe/it text updated from `20` to `21` field counts

## Self-Check: PASSED

Files verified present:
- `.planning/phases/84-foundation/tests/test-foundation.cjs` — FOUND
- `workflows/recommend.md` — FOUND (2 hasDeployStaging hits)
- `workflows/ideate.md` — FOUND (3 hasDeployStaging hits)
- `workflows/iterate.md` — FOUND (2 hasDeployStaging hits)
- `workflows/mockup.md` — FOUND (3 hasDeployStaging hits)
- `.planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs` — FOUND

Commits verified:
- f9b205d — FOUND
- cc24e48 — FOUND
