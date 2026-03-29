---
phase: 163-cli-ingestion-capability-model
plan: "01"
subsystem: cli-anything
tags: [capability-model, spec-detection, zod, vitest, ai-sdk]
dependency_graph:
  requires: []
  provides:
    - bin/lib/cli-anything/model.cjs (CapabilityModelSchema, validateCapabilityModel)
    - bin/lib/cli-anything/detect.cjs (detectSpecType)
    - bin/lib/cli-anything/ingest.cjs (cmdIngest, loadSource, slugify)
    - commands/ingest.md (/pde:ingest command)
    - tests/phase-163/ (test infrastructure for all 4 spec types)
  affects: []
tech_stack:
  added:
    - ai@6.0.141 (devDependency — AI SDK for downstream tool() codegen)
  patterns:
    - CJS modules with 'use strict' + JSDoc + module.exports pattern
    - Zod v4 with z.record(z.string(), z.unknown()) (not z.record(z.unknown()) — see deviations)
    - vitest ESM test files (.mjs) using createRequire for CJS module loading
key_files:
  created:
    - bin/lib/cli-anything/model.cjs
    - bin/lib/cli-anything/detect.cjs
    - bin/lib/cli-anything/ingest.cjs
    - commands/ingest.md
    - tests/phase-163/fixtures/openapi-petstore.json
    - tests/phase-163/fixtures/jsonschema-users.json
    - tests/phase-163/fixtures/graphql-introspection.json
    - tests/phase-163/fixtures/mcp-tools-list.json
    - tests/phase-163/detect.test.mjs
    - tests/phase-163/model.test.mjs
    - tests/phase-163/openapi-parser.test.mjs
    - tests/phase-163/jsonschema-parser.test.mjs
    - tests/phase-163/graphql-parser.test.mjs
    - tests/phase-163/mcp-parser.test.mjs
    - tests/phase-163/codegen.test.mjs
  modified:
    - package.json (added ai devDependency)
    - vitest.config.ts (added server.deps.inline for zod)
decisions:
  - "Use z.record(z.string(), z.unknown()) not z.record(z.unknown()) — Zod v4.3.6 has a bug where the one-argument form crashes on non-trivial values"
  - "vitest.config.ts server.deps.inline zod — ensures CJS and ESM zod share instances in test context"
  - "Test files use .mjs with createRequire pattern — vitest globals work in ESM but CJS modules load correctly via require"
metrics:
  duration: "8m 18s"
  completed_date: "2026-03-29"
  tasks_completed: 3
  tasks_total: 3
  files_created: 15
  files_modified: 2
---

# Phase 163 Plan 01: CLI Ingestion Foundation Summary

**One-liner:** Zod-validated capability model schema, spec-type auto-detection, ingest orchestrator skeleton, /pde:ingest command, and vitest test infrastructure for all 4 spec types (OpenAPI, JSON Schema, GraphQL, MCP).

## What Was Built

### Core Modules

**`bin/lib/cli-anything/model.cjs`** — Defines the unified `CapabilityModel` data structure via Zod schema. Exports `CapabilitySchema`, `CapabilityModelSchema`, and `validateCapabilityModel()`. All downstream parsers (Plans 02-03) produce objects validated by this schema; all generators (Plan 04) consume it.

**`bin/lib/cli-anything/detect.cjs`** — Single function `detectSpecType(source, parsedContent)` that identifies spec type from URL scheme (`mcp://`), file extension (`.graphql`/`.gql`), or content sniffing (`openapi`/`swagger`/`$schema`/`type`/`properties` keys). Returns `'openapi' | 'jsonschema' | 'graphql' | 'mcp' | 'http-probe' | 'unknown'`.

**`bin/lib/cli-anything/ingest.cjs`** — Orchestrator skeleton wiring detect.cjs and model.cjs. Exports `cmdIngest()`, `loadSource()`, `slugify()`. Parser delegation stubs throw until Plans 02-04 wire the actual parsers.

