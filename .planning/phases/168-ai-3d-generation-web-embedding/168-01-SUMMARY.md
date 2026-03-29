---
phase: 168-ai-3d-generation-web-embedding
plan: "01"
subsystem: 3d-pipeline
tags: [gltf-transform, model-viewer, glb, webxr, ar, draco, huggingface, gradio]

requires:
  - phase: 165-image-generation-pipeline
    provides: "save/list/DIR pattern from image-pipeline/assets.cjs; assetsDir test isolation pattern"

provides:
  - "bin/lib/3d-pipeline/assets.cjs: save3DAsset, list3DAssets, THREE_D_DIR"
  - "bin/lib/3d-pipeline/optimize.cjs: optimizeGLB (draco + resize via gltf-transform CLI), inspectGLB"
  - "bin/lib/3d-pipeline/embed.cjs: generateEmbed (model-viewer HTML with WebXR/AR fallback)"
  - "tests/phase-168/fixtures/cube.glb: minimal valid GLB fixture"
  - "27 passing tests across assets, optimize, embed modules"

affects:
  - 168-02 (generation modules will import assets.cjs and embed.cjs)
  - 168-03 (pde-tools.cjs 3d subcommand routing needs all three modules)

tech-stack:
  added:
    - "@huggingface/inference (HF Inference API client)"
    - "@gradio/client (Gradio Space client)"
    - "@gltf-transform/cli (draco compression, texture resize, inspect)"
    - "@gltf-transform/core (programmatic GLB manipulation)"
  patterns:
    - "GLB + JSON sidecar pattern in .planning/design/3d/ (mirrors image-pipeline assets pattern)"
    - "gltf-transform CLI wrapping via spawnSync with local node_modules/.bin fallback to npx"
    - "model-viewer embed with ar-modes=webxr scene-viewer quick-look (no ios-src needed)"

key-files:
  created:
    - "bin/lib/3d-pipeline/assets.cjs"
    - "bin/lib/3d-pipeline/optimize.cjs"
    - "bin/lib/3d-pipeline/embed.cjs"
    - "tests/phase-168/assets.test.mjs"
    - "tests/phase-168/optimize.test.mjs"
    - "tests/phase-168/embed.test.mjs"
    - "tests/phase-168/fixtures/cube.glb"
  modified:
    - "package.json (4 new dependencies)"

key-decisions:
  - "No ios-src in embed — model-viewer 4.x auto-generates USDZ for iOS Quick Look, no server-side conversion needed"
  - "gltf-transform CLI used via spawnSync (not programmatic API) — keeps optimize.cjs thin and avoids ESM/CJS boundary issues"
  - "THREE_D_DIR uses process.cwd() join to .planning/design/3d/ — same pattern as ASSETS_DIR in image-pipeline"
  - "optimizeGLB error handling: if draco fails, throw with stderr so caller can distinguish CLI-invoked vs dependency errors"
  - "inspectGLB gracefully falls back to { vertex_count: 0, file_size } when --format json not supported or parse fails"

patterns-established:
  - "3D asset save: save3DAsset({ slug, glbBuffer, meta, assetsDir }) -> { glbPath, metaPath, meta } with sha256 input_hash"
  - "GLB sidecar fields: source_model, input_type, input_hash, timestamp (ISO), file_size, vertex_count, slug, glb_path (relative)"
  - "embed HTML: DOCTYPE + charset + model-viewer CDN script + snippet; snippet: ar, ar-modes=webxr scene-viewer quick-look, camera-controls, auto-rotate"

requirements-completed: [TRD-03, TRD-04, TRD-05, TRD-08]

duration: 15min
completed: "2026-03-28"
---

# Phase 168 Plan 01: 3D Pipeline Foundation Summary

