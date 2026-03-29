---
phase: 164-cli-wrapping-publishing
plan: "01"
subsystem: cli-anything
tags: [model, test-infrastructure, fixtures, tdd]
dependency_graph:
  requires: []
  provides:
    - "CapabilityModelSchema accepts 'cli' type"
    - "test scaffolds for help-parser, server-gen, skill-gen, registry"
    - "fixture files for deterministic parser testing"
  affects:
    - "bin/lib/cli-anything/model.cjs"
    - "tests/phase-164/"
tech_stack:
  added: []
  patterns:
    - "TDD RED scaffolds — test files import non-existent modules to establish behavioral contracts"
    - "vitest with createRequire for ESM test files importing CJS modules"
key_files:
  created:
    - tests/phase-164/fixtures/git-help.txt
    - tests/phase-164/fixtures/gh-help.txt
    - tests/phase-164/fixtures/simple-help.txt
    - tests/phase-164/help-parser.test.mjs
    - tests/phase-164/server-gen.test.mjs
    - tests/phase-164/skill-gen.test.mjs
    - tests/phase-164/registry.test.mjs
  modified:
    - bin/lib/cli-anything/model.cjs
decisions:
  - "Fixture files are plain text captures of real CLI --help output (git, gh) plus one synthetic minimal fixture for deterministic testing"
  - "Test scaffolds use createRequire(import.meta.url) pattern consistent with phase-163 tests to bridge ESM/CJS boundary"
  - "registry.test.mjs uses tmp directories (mkdtempSync) for fs isolation — no mocking of Node fs module"
metrics:
  duration: "~8 minutes"
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_created: 8
  files_modified: 1
---

# Phase 164 Plan 01: Wave 0 Infrastructure — Model Extension + Test Scaffolds Summary

Extended CapabilityModelSchema to accept 'cli' type and established TDD RED scaffolds for all four new cli-anything modules (help-parser, server-gen, skill-gen, registry) with 3 fixture files for deterministic parser testing.

## What Was Built

### Task 1: model.cjs extension + fixture files
- Added `'cli'` to the `CapabilityModelSchema` meta.type enum alongside the existing 4 types (openapi, jsonschema, graphql, mcp)
- Change is backward-compatible — all 83 phase-163 tests still pass
- Created `tests/phase-164/fixtures/` directory with 3 help output samples:
  - `git-help.txt`: real GNU-style output with "These are common Git commands" sections
  - `gh-help.txt`: real GitHub CLI output with CORE COMMANDS / FLAGS sections
  - `simple-help.txt`: minimal synthetic fixture for deterministic parser testing

### Task 2: TDD RED test scaffolds
- **help-parser.test.mjs**: 6 tests covering parseSubcommands (extracts init/build/test/deploy, empty input, skips ALL_CAPS headers, skips flag lines), parseFlags (--verbose, --json), and spawnHelpText (stdout fallback)
- **server-gen.test.mjs**: 6 tests covering generateServerSource output — McpServer import, BINARY constant, DRY_RUN guard, JSON.parse(stdout) envelope fallback, useJson input field with --json flag, spawnSync usage
- **skill-gen.test.mjs**: 4 tests covering generateSkillMd output — PDE-GENERATED header, YAML frontmatter with name/binary, ## section per capability, --dry-run and --json in Flags section
- **registry.test.mjs**: 5 tests covering loadRegistry (missing file default, existing file parse), upsertEntry (creates file, adds entry, replaces on upsert), cmdPublish (fails without capability-model.json)

All 4 test files are in correct RED state (MODULE_NOT_FOUND) — modules are implemented in plans 164-02 through 164-05.

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 8c3b3c7 | feat | extend model.cjs type enum with 'cli' and add test fixtures |
| 1dd7596 | test | add RED test scaffolds for all four cli-anything modules |

## Success Criteria Verification

- [x] model.cjs type enum includes 'cli' alongside existing types
- [x] All 4 test files exist with behavioral tests matching the requirements
- [x] 3 fixture files exist with realistic --help output
- [x] Existing Phase 163 tests still pass (83/83)
- [x] validateCapabilityModel accepts type:'cli' without throwing

## Self-Check: PASSED