**`commands/ingest.md`** — Skill command definition for `/pde:ingest` following `commands/brief.md` YAML frontmatter pattern. Describes 4 supported spec types and delegates to `node bin/pde-tools.cjs cli-anything ingest`.

### Test Infrastructure

- **4 fixture files** in `tests/phase-163/fixtures/` — representative real-world samples for OpenAPI 3.0 (petstore with 3 operations), JSON Schema draft-2020-12 (users schema with $defs), GraphQL introspection (query/mutation/type), MCP tools/list response
- **2 real test files** — `detect.test.mjs` (10 passing assertions), `model.test.mjs` (4 passing assertions)
- **5 todo scaffold files** — `openapi/jsonschema/graphql/mcp-parser.test.mjs` and `codegen.test.mjs` with `it.todo()` placeholders for Plans 02-04

### Package Changes

- `ai@6.0.141` installed as devDependency for downstream AI SDK `tool()` codegen
- `vitest.config.ts` updated with `server.deps.inline: ['zod']` to fix CJS/ESM module isolation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4.3.6 `z.record(z.unknown())` crashes on non-trivial values**

- **Found during:** Task 2 — when running model.test.mjs, all tests failed with `TypeError: Cannot read properties of undefined (reading '_zod')`
- **Root cause:** Zod v4.3.6 bug — the one-argument form `z.record(z.unknown())` leaves `def.valueType._zod` undefined when parsing objects containing nested objects as values
- **Fix:** Replace all `z.record(z.unknown())` with `z.record(z.string(), z.unknown())` (two-argument form) throughout `model.cjs`. Verified fix with direct Node.js testing
- **Files modified:** `bin/lib/cli-anything/model.cjs`
- **Commit:** included in `8fd5fe1`

**2. [Rule 2 - Correctness] vitest.config.ts: add `server.deps.inline: ['zod']`**

- **Found during:** Task 2 — investigation of why tests failed only in vitest but not in plain Node.js
- **Issue:** vitest's Vite transform can create dual Zod module instances (one for ESM, one for CJS) causing `_zod` internal property mismatches
- **Fix:** Add `server.deps.inline: ['zod']` to vitest config so the same Zod instance is shared across ESM test files and CJS modules
- **Files modified:** `vitest.config.ts`
- **Commit:** included in `8fd5fe1`

## Test Results

```
Test Files: 2 passed | 5 skipped (7)
Tests:      14 passed | 33 todo (47)
```

- `detect.test.mjs`: 10/10 passing
- `model.test.mjs`: 4/4 passing
- Parser and codegen scaffolds: 33 `it.todo()` placeholders, skipped (expected)

## Known Stubs

- `ingest.cjs`: `cmdIngest()` throws `Parser for {specType} not yet wired` for all 4 spec types — intentional, parsers wired in Plan 04
- `ingest.cjs`: `http-probe` handler throws `HTTP URL probing not yet implemented` — intentional, probing wired in Plan 04 with actual parsers

These stubs are documented and tracked. They do not prevent this plan's goal (foundation modules, test infrastructure) from being achieved.

## Self-Check: PASSED

Files exist:
- FOUND: bin/lib/cli-anything/model.cjs
- FOUND: bin/lib/cli-anything/detect.cjs
- FOUND: bin/lib/cli-anything/ingest.cjs
- FOUND: commands/ingest.md
- FOUND: tests/phase-163/fixtures/openapi-petstore.json
- FOUND: tests/phase-163/fixtures/jsonschema-users.json
- FOUND: tests/phase-163/fixtures/graphql-introspection.json
- FOUND: tests/phase-163/fixtures/mcp-tools-list.json
- FOUND: tests/phase-163/detect.test.mjs
- FOUND: tests/phase-163/model.test.mjs

Commits:
- f0493ff: feat(163-01): capability model schema, detect module, and ai devDep
- 8fd5fe1: feat(163-01): test fixtures, scaffolds, and model bug fix
- a066f64: feat(163-01): ingest orchestrator skeleton and /pde:ingest command
