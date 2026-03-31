---
phase: 203-change-tracking-event-bus
plan: 02
subsystem: infra
tags: [firecrawl, event-bus, ndjson, observability, monitoring, dashboard]

# Dependency graph
requires:
  - phase: 199-firecrawl-cache-module
    provides: slugifyUrl — used in map/extract/interact/watch emission blocks to derive slug from URL
  - phase: 58-event-bus
    provides: safeAppendEvent — NDJSON appender called by all emission blocks
  - plan: 203-01
    provides: watch subcommand in firecrawl.md — where watch emission blocks are placed
affects: [dashboard EventLog, pane-log-stream.sh display, session archival, all future Firecrawl subcommand calls]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - safeAppendEvent called from workflow bash blocks after every Firecrawl MCP operation
    - session_id always read from .planning/config.json (never hardcoded)
    - word_count derivation varies per operation (see per-subcommand rules)

# Key files
key-files:
  created:
    - tests/phase-203/test-event-emission.cjs
  modified:
    - workflows/firecrawl.md
    - bin/pane-log-stream.sh
    - dashboard/lib/event-types.ts

# Key decisions
decisions:
  - safeAppendEvent chosen over bus.dispatch() — safeAppendEvent writes to the NDJSON file the relay tails; bus.dispatch() is in-process only
  - word_count=0 for map and extract — map returns URL list (no prose), extract returns structured JSON
  - watch subcommand has 2 emission blocks — one in baseline path (Step 4a), one in changed path (Step 6)
  - agent-status excluded from event emission — read-only status check, not a Firecrawl operation
  - firecrawl filter group placed after approvals in EVENT_FILTER_GROUPS — dashboard passthrough handles rendering automatically

# Metrics
metrics:
  duration: 5 minutes
  completed: 2026-03-31
  tasks_completed: 2
  files_modified: 4
  files_created: 1
---

# Phase 203 Plan 02: Firecrawl Event Bus Registration Summary

**One-liner:** firecrawl_operation NDJSON events emitted from all 8 operational subcommands with session-routed session_id, colored cyan in tmux log stream, filterable in dashboard

## What Was Built

### Task 1: Event emission in all firecrawl.md subcommands (TDD)

Created `tests/phase-203/test-event-emission.cjs` with 24 unit tests covering:
- Event envelope field validation (url, slug, word_count, operation, event_type)
- session_id reading from .planning/config.json (not hardcoded 'unknown')
- word_count type enforcement (must be number >= 0)
- All 8 valid operation values; agent-status correctly excluded
- safeAppendEvent integration (writes to NDJSON, swallows errors)

Added `safeAppendEvent` event emission blocks to all 8 operational subcommands in `workflows/firecrawl.md`:

| Subcommand | word_count derivation | Notes |
|---|---|---|
| scrape | markdown.split(/\s+/).length | Uses /tmp/pde-firecrawl-scrape.md |
| search | sum of result description word counts | Iterates all results |
| map | 0 | URL list, no content |
| extract | 0 | Structured JSON, not prose |
| crawl | total_word_count from writeCrawl | Aggregated across all pages |
| agent | result.data word count if string, else JSON stringify count | Falls back gracefully |
| interact | response.markdown word count if present, else 0 | Optional markdown field |
| watch | response.markdown word count | Two blocks: baseline + changed paths |
| agent-status | (no event — read-only check) | Intentionally excluded |

All emission blocks read session_id from `.planning/config.json` via try/catch (Pitfall 5 prevention).

### Task 2: Register firecrawl_operation in log stream and dashboard

**bin/pane-log-stream.sh:** Added `firecrawl_operation` case block before the default `*)` handler:
- Cyan color (`\033[36m`) consistent with experiment.* events
- Extracts `operation`, `word_count`, and `url` (truncated to 40 chars) via jq
- Format: `[sid] [HH:MM:SS] firecrawl_operation   scrape   example.com/pricing (1234 words)`

**dashboard/lib/event-types.ts:** Added `firecrawl: ['firecrawl_operation']` to EVENT_FILTER_GROUPS — dashboard EventLog can now filter to show only Firecrawl operations. No component changes needed since WireEnvelopeSchema.passthrough() already handles any event_type.

## Verification Results

```
node tests/phase-203/test-event-emission.cjs  → 24/24 passed
grep -c "safeAppendEvent" workflows/firecrawl.md  → 18 (8 subcommands, watch has 2 blocks)
grep -q "firecrawl_operation" bin/pane-log-stream.sh  → PASS
grep -q "firecrawl" dashboard/lib/event-types.ts  → PASS
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All emission blocks use real runtime values (url, slug from args, word_count from actual content, session_id from config.json). No placeholder data flows to the dashboard.

## Self-Check: PASSED
