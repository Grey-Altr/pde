---
phase: 172-core-app-wrappers
verified: 2026-03-29T11:44:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
gaps: []
human_verification: []
---

# Phase 172: Core App Wrappers Verification Report

**Phase Goal:** Build app-wrapper modules for Blender, GIMP, and Inkscape that produce CapabilityModels and MCP servers from approved registry entries
**Verified:** 2026-03-29T11:44:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All truths derived from PLAN frontmatter `must_haves.truths` across plans 01, 02, and 03.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | server-gen.cjs generateServerSource accepts asyncMode option that emits spawn instead of spawnSync | VERIFIED | Line 119-120: `generateServerSource(capabilities, meta, sdkBasePath, options = {})` + `const { asyncMode = false } = options;`; line 121: spawn import conditional; line 149: `asyncMode ? generateAsyncToolHandler(cap) : generateToolHandler(cap)` |
| 2 | generate.cjs orchestrates buildCapabilityModel + writeServer + writeSkillMd for any registered wrapper slug | VERIFIED | Lines 39-91: full pipeline with checkApproved → buildCapabilityModel → writeServer (asyncMode) → generateSkillMd + path replace; all 5 steps confirmed in file |
| 3 | index.cjs maps slug strings to wrapper modules and is extensible | VERIFIED | Lines 12-16: WRAPPER_PATHS maps blender/gimp/inkscape; `getWrapper(slug)` and `listSlugs()` exported; lazy require confirmed |
| 4 | Wave 0 test scaffolds exist for all test files | VERIFIED | 5 test files exist under tests/phase-172/; server-gen-async.test.mjs has 10 passing tests; others upgraded to full tests in Plans 02/03 |
| 5 | Blender wrapper builds a validated CapabilityModel with --background, --factory-startup, and --python-exit-code flags | VERIFIED | blender-wrapper.cjs lines 80-84: `path: 'blender --background'`, `subcommandPath: ['--background', '--factory-startup']`; --python-exit-code documented in descriptions; validateCapabilityModel called at line 172 |
| 6 | Blender wrapper declares startupMs 5000 and asyncRequired true in metadata | VERIFIED | getMetadata() at line 183: `startupMs: 5000`, `asyncRequired: true`; confirmed by 4 passing tests |
| 7 | Inkscape wrapper builds a validated CapabilityModel with --export-type, --export-filename, --export-overwrite flags | VERIFIED | inkscape-wrapper.cjs lines 56-111: inkscape_export capability with inputSvg/outputFile/exportType schema; --export-overwrite in description and alwaysPassFlags extension |
| 8 | Inkscape wrapper does not include any headless/display flags | VERIFIED | Confirmed by grep: no --without-gui, no --batch-process; explicit absence documented at lines 12-16 |
| 9 | GIMP wrapper detects major version and selects correct Script-Fu invocation pattern | VERIFIED | parseMajorVersion handles "GIMP 2.10.38" → 2 and "GNU Image Manipulation Program version 3.0.2" → 3; buildGimpArgs branches at line 74 |
| 10 | GIMP 2.x uses --batch '(gimp-quit 0)' for exit; GIMP 3.x uses --quit flag | VERIFIED | Runtime confirmed: 2.x args end with `--batch (gimp-quit 0)`, 3.x args end with `--quit`; strict isolation verified (no cross-contamination) |
| 11 | pde-tools app wrap slug runs the full generateAppWrapper pipeline and produces all four artifacts | VERIFIED | pde-tools.cjs line 1592: `case 'wrap':` routes to `generateAppWrapper(slug, registryPath, cwd)` at line 1597; returns modelPath, metadataPath, serverPath, skillPath |
| 12 | SKILL.md invocation path reads .planning/app-wrappers/ not .planning/cli-anything/ | VERIFIED | generate.cjs lines 84-87: string replace `.planning/cli-anything/${slug}/server/server.cjs` → `.planning/app-wrappers/${slug}/server/server.cjs`; 8 integration tests pass confirming path fix |

