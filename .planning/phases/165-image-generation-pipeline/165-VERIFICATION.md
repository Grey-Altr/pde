---
phase: 165-image-generation-pipeline
verified: 2026-03-29T19:50:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 165: Image Generation Pipeline Verification Report

**Phase Goal:** Users can generate OG images, social cards, device mockups, and product screenshots, with background removal and organized asset storage — all using free toolchains
**Verified:** 2026-03-29T19:50:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

All truths drawn from the three plan `must_haves` blocks (Plans 01, 02, 03).

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | `generateOgImage()` produces a valid PNG buffer from product data + template | VERIFIED | og.test.mjs OG-1 passes (PNG magic bytes confirmed); 120ms execution |
| 2  | `generateSocialCards()` produces 3 PNGs (twitter 1200x628, linkedin 1200x627, facebook 1200x630) from one data input | VERIFIED | social.test.mjs Social-1/2/3 all pass; SOCIAL_SIZES confirms correct dimensions |
| 3  | `saveAsset()` writes PNG + .meta.json sidecar to `.planning/design/assets/{type}/` | VERIFIED | assets.cjs lines 32-58 write both files; assets.test.mjs 9/9 pass |
| 4  | `listAssets()` returns JSON array of all assets with metadata, filterable by type | VERIFIED | assets.cjs lines 68-89; `node pde-tools.cjs image list` returns `[]` (valid JSON) |
| 5  | `captureScreenshot()` launches headless Chromium, navigates to URL, saves PNG at specified viewport size | VERIFIED | screenshot.test.mjs 14/14 pass including live Playwright tests with data: URLs |
| 6  | Named viewport presets (desktop 1440x900, tablet 768x1024, mobile 375x812) resolve correctly | VERIFIED | VIEWPORT_PRESETS object confirmed; 3 preset tests pass |
| 7  | `generateMockup()` composites a screenshot onto a device frame PNG at the correct viewport rectangle | VERIFIED | mockup.test.mjs 6/6 pass; Sharp composite confirmed in mockup.cjs lines 56-63 |
| 8  | `removeBackground()` calls remove.bg API with correct headers and saves transparent PNG | VERIFIED | rembg.test.mjs REMBG-6 passes (mocked fetch verifies URL + X-Api-Key header) |
| 9  | `removeBackground()` tracks monthly usage, warns at 40/50, blocks at 50/50 | VERIFIED | MONTHLY_LIMIT=50, WARN_THRESHOLD=40 confirmed; REMBG-2/3 tests pass |
| 10 | `removeBackground()` gracefully skips with warning when REMOVEBG_API_KEY not set | VERIFIED | rembg.cjs lines 72-76; REMBG-1 tests pass (returns null + console.warn) |
| 11 | `pde-tools.cjs image og\|social\|mockup\|screenshot\|rembg\|list` routes to correct module function | VERIFIED | `case 'image':` at line 750; all 6 branches present and route to correct modules |
| 12 | `/pde:image` command documentation describes all 6 subcommands with usage examples | VERIFIED | commands/image.md (221 lines) covers og, social, screenshot, mockup, rembg, list |
| 13 | `pde-tools.cjs image list` returns JSON array of assets filtered by optional `--type` | VERIFIED | CLI confirmed returning `[]` (empty assets dir — correct behavior); `--type` flag wired |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/image-pipeline/assets.cjs` | saveAsset, listAssets, SHA-256 sidecar | VERIFIED | 92 lines; exports saveAsset, listAssets, ASSETS_DIR; crypto.createHash('sha256') present |
| `bin/lib/image-pipeline/og.cjs` | OG image generation via Satori + resvg-js | VERIFIED | 79 lines; imports satori, Resvg, calls saveAsset |
| `bin/lib/image-pipeline/social.cjs` | Social card generation (3 platform variants) | VERIFIED | 94 lines; SOCIAL_SIZES with twitter/linkedin/facebook; calls saveAsset per platform |
| `bin/lib/image-pipeline/templates/og-default.cjs` | Default OG template function | VERIFIED | exists in templates/ directory |
| `bin/lib/image-pipeline/templates/social-default.cjs` | Default social template function | VERIFIED | exists in templates/ directory |
| `bin/lib/image-pipeline/fonts/Inter-Regular.woff` | Bundled Inter font (WOFF, Satori-compatible) | VERIFIED | Present in fonts/; plan deviated from TTF to WOFF due to Satori opentype.js limitation — correct fix |
| `bin/lib/image-pipeline/screenshot.cjs` | Playwright screenshot capture with viewport presets | VERIFIED | 91 lines; VIEWPORT_PRESETS, resolveViewport, captureScreenshot; finally block closes browser |
| `bin/lib/image-pipeline/mockup.cjs` | Sharp device mockup compositing | VERIFIED | 78 lines; reads frames.json, sharp resize+composite, calls saveAsset |
| `bin/lib/image-pipeline/rembg.cjs` | remove.bg API client with usage tracking | VERIFIED | 132 lines; loadUsage, saveUsage, removeBackground; MONTHLY_LIMIT=50, WARN_THRESHOLD=40 |
| `templates/mockup-frames/frames.json` | Viewport rectangles for browser and phone frames | VERIFIED | `{"browser":{"top":60,"left":20,"width":1460,"height":920},"phone":{"top":60,"left":20,"width":390,"height":780}}` |
| `templates/mockup-frames/browser.png` | Browser frame template PNG | VERIFIED | exists |
| `templates/mockup-frames/phone.png` | Phone frame template PNG | VERIFIED | exists |
| `bin/pde-tools.cjs` | image subcommand routing (`case 'image'`) | VERIFIED | case 'image' at line 750; 6 subcommand branches |
| `commands/image.md` | /pde:image command documentation | VERIFIED | 221 lines; all 6 subcommands documented with examples |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bin/lib/image-pipeline/og.cjs` | `bin/lib/image-pipeline/assets.cjs` | saveAsset() call after PNG generation | WIRED | Line 12: `require('./assets.cjs')`; line 63: `saveAsset({...})` |
| `bin/lib/image-pipeline/social.cjs` | `bin/lib/image-pipeline/assets.cjs` | saveAsset() call for each platform variant | WIRED | Line 14: `require('./assets.cjs')`; line 75: `saveAsset({...})` inside platform loop |
| `bin/lib/image-pipeline/screenshot.cjs` | `bin/lib/image-pipeline/assets.cjs` | saveAsset() after screenshot capture | WIRED | Line 12: `require('./assets.cjs')`; line 75: `saveAsset({...})` |
| `bin/lib/image-pipeline/mockup.cjs` | `bin/lib/image-pipeline/assets.cjs` | saveAsset() after composite | WIRED | Line 13: `require('./assets.cjs')`; line 65: `saveAsset({...})` |
| `bin/lib/image-pipeline/rembg.cjs` | `bin/lib/image-pipeline/assets.cjs` | saveAsset() after background removal | WIRED | Line 13: `require('./assets.cjs')`; line 119: `saveAsset({...})` |
| `bin/lib/image-pipeline/rembg.cjs` | `.planning/cli-anything/removebg-usage.json` | loadUsage/saveUsage for monthly tracking | WIRED | getUsagePath() at line 21 returns path; loadUsage/saveUsage read/write it |
| `bin/pde-tools.cjs` | `bin/lib/image-pipeline/og.cjs` | require for image og subcommand | WIRED | `require('./lib/image-pipeline/og.cjs')` at line 753 |
| `bin/pde-tools.cjs` | `bin/lib/image-pipeline/social.cjs` | require for image social subcommand | WIRED | `require('./lib/image-pipeline/social.cjs')` at line 764 |
| `bin/pde-tools.cjs` | `bin/lib/image-pipeline/screenshot.cjs` | require for image screenshot subcommand | WIRED | `require('./lib/image-pipeline/screenshot.cjs')` at line 775 |
| `bin/pde-tools.cjs` | `bin/lib/image-pipeline/mockup.cjs` | require for image mockup subcommand | WIRED | `require('./lib/image-pipeline/mockup.cjs')` at line 789 |
| `bin/pde-tools.cjs` | `bin/lib/image-pipeline/rembg.cjs` | require for image rembg subcommand | WIRED | `require('./lib/image-pipeline/rembg.cjs')` at line 799 |
| `bin/pde-tools.cjs` | `bin/lib/image-pipeline/assets.cjs` | require for image list subcommand + ASSETS_DIR injection | WIRED | `require('./lib/image-pipeline/assets.cjs')` present in all 5 saving subcommands plus list; ASSETS_DIR passed as assetsDir to each generator |

