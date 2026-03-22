---
phase: 87-flows-stage
plan: 01
subsystem: workflow
tags: [flows, service-blueprint, gtm, mermaid, business-mode, sequence-diagram, designCoverage]

# Dependency graph
requires:
  - phase: 84-business-mode-foundation
    provides: businessMode/businessTrack manifest fields, business-financial-disclaimer.md, business-track.md, launch-frameworks.md, 20-field designCoverage schema
  - phase: 85-brief-stage
    provides: businessMode detection pattern for workflow skills
  - phase: 86-competitive-opportunity-extensions
    provides: MLS artifact pattern (manifest registration, 20-field coverage write, track branching pattern)
provides:
  - flows.md extended with business mode detection (Steps 4f/4g/5-BIZ)
  - 5-lane SBP service blueprint generation via Mermaid sequenceDiagram
  - GTM channel flow generation via Mermaid flowchart LR with ACQ/CONV/RET subgraphs
  - Track depth branching for solo_founder, startup_team, product_leader
  - SBP/GTM artifact writes to strategy/ domain with 7-call manifest registration each
  - 20-field designCoverage write (upgraded from 16 fields)
  - Nyquist test scaffold with 10 structural assertions for OPS-01 through OPS-04
affects:
  - 87-02 (Plan 02 picks up where 01 ends — OPS-03 20-field coverage now also complete)
  - 88-onwards workflows that read flows.md
  - /pde:flows runtime (agents following flows.md now generate SBP/GTM when businessMode==true)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Business mode detection at Step 4 top with $BM/$BT cache — same as competitive.md pattern"
    - "SBP uses Mermaid sequenceDiagram with Note over C,E: for line of visibility spanning all 5 participants"
    - "GTM uses flowchart LR with self-contained subgraphs (ACQ/CONV/RET) — no cross-subgraph node links"
    - "20-field designCoverage pass-through-all write — read current first, merge new flags, write all 20"
    - "SBP_CONTENT_GENERATED / GTM_CONTENT_GENERATED flags gate artifact writes (Step 5-BIZ)"
    - "Post-write dollar-amount verification guard (grep -qE '\\$[0-9]') on SBP artifact"

key-files:
  created:
    - .planning/phases/87-flows-stage/tests/test-flows-sbp.cjs
  modified:
    - workflows/flows.md

key-decisions:
  - "Steps 4f/4g inserted as sub-steps of Step 4 — step count stays at 7, consistent with Phase 85 and Phase 86 patterns"
  - "Step 5-BIZ inserted between Step 5/7 display line and Step 5-EXP — preserves experience-only section position"
  - "20-field designCoverage write upgraded inline in Plan 01 (not deferred to Plan 02) — OPS-03 fully covered now"
  - "SBP domain is strategy/ (not ux/) — service blueprints are business artifacts, not UX artifacts"
  - "GTM depends on SBP (GTM_CONTENT_GENERATED gated on SBP_CONTENT_GENERATED) — enforces artifact dependency chain"

patterns-established:
  - "Business artifact writes go to strategy/ domain, not ux/ — consistent with BTH, MLS, OPP"
  - "Track depth uses IF/ELSE chain (solo_founder -> startup_team -> product_leader) within each generation step"
  - "All financial content in SBP/GTM uses [YOUR_X] placeholders from business-financial-disclaimer.md"

requirements-completed: [OPS-01, OPS-03, OPS-04]

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 87 Plan 01: Flows Stage Summary

**5-lane SBP service blueprint and GTM channel flow generation added to flows.md with businessMode detection, track depth branching, strategy/ artifact writes, and 20-field designCoverage upgrade — all 10 Nyquist tests pass**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T16:35:15Z
- **Completed:** 2026-03-22T16:38:26Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created Nyquist test scaffold (`test-flows-sbp.cjs`) with 10 structural assertions covering OPS-01 through OPS-04 — confirmed RED state (9/10 failing) before implementation
- Added `manifest-get-top-level businessMode/businessTrack` detection at top of Step 4 with `$BM`/`$BT` cache
- Added Step 4f: 5-lane SBP service blueprint generation using canonical `sequenceDiagram` with `participant C as Customer Actions` through `participant E as Physical Evidence`, `Note over C,E:` line-of-visibility spanning, and solo/startup/leader track depth branching
- Added Step 4g: GTM channel flow generation using `flowchart LR` with `subgraph ACQ/CONV/RET` and track-specific channel counts
- Added Step 5-BIZ: SBP/GTM artifact writes to `strategy/` domain, 7-call manifest registration each, dollar-amount post-write verification guard
- Upgraded `designCoverage` write from 16 to 20 fields (adds `hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`, `hasLaunchKit`)
- Extended `<required_reading>` block with `business-track.md`, `business-financial-disclaimer.md`, `launch-frameworks.md` (5 entries total)
- All 10 Nyquist tests pass GREEN after implementation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Nyquist test scaffold** - `b4661ae` (test)
2. **Task 2: Add business mode detection, SBP generation, artifact write, required_reading** - `41dc94f` (feat)

## Files Created/Modified

- `.planning/phases/87-flows-stage/tests/test-flows-sbp.cjs` — 10 structural assertions covering OPS-01 through OPS-04 (RED before, GREEN after)
- `workflows/flows.md` — 231 lines added: required_reading (3 new entries), Step 4 businessMode detection block, Step 4f SBP generation, Step 4g GTM generation, Step 5-BIZ artifact writes, 20-field designCoverage upgrade

## Decisions Made

- Steps 4f/4g inserted as sub-steps of Step 4, Step 5-BIZ as sub-step of Step 5 — keeps step count at 7, consistent with Phase 85 (Steps 5b/5c) and Phase 86 (Steps 4i/4j) patterns
- 20-field designCoverage write upgraded inline in Plan 01 rather than deferring to Plan 02 — OPS-03 is now fully satisfied, reducing Plan 02 scope to GTM-specific items only
- SBP artifact written to `strategy/` domain (not `ux/`) — service blueprints are business strategy artifacts, not UX artifacts
- GTM generation gated on `SBP_CONTENT_GENERATED == true` — enforces artifact dependency chain (GTM depends on SBP)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Upgraded 20-field designCoverage in Plan 01 (not Plan 02)**
- **Found during:** Task 2 (flows.md modification)
- **Issue:** The plan suggested OPS-03 20-field coverage test "may still fail until Plan 02" but the 16-field write was a pre-existing regression — all other skills (competitive.md, brief.md, opportunity.md) already use 20-field writes. Leaving flows.md at 16 fields would be a correctness regression.
- **Fix:** Upgraded the designCoverage write from 16 to 20 fields in Task 2, adding hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit
- **Files modified:** workflows/flows.md
- **Verification:** OPS-03 tests pass (10/10 total)
- **Committed in:** `41dc94f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical correctness)
**Impact on plan:** Made Plan 02 scope cleaner — OPS-03 complete, Plan 02 focuses on remaining OPS-02 GTM-specific items if any remain.

## Issues Encountered

None — plan executed cleanly. All 10 Nyquist tests pass after Task 2.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- OPS-01, OPS-03, OPS-04 fully satisfied; OPS-02 GTM-channel-flow also included (all 10 tests pass)
- Plan 02 should verify remaining items (if any) and may have reduced scope since 20-field coverage was completed in Plan 01
- `/pde:flows` workflow is now business-mode capable: runs SBP and GTM generation when `businessMode == true`

---
*Phase: 87-flows-stage*
*Completed: 2026-03-22*
