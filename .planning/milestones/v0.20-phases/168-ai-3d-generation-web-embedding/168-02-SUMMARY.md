---
phase: 168-ai-3d-generation-web-embedding
plan: "02"
subsystem: 3d-pipeline
tags: [huggingface, gradio, flux, text-to-3d, image-to-3d, glb, fallback-chain, dependency-injection]

requires:
  - phase: 168-ai-3d-generation-web-embedding
    plan: "01"
    provides: "save3DAsset, optimizeGLB, inspectGLB from 3D pipeline foundation modules"

provides:
  - "bin/lib/3d-pipeline/convert.cjs: convert3D (image-to-3D via Gradio Space fallback chain), SPACE_CHAIN constant"
  - "bin/lib/3d-pipeline/generate.cjs: generate3D (text-to-3D two-step: FLUX.1-schnell then convert3D)"
  - "tests/phase-168/convert.test.mjs: 8 tests covering SPACE_CHAIN, HF_TOKEN guard, fallback chain"
  - "tests/phase-168/generate.test.mjs: 6 tests covering HF_TOKEN guard, FLUX model, meta override"

affects:
  - 168-03 (pde-tools.cjs 3d subcommand routing needs convert3D and generate3D)

tech-stack:
  added:
    - "@gradio/client (dynamic import() for ESM-only CJS interop)"
    - "@huggingface/inference (InferenceClient.textToImage for FLUX.1-schnell)"
  patterns:
    - "Dependency injection via _gradioClient/_sharpFn/_optimizeFn/_saveFn/_hfClient parameters for CJS test mocking"
    - "SPACE_CHAIN fallback array: SF3D → InstantMesh, fail-fast per space with console.warn"
    - "Two-step text-to-3D pipeline: HF Inference API (text→image) → Gradio Space (image→GLB)"
    - "ESM-only package (@gradio/client) wrapped in dynamic import() inside CJS async function"

key-files:
  created:
    - "bin/lib/3d-pipeline/convert.cjs"
    - "bin/lib/3d-pipeline/generate.cjs"
    - "tests/phase-168/convert.test.mjs"
    - "tests/phase-168/generate.test.mjs"
  modified:
    - "vitest.config.ts (added @huggingface/inference to server.deps.inline)"

key-decisions:
  - "Dependency injection (_hfClient, _convertFn, _gradioClient, _sharpFn, _optimizeFn, _saveFn) replaces vi.mock() for CJS module mocking — vi.mock() cannot intercept require() in CJS files loaded via createRequire()"
  - "SPACE_CHAIN=['stabilityai/stable-fast-3d','TencentARC/InstantMesh'] — tries multiple route names (/run, /predict, /generate) per space to handle Gradio API variability"
  - "generate.cjs accepts _hfClient injection instead of top-level require('@huggingface/inference') — enables lazy loading and test isolation"
  - "FAKE_GLB in test is a 12-byte valid GLB header — sufficient for mocked pipeline tests without real 3D inference"

requirements-completed: [TRD-01, TRD-02]

duration: 20min
completed: "2026-03-29"
---

# Phase 168 Plan 02: 3D Generation Modules Summary

**convert3D (image-to-3D via @gradio/client SPACE_CHAIN fallback) and generate3D (text-to-3D via FLUX.1-schnell + convert3D) with 14 mocked unit tests using dependency injection**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-29T04:00:00Z
- **Completed:** 2026-03-29T04:21:00Z
- **Tasks:** 2
- **Files created:** 4 (2 modules + 2 test files)
- **Files modified:** 1 (vitest.config.ts)

## Accomplishments

