---
phase: 201-brief-phase-researcher-design-reference-integration
plan: 01
subsystem: workflows
tags: [firecrawl, mcp-integration, brief, phase-researcher, web-scraping, cache]

# Dependency graph
requires:
  - phase: 199-firecrawl-cache-module
    provides: bin/lib/firecrawl-cache.cjs with writeSource, readSource, slugifyUrl
  - phase: 198-firecrawl-credit-guard
    provides: bin/lib/mcp-bridge.cjs with probeFirecrawl()
provides:
  - Firecrawl scraping wired into /pde:brief via --source-url flag
  - Cache-first URL scraping with WebFetch fallback in brief workflow
  - Conditional ## Source Material section injected into BRF artifact
  - Firecrawl probe in pde-phase-researcher agent Standard Mode
  - Web Research Escalation Ladder in pde-phase-researcher
  - Conditional ## Web Evidence section in RESEARCH.md output (absent when Firecrawl unavailable)
affects:
  - phase: 202-firecrawl-workflow-command
  - commands/brief.md
  - workflows/brief.md
  - agents/pde-phase-researcher.md

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Firecrawl probe pattern (BRF skill code) in Step 3 after Sequential Thinking probe"
    - "Cache-first read pattern before firecrawl_scrape calls"
    - "writeSource() with added_by field for source attribution"
    - "Conditional section injection: section absent (not empty) when content unavailable"
    - "Web Research Escalation Ladder: WebSearch default, Firecrawl for JS/structured content"

key-files:
  created: []
  modified:
    - commands/brief.md
    - workflows/brief.md
    - agents/pde-phase-researcher.md

key-decisions:
  - "Brief workflow: Firecrawl probe uses BRF skill code in log lines (matching competitive.md CMP pattern)"
  - "Brief workflow: Step 3c executes inside LOCKED section, before Step 4 product type detection"
  - "Brief workflow: ## Source Material section is ABSENT (not empty placeholder) when no --source-url provided"
  - "Phase researcher: probeFirecrawl() runs immediately after reading context files, before codebase analysis"
  - "Phase researcher: ## Web Evidence section is ABSENT (not present with empty content) when FIRECRAWL_AVAILABLE is false"
  - "Both integrations use writeSource() with added_by field for traceability in the cache manifest"

patterns-established:
  - "Skill code in probe log lines: BRF for brief, CMP for competitive — consistent audit trail"
  - "Conditional section pattern: only write section when content is non-null, never write empty placeholder"
  - "Cache-first pattern: slugifyUrl + readSource before any firecrawl_scrape call to save credits"

requirements-completed: [PIP-04, PIP-02]

# Metrics
duration: 2min
completed: 2026-03-31
---

# Phase 201 Plan 01: Brief + Phase Researcher Firecrawl Integration Summary

**Firecrawl scraping wired into /pde:brief via --source-url flag (cache-first, WebFetch fallback, ## Source Material injection) and pde-phase-researcher agent gains ## Web Evidence section with escalation ladder**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-31T04:55:37Z
- **Completed:** 2026-03-31T04:57:57Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `--source-url` and `--no-firecrawl` flags to commands/brief.md and the brief workflow
- Wired full Firecrawl probe + Step 3c source scrape (cache-first, firecrawl_scrape, WebFetch fallback) into workflows/brief.md
- Added conditional `## Source Material` section injected into BRF artifact only when SOURCE_MATERIAL_CONTENT is non-null
- Added probeFirecrawl() + Web Research Escalation Ladder to pde-phase-researcher Standard Mode
- Added conditional `## Web Evidence` section template to RESEARCH.md output — explicitly absent when FIRECRAWL_AVAILABLE is false

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Firecrawl integration to brief command and workflow** - `10dee00` (feat)
2. **Task 2: Add Firecrawl integration to pde-phase-researcher agent** - `71fe34a` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `commands/brief.md` - Added --source-url/--no-firecrawl flags and mcp__firecrawl__firecrawl_scrape to allowed-tools
- `workflows/brief.md` - Added Firecrawl probe (BRF), Step 3c source scrape, ## Source Material section injection
- `agents/pde-phase-researcher.md` - Added Firecrawl tools, probeFirecrawl() probe, escalation ladder, ## Web Evidence conditional section

## Decisions Made
- Brief workflow uses BRF skill code in log lines (matching competitive.md CMP pattern for consistency)
- Step 3c is placed inside the LOCKED section between Step 3b (Reference Screenshot) and Step 4 (Product Type Detection)
- ## Source Material section is ABSENT (not an empty placeholder) when SOURCE_MATERIAL_CONTENT is null — matches plan requirement exactly
- pde-phase-researcher probeFirecrawl() runs early in Standard Mode, immediately after reading context files
- ## Web Evidence section is entirely absent when FIRECRAWL_AVAILABLE is false — not present with empty content

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Brief workflow ready to accept --source-url flag and scrape URLs via Firecrawl into BRF artifacts
- Phase researcher ready to generate ## Web Evidence section when Firecrawl credits available
- Both integrations use firecrawl-cache.cjs writeSource() — consistent with Phase 199 cache module
- Phase 202 (/pde:firecrawl command + Agent + Browser) can now build on proven probe and cache patterns

---
*Phase: 201-brief-phase-researcher-design-reference-integration*
*Completed: 2026-03-31*