**Three CJS foundation modules for GLB storage, draco optimization via gltf-transform CLI, and model-viewer AR embed — 27 tests passing with a hand-built GLB fixture**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-28T21:08:00Z
- **Completed:** 2026-03-28T21:12:00Z
- **Tasks:** 2
- **Files created:** 7 (3 modules + 3 test files + 1 GLB fixture)
- **Files modified:** 1 (package.json)

## Accomplishments

- Built `bin/lib/3d-pipeline/assets.cjs` mirroring image-pipeline pattern: saves GLB + SHA-256-keyed JSON sidecar to `.planning/design/3d/`, lists all 3D assets
- Built `bin/lib/3d-pipeline/optimize.cjs` wrapping gltf-transform CLI with spawnSync for draco compression + texture resize, with graceful inspect fallback
- Built `bin/lib/3d-pipeline/embed.cjs` generating self-contained model-viewer HTML pages with `ar`, `ar-modes="webxr scene-viewer quick-look"`, `camera-controls`, `auto-rotate` — no ios-src (model-viewer 4.x handles USDZ auto-conversion)
- Installed 4 new dependencies: @huggingface/inference, @gradio/client, @gltf-transform/cli, @gltf-transform/core
- Created minimal valid GLB binary fixture (440 bytes, single triangle mesh, hand-built per GLB spec)
- 27 tests pass across all three modules

## Task Commits

1. **Task 1: Install deps, create assets.cjs + optimize.cjs + embed.cjs** - `794b6a0` (feat)
2. **Task 2: Create GLB fixture and test files** - `195a714` (test)

## Files Created/Modified

- `bin/lib/3d-pipeline/assets.cjs` - save3DAsset, list3DAssets, THREE_D_DIR
- `bin/lib/3d-pipeline/optimize.cjs` - optimizeGLB (draco+resize), inspectGLB
- `bin/lib/3d-pipeline/embed.cjs` - generateEmbed (model-viewer HTML with AR fallback)
- `tests/phase-168/fixtures/cube.glb` - minimal valid 440-byte GLB fixture
- `tests/phase-168/assets.test.mjs` - 8 tests: save/list/dir/meta
- `tests/phase-168/optimize.test.mjs` - 5 tests: optimizeGLB/inspectGLB with CLI invocation proof
- `tests/phase-168/embed.test.mjs` - 14 tests: model-viewer snippet attributes, AR modes, no ios-src
- `package.json` - 4 new dependencies added

## Decisions Made

- No `ios-src` in embed: model-viewer 4.x auto-generates USDZ from GLB for iOS Quick Look; server-side USDZ conversion via gltf-transform was researched but not needed
- gltf-transform used as CLI (spawnSync) rather than programmatic API — avoids ESM/CJS boundary complexity in Node.js CJS modules
- optimizeGLB throws on CLI failure with stderr content so Plan 02 generation modules can surface actionable errors
- inspectGLB uses graceful fallback — `--format json` may not be available in all gltf-transform versions; returns `{ vertex_count: 0, file_size }` instead of throwing

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. The minimal GLB fixture required hand-building the binary per GLB spec (12-byte header + JSON chunk + BIN chunk) since `gltf-transform create` is not a supported subcommand. The hand-built 440-byte triangle mesh passes all gltf-transform inspect calls.

## User Setup Required

None — no external service configuration required for this plan. HF Inference API (@huggingface/inference) is installed but credentials are not needed for Plan 01 (generation modules are in Plan 02).

## Next Phase Readiness

- Plan 02 (generation modules: generate.cjs, convert.cjs) can import `save3DAsset` and `generateEmbed` immediately
- Plan 03 (pde-tools.cjs routing) can import all three modules for `3d generate|convert|embed|optimize|list` subcommands
- `.planning/design/3d/` directory will be created on first `save3DAsset` call (no manual setup needed)
- HF Inference API key needed for Plan 02 — document in 168-02 USER-SETUP.md

---
*Phase: 168-ai-3d-generation-web-embedding*
*Completed: 2026-03-28*
