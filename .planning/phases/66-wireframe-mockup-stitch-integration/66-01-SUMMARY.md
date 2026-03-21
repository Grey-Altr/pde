---
phase: 66-wireframe-mockup-stitch-integration
plan: 01
subsystem: ui
tags: [stitch, mcp, wireframe, consent, annotation, quota, workflow]

# Dependency graph
requires:
  - phase: 65-mcp-bridge-quota-infrastructure
    provides: checkStitchQuota/incrementStitchQuota functions, TOOL_MAP stitch entries, APPROVED_SERVERS.stitch
  - phase: 64-design-coverage-migration
    provides: hasStitchWireframes field in 14-field designCoverage schema

provides:
  - "--use-stitch flag on /pde:wireframe routes generation through Google Stitch MCP"
  - "Stitch probe in Step 3 with TOOL_MAP_VERIFY_REQUIRED warning and 10-second timeout"
  - "4-STITCH pipeline: quota pre-flight, batch outbound consent, per-screen generate-fetch-annotate-consent-persist"
  - "STH-{slug}.html and STH-{slug}.png artifacts in .planning/design/ux/wireframes/"
  - "Per-screen manifest registration with source:stitch and stitch_annotated:true"
  - "Fallback to Claude HTML/CSS on quota exhaustion, MCP unavailable, or Stitch error"
  - "hasStitchWireframes:true set in designCoverage when STH artifacts persisted"

affects:
  - phase-67-stitch-ideation
  - phase-68-stitch-critique
  - phase-69-stitch-handoff

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ESM createRequire wrapper for CJS mcp-bridge.cjs in workflow bash blocks (node --input-type=module)"
    - "4-STITCH pipeline branch: quota → outbound consent → generate → fetch → annotate → inbound consent → persist → manifest"
    - "Batch outbound consent (CONSENT-04): single AskUserQuestion for all screens before generation starts"
    - "Inbound consent per-screen (CONSENT-02): after annotation injection, before Write tool"
    - "Annotation injection immediately after fetch (EFF-05): regex on 5 semantic HTML tags"
    - "FALLBACK_SCREENS list: per-screen failure tracked, batch falls through to Claude generation"

key-files:
  created: []
  modified:
    - workflows/wireframe.md

key-decisions:
  - "ESM createRequire pattern required for all mcp-bridge.cjs calls in workflow files — project validator rejects inline require() in bash blocks"
  - "Stitch probe warning (TOOL_MAP_VERIFY_REQUIRED) is non-blocking — workflow continues with unverified tool names and warns user to run /pde:connect stitch --confirm"
  - "stitch:list-screens mentioned only as prohibition ('Do NOT call') — not used anywhere in the pipeline, preserving list_screens state-sync bug avoidance"
  - "hasStitchWireframes set via dual manifest-set-top-level call pattern: standard run uses {current} placeholder, --use-stitch run sets true explicitly"

patterns-established:
  - "Pattern: workflow Node.js code uses node --input-type=module + createRequire(import.meta.url) to load CJS modules"
  - "Pattern: consent gates fire in order — outbound AskUserQuestion before any MCP tool call, inbound AskUserQuestion before any Write tool call"
  - "Pattern: 4-STITCH-D collects FALLBACK_SCREENS after per-screen loop and routes them to Claude generation path"

requirements-completed: [WFR-01, WFR-02, WFR-03, WFR-04, WFR-06, CONSENT-01, CONSENT-02, CONSENT-03, CONSENT-04, EFF-01, EFF-02, EFF-04, EFF-05]

# Metrics
duration: 5min
completed: 2026-03-21
---

# Phase 66 Plan 01: Wireframe Stitch Integration Summary

**--use-stitch flag on /pde:wireframe with consent-gated generate-fetch-annotate pipeline, 10-second fallback, and manifest registration with source:stitch and stitch_annotated:true**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-21T00:26:29Z
- **Completed:** 2026-03-21T00:31:37Z
- **Tasks:** 2
- **Files modified:** 1 (workflows/wireframe.md)

