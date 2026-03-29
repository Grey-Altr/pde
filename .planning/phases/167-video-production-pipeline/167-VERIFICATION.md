---
phase: 167-video-production-pipeline
verified: 2026-03-29T03:50:34Z
status: gaps_found
score: 11/13 must-haves verified
re_verification: false
gaps:
  - truth: "ffmpeg-static dependency is physically installed and all video pipeline modules load"
    status: failed
    reason: "ffmpeg-static@5.3.0 is declared in package.json and present in package-lock.json but NOT installed in node_modules. All four video pipeline modules fail to require() at runtime: 'Cannot find module ffmpeg-static'."
    artifacts:
      - path: "node_modules/ffmpeg-static"
        issue: "Directory does not exist — npm install has not been run after the worktree merge"
    missing:
      - "Run npm install in the project root to materialize ffmpeg-static into node_modules"
  - truth: "commands/video.md prerequisites are accurate — implementation uses ffmpeg-static (bundled), not system FFmpeg"
    status: failed
    reason: "commands/video.md Prerequisites section instructs users to install FFmpeg via brew/apt-get, but the implementation uses ffmpeg-static (a bundled npm package). No system FFmpeg install is needed for assemble/caption. The doc contradicts the actual dependency model."
    artifacts:
      - path: "commands/video.md"
        issue: "Lines 186-193 say 'FFmpeg must be installed and available on PATH: brew install ffmpeg / apt-get install ffmpeg' — incorrect; implementation requires ffmpeg-static npm package, not system FFmpeg"
    missing:
      - "Replace system-FFmpeg install instructions with 'ffmpeg-static is bundled as an npm dependency — no system FFmpeg required'"
human_verification:
  - test: "Run npm install then run the full test suite"
    expected: "All 32 tests pass (25 from plan 01 + 7 from plan 02). Tests in assemble.test.mjs, caption.test.mjs, assets.test.mjs, record.test.mjs all pass."
    why_human: "ffmpeg-static not installed in this environment; tests cannot run until npm install is executed"
  - test: "Run: node bin/pde-tools.cjs video record data:text/html,<h1>Hello</h1> --slug test --duration 2000"
    expected: "JSON metadata output with type=video, path in .planning/design/assets/video/"
    why_human: "Requires Playwright Chromium headless + ffmpeg-static installed"
  - test: "Run: node bin/pde-tools.cjs video compose --title 'Test' --slug test-compose --duration-frames 30"
    expected: "Remotion renders a 30-frame MP4 (requires remotion node_modules)"
    why_human: "Remotion node_modules not installed in bin/lib/video-pipeline/remotion/"
---

# Phase 167: Video Production Pipeline Verification Report

