# Phase 168: AI 3D Generation + Web Embedding - Research

**Researched:** 2026-03-29
**Domain:** AI image-to-3D reconstruction, GLB optimization, AR web embedding
**Confidence:** MEDIUM (core stack verified; HF Space availability is volatile)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- TripoSR via Hugging Face Inference API (free tier, no local GPU needed) with SF3D as fallback — both return GLB
- Text-to-3D: two-step pipeline — text to image (via Stable Diffusion/SDXL on HF free tier), then image to 3D via TripoSR
- `/pde:3d <type>` with subcommands: generate (text to 3D), convert (image to 3D), embed, optimize
- HF Inference API as primary (cloud, free tier), local Python documented as optional upgrade path
- `gltf-transform` CLI for draco compression, texture resize, mesh simplification — target <5MB for web
- `.planning/design/3d/{slug}-{timestamp}.glb` with JSON sidecar: `{source_model, input_type, input_hash, timestamp, file_size, vertex_count}`
- `pde-tools.cjs 3d list` returns JSON array of all 3D assets with metadata
- Generate `<model-viewer>` HTML snippet with src, ar, ar-modes="webxr scene-viewer quick-look", ios-src for USDZ, camera-orbit presets
- `gltf-transform` GLB to USDZ conversion for iOS Quick Look — generated alongside GLB
- Self-contained HTML file at `.planning/design/3d/{slug}-embed.html` plus raw snippet for copy-paste

### Claude's Discretion
No items deferred.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRD-01 | User can generate 3D models from text descriptions via TripoSR/SF3D | Two-step pipeline: FLUX.1-schnell (text→image) via @huggingface/inference, then image→3D via Gradio client against HF Spaces |
| TRD-02 | User can generate 3D models from product images via image-to-3D | @gradio/client against SF3D or InstantMesh HF Space; accepts image buffer, returns GLB blob |
| TRD-03 | Generated models output in GLB format with optimized geometry | gltf-transform v4.3.0 draco + resize + simplify pipeline; target <5MB |
| TRD-04 | User can embed 3D models in web pages via model-viewer component | @google/model-viewer v4.2.0; HTML snippet generator with CDN script tag |
| TRD-05 | model-viewer integration includes automatic AR fallback (USDZ/WebXR) | model-viewer auto-generates USDZ on iOS if ios-src omitted; ar-modes attribute covers webxr+scene-viewer+quick-look |
| TRD-08 | 3D assets stored in .planning/design/3d/ with generation metadata | saveAsset pattern from image-pipeline/assets.cjs adapted for GLB + JSON sidecar |
</phase_requirements>

---

## Summary

Phase 168 builds a Node.js CJS pipeline that: (1) calls Hugging Face APIs or Gradio Spaces to generate GLB files from text or images, (2) optimizes GLB files for web via gltf-transform CLI, (3) converts GLB to USDZ for iOS AR via a Python subprocess, and (4) generates model-viewer HTML embed snippets. All tooling is free and open-source.

**Critical finding:** Neither the TripoSR nor the SF3D official HF Spaces are currently running reliably — both have reported runtime errors as of March 2026. The plan must treat HF Spaces as the primary path but implement a resilient fallback chain: SF3D Space → TripoSR Space → graceful error with local Python instructions. The `@gradio/client` npm package provides a clean JS interface for calling any HF Space. For text-to-image (step 1 of text-to-3D), `@huggingface/inference` targeting FLUX.1-schnell via HF Inference API is reliable.

**USDZ conversion** cannot be done with three.js USDZExporter in Node.js — it depends on browser-only APIs (ProgressEvent) and is not viable server-side. The correct approach is Apple's `usdzconvert` Python script (from the usdpython toolset) invoked as a subprocess, or model-viewer's built-in auto-USDZ generation which removes the need for a pre-generated .usdz entirely.

