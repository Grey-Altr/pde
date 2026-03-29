---
phase: 175-design-pipeline-integration
plan: 02
subsystem: design-pipeline-integration
tags: [blender, gimp, wireframe, mockup, optional-steps, graceful-degradation]
dependency_graph:
  requires:
    - 175-01 (probe-app-tool.cjs, blender-chain.cjs, gimp-chain.cjs)
  provides:
    - workflows/wireframe.md Step 3.5 + Step 4-BLENDER
    - workflows/mockup.md Step 3.5 + Step 4-GIMP
  affects:
    - /pde:wireframe command (optional Blender 3D render)
    - /pde:mockup command (optional GIMP retouch)
tech_stack:
  added: []
  patterns:
    - probeAppTool gate pattern (flag-first → registry probe → available/skip)
    - Graceful degradation with HTML skip comment annotations
    - Per-screen GIMP input check (screenshot PNG required)
key_files:
  modified:
    - workflows/wireframe.md
    - workflows/mockup.md
decisions:
  - "--no-app-tools flag disables all desktop app probes in both workflows, consistent with --no-mcp pattern"
  - "GIMP step requires screenshot PNG input per screen — per-screen skip (not whole-step skip) when PNG absent"
  - "Blender errors at runtime are caught and degraded gracefully — workflow never halts on optional step failure"
  - "Step 3.5 inserted as ### (not ####) to match existing conditional step convention (1.5/7)"
metrics:
  duration: ~10 minutes
  completed: "2026-03-29T20:34:44Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 175 Plan 02: Design Pipeline Integration — Workflow Integration Summary

Optional Blender 3D step wired into wireframe.md and optional GIMP retouch step wired into mockup.md, both gated by probeAppTool registry probe with graceful degradation via HTML skip comment annotations when tools are unavailable.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add Blender probe + optional 3D wireframe step to wireframe.md | c388115 | workflows/wireframe.md |
| 2 | Add GIMP probe + optional retouch step to mockup.md | ad15079 | workflows/mockup.md |

## What Was Built

### wireframe.md Changes

- **Step 3.5/7 added** (between Step 3 MCP probes and Step 4 generation): Probes Blender via `probeAppTool('blender', registryPath)`. Sets `BLENDER_AVAILABLE` and `BLENDER_ENTRY` or `BLENDER_SKIP_REASON`. Gated by `--no-app-tools` flag (sets `BLENDER_AVAILABLE = false` immediately, skips probe).

- **Step 4-BLENDER added** (last substep of Step 4/7, before `---` separator to Step 5): When `BLENDER_AVAILABLE = false`, appends skip HTML comment to each wireframe file and continues. When `BLENDER_AVAILABLE = true`, iterates wireframes that have `.planning/design/3d/{screen-slug}.blend` files, calls `runBlenderGLBChain`, appends `<!-- 3D-PREVIEW: ... -->` snippet. Runtime errors caught per-screen, workflow never halted.

- **`--no-app-tools` flag** added to flags table and initial check line.

### mockup.md Changes

- **Step 3.5/7 added** (between Step 3 MCP probes and Step 4 generation): Probes GIMP via `probeAppTool('gimp', registryPath)`. Sets `GIMP_AVAILABLE` and `GIMP_ENTRY` or `GIMP_SKIP_REASON`. Gated by `--no-app-tools` flag.

- **Step 4-GIMP added** (last substep of Step 4/7, before the `<!-- /OPTIMIZABLE -->` zone): When `GIMP_AVAILABLE = false`, appends skip HTML comment and continues. When `GIMP_AVAILABLE = true`, per-screen: globs for `.planning/design/assets/screenshot/{screen-slug}-*.png` — if none found, logs skip reason and continues (Research Pitfall 4: GIMP requires input PNG). For screens with a screenshot, calls `runGIMPRetouchChain`, output saved via Phase 165 saveAsset. Runtime errors caught per-screen, workflow never halted.

- **`--no-app-tools` flag** added to flags table and initial check line.

## Success Criteria Verification

- [x] wireframe.md has Step 3.5 (Blender probe) and Step 4-BLENDER (optional 3D render) with graceful degradation
- [x] mockup.md has Step 3.5 (GIMP probe) and Step 4-GIMP (optional retouch) with graceful degradation
- [x] Both workflows complete without error when Blender/GIMP absent — skip notes as HTML comments
- [x] When Blender approved, wireframe 3D render feeds into Phase 168 GLB optimize + model-viewer pipeline
- [x] When GIMP approved and screenshots exist, mockup retouch feeds into Phase 165 saveAsset pipeline
- [x] `--no-app-tools` flag disables all app tool probes in both workflows
- [x] No existing step content modified — only new sections inserted
- [x] Step numbering (1-7) preserved — Steps 3.5 inserted between 3 and 4

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The new steps are workflow instructions (Markdown), not code. The underlying modules (`probe-app-tool.cjs`, `blender-chain.cjs`, `gimp-chain.cjs`) are implemented in Plan 01.

## Self-Check: PASSED

- workflows/wireframe.md: FOUND and modified (81 lines inserted)
- workflows/mockup.md: FOUND and modified (80 lines inserted)
- Commit c388115: wireframe.md Task 1
- Commit ad15079: mockup.md Task 2
