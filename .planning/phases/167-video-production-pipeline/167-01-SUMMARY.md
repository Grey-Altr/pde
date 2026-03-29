---
phase: 167-video-production-pipeline
plan: "01"
subsystem: video-pipeline
tags: [ffmpeg, playwright, video, recording, assembly, captions, tdd]
dependency_graph:
  requires:
    - bin/lib/image-pipeline/assets.cjs (saveAsset pattern reference)
    - playwright (Chromium browser for UI recording)
    - ffmpeg-static@5.3.0 (bundled FFmpeg binary)
  provides:
    - bin/lib/video-pipeline/assets.cjs (saveVideoAsset, resolveResolution, ASSETS_DIR, FFMPEG)
    - bin/lib/video-pipeline/record.cjs (recordUIInteraction)
    - bin/lib/video-pipeline/assemble.cjs (assembleClips, getClipDuration)
    - bin/lib/video-pipeline/caption.cjs (captionVideo, jsonToSrt)
  affects:
    - Plan 167-03 (CLI wiring: /pde:video subcommands consume these modules)
tech_stack:
  added:
    - ffmpeg-static@5.3.0 (bundled FFmpeg binary, no system install required)
  patterns:
    - TDD (RED-GREEN per task, vitest run)
    - CJS modules with execFileSync/spawnSync for FFmpeg subprocess calls
    - Assets sidecar pattern (.meta.json alongside MP4) from image-pipeline
key_files:
  created:
    - bin/lib/video-pipeline/assets.cjs
    - bin/lib/video-pipeline/record.cjs
    - bin/lib/video-pipeline/assemble.cjs
    - bin/lib/video-pipeline/caption.cjs
    - tests/phase-167/assets.test.mjs
    - tests/phase-167/record.test.mjs
    - tests/phase-167/assemble.test.mjs
    - tests/phase-167/caption.test.mjs
    - tests/phase-167/fixtures/.gitkeep
  modified:
    - package.json (added ffmpeg-static@5.3.0)
    - package-lock.json
decisions:
  - "ffmpeg-static used as bundled binary source via require('ffmpeg-static') — no system FFmpeg required"
  - "spawnSync used in getClipDuration instead of execFileSync to reliably capture stderr (FFmpeg exits 1 for -f null -)"
  - "saveVideoAsset copies MP4 via fs.copyFileSync + writes .meta.json sidecar to .planning/design/assets/video/"
  - "jsonToSrt formats times as HH:MM:SS,mmm with comma separator (SRT standard)"
  - "Playwright video path only accessible after context.close() — video ref saved before close per research pitfall #1"
metrics:
  duration: "~7 minutes"
  completed_date: "2026-03-29"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 2
  tests_passing: 25
---

# Phase 167 Plan 01: Video Pipeline Core Modules Summary

**One-liner:** FFmpeg-static video pipeline with Playwright WebM-to-MP4 recording, concat/xfade assembly, SRT caption burn-in, and asset sidecar storage.

## What Was Built

Four CJS modules establishing the video production pipeline primitives:

1. **assets.cjs** — shared foundation module providing `saveVideoAsset()` (copies MP4 + writes `.meta.json` sidecar to `.planning/design/assets/video/`), `resolveResolution()` (handles `720p`/`1080p`/`4k` aliases and `WxH` strings), and the shared `FFMPEG` binary path from `ffmpeg-static`.

2. **record.cjs** — Playwright-based UI screen recorder: launches headless Chromium with `recordVideo` context option, waits `durationMs`, saves video ref before `context.close()`, then converts the WebM output to MP4 via FFmpeg `libx264`. Calls `saveVideoAsset()` to persist with metadata sidecar.

3. **assemble.cjs** — FFmpeg clip assembler: concatenates clips via the concat demuxer (stream copy, no re-encode) for the `none` transition path, or chains `xfade=transition=fade` filters with duration-aware offsets for `crossfade`. Uses `spawnSync` to probe clip duration via FFmpeg stderr parse.

4. **caption.cjs** — FFmpeg caption burn-in: accepts either an SRT file path or a JSON array `[{start, end, text}]` (auto-converted to SRT via `jsonToSrt()`), applies the `subtitles=` filter with `force_style` for font control.

## Tests

25 tests pass across 4 test files:
- `assets.test.mjs` — 13 tests (ASSETS_DIR, RESOLUTION_ALIASES, resolveResolution, saveVideoAsset, FFMPEG export)
- `assemble.test.mjs` — 4 tests (getClipDuration, concat no-transition, concat omitted transition, crossfade)
- `caption.test.mjs` — 7 tests (jsonToSrt formatting, captionVideo with JSON, captionVideo with SRT file)
- `record.test.mjs` — conditional skip if Chromium unavailable; exercises recordUIInteraction and resolution alias

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getClipDuration stderr capture failure**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** `execFileSync` with `stdio: ['pipe','pipe','pipe']` does not reliably expose stderr on the caught error in some Node.js versions; `err.stderr` was empty/undefined, causing the Duration regex to fail
- **Fix:** Switched to `spawnSync` which always captures `result.stderr` as a Buffer regardless of exit code
- **Files modified:** `bin/lib/video-pipeline/assemble.cjs`
- **Commit:** 8c64555

**2. [Rule 1 - Bug] Fixed toEndWith matcher in assets test**
- **Found during:** Task 1 (GREEN phase test run)
- **Issue:** `expect(x).toEndWith('.mp4')` is not a valid vitest/chai matcher
- **Fix:** Replaced with `expect(x).toMatch(/\.mp4$/)`
- **Files modified:** `tests/phase-167/assets.test.mjs`
- **Commit:** 959ac8c

## Known Stubs

None — all four modules are fully wired with real FFmpeg and Playwright calls. `saveVideoAsset` copies real files. Tests generate synthetic MP4 fixtures via `ffmpeg lavfi testsrc2`.

## Self-Check: PASSED

All created files verified on disk. Both task commits verified in git log.
