---
phase: 168-ai-3d-generation-web-embedding
plan: "03"
subsystem: cli-routing
tags: [3d-pipeline, pde-tools, cli, commands, ar, model-viewer]
dependency_graph:
  requires: ["168-01", "168-02"]
  provides: ["pde:3d CLI surface", "/pde:3d command docs"]
  affects: ["bin/pde-tools.cjs", "commands/3d.md"]
tech_stack:
  added: []
  patterns: ["args.indexOf() flag parsing", "case block routing after video case"]
key_files:
  created:
    - commands/3d.md
  modified:
    - bin/pde-tools.cjs
decisions:
  - "3d.md placed in commands/ (root) not bin/lib/commands/ — all command docs follow root commands/ pattern"
metrics:
  duration: "8 minutes"
  completed: "2026-03-29"
  tasks_completed: 2
  files_changed: 2
---

# Phase 168 Plan 03: 3D CLI Wiring + Command Docs Summary

**One-liner:** Wired all 3D pipeline modules into pde-tools.cjs as `case '3d'` with generate|convert|optimize|embed|list subcommands, plus /pde:3d command documentation.

## What Was Built

### Task 1: 3d case block in pde-tools.cjs

Added `case '3d':` block to `bin/pde-tools.cjs` after the `video` case and before `phase-plan-index`. Implements five subcommands:

- **generate** — routes to `generate3D()` with `--prompt` + optional `--slug`; prints JSON meta
- **convert** — routes to `convert3D()` with `--image` (reads file to Buffer) + optional `--slug`; prints JSON meta
- **optimize** — routes to `optimizeGLB()` with `--input`, optional `--output` and `--texture-max`; prints JSON result
- **embed** — routes to `generateEmbed()` with `--glb`, optional `--slug` and `--camera-orbit`; prints `{ embedPath, snippet }`
- **list** — routes to `list3DAssets()` using `THREE_D_DIR`; prints JSON array

All subcommands use `args.indexOf()` flag parsing consistent with the video case pattern. Missing required args print usage and exit 1.

### Task 2: /pde:3d command documentation

Created `commands/3d.md` documenting all five subcommands with:
- Prerequisites section (HF_TOKEN with link)
- Full options table per subcommand with examples
- AR fallback behavior (WebXR + iOS Quick Look via model-viewer)
- Notes on HF Space availability, local GPU TripoSR option, gltf-transform dependency

## Verification Results

```
node bin/pde-tools.cjs 3d              → Usage: 3d <generate|convert|optimize|embed|list> [options]
node bin/pde-tools.cjs 3d generate     → Usage: 3d generate --prompt <text> [--slug <slug>]
node bin/pde-tools.cjs 3d convert      → Usage: 3d convert --image <path> [--slug <slug>]
node bin/pde-tools.cjs 3d optimize     → Usage: 3d optimize --input <path.glb> [--output <path.glb>] [--texture-max <px>]
node bin/pde-tools.cjs 3d embed        → Usage: 3d embed --glb <path.glb> [--slug <slug>] [--camera-orbit <orbit>]
node bin/pde-tools.cjs 3d list         → [] (empty JSON array)
npx vitest run tests/phase-168/        → 41 passed (5 test files)
```

## Deviations from Plan

### Auto-applied corrections

**1. [Rule 1 - Bug] Corrected output file path for command docs**
- **Found during:** Task 2
- **Issue:** Plan specified `bin/lib/commands/3d.md` but no such directory exists — all command docs in the codebase live at `commands/` (root level): `commands/image.md`, `commands/video.md`, etc.
- **Fix:** Created `commands/3d.md` at root level following established pattern
- **Files modified:** `commands/3d.md`
- **Commit:** ce86fa6

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | b0a6f14 | feat(168-03): wire 3D pipeline subcommands into pde-tools.cjs |
| 2 | ce86fa6 | feat(168-03): create /pde:3d command documentation |

## Known Stubs

None — all subcommands route to real pipeline modules from Plans 01 and 02.
