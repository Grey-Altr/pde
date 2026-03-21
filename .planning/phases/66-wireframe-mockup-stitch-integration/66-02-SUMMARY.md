---
phase: 66-wireframe-mockup-stitch-integration
plan: "02"
subsystem: mockup-workflow
tags: [stitch, mockup, mcp-integration, consent, quota, annotation]
dependency_graph:
  requires: [66-01]
  provides: [mockup-stitch-pipeline]
  affects: [workflows/mockup.md]
tech_stack:
  added: []
  patterns: [ESM createRequire, consent-generate-fetch-annotate-persist, quota check/increment]
key_files:
  created: []
  modified:
    - workflows/mockup.md
decisions:
  - "No PNG fetch in mockup Stitch branch — STH-{slug}-hifi.html is sufficient; stitch:fetch-screen-image deliberately omitted"
  - "Artifact naming STH-{slug}-hifi distinguishes mockup Stitch artifacts from wireframe STH-{slug} artifacts"
  - "stitch:list-screens mentioned only as prohibition (same pattern as wireframe.md) — confirmed list_screens state-sync bug avoidance"
  - "4-STITCH inserted before Step 4a so Stitch path and Claude path are mutually exclusive (jump to 4a when USE_STITCH false)"
metrics:
  duration: "204 seconds"
  completed: "2026-03-21"
  tasks_completed: 2
  files_modified: 1
---

# Phase 66 Plan 02: Mockup Stitch Integration Summary

Extends workflows/mockup.md with a `--use-stitch` flag and full Stitch generation pipeline that mirrors the wireframe Stitch branch from Plan 01, producing STH-{slug}-hifi.html artifacts in mockups/ with consent, annotation, quota, and fallback guarantees.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Add --use-stitch flag, Step 2e parsing, Stitch MCP probe | 85580a7 | Done |
| 2 | Add Step 4-STITCH pipeline (consent, generate, annotate, persist, manifest) | d34d49f | Done |

## What Was Built

### Task 1 — Flag, parsing, probe

Three additions to `workflows/mockup.md`:

1. **Flags table** — new `--use-stitch` row with Boolean type and Stitch MCP description
2. **Check-for-flags line** — `--use-stitch` added to the pre-process flag list
3. **Step 2e** — parses `--use-stitch` from $ARGUMENTS, sets `USE_STITCH = true/false`
4. **Step 3 Stitch probe** — TOOL_MAP_VERIFY_REQUIRED warning check (ESM createRequire), `mcp__stitch__list_projects` probe with 10-second timeout, fallback on failure, Step 3 display line updated to include `Stitch: {available | unavailable | not requested}`

### Task 2 — Stitch generation pipeline (Step 4-STITCH)

Full `#### 4-STITCH. Stitch generation pipeline` section inserted before Step 4a:

- **4-STITCH-A**: Pre-flight `checkStitchQuota('standard')` — handles quota_exhausted (fallback), quota_warning (continue with warning), ok/no_quota_configured (silent continue)
- **4-STITCH-B**: Batch outbound consent — AskUserQuestion listing all screens with service name `stitch.withgoogle.com`; "no" falls back to Claude generation
- **4-STITCH-C**: Per-screen loop — generate-screen (STITCH_FAILED on error), fetch-screen-code (no PNG), annotation injection (5 semantic tags: nav/header/main/section/form), inbound consent showing `STH-{slug}-hifi.html`, persist to `.planning/design/ux/mockups/`, incrementStitchQuota, 10-call manifest registration (`source stitch`, `stitch_annotated true`)
- **4-STITCH-D**: Fallback collection — failed screens route to Claude generation (Step 4a-4b)

Additional updates:
- **Step 6** — STH-{slug}-hifi tracking rows added to ux DESIGN-STATE when Stitch artifacts exist
- **Step 7g** — Stitch Mockups summary row added to final summary table

## Key Differences from Wireframe Stitch Branch

| Aspect | Wireframe (Plan 01) | Mockup (Plan 02) |
|--------|--------------------|--------------------|
| Target path | `.planning/design/ux/wireframes/` | `.planning/design/ux/mockups/` |
| Artifact name | `STH-{slug}` | `STH-{slug}-hifi` |
| PNG fetch | Yes (`stitch:fetch-screen-image`) | No (HTML sufficient) |
| Artifact type | wireframe | mockup |
| Coverage flag | `hasStitchWireframes: true` | `hasMockup: true` (existing, no new flag) |

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

| Check | Expected | Actual | Pass |
|-------|----------|--------|------|
| `--use-stitch` count | >= 3 | 6 | Yes |
| `checkStitchQuota` count | >= 1 | 2 | Yes |
| `AskUserQuestion` count | >= 2 | 2 | Yes |
| `@component:` count | >= 5 | 5 | Yes |
| `STH-{slug}-hifi` count | >= 5 | 15 | Yes |
| `source stitch` count | >= 1 | 1 | Yes |
| `stitch:fetch-screen-image` | = 0 | 0 | Yes |
| `stitch:list-screens` in pipeline | = 0 calls | 1 prohibition note only | Yes |

## Self-Check

- [x] workflows/mockup.md modified and committed
- [x] Commit 85580a7 (Task 1) verified
- [x] Commit d34d49f (Task 2) verified
- [x] No stitch:fetch-screen-image in mockup Stitch branch
- [x] STH-{slug}-hifi.html in .planning/design/ux/mockups/ (not wireframes/)
- [x] Consent, annotation, fallback all present in correct order

## Self-Check: PASSED
