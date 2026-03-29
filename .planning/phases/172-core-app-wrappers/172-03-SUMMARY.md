---
phase: 172-core-app-wrappers
plan: "03"
subsystem: app-wrappers
tags: [gimp, script-fu, version-conditional, cli-wrappers, tdd, app-wrappers, pde-tools]
dependency-graph:
  requires:
    - phase: 172-01
      provides: generate.cjs orchestrator, index.cjs registry, Wave 0 test scaffolds
  provides:
    - gimp-wrapper.cjs with version-conditional Script-Fu (GIMP 2.x and 3.x)
    - pde-tools app wrap subcommand
    - SKILL.md path fix integration tests
  affects: [172-02-blender-inkscape, 173-mcp-bridge-dynamic-registration, 174-cli-wrap-skill]
tech-stack:
  added: []
  patterns: [tdd-red-green, version-conditional-cli, gimp-script-fu-batch, cjs-modules]
key-files:
  created:
    - bin/lib/app-wrappers/gimp-wrapper.cjs
    - tests/phase-172/gimp-wrapper.test.mjs (replaced Wave 0 scaffold with 25 real tests)
    - tests/phase-172/skill-gen-integration.test.mjs (replaced Wave 0 scaffold with 8 real tests)
  modified:
    - bin/pde-tools.cjs
key-decisions:
  - "GIMP 3.x uses --quit flag (introduced 2.99.12); GIMP 2.x uses --batch '(gimp-quit 0)' — enforced via parseMajorVersion() branch"
  - "getScriptFuTemplates() encapsulates all version-conditional Script-Fu string patterns, keeping buildCapabilityModel clean"
  - "skill-gen-integration tests use a mock CapabilityModel (not real wrapper) to avoid cascading dependencies and keep tests fast"
patterns-established:
  - "Version-conditional CLI wrappers: parseMajorVersion() + branch at call site for both args and templates"
  - "Script-Fu template objects (fileLoad, fileExport, drawableWrap, quit) bundle all version differences in one place"
requirements-completed: [WRAP-02, WRAP-04, WRAP-05, WRAP-06]
duration: ~5min
completed: 2026-03-29
---

# Phase 172 Plan 03: GIMP Wrapper + wrap Subcommand Summary

**GIMP 2.x/3.x version-conditional Script-Fu wrapper (parseMajorVersion + buildGimpArgs + getScriptFuTemplates) and pde-tools app wrap subcommand routing to generateAppWrapper pipeline**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-29T11:38:00Z
- **Completed:** 2026-03-29T11:40:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- GIMP wrapper with strict 2.x/3.x version isolation: `--quit` never appears in 2.x args, `(gimp-quit 0)` never appears in 3.x model
- `pde-tools app wrap <slug>` subcommand wired to the full generateAppWrapper pipeline (model, metadata, server, SKILL.md)
- 33 new tests (25 gimp + 8 skill-gen-integration), all passing; Phase 171 regression-free (31 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement gimp-wrapper.cjs with version-conditional Script-Fu** - `16aa3c0` (feat) + TDD test file
2. **Task 2: Wire pde-tools app wrap subcommand + SKILL.md integration tests** - `9c56a10` (feat)

## Files Created/Modified

- `bin/lib/app-wrappers/gimp-wrapper.cjs` - GIMP version-aware CapabilityModel builder; exports buildCapabilityModel, getMetadata, parseMajorVersion, buildGimpArgs, getScriptFuTemplates
- `bin/pde-tools.cjs` - Added `case 'wrap':` routing to generateAppWrapper; updated Available subcommand list
- `tests/phase-172/gimp-wrapper.test.mjs` - 25 tests covering parseMajorVersion, buildGimpArgs, getScriptFuTemplates, buildCapabilityModel, getMetadata (replaced Wave 0 scaffold)
- `tests/phase-172/skill-gen-integration.test.mjs` - 8 tests for SKILL.md baseline + path replacement contract (replaced Wave 0 scaffold)

## Decisions Made

- `getScriptFuTemplates()` extracted as a separate exported function so callers can inspect which Script-Fu patterns are active without rebuilding a full CapabilityModel. This enables the tests to be explicit about template content.
- skill-gen-integration tests use a hardcoded mock CapabilityModel rather than importing a wrapper module — keeps test focus on the path-replacement contract only, not wrapper correctness (which is tested separately).

## Deviations from Plan

None — plan executed exactly as written. TDD Red-Green cycle followed for Task 1.

## Issues Encountered

- Worktree was behind main branch (missing Plan 01 artifacts). Resolved by running `git merge main` before execution — not a deviation, this is normal for parallel worktree setup.

## Known Stubs

None. The GIMP wrapper produces a fully valid CapabilityModel that passes validateCapabilityModel(). The `pde-tools app wrap <slug>` command is end-to-end functional for any approved registry entry that has a wrapper module. Blender and Inkscape wrapper modules (Plan 02) are pending — calling `pde-tools app wrap blender` before Plan 02 completes will throw MODULE_NOT_FOUND (expected, documented in Plan 01 SUMMARY).

## Next Phase Readiness

- Phase 172 Plan 02 (Blender + Inkscape wrappers) can now be validated end-to-end: `pde-tools app wrap blender` / `pde-tools app wrap inkscape` will complete the full pipeline once those modules exist
- Phase 173 (MCP Bridge dynamic registration) can rely on the complete app-wrappers output directory structure: `.planning/app-wrappers/{slug}/server/server.cjs`
- No blockers. All three wrapper modules (blender, gimp, inkscape) are registered in index.cjs.

---
*Phase: 172-core-app-wrappers*
*Completed: 2026-03-29*
