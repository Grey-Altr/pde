---
phase: 168-ai-3d-generation-web-embedding
verified: 2026-03-28T21:30:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 168: AI 3D Generation + Web Embedding Verification Report

**Phase Goal:** Users can generate 3D models from text or images and embed them directly in web pages with automatic AR fallback — using open-source models only
**Verified:** 2026-03-28T21:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | save3DAsset writes a GLB file and JSON sidecar to .planning/design/3d/ | VERIFIED | assets.cjs line 38: `fs.writeFileSync(glbPath, glbBuffer)`, line 52: `fs.writeFileSync(metaPath, JSON.stringify(fullMeta))`. THREE_D_DIR = `.planning/design/3d`. Test confirmed: 8/8 assets tests pass. |
| 2 | list3DAssets returns JSON array of all 3D assets with metadata | VERIFIED | assets.cjs lines 64-82: reads .meta.json files, returns array with glb_file field. Test confirmed: list tests pass. |
| 3 | optimizeGLB runs gltf-transform draco + resize and produces a smaller GLB | VERIFIED | optimize.cjs lines 53-82: draco step via spawnSync, resize step via spawnSync, returns { outputPath, sizeMB }. Test confirmed: 5/5 optimize tests pass (draco invocation proven by test). |
| 4 | generateEmbed produces model-viewer HTML with ar, ar-modes, camera-controls | VERIFIED | embed.cjs lines 30-39: snippet includes `ar`, `ar-modes="webxr scene-viewer quick-look"`, `camera-controls`, `auto-rotate`. Tests confirmed: 14/14 embed tests pass. |
| 5 | embed HTML includes ar-modes="webxr scene-viewer quick-look" for AR fallback | VERIFIED | embed.cjs line 33: `ar-modes="webxr scene-viewer quick-look"` present verbatim. No `ios-src` present (model-viewer handles iOS USDZ automatically). |
| 6 | convert3D accepts an image buffer and returns a GLB file via HF Space fallback chain | VERIFIED | convert.cjs: SPACE_CHAIN = ['stabilityai/stable-fast-3d', 'TencentARC/InstantMesh'], fallback loop lines 85-158, HF_TOKEN guard line 64. 8/8 convert tests pass. |
| 7 | generate3D accepts a text prompt, generates an image via HF Inference API, then converts to 3D | VERIFIED | generate.cjs lines 50-62: textToImage with FLUX.1-schnell, then convert3D call. 6/6 generate tests pass. |
| 8 | Both modules auto-optimize output via optimize.cjs and save via assets.cjs | VERIFIED | convert.cjs lines 177-188: optimizeFn call (defaults to optimizeGLB), lines 205-216: saveFn call (defaults to save3DAsset). generate.cjs inherits via convert3D call. |
| 9 | Graceful error with instructions when all HF Spaces are down | VERIFIED | convert.cjs lines 162-167: throws with space list + TripoSR GitHub URL. Test "throws descriptive error when all spaces fail" passes. |
| 10 | pde-tools.cjs 3d subcommands route to pipeline modules and print JSON | VERIFIED | pde-tools.cjs line 915: `case '3d'` block. All 5 subcommands (generate, convert, optimize, embed, list) route to correct modules. CLI spot-checks: usage messages print on missing args, `3d list` returns `[]`. |
| 11 | /pde:3d command documentation exists | VERIFIED | commands/3d.md (100 lines) exists at repo root — deviation from plan's bin/lib/commands/3d.md path was correctly self-corrected to follow established pattern at commands/. |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Exists | Lines | Status | Details |
|----------|----------|--------|-------|--------|---------|
| `bin/lib/3d-pipeline/assets.cjs` | save3DAsset, list3DAssets, THREE_D_DIR | Yes | 84 | VERIFIED | Exports: ['save3DAsset', 'list3DAssets', 'THREE_D_DIR']. Writes to .planning/design/3d/. |
| `bin/lib/3d-pipeline/optimize.cjs` | optimizeGLB, inspectGLB | Yes | 121 | VERIFIED | Exports: ['optimizeGLB', 'inspectGLB']. Wraps gltf-transform CLI via spawnSync. Draco + resize steps both present. |
| `bin/lib/3d-pipeline/embed.cjs` | generateEmbed | Yes | 60 | VERIFIED | Exports: ['generateEmbed']. AR attributes confirmed: ar, ar-modes webxr scene-viewer quick-look, camera-controls, auto-rotate. No ios-src. |
| `bin/lib/3d-pipeline/convert.cjs` | convert3D, SPACE_CHAIN | Yes | 221 | VERIFIED | Exports: ['convert3D', 'SPACE_CHAIN']. Dynamic import() for @gradio/client. HF_TOKEN guard. Fallback chain implemented. |
| `bin/lib/3d-pipeline/generate.cjs` | generate3D | Yes | 74 | VERIFIED | Exports: ['generate3D']. FLUX.1-schnell textToImage → convert3D pipeline. HF_TOKEN guard. meta.input_type override to 'text'. |
| `tests/phase-168/fixtures/cube.glb` | Minimal valid GLB fixture | Yes | 440 bytes | VERIFIED | Hand-built 440-byte GLB (12-byte header + JSON chunk + BIN chunk). Used by optimize tests. |
| `bin/pde-tools.cjs` (3d case block) | case '3d' with 5 subcommands | Yes | — | VERIFIED | Line 915: case '3d'. All 5 subcommands require correct pipeline modules. |
| `commands/3d.md` | /pde:3d command documentation | Yes | 100 | VERIFIED | Documents all 5 subcommands, HF_TOKEN prerequisite, AR fallback, and TripoSR fallback option. Note: placed at commands/ not bin/lib/commands/ — correct per established pattern. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bin/lib/3d-pipeline/assets.cjs` | `.planning/design/3d/` | fs.writeFileSync | WIRED | Line 38: `fs.writeFileSync(glbPath, glbBuffer)`. glbPath is inside THREE_D_DIR. |
| `bin/lib/3d-pipeline/optimize.cjs` | gltf-transform CLI | spawnSync | WIRED | Lines 53, 65: spawnSync with gltf-transform binary. buildCmd() resolves local node_modules/.bin first. |
| `bin/lib/3d-pipeline/embed.cjs` | model-viewer CDN | HTML snippet template | WIRED | Line 14: MODEL_VIEWER_CDN const with googleapis URL. Used in html template at line 47. |
| `bin/lib/3d-pipeline/generate.cjs` | @huggingface/inference | InferenceClient.textToImage() | WIRED | Lines 46-54: require('@huggingface/inference'), new InferenceClient, textToImage call with FLUX.1-schnell. |
| `bin/lib/3d-pipeline/convert.cjs` | @gradio/client | dynamic import() + Client.connect() | WIRED | Line 93: `await import('@gradio/client')`. Line 97: `ClientClass.connect(space, { hf_token })`. |
| `bin/lib/3d-pipeline/convert.cjs` | `bin/lib/3d-pipeline/optimize.cjs` | require + optimizeGLB call | WIRED | Line 20: `const { optimizeGLB, inspectGLB } = require('./optimize.cjs')`. Line 177: optimizeFn call. |
| `bin/lib/3d-pipeline/generate.cjs` | `bin/lib/3d-pipeline/convert.cjs` | require + convert3D call | WIRED | Line 15: `const { convert3D } = require('./convert.cjs')`. Line 62: convertFn call. |
| `bin/pde-tools.cjs` | `bin/lib/3d-pipeline/generate.cjs` | require in generate subcommand | WIRED | Line 918: `require('./lib/3d-pipeline/generate.cjs')` inside case '3d' generate branch. |
| `bin/pde-tools.cjs` | `bin/lib/3d-pipeline/convert.cjs` | require in convert subcommand | WIRED | Line 928: `require('./lib/3d-pipeline/convert.cjs')`. |
| `bin/pde-tools.cjs` | `bin/lib/3d-pipeline/optimize.cjs` | require in optimize subcommand | WIRED | Line 940: `require('./lib/3d-pipeline/optimize.cjs')`. |
| `bin/pde-tools.cjs` | `bin/lib/3d-pipeline/embed.cjs` | require in embed subcommand | WIRED | Line 951: `require('./lib/3d-pipeline/embed.cjs')`. |
| `bin/pde-tools.cjs` | `bin/lib/3d-pipeline/assets.cjs` | require in list subcommand | WIRED | Lines 919, 929, 952, 963: `require('./lib/3d-pipeline/assets.cjs')` in multiple branches. |

---

### Data-Flow Trace (Level 4)

The 3D pipeline modules produce/consume GLB binary data and JSON metadata, not rendered UI. Data flow analysis:

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `assets.cjs → save3DAsset` | glbBuffer (Buffer) | Caller provides GLB binary | Yes — writes to disk via fs.writeFileSync | FLOWING |
| `assets.cjs → list3DAssets` | files (.meta.json) | fs.readdirSync + JSON.parse from disk | Yes — reads real files | FLOWING |
| `optimize.cjs → optimizeGLB` | outputPath (GLB file) | gltf-transform CLI via spawnSync | Yes — invokes real CLI | FLOWING |
| `embed.cjs → generateEmbed` | snippet, html | Template string with glbPath/slug | Yes — writes real HTML file | FLOWING |
| `convert.cjs → convert3D` | glbBuffer | @gradio/client HF Space API | Yes — real API call (HF_TOKEN required at runtime) | FLOWING |
| `generate.cjs → generate3D` | imageBuffer | InferenceClient.textToImage FLUX.1-schnell | Yes — real API call (HF_TOKEN required at runtime) | FLOWING |

Note: convert3D and generate3D require HF_TOKEN and live HF Services at runtime. This is expected behavior for external API integration — not a stub. All unit tests mock external calls correctly via dependency injection.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `3d` with no subcommand prints usage | `node bin/pde-tools.cjs 3d` | "Usage: 3d <generate\|convert\|optimize\|embed\|list> [options]" | PASS |
| `3d generate` without --prompt prints usage | `node bin/pde-tools.cjs 3d generate` | "Usage: 3d generate --prompt <text> [--slug <slug>]" | PASS |
| `3d convert` without --image prints usage | `node bin/pde-tools.cjs 3d convert` | "Usage: 3d convert --image <path> [--slug <slug>]" | PASS |
| `3d optimize` without --input prints usage | `node bin/pde-tools.cjs 3d optimize` | "Usage: 3d optimize --input <path.glb> [--output <path.glb>] [--texture-max <px>]" | PASS |
| `3d embed` without --glb prints usage | `node bin/pde-tools.cjs 3d embed` | "Usage: 3d embed --glb <path.glb> [--slug <slug>] [--camera-orbit <orbit>]" | PASS |
| `3d list` prints empty JSON array | `node bin/pde-tools.cjs 3d list` | `[]` | PASS |
| All module exports load correctly | `node -e "require('./bin/lib/3d-pipeline/assets.cjs')"` etc. | All 5 modules export expected functions | PASS |
| All 41 phase-168 tests pass | `npx vitest run tests/phase-168/` | 41 passed (5 test files) in 1.58s | PASS |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| TRD-01 | Plans 02, 03 | User can generate 3D models from text descriptions via TripoSR/SF3D | SATISFIED | generate3D: FLUX.1-schnell text→image then SF3D/InstantMesh image→GLB. CLI: `3d generate --prompt`. 6 tests pass. |
| TRD-02 | Plans 02, 03 | User can generate 3D models from product images via image-to-3D | SATISFIED | convert3D: SPACE_CHAIN fallback (SF3D → InstantMesh) via @gradio/client. CLI: `3d convert --image`. 8 tests pass. |
| TRD-03 | Plans 01, 03 | Generated models output in GLB format with optimized geometry | SATISFIED | optimizeGLB: draco compression + texture resize via gltf-transform CLI. CLI: `3d optimize --input`. 5 tests pass. |
| TRD-04 | Plans 01, 03 | User can embed 3D models in web pages via model-viewer component | SATISFIED | generateEmbed: produces model-viewer HTML snippet + self-contained page. CLI: `3d embed --glb`. 14 embed tests pass. |
| TRD-05 | Plans 01, 03 | model-viewer integration includes automatic AR fallback (USDZ/WebXR) | SATISFIED | embed.cjs: `ar`, `ar-modes="webxr scene-viewer quick-look"`, no ios-src (model-viewer 4.x auto-USDZ). Tests assert all AR attributes present. |
| TRD-08 | Plans 01, 03 | 3D assets stored in .planning/design/3d/ with generation metadata | SATISFIED | THREE_D_DIR = `.planning/design/3d`. save3DAsset writes GLB + meta.json sidecar with: source_model, input_type, input_hash, timestamp, file_size, vertex_count, slug, glb_path. |

**TRD-06 and TRD-07** (CadQuery STEP/CAD models) are assigned to Phase 169 and do not appear in any Phase 168 plan — correctly out of scope.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bin/lib/3d-pipeline/optimize.cjs` | 27 | `return null` in `resolveGltfTransformBin()` | Info | Not a stub — this helper function is unused (dead code). The actual invocation uses `buildCmd()` which handles the null case internally. No impact on functionality. |

