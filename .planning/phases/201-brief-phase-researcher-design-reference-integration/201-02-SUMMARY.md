---
phase: 201-brief-phase-researcher-design-reference-integration
plan: "02"
subsystem: ui
tags: [firecrawl, mcp, wireframe, mockup, design-system, design-reference, cache, webscrape]

requires:
  - phase: 199-firecrawl-cache-module
    provides: firecrawl-cache.cjs with writeSource/readSource/slugifyUrl
  - phase: 198-firecrawl-mcp-bridge
    provides: mcp-bridge.cjs probeFirecrawl() function

provides:
  - commands/wireframe.md: mcp__firecrawl__firecrawl_scrape in allowed-tools, --design-reference-url and --no-firecrawl flags
  - commands/mockup.md: mcp__firecrawl__firecrawl_scrape in allowed-tools, --design-reference-url and --no-firecrawl flags
  - commands/system.md: mcp__firecrawl__firecrawl_scrape in allowed-tools, --design-reference-url and --no-firecrawl flags
  - workflows/wireframe.md: Firecrawl probe (WFR skill code), Step 3a design reference scrape with cache-first pattern, generation context enrichment
  - workflows/mockup.md: Firecrawl probe (MKP skill code), Step 3a design reference scrape with cache-first pattern, generation context enrichment
  - workflows/system.md: Firecrawl probe (SYS skill code), Step 3a design reference scrape with cache-first pattern, generation context enrichment

affects:
  - Phase 202 (firecrawl agent/browser) — same cache and probe infrastructure paths
  - Any consumer of wireframe/mockup/system workflows needing design reference context

tech-stack:
  added: []
  patterns:
    - "Design reference scrape: parse URL in Step 2, probe Firecrawl in Step 3, scrape with cache-first in Step 3a, inject DESIGN_REFERENCE_CONTENT in generation step"
    - "Firecrawl probe pattern: probeFirecrawl() via node --input-type=module, WFR/MKP/SYS skill codes"
    - "Cache-first scrape: slugifyUrl + readSource check before calling mcp__firecrawl__firecrawl_scrape; writeSource only for Firecrawl results, never for WebFetch fallback"
    - "WebFetch fallback: if FIRECRAWL_AVAILABLE = false, fetch via WebFetch but do NOT cache the result"

key-files:
  created: []
  modified:
    - commands/wireframe.md
    - workflows/wireframe.md
    - commands/mockup.md
    - workflows/mockup.md
    - commands/system.md
    - workflows/system.md

key-decisions:
  - "Design reference URL parsing placed in early Step 2 sub-section; actual scraping deferred to Step 3a after FIRECRAWL_AVAILABLE is set by MCP probe"
  - "WebFetch fallback content is NOT cached — only Firecrawl-scraped content goes through writeSource(); WebFetch content is ephemeral per request"
  - "Consistent pattern across all three design workflows: same flag names, same scrape block structure, same DESIGN_REFERENCE_CONTENT variable name"

patterns-established:
  - "Step 3a pattern: design reference fetch step placed between Step 3 (MCP probes) and Step 3.5 (app tool probes) — runs after FIRECRAWL_AVAILABLE is known"
  - "Skill code in log lines: WFR for wireframe, MKP for mockup, SYS for system — matches existing skill code conventions"

requirements-completed: [PIP-03]

duration: 20min
completed: 2026-03-31
---

# Phase 201 Plan 02: Design Reference Integration Summary

**Firecrawl --design-reference-url flag wired into wireframe, mockup, and system workflows with cache-first scrape pattern and WebFetch fallback**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-31T04:40:00Z
- **Completed:** 2026-03-31T05:00:21Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- All three design workflows (wireframe, mockup, system) now accept `--design-reference-url` flag
- All three probe Firecrawl in Step 3 using canonical probeFirecrawl() pattern with skill-specific log codes (WFR, MKP, SYS)
- Cache-first scrape: checks readSource() before calling mcp__firecrawl__firecrawl_scrape, writes to cache via writeSource() with `added_by` tags (`wireframe-design-ref`, `mockup-design-ref`, `system-design-ref`)
- WebFetch fallback when Firecrawl unavailable — content is NOT cached
- DESIGN_REFERENCE_CONTENT injected into generation context in all three workflows
- LOCKED section boundaries preserved in all three workflow files

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Firecrawl to wireframe command/workflow and mockup command/workflow** - `2e03da5` (feat)
2. **Task 2: Add Firecrawl to system command/workflow** - `525ead1` (feat)

**Plan metadata:** (docs commit — see final commit hash)

## Files Created/Modified
- `commands/wireframe.md` - Added mcp__firecrawl__firecrawl_scrape to allowed-tools; updated argument-hint
- `workflows/wireframe.md` - Added --design-reference-url/--no-firecrawl flags table entries; Firecrawl probe block (WFR); Step 2a.1 URL parse; Step 3a scrape with writeSource; Step 4a DESIGN_REFERENCE_CONTENT enrichment
- `commands/mockup.md` - Added mcp__firecrawl__firecrawl_scrape to allowed-tools; updated argument-hint
- `workflows/mockup.md` - Added --design-reference-url/--no-firecrawl flags table entries; Firecrawl probe block (MKP); Step 2d.1 URL parse; Step 3a scrape with writeSource; Step 4a DESIGN_REFERENCE_CONTENT enrichment
- `commands/system.md` - Added mcp__firecrawl__firecrawl_scrape to allowed-tools; updated argument-hint
- `workflows/system.md` - Added --design-reference-url/--no-firecrawl flags table entries; Firecrawl probe block (SYS); Step 2z URL parse; Step 3a scrape with writeSource; Step 4 DESIGN_REFERENCE_CONTENT enrichment

## Decisions Made
- URL parsing placed early in Step 2 (parse-only, no scraping) so the URL value is available; actual scraping deferred to a new Step 3a that runs after FIRECRAWL_AVAILABLE is set in Step 3 — this matches the logical execution order and keeps the conditional well-structured
- WebFetch fallback content is ephemeral (not cached) because WebFetch output is lower quality than Firecrawl markdown and shouldn't pollute the cache
- Consistent variable name `DESIGN_REFERENCE_CONTENT` and flag name `--design-reference-url` across all three workflows to maintain pattern uniformity

## Deviations from Plan

None - plan executed exactly as written. The plan's notation of "Step 2a.1" as the insertion point was interpreted as parse-in-Step-2, scrape-after-Step-3 to maintain logical correctness (FIRECRAWL_AVAILABLE not set until Step 3). This is consistent with how competitive.md implements the pattern.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three design workflows ready for design reference URL inputs
- Pattern consistent and repeatable for any future workflows needing Firecrawl-backed design reference integration
- No blockers

---
*Phase: 201-brief-phase-researcher-design-reference-integration*
*Completed: 2026-03-31*