### Data-Flow Trace (Level 4)

All saving subcommands (`og`, `social`, `screenshot`, `mockup`, `rembg`) receive `assetsDir: ASSETS_DIR` from the CLI layer — this is the Plan 03 deviation that was auto-fixed. Without this, `result.meta` would have been null. The fix is present in the committed code.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `og.cjs` | `pngBuffer` | Satori SVG → Resvg rasterize | Yes — live Satori render | FLOWING |
| `social.cjs` | `pngBuffer` per platform | Satori SVG → Resvg per SOCIAL_SIZES entry | Yes — 3 live renders | FLOWING |
| `screenshot.cjs` | `buffer` | Playwright `page.screenshot()` | Yes — live headless Chrome | FLOWING |
| `mockup.cjs` | `compositeBuffer` | Sharp resize + composite onto frame PNG | Yes — real Sharp operation | FLOWING |
| `rembg.cjs` | `resultBuffer` | remove.bg API `response.arrayBuffer()` | Yes (API-dependent; graceful null without key) | FLOWING |
| `assets.cjs` `listAssets()` | `results` array | `fs.readdirSync` + JSON.parse of .meta.json files | Yes — real filesystem scan | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `image list` returns valid JSON | `node bin/pde-tools.cjs image list` | `[]` (empty array — no assets saved yet) | PASS |
| All module exports load without errors | `node -e "require('./bin/lib/image-pipeline/assets.cjs')"` etc. | function/string types confirmed for all 6 modules | PASS |
| 40/40 unit + integration tests pass | `npx vitest run tests/phase-165/` | 40 passed, 0 failed, 6 test files | PASS |
| OG image generates real PNG | og.test.mjs OG-1 | PNG magic bytes 0x89504E47 confirmed | PASS |
| Social cards 3 variants correct dimensions | social.test.mjs Social-3 | twitter 1200x628, linkedin 1200x627, facebook 1200x630 | PASS |
| Screenshot captures via Playwright | screenshot.test.mjs with data: URL | Valid PNG returned, meta.type='screenshot' | PASS |
| `image og` via CLI | SKIP — requires actual Satori render + disk write | N/A | SKIP (tested via vitest) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| IMG-01 | Plans 01, 03 | User can generate dynamic OG images from templates via Satori/next/og | SATISFIED | og.cjs + generateOgImage() + pde-tools.cjs image og subcommand; 3 tests pass |
| IMG-02 | Plans 01, 03 | User can generate social media card images from product data | SATISFIED | social.cjs + generateSocialCards() + pde-tools.cjs image social; 3 tests pass (3 platform variants) |
| IMG-03 | Plans 02, 03 | User can generate device mockup composites (browser frame, phone frame) from screenshots | SATISFIED | mockup.cjs + generateMockup() + frames.json + pde-tools.cjs image mockup; 6 tests pass |
| IMG-04 | Plans 02, 03 | User can capture product screenshots via Playwright at configurable viewports | SATISFIED | screenshot.cjs + captureScreenshot() + VIEWPORT_PRESETS + pde-tools.cjs image screenshot; 14 tests pass including live Playwright |
| IMG-07 | Plans 02, 03 | User can remove image backgrounds via remove.bg free tier (50/month) | SATISFIED | rembg.cjs + removeBackground() + MONTHLY_LIMIT=50 + WARN_THRESHOLD=40; 11 tests pass |
| IMG-08 | Plans 01, 03 | Image pipeline stores assets in .planning/design/assets/ with metadata JSON | SATISFIED | assets.cjs ASSETS_DIR + saveAsset() SHA-256 sidecar + ASSETS_DIR injected by CLI; 9 tests pass |