No blockers or warnings found. The single info-level item is unused dead code that does not affect any code path.

---

### Human Verification Required

#### 1. Real HF API Integration

**Test:** Set HF_TOKEN to a valid token and run `node bin/pde-tools.cjs 3d convert --image <any-product-image.png> --slug test-model`
**Expected:** Command contacts stabilityai/stable-fast-3d HF Space, receives a GLB, optimizes it, saves to .planning/design/3d/, and prints JSON metadata with glb_path
**Why human:** Requires live HF credentials and network access to validate real API integration behavior

#### 2. Text-to-3D End-to-End

**Test:** With HF_TOKEN set, run `node bin/pde-tools.cjs 3d generate --prompt "a simple wooden chair" --slug chair`
**Expected:** FLUX.1-schnell generates an image, then image is passed to convert3D, GLB saved to .planning/design/3d/, JSON meta shows input_type=text and prompt field
**Why human:** Two-step pipeline requires live HF Inference API + live Gradio Space

#### 3. AR Embed in Browser

**Test:** Run `node bin/pde-tools.cjs 3d embed --glb <any-real.glb> --slug demo` then open the generated HTML in a mobile browser (iOS or Android)
**Expected:** model-viewer renders the 3D model with visible AR button; on iOS, Quick Look activates; on Android, scene-viewer or WebXR activates
**Why human:** AR fallback behavior requires physical device testing in a browser

---

### Gaps Summary

No gaps found. All 11 observable truths verified. All 8 required artifacts exist, are substantive, and are wired correctly. All 13 key links confirmed present. All 6 phase requirements (TRD-01 through TRD-05, TRD-08) are satisfied by implemented code with passing tests. 41 tests pass. CLI spot-checks confirm correct routing and usage messages.

The only notable item is unused dead code (`resolveGltfTransformBin()` in optimize.cjs) that does not affect functionality.

---

_Verified: 2026-03-28T21:30:00Z_
_Verifier: Claude (gsd-verifier)_
