---
phase: 172-core-app-wrappers
plan: "02"
subsystem: app-wrappers
tags: [blender, inkscape, capability-model, tdd, headless-cli, version-aware, cjs-modules]
dependency-graph:
  requires:
    - phase: 172-01
      provides: app-wrappers/index.cjs, app-wrappers/generate.cjs, Wave 0 test scaffolds
    - phase: 171-security-architecture-discovery-foundation
      provides: app-registry.cjs checkApproved, registry entry shape with binaryPath/version/executionMode
  provides:
    - bin/lib/app-wrappers/blender-wrapper.cjs — Blender CapabilityModel builder with 3 capabilities
    - bin/lib/app-wrappers/inkscape-wrapper.cjs — Inkscape CapabilityModel builder with export capability
  affects: [172-03-gimp-wrapper, generateAppWrapper-orchestrator, pde-tools-app-wrap]
tech-stack:
  added: []
  patterns: [tdd-red-green, cjs-modules, validateCapabilityModel-call-before-return, version-string-regex-parse]
key-files:
  created:
    - bin/lib/app-wrappers/blender-wrapper.cjs
    - bin/lib/app-wrappers/inkscape-wrapper.cjs
  modified:
    - tests/phase-172/blender-wrapper.test.mjs
    - tests/phase-172/inkscape-wrapper.test.mjs
key-decisions:
  - "Blender wrapper declares asyncRequired true and startupMs 5000 in getMetadata — these fields live in wrapper-metadata.json not in CapabilityModel meta (which only takes strings)"
  - "Inkscape wrapper uses no headless flags — GUI is suppressed automatically by export flags since Inkscape 1.0; --without-gui is explicitly absent"
  - "parseMajorVersion returns null (not 'unknown') for null/undefined input — numeric return type is cleanly nullable vs. string sentinel"
  - "extensions.subcommandPath is empty array for Inkscape (all args are dynamic); non-empty for Blender (--background --factory-startup always present)"
patterns-established:
  - "Wrapper pattern: parseMajorVersion + buildCapabilityModel + getMetadata, all exported from a single CJS module"
  - "validateCapabilityModel called at end of buildCapabilityModel — throws on invalid shape, never returns unvalidated data"
  - "Capability descriptions document dynamic handler behavior (--export-overwrite always passed, --python-exit-code 1 added dynamically)"
requirements-completed: [WRAP-01, WRAP-03, WRAP-05, WRAP-06]
duration: ~5min
completed: "2026-03-29"
---

# Phase 172 Plan 02: Blender + Inkscape Wrappers Summary

**Blender and Inkscape CapabilityModel builders with TDD coverage — Blender has 3 headless capabilities (render/python-exec/export) with asyncRequired true + 5s startup, Inkscape has 1 pure CLI export capability with no deprecated flags.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-29T11:37:00Z
- **Completed:** 2026-03-29T11:39:30Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 test files updated)

## Accomplishments

- Blender wrapper: `parseMajorVersion` handles "Blender 4.0.0" and "Blender 2.93 (sub 5)" formats; `buildCapabilityModel` produces 3 validated capabilities (blender_render, blender_python_exec, blender_export); `getMetadata` declares asyncRequired=true and startupMs=5000
- Inkscape wrapper: pure CLI surface with `inkscape_export` capability; no deprecated --without-gui or --batch-process flags; --export-overwrite documented in description for handler awareness
- 35 tests total (17 Blender + 18 Inkscape), all pass green; TDD Red→Green cycle followed for both tasks

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement blender-wrapper.cjs with tests** - `fb73b33` (feat)
2. **Task 2: Implement inkscape-wrapper.cjs with tests** - `0de8815` (feat)

**Plan metadata:** (docs commit below)

_Note: TDD tasks had Wave 0 scaffold (todo) → RED (failing tests) → GREEN (passing) flow_

## Files Created/Modified

- `bin/lib/app-wrappers/blender-wrapper.cjs` — Blender CapabilityModel builder: parseMajorVersion, buildCapabilityModel (3 capabilities), getMetadata
- `bin/lib/app-wrappers/inkscape-wrapper.cjs` — Inkscape CapabilityModel builder: parseMajorVersion, buildCapabilityModel (1 capability), getMetadata
- `tests/phase-172/blender-wrapper.test.mjs` — 17 tests covering meta shape, all 3 capabilities, metadata fields, version parsing
- `tests/phase-172/inkscape-wrapper.test.mjs` — 18 tests covering meta shape, export capability schema, no-deprecated-flags, metadata, version parsing

## Decisions Made

- Blender asyncRequired=true and startupMs=5000 in getMetadata (not in CapabilityModel meta, which is strings-only per Zod schema)
- Inkscape --without-gui and --batch-process completely absent (deprecated since Inkscape 1.0; GUI auto-suppressed by export flags)
- parseMajorVersion returns null for null/undefined input (numeric type with null vs. "unknown" string sentinel — cleaner null check for callers)
- extensions.subcommandPath is empty array for Inkscape, ['--background', '--factory-startup'] for Blender — reflects actual invocation differences

## Deviations from Plan

None — plan executed exactly as written. TDD Red→Green cycle followed for both tasks.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 03 (GIMP wrapper) can now proceed — same pattern as blender/inkscape wrappers
- generateAppWrapper() in generate.cjs can now invoke blender-wrapper.cjs and inkscape-wrapper.cjs successfully (MODULE_NOT_FOUND stubs resolved)
- Remaining stub from Plan 01: gimp-wrapper.cjs still does not exist (Plan 03 will create it)

## Known Stubs

None. Both wrapper modules are fully implemented and wired into index.cjs.

## Self-Check

- [x] `bin/lib/app-wrappers/blender-wrapper.cjs` exists and exports buildCapabilityModel, getMetadata, parseMajorVersion
- [x] `bin/lib/app-wrappers/inkscape-wrapper.cjs` exists and exports buildCapabilityModel, getMetadata, parseMajorVersion
- [x] Blender: startupMs=5000, asyncRequired=true, --background in subcommandPath
- [x] Inkscape: no --without-gui, no --batch-process, --export-overwrite in description
- [x] Commits fb73b33 and 0de8815 confirmed in git log
- [x] 35/35 tests pass

---
*Phase: 172-core-app-wrappers*
*Completed: 2026-03-29*
