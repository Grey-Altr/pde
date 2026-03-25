---
phase: 127-reverse-parsers
plan: 01
subsystem: context-sync
tags: [reverse-parser, mdc, cursor, tdd, nyquist]
requires: [126-01, 126-02]
provides: [parseMdcContent]
affects: [bin/lib/context-sync.cjs, Phase-128-merge-engine]
tech_stack:
  added: []
  patterns: [TDD-RED-GREEN, PDE:BEGIN/END-marker-scoping, YAML-frontmatter-regex, section-to-IR-mapping]
key_files:
  created:
    - tests/phase-127/test-reverse-parsers.cjs
  modified:
    - bin/lib/context-sync.cjs
decisions:
  - Malformed markers (BEGIN without END) extract nothing rather than falling back to full body — safer for merge engine
  - Used existing extractSection() utility rather than reimplementing section parsing
  - D-07 backward compat implemented: absent markers treat entire body as PDE-owned
metrics:
  duration: "1 minute"
  completed: "2026-03-24T18:46:02Z"
  tasks_completed: 2
  files_modified: 2
  tests_added: 11
  tests_passing: 11
---

# Phase 127 Plan 01: .mdc Reverse Parser Summary

**One-liner:** parseMdcContent() extracts YAML frontmatter and maps section content to partial IR fields from PDE-generated .mdc files, with PDE:BEGIN/END marker scoping and D-07 backward compatibility.

## What Was Built

Implemented `parseMdcContent(content, filename)` in `bin/lib/context-sync.cjs` — the Cursor-side "read" half of v0.16 bidirectional sync. This function inverts `writeMdcRule()` / `emitCursorRules()`, enabling Phase 128's merge engine to receive structured partial IR objects from user-edited .mdc files.

### Function behavior

- **Gate checks:** Returns null for null/empty input, content without PDE-GENERATED marker, or corrupt content without frontmatter
- **YAML frontmatter:** Extracts `description` (string), `globs` (string or null when absent), `alwaysApply` (boolean)
- **PDE:BEGIN/END scoping:** When both markers present, extracts only content between them; malformed (BEGIN without END) extracts nothing; absent markers fall back to full body (D-07)
- **Section-to-IR mapping:** `pde-project.mdc` Conventions section -> `constraints`; `pde-architecture.mdc` Tech Stack section -> `techStack`; with stubs for design-tokens and components
- **Error resilience:** try/catch wraps entire body; any exception writes to stderr and returns null, never throws

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create test scaffold and write failing CUR-01/CUR-02 tests | 4900e4a | tests/phase-127/test-reverse-parsers.cjs (created) |
| 2 | Implement parseMdcContent and make all tests green | 35c937e | bin/lib/context-sync.cjs (modified) |

## Test Results

- **11/11 CUR-01/CUR-02 Nyquist tests green**
- **15/15 Phase 126 regression tests still pass** (no regression from context-sync.cjs edits)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Malformed marker behavior clarified from research skeleton**

- **Found during:** Task 2 implementation
- **Issue:** Research skeleton D-05/D-06/D-07 referenced PDE-OWNED extraction as null when malformed, but the test required `constraints === '' || constraints === undefined`. The research skeleton used `body` as fallback for all cases without markers, conflating absent-markers with malformed-markers.
- **Fix:** Added explicit three-way check: (1) both markers valid -> extract between them; (2) one marker present without other (malformed) -> extract empty string; (3) no markers at all -> D-07 fallback, use entire body. This correctly passes test 11 (malformed) while keeping test 10 (D-07 backward compat) green.
- **Files modified:** bin/lib/context-sync.cjs
- **Commit:** 35c937e

## Self-Check: PASSED

- FOUND: tests/phase-127/test-reverse-parsers.cjs
- FOUND: bin/lib/context-sync.cjs
- FOUND: commit 4900e4a (test RED)
- FOUND: commit 35c937e (feat GREEN)
- FOUND: parseMdcContent in context-sync.cjs