**Primary recommendation:** Use `@huggingface/inference` for text-to-image, `@gradio/client` for image-to-3D, `gltf-transform` CLI for optimization, and lean on model-viewer's built-in iOS USDZ auto-generation rather than server-side USDZ conversion. Store GLB only; skip USDZ file generation unless usdzconvert is available.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @huggingface/inference | 4.13.15 | text-to-image via FLUX.1-schnell HF Inference API | Official HF JS client; free tier; supports textToImage() |
| @gradio/client | 2.1.0 | Call HF Spaces (SF3D, InstantMesh) for image-to-3D | Only viable JS approach to call HF Spaces from Node.js |
| @gltf-transform/cli | 4.3.0 | Draco compression, texture resize, mesh simplify | The standard glTF optimization toolkit; CLI spawnable from Node.js |
| @gltf-transform/core | 4.3.0 | Programmatic GLB inspection (vertex count, file size) | Same package family; needed to read mesh metadata |
| three | 0.183.2 | GLTFLoader for reading/inspecting GLB in Node.js | Peer dep of model-viewer; available; read-only use only |
| sharp | 0.34.5 (already installed) | Pre-process/resize input images before 3D inference | Already in project; normalize image to 512x512 PNG before upload |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @google/model-viewer | 4.2.0 (CDN) | AR-capable 3D viewer web component | Embed snippet generation only — loaded via CDN, not bundled |
| node:child_process | built-in | Spawn gltf-transform CLI and optional usdzconvert | Needed to run CLI optimization in subprocess |
| node:crypto | built-in | sha256 hash of input image (for sidecar input_hash) | Consistent with image pipeline pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @gradio/client for image-to-3D | Raw HF Inference API | HF Inference API does NOT support image-to-3D task type — no providers available; Gradio is the only viable path |
| Skip server-side USDZ | usdzconvert Python subprocess | usdzconvert requires Apple's USD Python toolchain — not installed by default, macOS-only; model-viewer auto-generates USDZ on iOS making it optional |
| gltf-transform CLI subprocess | @gltf-transform/functions programmatic | CLI subprocess is simpler for draco (requires native draco encoder); programmatic API requires extra native binding setup |

**Installation (new packages):**
```bash
npm install @huggingface/inference @gradio/client @gltf-transform/cli @gltf-transform/core
```

**Version verification (confirmed against npm registry 2026-03-29):**
- @huggingface/inference: 4.13.15
- @gradio/client: 2.1.0
- @gltf-transform/cli: 4.3.0
- @gltf-transform/core: 4.3.0
- @google/model-viewer: 4.2.0 (CDN only, not bundled)

---

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/3d-pipeline/
├── assets.cjs        # save3DAsset(), list3DAssets(), THREE_D_DIR constant
├── generate.cjs      # text → image (HF Inference API) → 3D (Gradio/SF3D)
├── convert.cjs       # image → 3D (Gradio/SF3D or InstantMesh)
├── optimize.cjs      # gltf-transform CLI subprocess wrapper
└── embed.cjs         # model-viewer HTML snippet generator

.planning/design/3d/
├── {slug}-{timestamp}.glb         # optimized GLB
├── {slug}-{timestamp}.meta.json   # sidecar metadata
└── {slug}-embed.html              # self-contained viewer page
```

### Pattern 1: HF Inference API for text-to-image (step 1 of text-to-3D)
**What:** Call FLUX.1-schnell via @huggingface/inference to produce an image Blob from a text prompt, then pipe that Blob into the image-to-3D step.
**When to use:** TRD-01 (text-to-3D). Requires HF_TOKEN env var; free tier.
**Example:**
```javascript
// Source: https://huggingface.co/docs/huggingface.js/inference/README
const { InferenceClient } = require('@huggingface/inference');
const client = new InferenceClient(process.env.HF_TOKEN);

async function textToImage(prompt) {
  const blob = await client.textToImage({
    model: 'black-forest-labs/FLUX.1-schnell',
    inputs: prompt,
    parameters: { num_inference_steps: 4 },
  });
  // blob is a Blob; convert to Buffer for sharp preprocessing
  const arrayBuf = await blob.arrayBuffer();
  return Buffer.from(arrayBuf);
}
```

### Pattern 2: Gradio Client for image-to-3D
**What:** Connect to an HF Space (SF3D or InstantMesh) using @gradio/client, submit an image, await GLB file URL in response.
**When to use:** TRD-01 (step 2) and TRD-02. Requires HF_TOKEN; rate-limited but free.
**Example:**
```javascript
// Source: https://www.gradio.app/guides/getting-started-with-the-js-client
const { Client } = require('@gradio/client');