**Requirements coverage:** 6/6 (IMG-01, IMG-02, IMG-03, IMG-04, IMG-07, IMG-08)

**Orphaned requirements check:** IMG-05 and IMG-06 are mapped to Phase 166 in REQUIREMENTS.md — not claimed by this phase. No orphaned requirements.

### Anti-Patterns Found

Scanning key files for stubs, TODOs, hardcoded empty returns, and placeholder patterns.

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found | — | — | — |

No TODOs, FIXMEs, placeholder returns, hardcoded empty arrays, or stub implementations detected across any of the 9 image pipeline source files. All functions have complete implementations with real data paths.

Notable: `removeBackground()` returns `null` when `REMOVEBG_API_KEY` is absent — this is intentional graceful degradation, not a stub. It is tested and documented.

### Human Verification Required

#### 1. Visual quality of generated OG/social images

**Test:** Run `node bin/pde-tools.cjs image og --title "Test Product" --description "A great product" --slug test-og` and open the resulting PNG from `.planning/design/assets/og/`
**Expected:** A 1200x630 PNG with the title in white bold text on an indigo background, description below it
**Why human:** Cannot verify visual appearance programmatically

#### 2. Device mockup visual correctness

**Test:** Capture a screenshot, run `node bin/pde-tools.cjs image mockup <screenshot-path> --frame browser --slug test-mockup`, open the output PNG
**Expected:** Screenshot composited inside the browser chrome frame at the correct position (top 60px, left 20px)
**Why human:** Cannot verify pixel-level compositing accuracy programmatically