**Phase Goal:** Users can record product UI interactions and assemble them into branded videos with captions — all using free, local toolchains
**Verified:** 2026-03-29T03:50:34Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | recordUIInteraction() launches Playwright with recordVideo, closes context, converts WebM to MP4 via FFmpeg | ✓ VERIFIED | record.cjs:28-91 — chromium.launch, recordVideo context, execFileSync(FFMPEG, libx264 args), video.path() after context.close() |
| 2  | assembleClips() concatenates MP4 clips via FFmpeg concat demuxer and produces a single MP4 | ✓ VERIFIED | assemble.cjs:57-73 — writes concat list, execFileSync(FFMPEG, ['-f','concat',...]) |
| 3  | assembleClips() supports crossfade transitions via FFmpeg xfade filter | ✓ VERIFIED | assemble.cjs:76-119 — xfade=transition=fade filter_complex with duration-aware offset |
| 4  | captionVideo() burns SRT subtitles into MP4 via FFmpeg subtitles filter | ✓ VERIFIED | caption.cjs:82-94 — execFileSync(FFMPEG, subtitles=${srtPath}:force_style=...) |
| 5  | captionVideo() accepts JSON array [{start, end, text}] and converts to SRT before burn-in | ✓ VERIFIED | caption.cjs:44-53, 72-79 — jsonToSrt() converts array, writes temp .srt, passes to captionVideo |
| 6  | All video outputs land in .planning/design/assets/video/ with .meta.json sidecar | ✓ VERIFIED | assets.cjs:59-79 — saveVideoAsset() copies to {baseDir}/video/{slug}-{ts}.mp4 + writes .meta.json |
| 7  | Resolution is configurable via --resolution flag with WxH and shorthand aliases (720p, 1080p, 4k) | ✓ VERIFIED | assets.cjs:22-48 — RESOLUTION_ALIASES map + resolveResolution() + pde-tools.cjs:844 --resolution flag |
| 8  | Remotion project in bin/lib/video-pipeline/remotion/ has its own package.json with pinned versions | ✓ VERIFIED | remotion/package.json — remotion@4.0.441, @remotion/cli@4.0.441, react@19.2.4, react-dom@19.2.4 (no ^ ranges) |
| 9  | BrandedVideo.tsx reads inputProps tokens (colors, fonts, title) and renders a branded composition | ✓ VERIFIED | BrandedVideo.tsx:28-33 — colors.background||'#0a0a0a', colors.primary||'#ffffff', fonts.heading||'Arial', spring-animated title |
| 10 | compose.cjs extracts PDE design tokens from .planning/design/SYS-*.json files | ✓ VERIFIED | compose.cjs:83-117 — reads SYS-*.json, walkTokens() DTCG traversal with fallback DEFAULT_TOKENS |
| 11 | pde-tools.cjs routes 'video record/assemble/compose/caption' to the correct pipeline modules | ✓ VERIFIED | pde-tools.cjs:836-913 — case 'video' block with all four subcommand branches, require on demand |
| 12 | ffmpeg-static is installed in node_modules and video pipeline modules load successfully | ✗ FAILED | node_modules/ffmpeg-static does not exist; all four pipeline modules throw MODULE_NOT_FOUND at require() time |
| 13 | commands/video.md prerequisites accurately describe the actual dependency model | ✗ FAILED | commands/video.md:186-193 instructs system FFmpeg install (brew/apt-get) but implementation uses ffmpeg-static npm package; contradicts free/local-toolchain goal |