async function imageToGLB(imageBuffer, slug) {
  // Try SF3D first; fall back to InstantMesh
  const SPACES = [
    'stabilityai/stable-fast-3d',
    'TencentARC/InstantMesh',
  ];
  for (const space of SPACES) {
    try {
      const app = await Client.connect(space, { token: process.env.HF_TOKEN });
      const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
      const result = await app.predict('/run', [imageBlob]);
      // result.data[0] is typically a file URL or Blob for the GLB
      return result.data;
    } catch (err) {
      console.warn(`Space ${space} unavailable: ${err.message}, trying next...`);
    }
  }
  throw new Error('All image-to-3D spaces unavailable. Set up local Python fallback.');
}
```

**CRITICAL: Gradio API endpoint names vary per space.** The planner MUST include a Wave 0 task to inspect each Space's `/info` endpoint to discover actual API route names before coding. Use `app.view_api()` or fetch `https://huggingface.co/spaces/{space}/api/` to confirm.

### Pattern 3: gltf-transform CLI Optimization
**What:** Spawn gltf-transform CLI as a child process to run draco compression + texture resize.
**When to use:** TRD-03. Input is any GLB; outputs optimized GLB.
**Example:**
```javascript
// Source: https://gltf-transform.dev/cli
const { spawnSync } = require('child_process');
const path = require('path');

function optimizeGLB({ inputPath, outputPath, textureMaxSize = 1024 }) {
  // Step 1: Draco compress geometry
  const dracoResult = spawnSync(
    'npx', ['@gltf-transform/cli', 'draco', inputPath, outputPath,
            '--method', 'edgebreaker'],
    { encoding: 'utf8', stdio: 'pipe' }
  );
  if (dracoResult.status !== 0) throw new Error(`draco failed: ${dracoResult.stderr}`);

  // Step 2: Resize textures in-place
  const resizeResult = spawnSync(
    'npx', ['@gltf-transform/cli', 'resize', outputPath, outputPath,
            '--width', String(textureMaxSize), '--height', String(textureMaxSize)],
    { encoding: 'utf8', stdio: 'pipe' }
  );
  if (resizeResult.status !== 0) throw new Error(`resize failed: ${resizeResult.stderr}`);

  return { outputPath, sizeMB: (require('fs').statSync(outputPath).size / 1e6).toFixed(2) };
}
```

### Pattern 4: model-viewer Embed Snippet Generation
**What:** Generate a self-contained HTML file and a raw `<model-viewer>` snippet.
**When to use:** TRD-04, TRD-05.
**Example:**
```javascript
// Source: https://modelviewer.dev/examples/augmentedreality/index.html
function generateEmbed({ glbPath, usdzPath, slug, cameraOrbit = '45deg 75deg 2m' }) {
  const glbUrl = `./${path.basename(glbPath)}`;
  const iosSrc = usdzPath ? `ios-src="./${path.basename(usdzPath)}"` : '';
  // Without ios-src, model-viewer auto-generates USDZ on iOS Quick Look tap

  const snippet = `<script type="module"
  src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js">
</script>
<model-viewer
  src="${glbUrl}"
  ${iosSrc}
  ar
  ar-modes="webxr scene-viewer quick-look"
  camera-controls
  camera-orbit="${cameraOrbit}"
  auto-rotate
  shadow-intensity="1"
  style="width:100%;height:500px">
</model-viewer>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${slug} 3D Preview</title></head>
<body style="margin:0;background:#111">
${snippet}
</body></html>`;

  return { snippet, html };
}
```

### Pattern 5: 3D Asset Storage (adapted from image-pipeline)
**What:** Save GLB + JSON sidecar to `.planning/design/3d/` using the same pattern as `image-pipeline/assets.cjs`.
**When to use:** TRD-08. Called after optimize step.
**Sidecar schema:**
```json
{
  "source_model": "stabilityai/stable-fast-3d",
  "input_type": "image | text",
  "input_hash": "<sha256 of source image>",
  "timestamp": "2026-03-29T00:00:00.000Z",
  "file_size": 2456832,
  "vertex_count": 14200,
  "slug": "product-hero",
  "glb_path": ".planning/design/3d/product-hero-1743200000000.glb",
  "embed_path": ".planning/design/3d/product-hero-embed.html"
}
```

