---
phase: 165-image-generation-pipeline
plan: "02"
subsystem: image-pipeline
tags: [playwright, sharp, remove.bg, screenshot, mockup, rembg]
dependency_graph:
  requires: [165-01]
  provides: [screenshot.cjs, mockup.cjs, rembg.cjs, templates/mockup-frames/]
  affects: [pde-tools image subcommands]
tech_stack:
  added: [playwright@1.58.2, sharp@0.34.5]
  patterns: [TDD-RED-GREEN, playwright-headless, sharp-composite, formdata-fetch]
key_files:
  created:
    - bin/lib/image-pipeline/screenshot.cjs
    - bin/lib/image-pipeline/mockup.cjs
    - bin/lib/image-pipeline/rembg.cjs
    - templates/mockup-frames/browser.png
    - templates/mockup-frames/phone.png
    - templates/mockup-frames/frames.json
    - tests/phase-165/screenshot.test.mjs
    - tests/phase-165/mockup.test.mjs
    - tests/phase-165/rembg.test.mjs
    - tests/phase-165/fixtures/frame-100x100.png
  modified:
    - package.json (sharp added as dependency)
decisions:
  - rembg USAGE_PATH computed dynamically via getUsagePath() (not at module load) to allow test isolation via process.cwd() patching
  - prevMonth() uses string arithmetic (not Date.setMonth) to avoid JS Date overflow on non-leap month boundaries
  - Chromium availability detected synchronously at test module load via execFileSync so it.skipIf evaluates before beforeAll
  - Sharp installed explicitly at plan execution (was missing from node_modules after worktree merge)
metrics:
  duration_seconds: 352
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_created: 10
---

# Phase 165 Plan 02: Screenshot, Mockup, and Background Removal Summary

**One-liner:** Playwright headless screenshot capture with named viewport presets, Sharp device-frame compositing, and remove.bg API client with monthly usage tracking (warn at 40/50, block at 50/50).

## What Was Built

### Task 1: Screenshot capture + device mockup compositing

**`bin/lib/image-pipeline/screenshot.cjs`**
- `VIEWPORT_PRESETS`: `desktop` (1440x900), `tablet` (768x1024), `mobile` (375x812)
- `captureScreenshot({ url, viewport, slug, outputDir, format, timeout })`:
  - Resolves viewport from named preset, `WxH` string, or `{ width, height }` object
  - Launches headless Chromium, navigates with `waitUntil: 'networkidle'`
  - Saves PNG via `saveAsset()`, returns `{ buffer, path, meta }`
  - Browser always closed in `finally` block

**`bin/lib/image-pipeline/mockup.cjs`**
- `generateMockup({ screenshotPath, frame, slug, outputDir, framesDir })`:
  - Reads `frames.json` for viewport rectangle (`top`, `left`, `width`, `height`)
  - Resizes screenshot via Sharp `resize({ fit: 'cover' })` to viewport area
  - Composites onto frame PNG via Sharp `composite()`
  - Saves via `saveAsset()`, returns `{ buffer, path, meta }`

**Frame templates** (`templates/mockup-frames/`):
- `browser.png`: 1500x1000 — grey browser chrome (60px header, 20px side/bottom borders), generated from SVG via Sharp
- `phone.png`: 430x880 — dark rounded border (20px padding, 60px top for camera), generated from SVG via Sharp
- `frames.json`: `{ browser: { top:60, left:20, width:1460, height:920 }, phone: { top:60, left:20, width:390, height:780 } }`

### Task 2: Background removal (TDD)

**`bin/lib/image-pipeline/rembg.cjs`**
- `loadUsage()`: reads `.planning/cli-anything/removebg-usage.json`, resets to `{ month, count:0 }` when stored month differs from current
- `saveUsage(usage)`: writes usage JSON, creates parent dirs if needed
- `removeBackground({ inputPath, slug, outputDir })`:
  - Returns `null` + `console.warn` if `REMOVEBG_API_KEY` not set
  - Throws if `count >= 50` (MONTHLY_LIMIT)
  - Warns if `count >= 40` (WARN_THRESHOLD)
  - POSTs to `https://api.remove.bg/v1.0/removebg` with `X-Api-Key` header + native `FormData`/`Blob`
  - Handles 429 (rate limit) and other non-ok responses with descriptive errors
  - Increments usage count, saves via `saveAsset()`
  - API key NOT stored in metadata sidecar

## Test Results

| Test File | Tests | Result |
|-----------|-------|--------|
| screenshot.test.mjs | 14/14 | GREEN |
| mockup.test.mjs | 6/6 | GREEN |
| rembg.test.mjs | 11/11 | GREEN |
| assets.test.mjs (plan 01) | 9/9 | GREEN |
| og.test.mjs (plan 01) | 3/3 | GREEN |
| social.test.mjs (plan 01) | 3/3 | GREEN |
| **Phase total** | **40/40** | **GREEN** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Sharp not in node_modules after merge**
- **Found during:** Task 1 setup
- **Issue:** `sharp` listed in `package.json` but not installed in this worktree after fast-forward merge from main
- **Fix:** `npm install --save sharp`
- **Files modified:** `package.json`, `package-lock.json`
- **Commit:** a2433fe

**2. [Rule 1 - Bug] `getUsagePath()` dynamic to enable test isolation**
- **Found during:** Task 2 GREEN phase
- **Issue:** `USAGE_PATH` computed at module load time captured the real `process.cwd()`, not the test-patched temp dir
- **Fix:** Replaced constant `USAGE_PATH` with `getUsagePath()` function called at call time inside `loadUsage()`/`saveUsage()`
- **Files modified:** `bin/lib/image-pipeline/rembg.cjs`
- **Commit:** 440c762

**3. [Rule 1 - Bug] `prevMonth()` Date overflow on non-leap month boundaries**
- **Found during:** Task 2 testing (REMBG-4 failing)
- **Issue:** `new Date(); d.setMonth(d.getMonth() - 1)` on March 29 UTC produces March 1 (Feb 29 doesn't exist in 2026) — both current and prev month returned same `2026-03` string
- **Fix:** Replaced `Date.setMonth()` with string arithmetic in `prevMonth()` helper in test file
- **Files modified:** `tests/phase-165/rembg.test.mjs`
- **Commit:** 440c762

**4. [Rule 3 - Blocking] Chromium skipIf evaluated before beforeAll**
- **Found during:** Task 1 first test run (4 tests skipped unexpectedly)
- **Issue:** `it.skipIf(!chromiumAvailable)` evaluates at module import time; setting `chromiumAvailable` inside `beforeAll` is too late
- **Fix:** Detect Chromium synchronously at module level via `execFileSync` calling `chromium.executablePath()`
- **Files modified:** `tests/phase-165/screenshot.test.mjs`
- **Commit:** a2433fe

## Known Stubs

None — all functions are fully wired. `removeBackground()` requires `REMOVEBG_API_KEY` at runtime but gracefully skips without it (per locked decision in CONTEXT.md).

## Self-Check: PASSED

All 10 created files verified on disk. All 3 task commits verified in git history:
- `a2433fe`: feat(165-02) screenshot + mockup + frames
- `b0ae5bc`: test(165-02) rembg RED phase
- `440c762`: feat(165-02) rembg GREEN phase