**Score:** 12/12 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/cli-anything/server-gen.cjs` | asyncMode extension to generateServerSource and writeServer | VERIFIED | Contains `generateAsyncToolHandler`, `asyncMode` param, `spawn(BINARY, args, { timeout: 120000 })`; backward compat confirmed (asyncMode=false still uses spawnSync) |
| `bin/lib/app-wrappers/index.cjs` | Slug-to-wrapper-module registry | VERIFIED | Exports `{ getWrapper, listSlugs, WRAPPER_PATHS }`; maps blender/gimp/inkscape |
| `bin/lib/app-wrappers/generate.cjs` | generateAppWrapper orchestrator | VERIFIED | Exports `{ generateAppWrapper }`; full 7-step pipeline including asyncMode and SKILL.md path fix |
| `bin/lib/app-wrappers/blender-wrapper.cjs` | Blender CapabilityModel builder | VERIFIED | Exports `{ buildCapabilityModel, getMetadata, parseMajorVersion }`; 3 capabilities; validateCapabilityModel called; 17 tests pass |
| `bin/lib/app-wrappers/inkscape-wrapper.cjs` | Inkscape CapabilityModel builder | VERIFIED | Exports `{ buildCapabilityModel, getMetadata, parseMajorVersion }`; 1 capability; no deprecated flags; 18 tests pass |
| `bin/lib/app-wrappers/gimp-wrapper.cjs` | GIMP version-aware CapabilityModel builder | VERIFIED | Exports `{ buildCapabilityModel, getMetadata, parseMajorVersion, buildGimpArgs, getScriptFuTemplates }`; 25 tests pass |
| `bin/pde-tools.cjs` | pde-tools app wrap subcommand routing | VERIFIED | `case 'wrap':` at line 1592 calls `generateAppWrapper(slug, registryPath, cwd)`; error message updated to include 'wrap' |
| `tests/phase-172/server-gen-async.test.mjs` | asyncMode test coverage | VERIFIED | 10 passing tests covering asyncMode=true emits spawn, asyncMode=false stays spawnSync, writeServer passes options |
| `tests/phase-172/blender-wrapper.test.mjs` | Blender wrapper test coverage | VERIFIED | 17 tests across buildCapabilityModel, capabilities, metadata, version parsing — all pass |
| `tests/phase-172/gimp-wrapper.test.mjs` | GIMP wrapper test coverage | VERIFIED | 25 tests across parseMajorVersion, buildGimpArgs, getScriptFuTemplates, buildCapabilityModel, getMetadata — all pass |
| `tests/phase-172/inkscape-wrapper.test.mjs` | Inkscape wrapper test coverage | VERIFIED | 18 tests across buildCapabilityModel, schema, no-deprecated-flags, metadata, version parsing — all pass |
| `tests/phase-172/skill-gen-integration.test.mjs` | SKILL.md path fix integration tests | VERIFIED | 8 tests verifying baseline and post-replacement path behavior — all pass |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bin/lib/app-wrappers/generate.cjs` | `bin/lib/cli-anything/server-gen.cjs` | `writeServer` with asyncMode option | WIRED | Line 73: `writeServer(serverDir, model.capabilities, model.meta, projectRoot, { asyncMode: !!metadata.asyncRequired })` |
| `bin/lib/app-wrappers/generate.cjs` | `bin/lib/cli-anything/skill-gen.cjs` | `generateSkillMd` with path post-processing | WIRED | Lines 82-87: `generateSkillMd(model)` then string replace on output |
| `bin/lib/app-wrappers/blender-wrapper.cjs` | `bin/lib/cli-anything/model.cjs` | `validateCapabilityModel` | WIRED | Line 18: `const { validateCapabilityModel } = require('../cli-anything/model.cjs')` called at line 172 |
| `bin/lib/app-wrappers/inkscape-wrapper.cjs` | `bin/lib/cli-anything/model.cjs` | `validateCapabilityModel` | WIRED | Line 23: `const { validateCapabilityModel } = require('../cli-anything/model.cjs')` called at line 125 |
| `bin/lib/app-wrappers/gimp-wrapper.cjs` | `bin/lib/cli-anything/model.cjs` | `validateCapabilityModel` | WIRED | Line 92: `const { validateCapabilityModel } = require('../cli-anything/model.cjs')` (inline require inside buildCapabilityModel) called at line 166 |
| `bin/pde-tools.cjs` | `bin/lib/app-wrappers/generate.cjs` | `generateAppWrapper` call in wrap subcommand | WIRED | Line 1595: `const { generateAppWrapper } = require('./lib/app-wrappers/generate.cjs')` at line 1597: `generateAppWrapper(slug, registryPath, cwd)` |
| `bin/lib/app-wrappers/index.cjs` | `blender-wrapper.cjs`, `gimp-wrapper.cjs`, `inkscape-wrapper.cjs` | `getWrapper(slug)` lazy require | WIRED | WRAPPER_PATHS entries confirmed; runtime `node -e` confirms all three slugs resolve to loaded modules |