### Anti-Patterns to Avoid
- **three.js USDZExporter in Node.js:** Depends on browser-only `ProgressEvent` API. Throws `ReferenceError: ProgressEvent is not defined`. Do not attempt.
- **Polling Gradio Space via raw fetch without @gradio/client:** Gradio has non-trivial event streaming protocol; @gradio/client handles this correctly.
- **Calling gltf-transform programmatic API for draco:** The draco encoder is a native binary (`draco_encoder`) that gltf-transform CLI bundles. Using the Node.js API directly requires separate draco native setup. Use `npx @gltf-transform/cli` instead.
- **Assuming HF Space API route names:** Each space has its own Gradio function names (/predict, /run, /generate, etc.). Always discover via `/info` API before hardcoding.
- **Bundling model-viewer into project:** model-viewer is loaded via CDN `<script>` in the generated HTML. Do not `npm install @google/model-viewer` into the main project — it pulls in three.js and inflates bundle size for no benefit.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GLB Draco compression | Custom geometry encoder | `gltf-transform draco` CLI | Draco is a complex binary codec; gltf-transform wraps the official Google encoder |
| Texture mip/resize pipeline | Custom image resize for GLB | `gltf-transform resize` CLI | Must handle embedded vs. external textures, multiple texture slots |
| HF Space event streaming | Custom SSE parser | @gradio/client | Gradio uses custom JSON-over-SSE; client handles auth, retries, file upload |
| Mesh simplification | Decimation algorithm | `gltf-transform simplify` CLI | Mesh simplification with topology preservation is a research problem |
| AR mode detection | User-agent sniffing | model-viewer `ar-modes` attribute | model-viewer handles WebXR/SceneViewer/QuickLook detection natively |

**Key insight:** The 3D toolchain (compression, mesh simplification, AR mode detection) involves solved problems with decades of research. Every "simple" custom solution will miss edge cases that the battle-tested tools handle.

---

## Runtime State Inventory

Not applicable. This is a greenfield pipeline phase with no existing stored data, live service config, or OS-registered state referencing terms that will change. The output directory `.planning/design/3d/` does not yet exist and will be created by Wave 0.

---

## Common Pitfalls

### Pitfall 1: HF Space Runtime Errors (CRITICAL)
**What goes wrong:** Both `stabilityai/TripoSR` and `stabilityai/stable-fast-3d` are confirmed down as of March 2026 (onnxruntime missing, gradio_client TypeError). The generate and convert modules will fail on every call if they only try one space.
**Why it happens:** HF Spaces are community-maintained; dependencies go stale and maintainers don't always update promptly. Free tier spaces can go offline at any time.
**How to avoid:** Implement a `SPACE_CHAIN` array tried in order. Include at least: `['stabilityai/stable-fast-3d', 'TencentARC/InstantMesh']`. On any error, try next. If all fail, throw a descriptive error with instructions for local Python fallback.
**Warning signs:** HTTP 503 from space, `RuntimeError` in Gradio response, `status: "error"` in API response.

### Pitfall 2: Gradio API Route Discovery
**What goes wrong:** Hardcoding `/predict` or `/run` as the Gradio API route when the space actually uses a different function name. Results in 404 or malformed request.
**Why it happens:** Each Gradio app defines its own named functions; there is no standard route.
**How to avoid:** In Wave 0, add a task to fetch `https://huggingface.co/spaces/{space}/api/` and document the actual route names. Store them as constants in convert.cjs.
**Warning signs:** `EndpointNotFoundError`, empty response array, status code 422.

### Pitfall 3: USDZ Conversion — Three.js is Not Viable
**What goes wrong:** three.js `USDZExporter.parseAsync()` throws `ReferenceError: ProgressEvent is not defined` in Node.js because it depends on browser-only Web APIs.
**Why it happens:** three.js is a browser-first library; USDZExporter was designed for in-browser use only.
**How to avoid:** Do NOT attempt three.js USDZ conversion. Instead: (a) rely on model-viewer's built-in iOS auto-USDZ (no ios-src needed), or (b) if USDZ file is required, use `usdzconvert` Python CLI as subprocess (macOS with Apple USD tools only). Document this constraint in embed.cjs.
**Warning signs:** Any attempt to `new USDZExporter()` in a Node.js/CJS context.

### Pitfall 4: GLB File Size After Inference
**What goes wrong:** Raw GLB from TripoSR/SF3D can be 20-100 MB. Skipping optimization makes the asset unusable for web embedding (target: <5 MB).
**Why it happens:** Models output full-resolution uncompressed geometry. Draco alone can reduce by 60-90%.
**How to avoid:** Always run the optimize step before saving to `.planning/design/3d/`. optimize.cjs should be called automatically in generate.cjs and convert.cjs.
**Warning signs:** GLB file > 5 MB in output directory.

