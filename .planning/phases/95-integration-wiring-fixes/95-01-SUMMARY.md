---
phase: 95-integration-wiring-fixes
plan: "01"
subsystem: workflow-integration
one-liner: "Closed 6 requirement gaps: OTR/BTH glob fixes, 21-field designCoverage with hasDeployStaging, handoff required_reading with 4 business refs"
tags: [integration-wiring, designCoverage, glob-fix, regression-tests]
dependency-graph:
  requires: [phase-92, phase-91, phase-89, phase-84]
  provides: [BRIEF-03, KIT-01, KIT-03, DEPLOY-04, DEPLOY-06, DEPLOY-09]
  affects: [workflows/deploy.md, workflows/handoff.md, workflows/wireframe.md, workflows/critique.md, templates/design-manifest.json, all 9 coverage-writing workflows]
tech-stack:
  added: []
  patterns: [read-merge-write coverage pattern, 21-field designCoverage canonical order, required_reading business references]
key-files:
  created: []
  modified:
    - workflows/deploy.md
    - workflows/handoff.md
    - workflows/wireframe.md
    - workflows/critique.md
    - workflows/brief.md
    - workflows/competitive.md
    - workflows/opportunity.md
    - workflows/flows.md
    - workflows/hig.md
    - workflows/system.md
    - templates/design-manifest.json
    - .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs
decisions:
  - OTR artifact filename is OTR-outreach-sequences-v*.md (matches handoff.md producer output in Phase 91)
  - BTH artifact filename is BTH-thesis-v*.md (matches brief.md producer output in Phase 85)
  - hasDeployStaging is the 21st field, appended after hasLaunchKit in canonical field order
  - deploy.md owns hasDeployStaging:true write; all 9 other workflows pass-through {current}
  - Coverage write in deploy.md is gated inside $DEPLOY_EXIT == 0 success path (after Gate 4)
  - handoff.md required_reading grows from 4 to 8 entries to include all 4 business reference files
metrics:
  duration: ~25 minutes
  completed: "2026-03-23"
  tasks: 3
  files_modified: 12
---

# Phase 95 Plan 01: Integration Wiring Fixes Summary

Closed all 6 requirement gaps from the v0.12 milestone audit: fixed OTR and BTH glob mismatches in 4 workflow files, added hasDeployStaging as the 21st designCoverage field across manifest template + deploy.md owner write + 9 pass-through workflows, and expanded handoff.md required_reading with 4 missing business reference files. Regression suite updated: TWENTY_ONE_FIELDS, deploy.md added to coverage writers, 10 new Phase 95 assertions — all 46 tests GREEN.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix OTR glob, BTH globs, handoff required_reading, deploy.md BTH comment | a18e380 | deploy.md, handoff.md, wireframe.md, critique.md |
| 2 | Add hasDeployStaging as 21st designCoverage field across all writers | e038559 | design-manifest.json, deploy.md, brief.md, competitive.md, opportunity.md, flows.md, wireframe.md, critique.md, hig.md, handoff.md, system.md |
| 3 | Update regression test — TWENTY_ONE_FIELDS, deploy.md writer, Phase 95 assertions | e437d9a | test-regression-matrix.cjs |

## What Was Fixed

### Fix 1: OTR Glob Mismatch in deploy.md

**Requirement:** DEPLOY-04 — deploy.md preflight finds OTR artifact when handoff.md has written OTR-outreach-sequences-v*.md

**Before:** `OTR_FILE=$(ls .planning/design/launch/OTR-outreach-v*.md 2>/dev/null ...)`
**After:** `OTR_FILE=$(ls .planning/design/launch/OTR-outreach-sequences-v*.md 2>/dev/null ...)`

Also fixed the error message text from `OTR-outreach-v{N}.md` to `OTR-outreach-sequences-v{N}.md`.

### Fix 2: BTH Glob Mismatch in 4 Consumer Workflows

**Requirement:** KIT-01, KIT-03 — consumer workflows find BTH artifact when brief.md has written BTH-thesis-v*.md

