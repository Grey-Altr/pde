---
phase: 175-design-pipeline-integration
plan: 01
subsystem: design-pipeline
tags: [blender, gimp, glb, 3d-pipeline, image-pipeline, script-fu, app-registry]

# Dependency graph
requires:
  - phase: 171-app-registry
    provides: checkApproved() guard that throws on non-approved/mock entries
  - phase: 172-core-app-wrappers
    provides: buildGimpArgs() (version-aware CLI args) and parseMajorVersion()
  - phase: 168-3d-pipeline
    provides: optimizeGLB() and generateEmbed() for Blender chain
  - phase: 165-image-pipeline
    provides: saveAsset() for GIMP chain output
provides:
  - probeAppTool() — never-throwing registry probe returning { available, reason, entry }
  - blender-glb-export.py — Blender headless Python script for bpy GLB export
  - runBlenderGLBChain() — Blender export -> optimizeGLB -> generateEmbed pipeline
  - runGIMPRetouchChain() — GIMP Script-Fu retouch -> saveAsset pipeline
  - buildRetouchScript() — version-aware (2.x/3.x) Script-Fu brightness/contrast generator
affects:
  - 175-02 (will wire these chains into wireframe.md and mockup.md workflows)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - vi.spyOn on module.exports for CJS interop mocking (more reliable than vi.mock for lazy require())
    - Lazy require('child_process') inside async functions for testability
    - Try/finally temp file cleanup pattern for all pipeline chains

key-files:
  created:
    - bin/lib/design-pipeline/probe-app-tool.cjs
    - bin/lib/design-pipeline/blender-glb-export.py
    - bin/lib/design-pipeline/blender-chain.cjs
    - bin/lib/design-pipeline/gimp-chain.cjs
    - tests/phase-175/probe-app-tool.test.mjs
    - tests/phase-175/blender-chain.test.mjs
    - tests/phase-175/gimp-chain.test.mjs
  modified: []

key-decisions:
  - "vi.spyOn on module.exports (not vi.mock) used for CJS-in-CJS mocking — vi.mock factory doesn't intercept require() calls inside lazy CJS modules"
  - "GIMP version strings in tests must use 'GIMP X.Y.Z' format (not bare '3.0.2') — parseMajorVersion requires GIMP/version prefix"
  - "spawn and other dependencies required lazily (inside function body) to enable spyOn interception"
  - "blender-chain uses projectRoot param to locate blender-glb-export.py rather than __dirname to support test isolation"

patterns-established:
  - "CJS-spy pattern: load dependency modules first, then production module, then vi.spyOn module.exports"
  - "Temp file cleanup: try/finally with fs.existsSync + fs.unlinkSync — ignore cleanup errors"
  - "Pipeline chain return shape: { glbPath, embedPath, snippet } for Blender; saveAsset result pass-through for GIMP"

requirements-completed: [PIPE-01, PIPE-02, PIPE-03]

# Metrics
duration: 27min
completed: 2026-03-29
---

# Phase 175 Plan 01: Design Pipeline Integration Summary

**probeAppTool (never-throwing registry probe), Blender bpy GLB export script, and two pipeline chains (Blender->optimize->embed, GIMP->saveAsset) with 16 passing tests**

## Performance

- **Duration:** 27 min
- **Started:** 2026-03-29T20:17:54Z
- **Completed:** 2026-03-29T20:45:00Z
- **Tasks:** 2
- **Files modified:** 7 created

## Accomplishments

- Created `probeAppTool()` that wraps `checkApproved()` in try/catch — never throws, always returns `{ available, reason, entry }` for all 5 registry states (missing file, pending, mock, headless-approved, unknown slug)
- Created `blender-glb-export.py` — standalone Blender Python script using `bpy.ops.export_scene.gltf()` for headless GLB export, invoked as `blender --background input.blend --python blender-glb-export.py -- output.glb`
- Created `runBlenderGLBChain()` connecting Blender spawn -> `optimizeGLB()` -> `generateEmbed()` with try/finally temp GLB cleanup
- Created `runGIMPRetouchChain()` + `buildRetouchScript()` connecting GIMP spawn (version-aware Script-Fu) -> `saveAsset(type='mockup')` with try/finally temp PNG cleanup
- 16 tests across 3 test files, all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: probeAppTool utility + Blender GLB export script** - `1969e16` (feat)
2. **Task 2: Blender GLB chain + GIMP retouch chain + tests** - `0d1bea8` (feat)

## Files Created/Modified