### Pitfall 5: HF_TOKEN Requirement
**What goes wrong:** @huggingface/inference and @gradio/client both require a HF access token even for free-tier public models. Without it, requests return 401 or are rate-limited to 0.
**Why it happens:** HF moved from unauthenticated to token-required access for API calls in 2024-2025.
**How to avoid:** Read `process.env.HF_TOKEN` at module load time. If missing, throw a descriptive error: `"Set HF_TOKEN environment variable: https://huggingface.co/settings/tokens"`. Document this in commands/3d.md.
**Warning signs:** 401 Unauthorized, "requires authentication" in error message.

### Pitfall 6: @gradio/client is ESM-only
**What goes wrong:** `@gradio/client` is an ESM package. Using `require('@gradio/client')` in a `.cjs` file throws `ERR_REQUIRE_ESM`.
**Why it happens:** The package ships only ES module format with no CJS interop layer.
**How to avoid:** Use dynamic `import()` inside an async function in the CJS module. Pattern: `const { Client } = await import('@gradio/client');`
**Warning signs:** `ERR_REQUIRE_ESM`, "Cannot use import statement in a module".

### Pitfall 7: gltf-transform CLI not globally available
**What goes wrong:** `spawnSync('gltf-transform', ...)` fails with ENOENT if the CLI is not globally installed.
**Why it happens:** The CLI is listed as a project dependency but not necessarily in PATH.
**How to avoid:** Use `npx --yes @gltf-transform/cli` rather than bare `gltf-transform` in spawnSync. Or resolve the binary path from `node_modules/.bin/gltf-transform` relative to project root.
**Warning signs:** `ENOENT spawn gltf-transform`, error code 127.

---

## Code Examples

### Discover Gradio Space API Routes
```javascript
// Run once during Wave 0 to document actual route names
async function discoverSpaceAPI(spaceName) {
  // Source: https://www.gradio.app/guides/getting-started-with-the-js-client
  const { Client } = await import('@gradio/client');
  const app = await Client.connect(spaceName, { token: process.env.HF_TOKEN });
  const api = await app.view_api();
  console.log(JSON.stringify(api, null, 2));
}
```

### Save 3D Asset (adapted from image-pipeline pattern)
```javascript
// Source: bin/lib/image-pipeline/assets.cjs (existing pattern)
function save3DAsset({ slug, glbBuffer, meta, assetsDir }) {
  const baseDir = assetsDir || THREE_D_DIR;
  fs.mkdirSync(baseDir, { recursive: true });
  const timestamp = Date.now();
  const glbFilename = `${slug}-${timestamp}.glb`;
  const metaFilename = `${slug}-${timestamp}.meta.json`;
  const glbPath = path.join(baseDir, glbFilename);
  const metaPath = path.join(baseDir, metaFilename);
  fs.writeFileSync(glbPath, glbBuffer);
  fs.writeFileSync(metaPath, JSON.stringify({ ...meta, timestamp: new Date(timestamp).toISOString() }, null, 2));
  return { glbPath, metaPath };
}
```

