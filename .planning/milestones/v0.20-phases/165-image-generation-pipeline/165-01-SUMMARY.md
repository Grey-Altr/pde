---
phase: 165-image-generation-pipeline
plan: 01
subsystem: image-pipeline
tags: [satori, resvg-js, sharp, playwright, png, og-image, social-cards, asset-storage, sha256, cjs, fontsource]

# Dependency graph
requires: []
provides:
  - "bin/lib/image-pipeline/assets.cjs: saveAsset() + listAssets() with SHA-256 sidecar metadata"
  - "bin/lib/image-pipeline/og.cjs: generateOgImage() — 1200x630 PNG via Satori+resvg-js"
  - "bin/lib/image-pipeline/social.cjs: generateSocialCards() — 3 platform PNGs (twitter/linkedin/facebook)"
  - "bin/lib/image-pipeline/templates/og-default.cjs: default OG template (object-literal JSX)"
  - "bin/lib/image-pipeline/templates/social-default.cjs: default social template (platform-adaptive)"
  - "bin/lib/image-pipeline/fonts/Inter-Regular.woff: bundled Inter 400 WOFF font (Satori-compatible)"
  - "tests/phase-165/assets.test.mjs: 9 tests covering saveAsset and listAssets"
  - "tests/phase-165/og.test.mjs: 3 tests covering OG PNG generation and sidecar"
  - "tests/phase-165/social.test.mjs: 3 tests covering 3-variant social card generation"
affects: [165-02, 165-03, 166-visual-diff]

# Tech tracking
tech-stack:
  added: [satori, "@resvg/resvg-js", sharp, playwright, htm, "@fontsource/inter"]
  patterns:
    - "CJS modules in bin/lib/image-pipeline/ with require('satori').default destructure"
    - "Object-literal JSX (no transpiler) for Satori templates"
    - "Asset storage with SHA-256 sidecar: .planning/design/assets/{type}/{slug}-{timestamp}.png + .meta.json"
    - "WOFF font (not TTF variable, not WOFF2) for Satori compatibility"

key-files:
  created:
    - bin/lib/image-pipeline/assets.cjs
    - bin/lib/image-pipeline/og.cjs
    - bin/lib/image-pipeline/social.cjs
    - bin/lib/image-pipeline/templates/og-default.cjs
    - bin/lib/image-pipeline/templates/social-default.cjs
    - bin/lib/image-pipeline/fonts/Inter-Regular.woff
    - tests/phase-165/assets.test.mjs
    - tests/phase-165/og.test.mjs
    - tests/phase-165/social.test.mjs
  modified:
    - package.json (added satori, @resvg/resvg-js, sharp, playwright, htm, @fontsource/inter)

key-decisions:
  - "Satori requires WOFF (not WOFF2) font — Inter variable TTF downloaded from rsms/inter is rejected by @shuding/opentype.js with 'Unsupported OpenType signature'; switched to WOFF from @fontsource/inter"
  - "Font source: @fontsource/inter latin-400-normal.woff copied to bin/lib/image-pipeline/fonts/Inter-Regular.woff"
  - "saveAsset() assetsDir param enables test isolation via mkdtempSync (no process.cwd() mocking needed)"
  - "Social card filename format: {slug}-{platform}-{timestamp}.png (platform suffix before timestamp, not after)"

patterns-established:
  - "Pattern: Satori CJS import — const { default: satori } = require('satori') (default export wrapper)"
  - "Pattern: Resvg rasterization — new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { loadSystemFonts: false } }).render().asPng()"
  - "Pattern: Asset sidecar — saveAsset() writes both PNG and .meta.json atomically with SHA-256 hash"
  - "Pattern: Template function signature — fn({ title, description, width?, height?, brandColor? }) returns { type, props } tree"

requirements-completed: [IMG-01, IMG-02, IMG-08]

# Metrics
duration: 4min
completed: 2026-03-29
---

# Phase 165 Plan 01: Image Generation Pipeline - Foundation Summary

**Satori+resvg-js OG/social image pipeline with SHA-256 asset sidecar storage — 15 tests green in 4 minutes**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T02:25:57Z
- **Completed:** 2026-03-29T02:30:41Z
- **Tasks:** 2
- **Files modified:** 9 (created) + 2 (modified)

## Accomplishments
- Installed satori, @resvg/resvg-js, sharp, playwright, htm, @fontsource/inter
- Built asset storage layer with saveAsset()/listAssets() and SHA-256 metadata sidecars
- Implemented generateOgImage() producing valid 1200x630 PNG with sidecar
- Implemented generateSocialCards() generating 3 platform variants (twitter 1200x628, linkedin 1200x627, facebook 1200x630)
- Created default OG and social templates using object-literal JSX (no transpiler)
- 15 tests passing across assets.test.mjs, og.test.mjs, social.test.mjs

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies + create asset storage module + test scaffolds** - `32683e5` (feat)
2. **Task 2 [RED]: Add failing tests for OG image and social card generation** - `10f6d5c` (test)
3. **Task 2 [GREEN]: Implement OG image and social card generation** - `a7f5c22` (feat)

