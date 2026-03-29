---
phase: 171-security-architecture-discovery-foundation
plan: 01
subsystem: discovery
tags: [binary-probe, display-detection, col-b, app-catalog, spawnSync]

# Dependency graph
requires: []
provides:
  - "Five-tier binary probe (probeBinary) for cross-platform app discovery"
  - "Cross-platform display server detection (probeDisplay)"
  - "col -b preprocessing with regex fallback (preprocessHelpText)"
  - "APP_CATALOG with blender, gimp, inkscape definitions"
  - "discoverApp orchestrator with executionMode classification"
affects: [172-gimp-wrapper, 173-mcp-bridge, 174-cli-wrap-skill, 175-pipeline-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: ["dependency-injectable _fns parameter for all subprocess calls", "five-tier waterfall probe with first-match-wins", "spawnSync with argument arrays (never shell strings)"]

key-files:
  created:
    - bin/lib/app-discovery.cjs
    - tests/phase-171/app-discovery.test.mjs
    - tests/phase-171/col-preprocess.test.mjs
  modified: []

key-decisions:
  - "APP_CATALOG uses static array (not JSON file) for known app definitions"
  - "Blender bpy pip module (Tier 3) is supplemental - probe continues to Tier 4-5"
  - "col -b regex fallback uses /.\x08/g pattern for Windows compatibility"
  - "probeDisplay records method string for registry audit trail"

patterns-established:
  - "Five-tier waterfall probe: env var > which > pip > mdfind > well-known paths"
  - "Dependency injection via _fns parameter: existsFn, execFn, spawnFn, env, platform, homedir"
  - "parseQuality annotation: 'clean' vs 'degraded' for downstream parser awareness"

requirements-completed: [DISC-01, DISC-03, DISC-04, DISC-05]

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 171 Plan 01: App Discovery Summary

**Five-tier binary probe with display detection, col-b preprocessing, and executionMode classification for cross-platform desktop app discovery**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T08:55:29Z
- **Completed:** 2026-03-29T08:58:17Z
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments

### Task 1: Test scaffolds for app-discovery and col-preprocess
Created 17 unit tests across two test files covering all five probe tiers, executionMode classification, display detection for three platforms, and col-b preprocessing with regex fallback. All tests use vi.fn() mocks injected via _fns parameter -- no real subprocess calls.

### Task 2: Implement app-discovery.cjs
Built the core discovery engine with six exports: probeBinary (five-tier waterfall), resolveBinaryFromBundle (macOS .app bundle resolution via plutil), probeDisplay (WindowServer/DISPLAY/win32), preprocessHelpText (col -b with regex fallback), discoverApp (orchestrator), and APP_CATALOG (blender/gimp/inkscape definitions). All subprocess calls use spawnSync/execFileSync with argument arrays to prevent shell injection.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 20cff79 | test(171-01): add failing tests for app-discovery and col-preprocess |
| 2 | ce64768 | feat(171-01): implement app-discovery.cjs with five-tier probe |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed mock spawnFn in executionMode test**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** Test mock returned same stdout for both python3 pip check and ps aux, causing Tier 3 to match when testing the "all tiers fail" scenario
- **Fix:** Made spawnFn mock implementation-aware: returns 'none' for python3 calls and WindowServer for ps calls
- **Files modified:** tests/phase-171/app-discovery.test.mjs
- **Commit:** ce64768

## Known Stubs

None -- all exports are fully wired with complete implementations.

## Self-Check: PASSED

- [x] bin/lib/app-discovery.cjs exists
- [x] tests/phase-171/app-discovery.test.mjs exists
- [x] tests/phase-171/col-preprocess.test.mjs exists
- [x] Commit 20cff79 found
- [x] Commit ce64768 found