### pde-tools.cjs 3d case block (routing pattern)
```javascript
// Follows existing video/image case pattern in pde-tools.cjs
case '3d': {
  const subcommand = args[1];
  if (subcommand === 'generate') {
    const { generate3D } = require('./lib/3d-pipeline/generate.cjs');
    const promptIdx = args.indexOf('--prompt');
    const slugIdx = args.indexOf('--slug');
    const prompt = promptIdx !== -1 ? args[promptIdx + 1] : undefined;
    if (!prompt) { console.error('Usage: 3d generate --prompt <text> [--slug <slug>]'); process.exit(1); }
    const slug = slugIdx !== -1 ? args[slugIdx + 1] : 'model';
    const result = await generate3D({ prompt, slug });
    console.log(JSON.stringify(result.meta, null, 2));
  } else if (subcommand === 'convert') { /* ... */ }
  else if (subcommand === 'optimize') { /* ... */ }
  else if (subcommand === 'embed') { /* ... */ }
  else if (subcommand === 'list') { /* ... */ }
  else { console.error('Usage: 3d <generate|convert|optimize|embed|list>'); process.exit(1); }
  break;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Point cloud / NeRF (multi-image) | Single-image feed-forward reconstruction (TripoSR, SF3D) | 2024 | Single product photo → usable 3D mesh in seconds |
| OBJ format for web | GLB (binary glTF 2.0) | 2020+ | Single file, embedded textures, natively supported by model-viewer |
| OBJ/FBX Draco | glTF-native Draco (KHR_draco_mesh_compression) | 2018+ | Web loaders decode directly; 60-90% geometry reduction |
| Custom AR SDK (ARKit/ARCore native) | model-viewer web component | 2019+ | Zero-install AR from any mobile browser |
| Pre-generating USDZ server-side | model-viewer auto-USDZ on iOS tap | 2022+ | Eliminates need for server-side USDZ toolchain |

**Deprecated/outdated:**
- OBJ/FBX for web: replaced by GLB; model-viewer does not support OBJ
- three.js USDZExporter for Node.js: browser-only, not viable server-side (confirmed broken 2024-2026)
- HF Inference API for image-to-3D task: no providers support this task type as of 2026; Gradio Spaces is the only path

---

## Open Questions

1. **Gradio Space downtime strategy**
   - What we know: Both SF3D and TripoSR spaces are currently down (March 2026). InstantMesh appears to be available.
   - What's unclear: InstantMesh Space API route names; whether it produces GLB or OBJ by default.
   - Recommendation: Wave 0 task must call `Client.view_api()` on InstantMesh and document actual routes and output format before writing convert.cjs.

2. **gltf-transform draco availability in npx context**
   - What we know: gltf-transform CLI v4.3.0 exists; draco command wraps Google's native draco_encoder.
   - What's unclear: Whether `npx @gltf-transform/cli draco` works without a prior `npm install` in a clean environment.
   - Recommendation: Add `@gltf-transform/cli` to project devDependencies so `node_modules/.bin/gltf-transform` is reliably resolvable.

3. **Vertex count extraction from GLB**
   - What we know: The sidecar requires `vertex_count`. gltf-transform's `inspect` command outputs this.
   - What's unclear: Whether `gltf-transform inspect` outputs JSON parseable from stdout.
   - Recommendation: Test `gltf-transform inspect input.glb --format json` in Wave 0; fall back to 0 if unavailable.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All modules | ✓ | 20.20.0 | — |
| Python 3 | Local TripoSR (optional path) | ✓ | 3.14.3 | — |
| PyTorch | Local TripoSR | ✗ | — | Use HF Space path (cloud) |
| sharp | Image preprocessing | ✓ | 0.34.5 | — |
| @huggingface/inference | Text-to-image step 1 | ✗ (not installed) | — | npm install |
| @gradio/client | Image-to-3D via HF Spaces | ✗ (not installed) | — | npm install |
| @gltf-transform/cli | GLB optimization | ✗ (not installed) | — | npm install |
| gltf-transform binary | GLB optimization | ✗ (not in PATH) | — | Use node_modules/.bin path |
| usdzconvert | USDZ generation | ✗ | — | model-viewer auto-USDZ (preferred) |
| HF_TOKEN env var | HF API + Gradio calls | unknown | — | Must be set by user |
| HF SF3D Space | image-to-3D primary | ✗ (down as of 2026-03-29) | — | Fall back to InstantMesh |
| HF TripoSR Space | image-to-3D secondary | ✗ (down as of 2026-03-29) | — | Fall back to InstantMesh |
| TencentARC/InstantMesh Space | image-to-3D tertiary | likely ✓ (active) | — | Local Python (documented) |

**Missing dependencies with no fallback:**
- HF_TOKEN: must be documented in commands/3d.md as a prerequisite; pipeline fails without it

**Missing dependencies with fallback:**
- @huggingface/inference, @gradio/client, @gltf-transform/cli: install in Wave 0
- usdzconvert: skip USDZ pre-generation; model-viewer handles iOS auto-USDZ natively

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `npx vitest run tests/phase-168/ --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRD-01 | generate3D() returns { glbPath, meta } for a text prompt | unit (mocked HF calls) | `npx vitest run tests/phase-168/generate.test.mjs -x` | ❌ Wave 0 |
| TRD-02 | convert3D() returns { glbPath, meta } given an image buffer | unit (mocked Gradio) | `npx vitest run tests/phase-168/convert.test.mjs -x` | ❌ Wave 0 |
| TRD-03 | optimizeGLB() reduces file size and produces valid GLB | unit (real fixture GLB) | `npx vitest run tests/phase-168/optimize.test.mjs -x` | ❌ Wave 0 |
| TRD-04 | generateEmbed() returns HTML containing `<model-viewer>` and correct src | unit | `npx vitest run tests/phase-168/embed.test.mjs -x` | ❌ Wave 0 |
| TRD-05 | embed snippet includes ar, ar-modes="webxr scene-viewer quick-look" | unit (string match) | `npx vitest run tests/phase-168/embed.test.mjs -x` | ❌ Wave 0 |
| TRD-08 | save3DAsset() writes GLB + meta.json to .planning/design/3d/ | unit (tmpdir) | `npx vitest run tests/phase-168/assets.test.mjs -x` | ❌ Wave 0 |
| TRD-01/02 | pde-tools.cjs `3d generate/convert` commands print JSON | smoke (manual, requires HF_TOKEN + Space up) | manual | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-168/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-168/assets.test.mjs` — covers TRD-08 (save3DAsset, list3DAssets)
- [ ] `tests/phase-168/generate.test.mjs` — covers TRD-01 with mocked @huggingface/inference and @gradio/client
- [ ] `tests/phase-168/convert.test.mjs` — covers TRD-02 with mocked @gradio/client
- [ ] `tests/phase-168/optimize.test.mjs` — covers TRD-03 with a tiny fixture GLB file
- [ ] `tests/phase-168/embed.test.mjs` — covers TRD-04, TRD-05 via HTML string assertions
- [ ] `tests/phase-168/fixtures/cube.glb` — minimal valid GLB for optimize tests
- [ ] Wave 0 task: call `Client.view_api()` on `TencentARC/InstantMesh` and document actual API routes

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md does not exist in this project. No additional constraints apply beyond those in CONTEXT.md and STATE.md:
- All services must use free or open-source toolchains — no paid API keys required
- 3D pipeline: `.planning/design/3d/` is the canonical output directory with metadata JSON sidecar
- CJS module pattern throughout `bin/lib/` (`.cjs` extension, `'use strict'`, `module.exports`)
- pde-tools.cjs routing: `case '3d':` block placed after `case 'video':`, before `case 'phase-plan-index':`
- Test pattern: `.mjs` test files in `tests/phase-168/`, using `createRequire(import.meta.url)` to bridge ESM/CJS boundary
- Vitest include pattern: `tests/**/*.{test,spec}.{cjs,mjs,js,ts}`

---

## Sources

### Primary (HIGH confidence)
- https://huggingface.co/docs/huggingface.js/inference/README — @huggingface/inference full API including textToImage()
- https://www.gradio.app/guides/getting-started-with-the-js-client — @gradio/client Client.connect(), predict(), view_api()
- https://gltf-transform.dev/cli — gltf-transform CLI v4.3.0 commands: draco, resize, simplify, optimize
- https://modelviewer.dev/examples/augmentedreality/index.html — model-viewer AR attributes: ar, ar-modes, ios-src, camera-orbit

### Secondary (MEDIUM confidence)
- https://huggingface.co/tasks/image-to-3d — Confirmed no HF Inference API providers for image-to-3D; Gradio/Diffusers only
- https://github.com/VAST-AI-Research/TripoSR — Local inference requirements: Python ≥3.8, ~6GB VRAM, `--device cpu` supported
- https://discourse.threejs.org/t/convert-glb-format-file-to-usdz-without-browser/73459 — three.js USDZExporter Node.js failure confirmed (ProgressEvent not defined)
- https://github.com/Stability-AI/stable-fast-3d — SF3D outputs GLB; license restriction for >$1M ARR orgs
- HF Spaces live inspection (2026-03-29) — TripoSR space down (onnxruntime missing); SF3D space down (gradio_client TypeError)

### Tertiary (LOW confidence)
- npm view outputs (2026-03-29) — version numbers confirmed for @huggingface/inference, @gradio/client, @gltf-transform/cli
- WebSearch: InstantMesh space described as active; not directly verified via live API call

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against npm registry
- Architecture: MEDIUM — patterns drawn from official docs; Gradio route names unconfirmed for target spaces
- Pitfalls: HIGH — three.js/USDZ failure confirmed via live forum; HF Space downtime confirmed via live page fetch
- HF Space availability: LOW — volatile; confirmed down as of research date

**Research date:** 2026-03-29
**Valid until:** 2026-04-05 (7-day window; HF Space availability changes frequently)