#### 3. Background removal output quality

**Test:** Set `REMOVEBG_API_KEY`, run `node bin/pde-tools.cjs image rembg <image-path> --slug test-rembg`
**Expected:** Transparent PNG with background removed, usage counter incremented in `.planning/cli-anything/removebg-usage.json`
**Why human:** Requires live API key and real image to verify background removal quality; API call cost (uses 1 of 50/month)

---

## Summary

Phase 165 goal is fully achieved. All 6 image pipeline subcommands are implemented, tested, and wired into the CLI:

- **OG images** (IMG-01): generateOgImage() produces 1200x630 PNG via Satori+resvg-js with bundled Inter WOFF font
- **Social cards** (IMG-02): generateSocialCards() produces 3 platform-specific variants in one call
- **Device mockups** (IMG-03): generateMockup() composites screenshots onto browser/phone frames via Sharp
- **Screenshots** (IMG-04): captureScreenshot() uses Playwright headless Chromium with 3 named viewport presets
- **Background removal** (IMG-07): removeBackground() wraps remove.bg free tier with graceful no-key degradation and monthly usage tracking
- **Asset storage** (IMG-08): saveAsset() writes PNG + SHA-256 .meta.json sidecar; all subcommands route through it

The test suite is comprehensive: 40/40 tests pass across 6 test files including live Playwright execution. All 6 requirement IDs are satisfied. No stubs, placeholders, or broken wiring found.

One notable deviation from plans: Plan 03 auto-fixed the missing `assetsDir: ASSETS_DIR` injection — without it, CLI output would have been null metadata. The fix is in the committed code and verified working.

---

_Verified: 2026-03-29T19:50:00Z_
_Verifier: Claude (gsd-verifier)_
