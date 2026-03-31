---
phase: 200-core-scraping-tools-competitive-recommend-integration
plan: "02"
subsystem: workflows
tags: [firecrawl, competitive, recommend, mcp-integration, workflow-enhancement]
dependency_graph:
  requires: [198-mcp-bridge, 199-firecrawl-cache]
  provides: [firecrawl-competitive-analysis, firecrawl-tool-discovery]
  affects: [commands/competitive.md, commands/recommend.md, workflows/competitive.md, workflows/recommend.md]
tech_stack:
  added: []
  patterns: [probeFirecrawl-pattern, firecrawl-dual-probe, graceful-degradation, locked-section-boundary]
key_files:
  created: []
  modified:
    - commands/competitive.md
    - commands/recommend.md
    - workflows/competitive.md
    - workflows/recommend.md
decisions:
  - "Firecrawl probe inserted inside LOCKED section of Step 3 in both workflows — probe is infrastructure, not optimizable guidance"
  - "--no-firecrawl flag added to both workflows for per-run opt-out without --no-mcp"
  - "Firecrawl ranked as item 3 in recommend.md 4b priority order (after mcp-compass and WebSearch, before Sequential Thinking)"
  - "competitive.md uses firecrawl_search + firecrawl_scrape + firecrawl_extract triple for full competitor data extraction"
  - "recommend.md uses firecrawl_search only — narrower scope matches the tool-discovery use case"
metrics:
  duration_minutes: 8
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 4
---

# Phase 200 Plan 02: Firecrawl Integration into Competitive and Recommend Workflows Summary

Integrated Firecrawl MCP into competitive analysis and recommend workflows via probeFirecrawl() guard in Step 3, firecrawl_search + firecrawl_extract in competitive Step 4, and firecrawl_search for live tool discovery in recommend Step 4.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Firecrawl tools to command file allowed-tools | f1286f8 | commands/competitive.md, commands/recommend.md |
| 2 | Add Firecrawl probe and enhancement to competitive.md and recommend.md workflows | 4602915 | workflows/competitive.md, workflows/recommend.md |

## What Was Built

**commands/competitive.md:** Added `mcp__firecrawl__firecrawl_scrape`, `mcp__firecrawl__firecrawl_search`, and `mcp__firecrawl__firecrawl_extract` to allowed-tools list. All existing tools preserved.

**commands/recommend.md:** Added `mcp__firecrawl__firecrawl_search` to allowed-tools list. All existing tools preserved.

**workflows/competitive.md:**
- Added `--no-firecrawl` flag to the flags table inside the LOCKED section
- Inserted Firecrawl probe block (probeFirecrawl() via node --input-type=module pattern) in Step 3 before the `<!-- /LOCKED -->` boundary
- Updated Step 3 display line to include "Firecrawl: {available|unavailable}"
- Added Firecrawl enrichment block to Step 4b: firecrawl_search for pricing page discovery, firecrawl_scrape for main page extraction, firecrawl_extract with JSON schema for structured pricing/positioning data
- Added Firecrawl attribution to artifact footer
- LOCKED boundaries fully preserved at lines 1 and 259

**workflows/recommend.md:**
- Added `--no-firecrawl` flag to the flags table and process header check line
- Inserted Firecrawl probe block (probeFirecrawl() via node --input-type=module pattern) in Step 3 before the `<!-- /LOCKED -->` boundary
- Updated Step 3 display line to include "Firecrawl: {available|unavailable}"
- Added Firecrawl as item 3 in 4b candidate collection priority order (firecrawl_search for live tool discovery, deduplicated against mcp-compass and WebSearch results)
- Added Firecrawl data source tag to recommend artifact footer
- LOCKED boundaries fully preserved at lines 1 and 210

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Verification Results

- `FIRECRAWL_AVAILABLE` appears 5 times in workflows/competitive.md (probe set, IF check, ELSE, Step 3 display, footer tag) — requirement: >= 3
- `FIRECRAWL_AVAILABLE` appears 5 times in workflows/recommend.md — requirement: >= 3
- `mcp__firecrawl__firecrawl_` tools: 3 entries in commands/competitive.md — requirement: 3
- `mcp__firecrawl__firecrawl_` tools: 1 entry in commands/recommend.md — requirement: 1
- `probeFirecrawl` confirmed in both workflow files
- LOCKED boundaries intact in both workflows

## Self-Check: PASSED

Files confirmed modified:
- commands/competitive.md: FOUND
- commands/recommend.md: FOUND
- workflows/competitive.md: FOUND
- workflows/recommend.md: FOUND

Commits confirmed:
- f1286f8: FOUND
- 4602915: FOUND
