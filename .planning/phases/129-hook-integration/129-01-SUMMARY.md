---
phase: 129-hook-integration
plan: "01"
subsystem: context-sync
tags: [reverse-sync, reconciliation, ingest, state, monitored-files]
dependency_graph:
  requires: [128-01, 128-02]
  provides: [MONITORED_FILES, replaceSectionInFile, parseMonitoredFile, reconcileOnStart, ingestAll]
  affects: [bin/lib/context-sync.cjs, tests/phase-129/test-hook-integration.cjs]
tech_stack:
  added: []
  patterns: [mtime-based-change-detection, 3-way-merge-writeback, idempotent-ingest]
key_files:
  created:
    - tests/phase-129/test-hook-integration.cjs
  modified:
    - bin/lib/context-sync.cjs
decisions:
  - "MONITORED_FILES constant lists all 7 editor output paths with parser type mapping"
  - "reconcileOnStart uses 500ms grace period to avoid false positives from near-simultaneous PDE writes"
  - "ingestAll always scans all 7 files (filesScanned = 7 regardless of file existence)"
  - "replaceSectionInFile replaces section body between ## heading and next ## heading or EOF"
  - "--ingest CLI flag routes to ingestAll via cmdContextSync, added before --editor check"
metrics:
  duration_minutes: 12
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_changed: 2
---

# Phase 129 Plan 01: Hook Integration Foundation Summary

Session-start reconciliation (SYN-04) and always-scan ingest (SYN-05) for mtime-based editor change detection, reverse parse, merge, and PROJECT.md write-back.

## What Was Built

- **MONITORED_FILES**: 7-entry constant listing all editor output paths (.cursor/rules/*.mdc, SKILL.md, DESIGN.md) with parser type mapping (mdc/skill/design)
- **replaceSectionInFile(filePath, sectionName, newContent)**: Replaces a `## Section` body in a markdown file; returns true/false; used for techStack/constraints write-back to PROJECT.md
- **parseMonitoredFile(absPath, entry)**: Dispatches to parseMdcContent/parseSkillMd/parseDesignMd based on entry.parser
- **reconcileOnStart(cwd)**: Scans MONITORED_FILES for mtime changes since lastEmittedAt (500ms grace), calls computeLoopBreak gate, parses externally-edited files, merges via mergePartialIR, writes back techStack/constraints to PROJECT.md, calls emitAll to re-normalize, logs to sync-reconciliation.log
- **ingestAll(cwd)**: Always-scan variant — scans all 7 files regardless of mtime, same merge/write-back/emitAll flow, idempotent (second run = 0 changes)
- **--ingest CLI flag**: routes to ingestAll via cmdContextSync, outputs summary to stdout

## Test Coverage

12 tests in tests/phase-129/test-hook-integration.cjs (tests 1-12):
- Tests 1-2: replaceSectionInFile (replace found/not-found)
- Tests 3-8: SYN-04 reconcileOnStart (skip old mtime, detect new mtime, loop-break gate, write-back, logging, performance)
- Tests 9-12: SYN-05 ingestAll (counts, idempotency, emitAll integration, first-run/null state)

## Deviations from Plan

None - plan executed exactly as written.

One minor implementation detail: `ingestAll` increments `filesScanned` for all 7 MONITORED_FILES in the outer loop (not inside processEntry) to ensure the count reflects the full scan set regardless of file existence.

## Self-Check: PASSED

- bin/lib/context-sync.cjs modified: FOUND
- tests/phase-129/test-hook-integration.cjs created: FOUND
- All 12 SYN-04/SYN-05 tests GREEN: CONFIRMED (node --test output: pass 12, fail 0)
- No regressions in phases 126-128: CONFIRMED