## Accomplishments

- Added `--use-stitch` to wireframe.md flags table, Step 2g parsing, and Step 3 Stitch MCP probe with TOOL_MAP_VERIFY_REQUIRED warning
- Added complete 4-STITCH pipeline: quota pre-flight (4-STITCH-A), batch outbound consent (4-STITCH-B), per-screen loop with generate/fetch/annotate/inbound-consent/persist (4-STITCH-C), fallback handler (4-STITCH-D)
- Updated Steps 6-7 for STH artifact tracking, hasStitchWireframes coverage flag, and output summary table with cached-locally note

## Task Commits

Each task was committed atomically:

1. **Task 1: Add --use-stitch flag parsing and Stitch MCP probe** - `a4cd923` (feat)
2. **Task 2: Add Stitch generation pipeline (Step 4-STITCH)** - `dd35b3a` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `workflows/wireframe.md` - Added --use-stitch flag, Step 2g, Stitch MCP probe in Step 3, full 4-STITCH pipeline in Step 4, STH artifact rows in Steps 6-7, hasStitchWireframes coverage update in Step 7d, Stitch rows in Step 7f output table

## Decisions Made

- ESM `createRequire` wrapper required for all mcp-bridge.cjs calls in workflow bash blocks — project validator (posttooluse-validate) rejects inline `require()` calls as not available in workflow sandbox scope. Pattern: `node --input-type=module <<'EOF'` with `import { createRequire } from 'module'`
- Stitch probe warning for TOOL_MAP_VERIFY_REQUIRED markers is a non-blocking warning, not a gate — workflow proceeds with unverified tool names and instructs user to run `/pde:connect stitch --confirm` to resolve
- `hasStitchWireframes` is set via dual manifest-set-top-level call: standard runs pass `{current}` through unchanged, `--use-stitch` runs set it to `true` explicitly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESM createRequire pattern required for mcp-bridge.cjs require() calls**
- **Found during:** Task 1 (Add --use-stitch flag parsing and Stitch MCP probe)
- **Issue:** Plan specified `node -e "const {TOOL_MAP} = require('...')"` pattern. Project validator (posttooluse-validate workflow skill) flagged line 237 with ERROR: "require() is not available in workflow sandbox scope — use ESM imports and move Node.js logic into 'use step' functions"
- **Fix:** Rewrote all inline Node.js bash blocks to use `node --input-type=module <<'EOF'` with `import { createRequire } from 'module'; const req = createRequire(import.meta.url)`. Pattern matches connect.md existing usage (line 33-44).
- **Files modified:** workflows/wireframe.md
- **Verification:** No further validator errors after fix
- **Committed in:** a4cd923 (Task 1 commit), dd35b3a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: incompatible require() pattern)
**Impact on plan:** Fix necessary for workflow correctness — plan code examples used CJS require() which is rejected by the project's workflow validator. All functionality preserved; only invocation pattern changed.

## Issues Encountered

None beyond the ESM createRequire deviation documented above.

## User Setup Required

None - no external service configuration required for this workflow documentation plan.

## Next Phase Readiness

- `workflows/wireframe.md` now has a complete `--use-stitch` pipeline ready for use when Stitch MCP is connected
- Phase 66 Plan 02 (mockup Stitch integration) can proceed — same pipeline pattern applies
- Phase 66 Plan 03 (Nyquist tests) can proceed — all 13 requirements satisfied in this plan are testable
- Pending: `/pde:connect stitch --confirm` must be run with valid STITCH_API_KEY to update TOOL_MAP markers from TOOL_MAP_VERIFY_REQUIRED to TOOL_MAP_VERIFIED before --use-stitch runs reliably

---
*Phase: 66-wireframe-mockup-stitch-integration*
*Completed: 2026-03-21*
