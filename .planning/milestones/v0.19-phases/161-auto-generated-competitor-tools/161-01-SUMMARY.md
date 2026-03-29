---
phase: 161-auto-generated-competitor-tools
plan: 01
subsystem: workflows, dashboard/api
tags: [webmcp, competitor-tools, approval-gates, registry, competitive-workflow]

# Dependency graph
requires:
  - phase: 160-declarative-approval-gates-workflow-flags
    provides: "160-01: pde_approval_gate MCP tool and gate infrastructure"
  - phase: 160-declarative-approval-gates-workflow-flags
    provides: "160-02: --webmcp flag in competitive.md workflow (partially missing from main — absorbed here)"
provides:
  - "Step 8/8 competitor tool stub generation block in competitive.md (--webmcp only)"
  - "Sanitization pipeline: strip injection patterns (<system>, IMPORTANT:, You must, etc.), 512-char sentence-aware truncation"
  - "Registry write to .webmcp/competitor-tools-registry.json with status: pending"
  - "Gate file creation at .planning/gates/competitor-tool-{id}.json per competitor"
  - "GET /api/planning/competitor-tools serving approved registry entries with ?name= filter"
affects:
  - 161-02 (useCompetitorTools() hook reads registry via this API route)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Step 8 as post-processing step: competitor tool stubs generated after core analysis output, gated on USE_WEBMCP flag"
    - "Sanitization pipeline: case-insensitive injection pattern stripping + markdown header stripping + sentence-aware 512-char truncation"
    - "Merge-safe registry write: read-merge-write prevents duplicate gate_id entries on repeated runs"
    - "File-backed API route: fs.readFileSync + JSON.parse + filter pattern (consistent with gates route)"

key-files:
  created:
    - "dashboard/app/api/planning/competitor-tools/route.ts"
  modified:
    - "workflows/competitive.md"

key-decisions:
  - "Phase 160-02 changes to competitive.md (--webmcp flag, USE_WEBMCP parse step, WebMCP Context section) were not merged to main — absorbed into this plan as prerequisite (Rule 3: auto-fix blocking issue)"
  - "query_competitor_data added to WebMCP Context tool table alongside existing tools for browser agent discoverability"
  - "API route GET is unauthenticated (read-only, matches gates GET pattern — no Clerk auth import)"

patterns-established:
  - "Competitor tool registry: flat JSON array at .webmcp/competitor-tools-registry.json, merged on each run"
  - "Gate ID format for competitor tools: competitor-tool-{sanitized_name}-{YYYYMMDD}-{4_HEX}"

requirements-completed: [ADV-01, ADV-02, ADV-04]

# Metrics
duration: 6min
completed: 2026-03-28
---

# Phase 161 Plan 01: Competitor Tool Stub Generation Summary

**Step 8/8 added to competitive.md with full sanitization pipeline (injection stripping, 512-char truncation), registry write to .webmcp/competitor-tools-registry.json, gate file creation, and GET /api/planning/competitor-tools route serving approved entries**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-28T22:31:21Z
- **Completed:** 2026-03-28T22:36:46Z
- **Tasks:** 2
- **Files modified:** 2 (1 workflow + 1 new API route)

## Accomplishments

- Added Step 8/8 to `workflows/competitive.md` that generates competitor tool stubs when `--webmcp` flag is active and competitors exist
- Renumbered all steps from /7 to /8 throughout the workflow
- Added `--webmcp` flag row to flags table and `USE_WEBMCP` parse step in Step 2 (absorbing Phase 160-02 changes that were not merged to main)
- Sanitization pipeline strips: `<system>`, `</system>`, `IMPORTANT:`, `You must`, `Ignore previous`, `Ignore all previous`, and markdown headers (`#` at line start)
- Truncation logic: finds last `.` before position 512, falls back to last space, appends `...` if truncated
- Registry write: merge-safe (skips entries with duplicate gate_id), writes to `.webmcp/competitor-tools-registry.json`
- Gate file write: one `.planning/gates/competitor-tool-{id}.json` per competitor with status: pending
- WebMCP Context section added with tool table including `query_competitor_data` row
- Output section updated with registry and gate file paths
- Created `dashboard/app/api/planning/competitor-tools/route.ts` — GET handler serving approved entries from registry, `?name=` param for single-competitor lookup, 404/500 error handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Step 8 competitor tool stub generation to competitive.md** — `4a3ade7` (feat)
2. **Task 2: Create competitor-tools API route** — `b4f4f07` (feat)

## Files Created/Modified

- `workflows/competitive.md` — Step 8/8 added, steps renumbered /7→/8, --webmcp flag + USE_WEBMCP parse step, WebMCP Context section with query_competitor_data, output section updated
- `dashboard/app/api/planning/competitor-tools/route.ts` — New GET /api/planning/competitor-tools endpoint, filters registry to approved entries, supports ?name= query param

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Phase 160-02 workflow changes not present in main branch**
- **Found during:** Task 1 (reading competitive.md)
- **Issue:** The --webmcp flag row, USE_WEBMCP parse step, and WebMCP Context section that Phase 160-02 added to competitive.md were committed in a parallel worktree branch (`worktree-agent-abbef32d`, commit c99ccd5) but were never merged to main. The current worktree's competitive.md lacked these prerequisite changes.
- **Fix:** Applied the Phase 160-02 changes as part of this plan's Task 1 alongside the Phase 161 additions, combining both into a single atomic commit. The `--webmcp` flag description was enhanced to mention Step 8's stub generation behavior.
- **Files modified:** `workflows/competitive.md`
- **Commit:** `4a3ade7`

## Known Stubs

None — all registry and gate writes are fully specified in the workflow instructions with complete data flows. The API route serves real data from the registry file once populated by the workflow.

## Self-Check: PASSED

All files verified on disk. Both task commits confirmed in git history.

| Check | Result |
|-------|--------|
| `workflows/competitive.md` | FOUND |
| `dashboard/app/api/planning/competitor-tools/route.ts` | FOUND |
| `161-01-SUMMARY.md` | FOUND |
| Commit `4a3ade7` (Task 1) | FOUND |
| Commit `b4f4f07` (Task 2) | FOUND |