## Files Created/Modified
- `bin/lib/image-pipeline/assets.cjs` - saveAsset() + listAssets() with SHA-256 sidecar metadata
- `bin/lib/image-pipeline/og.cjs` - generateOgImage() via Satori+resvg-js, calls saveAsset()
- `bin/lib/image-pipeline/social.cjs` - generateSocialCards() 3-platform variants, calls saveAsset()
- `bin/lib/image-pipeline/templates/og-default.cjs` - Default OG template (object-literal JSX, indigo branding)
- `bin/lib/image-pipeline/templates/social-default.cjs` - Default social template with platform-adaptive sizes
- `bin/lib/image-pipeline/fonts/Inter-Regular.woff` - Bundled Inter 400 WOFF from @fontsource/inter
- `tests/phase-165/assets.test.mjs` - 9 tests for saveAsset and listAssets
- `tests/phase-165/og.test.mjs` - 3 tests for OG PNG magic bytes, dimensions, and sidecar
- `tests/phase-165/social.test.mjs` - 3 tests for 3-variant social card generation
- `package.json` - Added image pipeline dependencies

## Decisions Made

1. **WOFF not TTF**: Satori's bundled `@shuding/opentype.js` rejects variable TTF fonts with "Unsupported OpenType signature". The Inter variable font (`Inter[opsz,wght].ttf`) from rsms/inter causes this error. Solution: use WOFF format from `@fontsource/inter` — Satori explicitly supports WOFF.

2. **Font source**: Used `@fontsource/inter` npm package (already installable) rather than fighting GitHub raw URL rate limits or bundling a large static TTF. The WOFF is 30KB vs 296KB for the variable TTF.

3. **assetsDir param for test isolation**: Added `assetsDir` override parameter to saveAsset/listAssets to allow tests to use `mkdtempSync` for fs isolation without mocking `process.cwd()`.

4. **Social filename format**: `{slug}-{platform}-{timestamp}.png` — the slug passed to saveAsset is `${slug}-${platform}`, and saveAsset appends the timestamp internally, producing `my-product-twitter-1234567890.png`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Variable Inter TTF rejected by Satori**
- **Found during:** Task 2 (OG image implementation)
- **Issue:** Plan specified `Inter-Regular.ttf` from `https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.ttf` — that URL serves the variable font `Inter[opsz,wght].ttf` which Satori's opentype.js cannot parse ("Unsupported OpenType signature")
- **Fix:** Installed `@fontsource/inter`, copied `inter-latin-400-normal.woff` to `bin/lib/image-pipeline/fonts/Inter-Regular.woff`, and updated font path in og.cjs and social.cjs to use `.woff`
- **Files modified:** `bin/lib/image-pipeline/og.cjs`, `bin/lib/image-pipeline/social.cjs`, `bin/lib/image-pipeline/fonts/Inter-Regular.woff`
- **Verification:** All 6 OG+social tests pass after fix
- **Committed in:** `a7f5c22` (Task 2 feat commit)

**2. [Rule 1 - Bug] Test used invalid Chai matcher `toEndWith`**
- **Found during:** Task 1 (assets.test.mjs)
- **Issue:** Used `toEndWith()` which is not a vitest/Chai matcher; threw "Invalid Chai property: toEndWith"
- **Fix:** Replaced with `toMatch()` (supports regex and string pattern matching)
- **Files modified:** `tests/phase-165/assets.test.mjs`
- **Verification:** 9/9 tests passing
- **Committed in:** `32683e5` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Font format change is required for Satori compatibility. No scope creep.

## Issues Encountered
- GitHub raw font URLs were returning HTML (redirects/rate-limiting) — resolved by using npm package @fontsource/inter instead

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- assets.cjs, og.cjs, social.cjs are fully functional and tested — Plan 02 can build on these
- Inter-Regular.woff is bundled — no system font dependency
- Plans 02+ can add mockup.cjs, screenshot.cjs, rembg.cjs following the same saveAsset() pattern
- Playwright is installed but `npx playwright install chromium` still needed (Plan 02 responsibility per plan spec)

---
*Phase: 165-image-generation-pipeline*
*Completed: 2026-03-29*

## Self-Check: PASSED

- All 10 created files found on disk
- All 3 task commits found in git history (32683e5, 10f6d5c, a7f5c22)
- 15/15 tests passing
