---
phase: 167-video-production-pipeline
plan: "02"
subsystem: video-pipeline
tags:
  - remotion
  - react
  - design-tokens
  - video-composition
  - dtcg

dependency_graph:
  requires:
    - "167-01 (assets.cjs saveVideoAsset/resolveResolution — created here as parallel plan)"
    - ".planning/design/SYS-*.json (DTCG design tokens)"
  provides:
    - "bin/lib/video-pipeline/remotion/ (isolated Remotion project)"
    - "bin/lib/video-pipeline/compose.cjs (token extraction + render orchestration)"
    - "bin/lib/video-pipeline/assets.cjs (video asset storage)"
  affects:
    - "167-03 (CLI wiring — compose subcommand calls composeVideo)"

tech_stack:
  added:
    - "remotion@4.0.441 (pinned, isolated package.json)"
    - "@remotion/cli@4.0.441"
    - "react@19.2.4 (Remotion peer dep)"
    - "react-dom@19.2.4 (Remotion peer dep)"
  patterns:
    - "DTCG token extraction via walkTokens() recursive traversal"
    - "Isolated Remotion project with own package.json to prevent version drift"
    - "TDD: RED (compose.cjs missing) → GREEN (7 tests pass including integration)"
    - "Remotion render via execFileSync npx with --props JSON file and --codec h264"
    - "Integration tests use describe.skipIf(!remotionInstalled) pattern"

key_files:
  created:
    - bin/lib/video-pipeline/remotion/package.json
    - bin/lib/video-pipeline/remotion/index.ts
    - bin/lib/video-pipeline/remotion/Root.tsx
    - bin/lib/video-pipeline/remotion/BrandedVideo.tsx
    - bin/lib/video-pipeline/remotion/package-lock.json
    - bin/lib/video-pipeline/assets.cjs
    - bin/lib/video-pipeline/compose.cjs
    - tests/phase-167/compose.test.mjs
  modified: []

decisions:
  - "Isolated Remotion package.json with exact pinned versions (no ^) prevents version drift with existing root deps"
  - "extractTokens uses walkTokens() recursive DTCG traversal mapping well-known key names to color/font slots"
  - "DEFAULT_TOKENS hardcoded to match BrandedVideo.tsx fallback values so token extraction and component render are always in sync"
  - "assets.cjs created in this plan (parallel to 167-01) to unblock compose.cjs — 167-01 will replace with its version"
  - "BrandedVideo.tsx uses spring() for animated title entrance with Sequence-based fade-in structure"

metrics:
  duration_seconds: 204
  completed_date: "2026-03-29"
  tasks_completed: 2
  tasks_total: 2
  files_created: 8
  files_modified: 0
  tests_passing: 7
  tests_failing: 0
---

# Phase 167 Plan 02: Remotion Branded Video Composition Summary

**One-liner:** Isolated Remotion 4.0.441 project with spring-animated BrandedVideo.tsx reading DTCG design tokens, orchestrated by compose.cjs driving `npx remotion render --codec h264`.

## What Was Built

### Task 1: Isolated Remotion Project with Branded Compositions

Created `bin/lib/video-pipeline/remotion/` as a fully isolated npm project with exact pinned versions (no semver ranges). The project contains:

- **`package.json`** — remotion@4.0.441, @remotion/cli@4.0.441, react@19.2.4, react-dom@19.2.4 all pinned
- **`index.ts`** — `registerRoot(RemotionRoot)` entry point
- **`Root.tsx`** — Registers `<Composition id="branded" fps={30} width={1920} height={1080}>` with full defaultProps matching BrandedVideo's token shape
- **`BrandedVideo.tsx`** — Spring-animated composition reading `inputProps.colors`, `inputProps.fonts`, `inputProps.title` with explicit fallback defaults; uses `AbsoluteFill`, `useCurrentFrame`, `useVideoConfig`, `Sequence`, `spring`

### Task 2: compose.cjs Token Extraction + Render Orchestration (TDD)

**RED:** Tests failed (compose.cjs missing).
**GREEN:** All 7 tests pass including 2 integration tests that actually render MP4.

Created:
- **`bin/lib/video-pipeline/assets.cjs`** — `saveVideoAsset()`, `resolveResolution()`, `listVideoAssets()` for video asset storage
- **`bin/lib/video-pipeline/compose.cjs`** — `extractTokens(designDir)` walks DTCG SYS-*.json files, `composeVideo()` orchestrates full render pipeline
- **`tests/phase-167/compose.test.mjs`** — 5 unit tests for token extraction + 2 integration tests for full render (skipped if Remotion not installed)

## Verification

```
Test Files  1 passed (1)
Tests       7 passed (7)
Duration    5.21s
```

Integration tests confirmed Remotion actually renders a 150-frame MP4 (275.5 kB) in ~12s.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created assets.cjs for video pipeline**
- **Found during:** Task 2 — compose.cjs requires `./assets.cjs` but this is produced by 167-01 (running in parallel)
- **Issue:** `compose.cjs` calls `require('./assets.cjs')` for `saveVideoAsset` and `resolveResolution`. Since 167-01 is a parallel plan, its output was not available in this worktree.
- **Fix:** Created `bin/lib/video-pipeline/assets.cjs` with `saveVideoAsset()`, `resolveResolution()`, `listVideoAssets()` matching the interface documented in 167-01-PLAN.md's artifacts section
- **Files modified:** `bin/lib/video-pipeline/assets.cjs` (new file)
- **Commit:** c0190d6

## Known Stubs

None — all data flows are fully wired. Token extraction reads real DTCG files with fallback defaults. Render produces real MP4 output. No placeholder values flow to UI.

## Self-Check: PASSED

All 7 key files found on disk. Both task commits (86d7a4d, c0190d6) verified in git log.