**Score:** 11/13 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/video-pipeline/assets.cjs` | saveVideoAsset, resolveResolution, ASSETS_DIR, FFMPEG | ✓ VERIFIED | All exports present; saveVideoAsset copies MP4 + writes .meta.json; resolveResolution handles aliases and WxH |
| `bin/lib/video-pipeline/record.cjs` | recordUIInteraction, Playwright + FFmpeg | ✓ VERIFIED | 92 lines; chromium.launch + recordVideo + execFileSync libx264 conversion; exports { recordUIInteraction } |
| `bin/lib/video-pipeline/assemble.cjs` | assembleClips, getClipDuration | ✓ VERIFIED | 126 lines; concat demuxer + xfade filter_complex for N clips; exports { assembleClips, getClipDuration } |
| `bin/lib/video-pipeline/caption.cjs` | captionVideo, jsonToSrt | ✓ VERIFIED | 105 lines; jsonToSrt converts [{start,end,text}] to SRT; subtitles= filter with force_style; exports { captionVideo, jsonToSrt } |
| `bin/lib/video-pipeline/compose.cjs` | composeVideo, extractTokens | ✓ VERIFIED | 200 lines; walkTokens() DTCG traversal; execFileSync npx remotion render --codec h264 --props; exports { composeVideo, extractTokens, DEFAULT_TOKENS } |
| `bin/lib/video-pipeline/remotion/package.json` | Pinned remotion deps | ✓ VERIFIED | remotion@4.0.441, @remotion/cli@4.0.441, react@19.2.4, react-dom@19.2.4 — all exact, no ^ |
| `bin/lib/video-pipeline/remotion/index.ts` | registerRoot | ✓ VERIFIED | 3 lines; import registerRoot from remotion; registerRoot(RemotionRoot) |
| `bin/lib/video-pipeline/remotion/Root.tsx` | Composition with id="branded" | ✓ VERIFIED | Composition id="branded" fps=30 width=1920 height=1080 with full defaultProps matching BrandedVideo shape |
| `bin/lib/video-pipeline/remotion/BrandedVideo.tsx` | useCurrentFrame, token-driven styling | ✓ VERIFIED | 125 lines; useCurrentFrame + useVideoConfig; spring-animated title; all colors/fonts with fallback defaults |
| `bin/pde-tools.cjs` | case 'video' with record/assemble/compose/caption | ✓ VERIFIED | Lines 836-913; all four subcommands; --resolution, --slug, usage errors, exit 1 on missing required args |
| `commands/video.md` | /pde:video command doc, all four subcommands | ✓ VERIFIED (with warning) | Exists; documents all four subcommands, resolution table, SRT format, JSON captions format; but Prerequisites section incorrectly says system FFmpeg required |
| `tests/phase-167/assets.test.mjs` | Tests for saveVideoAsset, resolveResolution | ✗ STUB/FAIL | File exists and is substantive (13 tests) but FAILS at import time: Cannot find module 'ffmpeg-static' |
| `tests/phase-167/assemble.test.mjs` | Tests for assembleClips | ✗ STUB/FAIL | File exists and is substantive (4 tests) but FAILS at import time: Cannot find module 'ffmpeg-static' |
| `tests/phase-167/caption.test.mjs` | Tests for captionVideo, jsonToSrt | ✗ STUB/FAIL | File exists and is substantive (7 tests) but FAILS at import time: Cannot find module 'ffmpeg-static' |
| `tests/phase-167/record.test.mjs` | Tests for recordUIInteraction | ✗ STUB/FAIL | File exists and is substantive but FAILS at import time: Cannot find module 'ffmpeg-static' |
| `tests/phase-167/compose.test.mjs` | Tests for extractTokens, composeVideo | ✓ VERIFIED | 5/7 tests pass; 2 integration tests skipped (Remotion node_modules not installed in remotion/) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| bin/lib/video-pipeline/record.cjs | ffmpeg-static | require('ffmpeg-static') in assets.cjs | ✗ NOT_WIRED at runtime | Module not installed — require() throws MODULE_NOT_FOUND |
| bin/lib/video-pipeline/record.cjs | playwright | chromium.launch + recordVideo | ✓ WIRED | playwright installed; record.cjs:14 require('playwright') |
| bin/lib/video-pipeline/assemble.cjs | ffmpeg-static | execFileSync(FFMPEG, ...) | ✗ NOT_WIRED at runtime | FFMPEG is imported from assets.cjs which fails to load |
| bin/lib/video-pipeline/caption.cjs | ffmpeg-static | subtitles= filter | ✗ NOT_WIRED at runtime | FFMPEG is imported from assets.cjs which fails to load |
| bin/lib/video-pipeline/compose.cjs | bin/lib/video-pipeline/remotion/ | execFileSync npx remotion render | ✓ WIRED (code) | compose.cjs:161 execFileSync('npx', ['remotion','render',...], {cwd: remotionDir}) — correct pattern; Remotion node_modules absent but that is a separate setup step |
| bin/lib/video-pipeline/compose.cjs | .planning/design/SYS-*.json | fs.readdirSync + walkTokens | ✓ WIRED | compose.cjs:94-97 reads SYS-*.json with fallback; unit tests pass (5/5) |
| bin/lib/video-pipeline/remotion/BrandedVideo.tsx | inputProps | colors/fonts/title from Remotion props | ✓ WIRED | BrandedVideo.tsx:19-34 destructures tokens, renders with spring animation |
| bin/pde-tools.cjs | bin/lib/video-pipeline/record.cjs | require('./lib/video-pipeline/record.cjs') | ✓ WIRED | pde-tools.cjs:839 |
| bin/pde-tools.cjs | bin/lib/video-pipeline/assemble.cjs | require('./lib/video-pipeline/assemble.cjs') | ✓ WIRED | pde-tools.cjs:852 |
| bin/pde-tools.cjs | bin/lib/video-pipeline/compose.cjs | require('./lib/video-pipeline/compose.cjs') | ✓ WIRED | pde-tools.cjs:874 |
| bin/pde-tools.cjs | bin/lib/video-pipeline/caption.cjs | require('./lib/video-pipeline/caption.cjs') | ✓ WIRED | pde-tools.cjs:889 |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| BrandedVideo.tsx | colors, fonts, title | inputProps from Remotion render --props JSON file | Yes — compose.cjs writes real token data from SYS-*.json (or DEFAULT_TOKENS) to props file | ✓ FLOWING |
| record.cjs | webmPath, mp4Path | Playwright recordVideo + FFmpeg conversion | Yes — context records real WebM, FFmpeg converts to real MP4 | ✓ FLOWING (code-level) |
| assemble.cjs | outputPath | FFmpeg concat demuxer / xfade filter | Yes — real clips concatenated | ✓ FLOWING (code-level) |
| caption.cjs | outputPath | FFmpeg subtitles filter with real SRT | Yes — jsonToSrt produces valid SRT, FFmpeg burns into video | ✓ FLOWING (code-level) |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| compose.cjs extractTokens with no SYS files returns DEFAULT_TOKENS | npx vitest run tests/phase-167/compose.test.mjs | 5 pass, 2 skipped (Remotion not installed) | ✓ PASS |
| extractTokens parses DTCG color/font tokens | npx vitest run tests/phase-167/compose.test.mjs | 5 pass | ✓ PASS |
| assets.cjs resolveResolution | npx vitest run tests/phase-167/assets.test.mjs | FAIL — Cannot find module 'ffmpeg-static' | ✗ FAIL |
| caption.cjs jsonToSrt | npx vitest run tests/phase-167/caption.test.mjs | FAIL — Cannot find module 'ffmpeg-static' | ✗ FAIL |
| assemble.cjs crossfade | npx vitest run tests/phase-167/assemble.test.mjs | FAIL — Cannot find module 'ffmpeg-static' | ✗ FAIL |
| pde-tools.cjs requires video case 'video' block | node -e check | ✓ case 'video' + all 4 require() paths present | ✓ PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VID-01 | 167-01, 167-03 | User can record product UI interactions via Playwright screen capture | ✓ SATISFIED | record.cjs implements recordUIInteraction() with chromium + recordVideo; pde-tools.cjs routes video record subcommand |
| VID-02 | 167-01, 167-03 | User can assemble video clips with FFmpeg (transitions, overlays, captions) | ✓ SATISFIED | assemble.cjs implements assembleClips() with concat demuxer and xfade; pde-tools.cjs routes video assemble |
| VID-03 | 167-02, 167-03 | User can compose branded product videos via Remotion React components | ✓ SATISFIED | compose.cjs + remotion/ project with BrandedVideo.tsx; pde-tools.cjs routes video compose |
| VID-04 | 167-02, 167-03 | Remotion templates include PDE design tokens (colors, fonts, spacing) | ✓ SATISFIED | extractTokens() reads SYS-*.json DTCG files; compose.cjs passes tokens as Remotion --props; BrandedVideo.tsx consumes inputProps.colors/fonts |
| VID-05 | 167-01, 167-03 | Video pipeline produces MP4 output with configurable resolution | ✓ SATISFIED | resolveResolution() handles 720p/1080p/4k aliases and WxH; --resolution flag in all subcommands; MP4 produced via libx264 |
| VID-06 | 167-01, 167-03 | User can add text captions/subtitles to generated videos | ✓ SATISFIED | captionVideo() + jsonToSrt() + subtitles= FFmpeg filter; pde-tools.cjs routes video caption with --srt/--captions |

All 6 requirements are satisfied at the code level. Runtime execution is blocked by the ffmpeg-static install gap.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| commands/video.md | 186-193 | Prerequisites says "brew install ffmpeg / apt-get install ffmpeg" but implementation uses ffmpeg-static npm package | ⚠️ Warning | Misleads users to install system FFmpeg unnecessarily; contradicts the "free, local toolchain" goal that uses bundled ffmpeg-static |
| node_modules/ | — | ffmpeg-static listed in package.json + package-lock.json but not physically installed | 🛑 Blocker | All four video pipeline modules (assets, record, assemble, caption) throw MODULE_NOT_FOUND at require() time; all related tests fail with import error |

---

## Human Verification Required

### 1. Full Test Suite After npm install

**Test:** Run `npm install` in the project root, then run `npx vitest run tests/phase-167/`
**Expected:** All 32 tests pass — 13 assets, 4 assemble, 7 caption (+ record conditional), 5 compose unit + 2 compose integration (if Remotion node_modules present in remotion/)
**Why human:** ffmpeg-static not installed in this verification environment; tests cannot execute until npm install is run

### 2. Remotion Integration Test

**Test:** Run `cd bin/lib/video-pipeline/remotion && npm install`, then run `npx vitest run tests/phase-167/compose.test.mjs`
**Expected:** All 7 tests pass including the 2 integration tests that render a real MP4 (~12s per the SUMMARY)
**Why human:** remotion/node_modules is absent; integration tests are skipped (not failed) pending install

### 3. End-to-End record Subcommand

**Test:** After npm install + playwright install chromium: `node bin/pde-tools.cjs video record "data:text/html,<h1>Test</h1>" --slug e2e-test --duration 2000`
**Expected:** JSON metadata output; .planning/design/assets/video/e2e-test-{timestamp}.mp4 and .meta.json created
**Why human:** Requires Playwright Chromium headless browser + ffmpeg-static binary

### 4. End-to-End caption Subcommand

**Test:** With a real MP4 clip: `node bin/pde-tools.cjs video caption clip.mp4 --captions '[{"start":0,"end":2,"text":"Hello"}]' --slug captioned-test`
**Expected:** JSON metadata; captioned MP4 in assets/video/
**Why human:** Requires ffmpeg-static installed and a real MP4 input file

---

## Gaps Summary

Two gaps block full goal achievement:

**Gap 1 — Blocker: ffmpeg-static not installed.** The package is declared in `package.json` and has a lock entry in `package-lock.json`, confirming the install was performed in the plan 01 worktree. However, the post-merge main working directory has not had `npm install` run to materialize the package. This causes all four core video pipeline modules to fail at `require()` time with `MODULE_NOT_FOUND`. The fix is a single `npm install` command — the code is correct.

**Gap 2 — Warning: incorrect prerequisites in commands/video.md.** The doc tells users to install system FFmpeg via brew/apt-get. The actual implementation uses `ffmpeg-static`, a bundled npm package, meaning no system FFmpeg is required for assemble or caption. This contradiction undermines the "free, local toolchain" goal. The doc should be corrected to remove the system FFmpeg install instructions.

The code quality across all six modules is substantive and correct: Playwright recording pattern matches the researched pitfalls (video ref before context.close), xfade chaining handles N clips with running offsets, jsonToSrt produces valid SRT with comma-separated milliseconds, DTCG walkTokens handles nested groups, and the pde-tools.cjs routing matches the plan exactly. Once `npm install` is run, all automated verifications are expected to pass.

---

_Verified: 2026-03-29T03:50:34Z_
_Verifier: Claude (gsd-verifier)_
