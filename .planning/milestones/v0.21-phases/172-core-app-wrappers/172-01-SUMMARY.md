---
phase: 172-core-app-wrappers
plan: "01"
subsystem: app-wrappers
tags: [server-gen, async-mode, app-wrappers, tdd, wave-0-scaffolds]
dependency-graph:
  requires: [171-security-architecture-discovery-foundation]
  provides: [asyncMode-server-gen, app-wrappers-orchestrator, wave-0-test-scaffolds]
  affects: [172-02-blender-wrapper, 172-03-gimp-inkscape-wrappers]
tech-stack:
  added: []
  patterns: [tdd-red-green, cjs-modules, spawn-promise-wrapper]
key-files:
  created:
    - bin/lib/app-wrappers/index.cjs
    - bin/lib/app-wrappers/generate.cjs
    - tests/phase-172/server-gen-async.test.mjs
    - tests/phase-172/blender-wrapper.test.mjs
    - tests/phase-172/gimp-wrapper.test.mjs
    - tests/phase-172/inkscape-wrapper.test.mjs
    - tests/phase-172/skill-gen-integration.test.mjs
  modified:
    - bin/lib/cli-anything/server-gen.cjs
decisions:
  - "asyncMode driven by metadata.asyncRequired field — wrappers declare their own startup characteristics"
  - "generateAsyncToolHandler is a separate exported function for testability"
  - "index.cjs uses lazy require() not pre-loaded modules — avoids errors when wrapper files don't exist yet"
metrics:
  duration: "~3 minutes"
  completed_date: "2026-03-29"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 1
requirements: [WRAP-04, WRAP-05]
---

# Phase 172 Plan 01: App Wrappers Infrastructure Summary

**One-liner:** asyncMode spawn/Promise extension to server-gen.cjs plus app-wrappers orchestration layer (index.cjs + generate.cjs) with Wave 0 test scaffolds for all three wrapper plans.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend server-gen.cjs with asyncMode + Wave 0 scaffolds | db7ae6e | server-gen.cjs, 5 test files |
| 2 | Create app-wrappers index.cjs and generate.cjs orchestrator | d5165b8 | index.cjs, generate.cjs |

## What Was Built

**server-gen.cjs asyncMode extension (WRAP-05 infrastructure):**
- `generateServerSource(capabilities, meta, sdkBasePath, options = {})` — new `options` parameter, destructures `asyncMode = false`
- `generateAsyncToolHandler(cap)` — new exported function, generates spawn + Promise handler body with 120s timeout, stdout/stderr listeners, and JSON parse fallback
- `writeServer(outputDir, capabilities, meta, projectRoot, options = {})` — passes options through to generateServerSource
- Backward compatibility preserved: default (no options) still generates spawnSync handlers

**app-wrappers/index.cjs (WRAP-04 infrastructure):**
- `WRAPPER_PATHS` registry mapping `blender`, `gimp`, `inkscape` to their module paths
- `getWrapper(slug)` — lazy require() by slug, returns null for unknown slugs
- `listSlugs()` — returns all registered slug strings
- Exports: `{ getWrapper, listSlugs, WRAPPER_PATHS }`

**app-wrappers/generate.cjs (WRAP-04 + WRAP-05 orchestrator):**
- `generateAppWrapper(slug, registryPath, projectRoot, _fns = {})` — full pipeline orchestrator
- Pipeline: `checkApproved` → `buildCapabilityModel` → write `capability-model.json` → write `wrapper-metadata.json` → `writeServer` (with asyncMode) → `generateSkillMd` + path fix → write `SKILL.md`
- SKILL.md path fix: replaces `.planning/cli-anything/{slug}/server/server.cjs` with `.planning/app-wrappers/{slug}/server/server.cjs`
- Dependency injection via `_fns` for testability

**Wave 0 test scaffolds:**
- `server-gen-async.test.mjs` — 10 actual passing tests for asyncMode behavior
- `blender-wrapper.test.mjs` — 13 todos covering buildCapabilityModel, capabilities, metadata, version parsing
- `gimp-wrapper.test.mjs` — 14 todos covering 2.x vs 3.x model, buildGimpArgs, version parsing
- `inkscape-wrapper.test.mjs` — 11 todos covering buildCapabilityModel, capabilities, version parsing
- `skill-gen-integration.test.mjs` — 5 todos covering SKILL.md path replacement contract

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run tests/phase-172/` | 10 passed, 51 todo, 0 failed |
| `npx vitest run tests/phase-171/` | 31 passed, 0 failed (no regression) |
| `node -e "require('./bin/lib/app-wrappers/index.cjs').listSlugs()"` | `["blender","gimp","inkscape"]` |
| `node -e "require('./bin/lib/app-wrappers/generate.cjs')"` | Loads without error |
| `server-gen.cjs` backward compat | Confirmed via test: asyncMode=false still uses spawnSync |

## Deviations from Plan

None — plan executed exactly as written. TDD Red→Green cycle followed for Task 1 asyncMode tests.

## Known Stubs

None. The wrapper module files referenced by index.cjs (`blender-wrapper.cjs`, `gimp-wrapper.cjs`, `inkscape-wrapper.cjs`) do not yet exist — they are intentionally deferred to Plans 02 and 03. The `getWrapper()` function lazy-requires them at call time; until Plan 02/03 are implemented, calling `getWrapper('blender')` will throw a MODULE_NOT_FOUND error. This is expected — generate.cjs is not callable end-to-end until at least one wrapper module is implemented.

## Self-Check: PASSED

- [x] `bin/lib/cli-anything/server-gen.cjs` exists and contains asyncMode extension
- [x] `bin/lib/app-wrappers/index.cjs` exists and exports `getWrapper, listSlugs, WRAPPER_PATHS`
- [x] `bin/lib/app-wrappers/generate.cjs` exists and exports `generateAppWrapper`
- [x] All 5 test files exist under `tests/phase-172/`
- [x] Commits `db7ae6e` and `d5165b8` confirmed in git log