- Built `bin/lib/3d-pipeline/convert.cjs` implementing TRD-02: image-to-3D via @gradio/client with SPACE_CHAIN fallback (SF3D → InstantMesh), multi-route discovery (/run, /predict, /generate), auto-optimize via optimizeGLB, auto-save via save3DAsset
- Built `bin/lib/3d-pipeline/generate.cjs` implementing TRD-01: two-step text-to-3D pipeline using InferenceClient.textToImage (FLUX.1-schnell) then convert3D, overrides meta.input_type to 'text' and adds prompt field
- Both modules guard against missing HF_TOKEN before any API call with a descriptive error message
- @gradio/client loaded via dynamic `import()` inside async functions (ESM-only package, cannot use `require()`)
- Created `tests/phase-168/convert.test.mjs` (8 tests) and `tests/phase-168/generate.test.mjs` (6 tests)
- 41 total phase-168 tests passing (previously 27 from Plan 01 + 14 new)

## Task Commits

1. **Task 1: Create convert.cjs and generate.cjs** — `69f1662` (feat)
2. **Task 2: Create mocked tests** — `e711602` (test)

## Files Created/Modified

- `bin/lib/3d-pipeline/convert.cjs` — convert3D with SPACE_CHAIN fallback, HF_TOKEN guard, DI injection parameters
- `bin/lib/3d-pipeline/generate.cjs` — generate3D two-step pipeline with DI injection parameters
- `tests/phase-168/convert.test.mjs` — 8 tests: SPACE_CHAIN content, HF_TOKEN missing, first space called, fallback to second, all-spaces-fail error, success shape, input_type=image, source_model
- `tests/phase-168/generate.test.mjs` — 6 tests: HF_TOKEN missing, FLUX model called, imageBuffer passed, input_type=text, prompt in meta, return shape
- `vitest.config.ts` — added @huggingface/inference to server.deps.inline

## Decisions Made

- **Dependency injection over vi.mock() for CJS mocking**: `vi.mock()` works for vitest's ESM module resolution but cannot intercept `require()` calls in CJS files loaded via `createRequire(import.meta.url)`. The solution is DI parameters (`_hfClient`, `_convertFn`, `_gradioClient`, etc.) — this is a non-invasive pattern where prod code falls back to real implementations when params are absent.
- **Dynamic import() for @gradio/client**: @gradio/client is ESM-only; using `require('@gradio/client')` throws ERR_REQUIRE_ESM. The fix is `const { Client } = await import('@gradio/client')` inside the async function. The `_gradioClient` injection parameter bypasses this in tests.
- **Multi-route discovery in convert3D**: Different HF Spaces expose different Gradio function names. Rather than hardcoding `/run`, convert3D tries `/run`, `/predict`, and `/generate` in sequence. First successful response wins.
- **SPACE_CHAIN failure message**: When all spaces fail, the error message lists the failed spaces and includes the TripoSR GitHub URL for local Python fallback setup.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Testability] Added dependency injection parameters to convert3D and generate3D**
- **Found during:** Task 2 (writing tests)
- **Issue:** `vi.mock()` cannot intercept `require()` calls in `.cjs` files loaded via Node's native CJS loader (via `createRequire`). The `sharp`, `@huggingface/inference`, and transitive dependencies bypass vitest's ESM mock resolver entirely.
- **Fix:** Added optional `_sharpFn`, `_gradioClient`, `_optimizeFn`, `_inspectFn`, `_saveFn`, `_hfClient` parameters to both functions. Production code uses real implementations when params are undefined.
- **Files modified:** `bin/lib/3d-pipeline/convert.cjs`, `bin/lib/3d-pipeline/generate.cjs`
- **Commit:** `69f1662`, `e711602`

## Known Stubs

None — all functionality is implemented. Both convert3D and generate3D require real HF_TOKEN and real HF Services (Space/Inference API) for production use. This is documented in the user_setup section of the plan, not a code stub.

## Self-Check

- [x] `bin/lib/3d-pipeline/convert.cjs` exists
- [x] `bin/lib/3d-pipeline/generate.cjs` exists
- [x] `tests/phase-168/convert.test.mjs` exists
- [x] `tests/phase-168/generate.test.mjs` exists
- [x] Commit `69f1662` exists
- [x] Commit `e711602` exists
- [x] 41 phase-168 tests passing

## Self-Check: PASSED

---
*Phase: 168-ai-3d-generation-web-embedding*
*Completed: 2026-03-29*