---

### Data-Flow Trace (Level 4)

These modules are CLI wrapper builders (not UI components). They produce static JSON-serializable outputs from registry entries rather than rendering dynamic UI data. Level 4 data-flow trace for artifact stubs is not applicable — the data source is the registry entry passed at call time, and test suites exercise real data paths (not hardcoded empty values).

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `blender-wrapper.cjs` | CapabilityModel | `registryEntry` passed to `buildCapabilityModel` | Yes — model built from entry fields, validated by Zod | FLOWING |
| `gimp-wrapper.cjs` | CapabilityModel | `registryEntry` version field drives version-conditional templates | Yes — templates differ based on major version | FLOWING |
| `inkscape-wrapper.cjs` | CapabilityModel | `registryEntry` passed to `buildCapabilityModel` | Yes — capability reflects real Inkscape export interface | FLOWING |
| `generate.cjs` | All four artifacts | `checkApproved` → wrapper module → `writeServer` → `generateSkillMd` | Yes — pipeline is end-to-end; _fns injection allows testing | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| index.cjs listSlugs returns all three wrappers | `node -e "require('./bin/lib/app-wrappers/index.cjs').listSlugs()"` | `['blender', 'gimp', 'inkscape']` | PASS |
| generateAppWrapper exports as function | `node -e "typeof require('./bin/lib/app-wrappers/generate.cjs').generateAppWrapper"` | `'function'` | PASS |
| server-gen asyncMode handler exported | `node -e "typeof require('./bin/lib/cli-anything/server-gen.cjs').generateAsyncToolHandler"` | `'function'` | PASS |
| GIMP 2.x args isolation: no --quit flag | runtime node check | `2.x has --quit: false` | PASS |
| GIMP 3.x args isolation: no (gimp-quit 0) | runtime node check | `3.x has (gimp-quit 0): false` | PASS |
| Phase 172 test suite | `npx vitest run tests/phase-172/` | 78 passed, 0 failed | PASS |
| Phase 171 regression | `npx vitest run tests/phase-171/` | 31 passed, 0 failed | PASS |

---

### Requirements Coverage