Four files had the wrong glob pattern `BTH-business-thesis-v*.md`:
- `workflows/handoff.md` line 594: Glob instruction
- `workflows/wireframe.md` line 624: ls command in DPD funding detection
- `workflows/critique.md` line 812: artifact doc string
- `workflows/deploy.md` line 419: scaffold comment

All changed to `BTH-thesis-v*.md` matching brief.md's actual output filename.

### Fix 3: hasDeployStaging as 21st designCoverage Field

**Requirement:** DEPLOY-06, DEPLOY-09 — build.md Stage 14 shows complete after deploy.md Gate 4 succeeds

- `templates/design-manifest.json`: Added `"hasDeployStaging": false` as 21st field after `"hasLaunchKit": false`
- `workflows/deploy.md`: Added full 21-field coverage write in the `$DEPLOY_EXIT == 0` success path (between Store DEPLOY_URL and Step 5/6), with `hasDeployStaging` hardcoded to `true`
- 9 pass-through workflows: All coverage write calls updated with `"hasDeployStaging":{current}` as the 21st field

Coverage write counts by workflow:
- brief.md: 1 variant (ACTUAL placeholders)
- competitive.md: 1 variant ({current} placeholders)
- opportunity.md: 1 variant ({current} placeholders)
- flows.md: 1 variant ({current} placeholders)
- wireframe.md: 3 variants (standard/stitch/experience)
- critique.md: 1 variant ({current} placeholders)
- hig.md: 1 variant ({current} placeholders)
- handoff.md: 4 variants (experience/hybrid-event/non-experience-non-business/business)
- system.md: 1 variant ({current} placeholders)

### Fix 4: handoff.md required_reading Additions

**Requirement:** BRIEF-03 — handoff.md pre-loads all 4 business reference files

Added 4 entries to `<required_reading>` block (was 4, now 8):
```
@references/business-track.md
@references/launch-frameworks.md
@references/business-financial-disclaimer.md
@references/business-legal-disclaimer.md
```

## Regression Test Updates

**File:** `.planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs`

Changes:
- Renamed `TWENTY_FIELDS` → `TWENTY_ONE_FIELDS`, added `'hasDeployStaging'` as 21st element
- Updated `INTG-07` describe/it titles from "20" to "21 designCoverage fields"
- Added `'deploy.md'` to `V012_COVERAGE_WRITERS` array (9 → 10 writers)
- Added `describe('Phase 95: integration wiring fixes verified')` block with 10 new assertions

**Final results:** 46 tests, 46 pass, 0 fail (was 35 tests before Phase 95)

## Deviations from Plan

None — plan executed exactly as written.

Note: The worktree (agent-af6f20dc) was at Phase 89 state and lacked deploy.md and Phase 90-94 workflow updates. Files were synced from the main branch before applying Phase 95 fixes, which is expected behavior for a parallel agent worktree executing a phase that depends on upstream phase work.

## Verification

```
BTH-business-thesis in workflows/: 0 occurrences (grep exit 1)
OTR-outreach-v* (without sequences) in workflows/: 0 occurrences
hasDeployStaging in manifest: 1 match (false default)
hasDeployStaging in deploy.md: 3 matches (coverage write + context)
hasDeployStaging in all 9 pass-through workflows: present in all
business-track.md in handoff.md required_reading: 1 match
Test suite: 46/46 GREEN
```

## Self-Check: PASSED

- [x] workflows/deploy.md modified (OTR glob, BTH comment, hasDeployStaging write)
- [x] workflows/handoff.md modified (BTH glob, required_reading, hasDeployStaging pass-through)
- [x] workflows/wireframe.md modified (BTH glob, 3x hasDeployStaging pass-through)
- [x] workflows/critique.md modified (BTH ref, hasDeployStaging pass-through)
- [x] templates/design-manifest.json modified (21st field)
- [x] 5 other workflows modified (brief, competitive, opportunity, flows, hig, system)
- [x] test-regression-matrix.cjs updated (TWENTY_ONE_FIELDS, 10 new assertions)
- [x] Commits: a18e380, e038559, e437d9a
- [x] Regression suite: 46/46 GREEN