- `bin/lib/design-pipeline/probe-app-tool.cjs` — Never-throwing registry probe, exports `{ probeAppTool }`
- `bin/lib/design-pipeline/blender-glb-export.py` — Blender headless GLB exporter via `bpy.ops.export_scene.gltf()`
- `bin/lib/design-pipeline/blender-chain.cjs` — Blender export -> optimizeGLB -> generateEmbed chain, exports `{ runBlenderGLBChain }`
- `bin/lib/design-pipeline/gimp-chain.cjs` — GIMP retouch -> saveAsset chain, exports `{ runGIMPRetouchChain, buildRetouchScript }`
- `tests/phase-175/probe-app-tool.test.mjs` — 5 tests for all registry states
- `tests/phase-175/blender-chain.test.mjs` — 4 tests for Blender chain (success, failure, temp cleanup x2)
- `tests/phase-175/gimp-chain.test.mjs` — 7 tests for GIMP chain (buildRetouchScript 2.x/3.x + brightness, spawn tests)

## Decisions Made

- **CJS spy pattern**: `vi.mock()` factory does NOT reliably intercept `require()` calls inside lazy CJS production code when tests use `.mjs` + `createRequire()`. Solution: load dependency modules before production module so they're in require cache, then `vi.spyOn(module, 'method')` — CJS returns the same cached object, so spying intercepts production calls.
- **GIMP version string format**: `parseMajorVersion` in `gimp-wrapper.cjs` requires `"GIMP X.Y.Z"` or `"version X.Y.Z"` prefix — bare `"3.0.2"` returns null and defaults to GIMP 2.x behavior. Tests updated to use proper format.
- **Lazy require in function body**: All dependencies (child_process, optimize, embed, assets, gimp-wrapper) required lazily inside the async function body to ensure `vi.spyOn` interception works.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Registry entries format: plan spec used object, actual format is array**
- **Found during:** Task 1 (probe-app-tool tests)
- **Issue:** Plan's test fixture showed `{ version: 1, entries: { blender: {...} } }` (object) but `app-registry.cjs` actually uses `{ version: 1, entries: [{...}] }` (array with slug field)
- **Fix:** Tests use array format matching the actual `loadRegistry()` return shape
- **Files modified:** tests/phase-175/probe-app-tool.test.mjs
- **Committed in:** 1969e16

**2. [Rule 1 - Bug] vi.mock not intercepting CJS lazy require() for child_process and peer modules**
- **Found during:** Task 2 (blender-chain and gimp-chain tests)
- **Issue:** `vi.mock('child_process', ...)` did not intercept `require('child_process')` called inside CJS production code; real spawn was used causing ENOENT failures
- **Fix:** Switched from `vi.mock()` to `vi.spyOn(module, 'method')` after preloading modules into require cache
- **Files modified:** tests/phase-175/blender-chain.test.mjs, tests/phase-175/gimp-chain.test.mjs
- **Verification:** All 11 chain tests pass with mocked spawn
- **Committed in:** 0d1bea8

**3. [Rule 1 - Bug] GIMP version string format incompatibility**
- **Found during:** Task 2 (gimp-chain buildRetouchScript tests)
- **Issue:** Tests used bare `'3.0.2'` version string but `parseMajorVersion` requires `'GIMP 3.0.2'` format; returned null -> defaulted to GIMP 2.x path
- **Fix:** Updated test fixtures to use `'GIMP X.Y.Z'` format matching production version strings
- **Files modified:** tests/phase-175/gimp-chain.test.mjs
- **Committed in:** 0d1bea8

---

**Total deviations:** 3 auto-fixed (3 Rule 1 - Bug)
**Impact on plan:** All auto-fixes corrected mismatches between plan spec and actual codebase behavior. No scope creep.

## Issues Encountered

- CJS/ESM mocking boundary: vitest's `vi.mock()` hoisting works for ES module imports but CJS `require()` calls inside CJS production modules require `vi.spyOn()` on the cached module object. This pattern is now established as a project convention (see `patterns-established`).

## Known Stubs

None — all functions are fully implemented and wired to real dependencies.

## Next Phase Readiness

- All 4 design-pipeline module files ready for wiring in Plan 02
- `probeAppTool` provides the availability check needed before invoking Blender/GIMP in workflows
- `runBlenderGLBChain` and `runGIMPRetouchChain` are the building blocks for wireframe.md and mockup.md workflow integration
- No blockers

---
*Phase: 175-design-pipeline-integration*
*Completed: 2026-03-29*

## Self-Check: PASSED

All files confirmed present:
- bin/lib/design-pipeline/probe-app-tool.cjs FOUND
- bin/lib/design-pipeline/blender-glb-export.py FOUND
- bin/lib/design-pipeline/blender-chain.cjs FOUND
- bin/lib/design-pipeline/gimp-chain.cjs FOUND
- tests/phase-175/probe-app-tool.test.mjs FOUND
- tests/phase-175/blender-chain.test.mjs FOUND
- tests/phase-175/gimp-chain.test.mjs FOUND

All commits confirmed:
- 1969e16: feat(175-01): probeAppTool utility + Blender GLB export script FOUND
- 0d1bea8: feat(175-01): Blender GLB chain + GIMP retouch chain + tests FOUND