All requirement IDs declared across the three plans: WRAP-01, WRAP-02, WRAP-03, WRAP-04, WRAP-05, WRAP-06.

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| WRAP-01 | 172-02 | Blender CLI wrapper with --background headless mode, version-aware (3.x vs 4.x), startupMs declaration, async-only MCP server | SATISFIED | blender-wrapper.cjs: `--background`, `--factory-startup`, `startupMs: 5000`, `asyncRequired: true`; parseMajorVersion handles 3.x/4.x; server generated with asyncMode via generate.cjs |
| WRAP-02 | 172-03 | GIMP CLI wrapper with --no-interface --batch Script-Fu mode, GIMP 2.x vs 3.x version detection and flag adaptation | SATISFIED | gimp-wrapper.cjs: `--no-interface`, buildGimpArgs branches strictly by major version; 2.x uses `(gimp-quit 0)`, 3.x uses `--quit`; getScriptFuTemplates provides version-correct API patterns |
| WRAP-03 | 172-02 | Inkscape CLI wrapper with inkscape --export-type pure CLI mode, no headless flags needed | SATISFIED | inkscape-wrapper.cjs: `inkscape_export` capability with `--export-type` documented; no `--without-gui`, no `--batch-process`; `--export-overwrite` always-pass documented |
| WRAP-04 | 172-01, 172-03 | SKILL.md auto-generation for all three wrapped apps extending Phase 164 machinery | SATISFIED | generate.cjs lines 82-87: `generateSkillMd(model)` called; path fixed from `.planning/cli-anything/` to `.planning/app-wrappers/`; 8 integration tests confirm contract |
| WRAP-05 | 172-01, 172-02, 172-03 | JSON structured output mode for every wrapped app command (required for pipeline chaining) | SATISFIED | server-gen.cjs `generateAsyncToolHandler`: handler wraps spawn output in `JSON.stringify(data)` and `{ content: [{ type: 'text', text: ... }] }`; all three wrappers use asyncMode=true via getMetadata.asyncRequired |
| WRAP-06 | 172-02, 172-03 | Version-aware capability models that reflect the actual installed version's API surface | SATISFIED | GIMP: 2.x vs 3.x template differences in capability descriptions and buildGimpArgs; Blender: parseMajorVersion; Inkscape: parseMajorVersion; meta.version set from registryEntry.version in all three wrappers |

**Orphaned requirements check:** REQUIREMENTS.md maps WRAP-01 through WRAP-06 to Phase 172. All six are claimed in plan frontmatter and verified above. No orphaned requirements.

---

### Anti-Patterns Found

No blockers or warnings found. Spot checks performed on all phase-172 files:

- No TODO/FIXME/PLACEHOLDER comments in implementation files
- No stub patterns (`return null`, `return {}`, `return []` as final values) in wrapper builders
- No hardcoded empty data reaching rendered output — test mocks are local to test files only
- No console.log-only handler implementations
- gimp-wrapper.cjs uses inline `require('../cli-anything/model.cjs')` inside `buildCapabilityModel` function body — this is a valid CJS lazy-load pattern (not a stub), consistent with the project's injection-friendly approach

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

---

### Human Verification Required

None. All phase behaviors are programmatically verifiable:
- Wrapper correctness is covered by 78 unit/integration tests
- GIMP version isolation is confirmed via runtime spot-checks
- CLI routing is confirmed by pde-tools.cjs grep and module load verification
- The full generateAppWrapper pipeline requires an approved registry entry to run end-to-end, but its component parts (model building, server generation, skill generation) are all verified individually

---

### Gaps Summary

No gaps. All 12 must-haves verified. Phase goal achieved.

The phase delivered:

1. **server-gen.cjs asyncMode** — spawn-based async handler generation with 120s timeout, stdout/stderr aggregation, JSON parse with fallback; fully backward-compatible (asyncMode defaults to false)
2. **app-wrappers infrastructure** — index.cjs lazy registry + generate.cjs 7-step orchestrator with dependency injection
3. **Blender wrapper** — 3 capabilities (render, python-exec, export); asyncRequired=true, startupMs=5000; --background/--factory-startup always in subcommandPath
4. **Inkscape wrapper** — 1 capability (export); pure CLI surface; no deprecated flags; --export-overwrite documented for handler
5. **GIMP wrapper** — 2 capabilities (batch, file-convert); strict 2.x/3.x version isolation confirmed at runtime; version-conditional Script-Fu templates exported for inspection
6. **pde-tools app wrap** — CLI subcommand routes full pipeline; error messages updated
7. **Test coverage** — 78 passing tests across 5 test files; Phase 171 regression-free (31 tests)

---

_Verified: 2026-03-29T11:44:00Z_
_Verifier: Claude (gsd-verifier)_
