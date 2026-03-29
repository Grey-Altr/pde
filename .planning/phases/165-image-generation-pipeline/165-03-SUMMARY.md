---
phase: 165-image-generation-pipeline
plan: 03
subsystem: image-pipeline
tags: [pde-tools, cli-routing, image-pipeline, og, social, screenshot, mockup, rembg, command-docs]

# Dependency graph
requires:
  - phase: 165-01
    provides: "og.cjs, social.cjs, assets.cjs, templates — OG + social card generation"
  - phase: 165-02
    provides: "screenshot.cjs, mockup.cjs, rembg.cjs — screenshot, mockup, background removal"
provides:
  - "bin/pde-tools.cjs: case 'image' routing all 6 subcommands (og, social, screenshot, mockup, rembg, list)"
  - "commands/image.md: /pde:image command documentation with all 6 subcommands, examples, prerequisites"
affects: [166-visual-diff, 170-utilities]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Image CLI routing: args.indexOf() flag parsing for each subcommand, consistent with existing cli-anything pattern"
    - "ASSETS_DIR injection: CLI passes ASSETS_DIR from assets.cjs so all subcommands save to canonical output path"

key-files:
  created:
    - commands/image.md
  modified:
    - bin/pde-tools.cjs

key-decisions:
  - "Pass ASSETS_DIR from assets.cjs to all saving subcommands (og, social, screenshot, mockup, rembg) so CLI always persists output to .planning/design/assets/"
  - "Use args.indexOf() pattern (not a getFlag helper) to match existing pde-tools.cjs conventions for flag parsing"

patterns-established:
  - "Image subcommand routing: case 'image' follows identical structure to case 'cli-anything' in pde-tools.cjs"

requirements-completed: [IMG-01, IMG-02, IMG-03, IMG-04, IMG-07, IMG-08]

# Metrics
duration: 12min
completed: 2026-03-29
---

# Phase 165 Plan 03: Image Pipeline Wiring + Command Docs Summary

**`node bin/pde-tools.cjs image og|social|screenshot|mockup|rembg|list` fully wired into pde-tools.cjs with /pde:image command documentation for agent discovery**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-29T02:40:00Z
- **Completed:** 2026-03-29T02:52:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `case 'image':` block to pde-tools.cjs routing all 6 subcommands to their respective image-pipeline modules
- Each subcommand uses `args.indexOf()` pattern for flag parsing, consistent with existing pde-tools.cjs conventions
- All saving subcommands (og, social, screenshot, mockup, rembg) default to canonical ASSETS_DIR output
- Created commands/image.md documenting all 6 subcommands with usage examples, options, prerequisites, and asset storage spec

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire image subcommands into pde-tools.cjs** - `8cb2ed6` (feat)
2. **Task 2: Create /pde:image command documentation** - `9371028` (feat)

## Files Created/Modified

- `bin/pde-tools.cjs` — Added `case 'image':` block with 6 subcommand routes + usage docs in comment header
- `commands/image.md` — Full /pde:image command documentation (221 lines) with all 6 subcommands

## Decisions Made

- Passed `ASSETS_DIR` from `assets.cjs` to all subcommands that save files, so CLI output always goes to `.planning/design/assets/` rather than returning null meta. This makes the CLI useful out-of-the-box without users needing to specify output dirs.
- Used `args.indexOf()` flag parsing (not a new `getFlag` helper) to match the existing pattern already used throughout pde-tools.cjs (e.g., `const limitIdx = args.indexOf('--limit')`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added assetsDir to all saving subcommands**
- **Found during:** Task 1 (Wire image subcommands)
- **Issue:** Plan showed `generateOgImage({ title, description, slug })` without `assetsDir`, causing `result.meta` to be `null` — the image was generated but not saved, making the CLI output useless
- **Fix:** Added `const { ASSETS_DIR } = require('./lib/image-pipeline/assets.cjs')` and passed `assetsDir: ASSETS_DIR` to og, social, screenshot, mockup, and rembg calls
- **Files modified:** bin/pde-tools.cjs
- **Verification:** `node bin/pde-tools.cjs image og --title "Test" --slug test` returns full JSON metadata; `node bin/pde-tools.cjs image list` returns populated array
- **Committed in:** 8cb2ed6 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required for correct operation — without assetsDir, CLI output would be null. No scope creep.

## Issues Encountered

- Plans 165-01 and 165-02 were executed in parallel by other agents. This worktree was behind — merged commit `87894b9` (165-02 SUMMARY) via fast-forward to get all image-pipeline modules before proceeding.

## Next Phase Readiness

- All 6 image subcommands callable via `node bin/pde-tools.cjs image <subcommand>`
- Assets stored in `.planning/design/assets/{type}/` with JSON sidecar metadata
- `/pde:image` command documented and discoverable by agents
- Phase 166 (visual diff) can now consume assets from `.planning/design/assets/` via `image list`

---
*Phase: 165-image-generation-pipeline*
*Completed: 2026-03-29*
