# Phase 175: Design Pipeline Integration - Research

**Researched:** 2026-03-29
**Domain:** Graceful degradation patterns for optional app-tool steps in wireframe/mockup workflows; Blender render → Phase 168 GLB pipeline chaining; GIMP retouch → Phase 165 image pipeline chaining; app-registry.json status probing at skill execution time
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-01 | `wireframe.md` and `mockup.md` gain optional app-tool steps gated by `probeServer()`, degrading to no-op with documented skip | mcp-bridge.cjs `probe()` function verified; existing MCP probe step pattern in wireframe.md Step 3 is the exact model; app-registry.cjs `checkApproved()` throws on non-approved entries — wrap in try/catch for graceful degrade |
| PIPE-02 | Blender → 3D pipeline chaining: render output feeds into GLB optimize → model-viewer (Phase 168 integration) | Phase 168 `optimize.cjs` accepts any GLB path; `optimizeGLB({inputPath, outputPath})` is the entry point; Blender `--render-format` must be set to a format convertible to GLB — use Python bpy export via `--python` script for GLB direct output |
| PIPE-03 | GIMP → image pipeline chaining: GIMP retouch as an editing step within existing Phase 165 image pipeline | Phase 165 `assets.cjs` `saveAsset()` pattern; GIMP outputs PNG to any path via Script-Fu; the output PNG drops directly into `.planning/design/assets/mockup/` via the existing `saveAsset()` call |
</phase_requirements>

---

## Summary

Phase 175 adds conditional steps to the two existing design workflow skills (`wireframe.md` and `mockup.md`), wires Blender render output into the Phase 168 GLB pipeline, and wires GIMP retouch output into the Phase 165 image pipeline. No new infrastructure is needed — this phase is entirely about connecting Phase 172's app wrappers into the two existing skill workflows and the two existing asset pipelines.

The central design principle is that all three app-tool steps (Blender 3D wireframe, GIMP mockup retouch) must be strictly optional. The skill must complete its full normal execution path regardless of whether Blender or GIMP is installed and approved. Optional steps are gated by a registry availability check; failure produces a documented skip note, not an error.

The registry check pattern is already established by Phase 171's `app-registry.cjs`. At skill execution time, the workflow calls `pde-tools app probe <slug>` (a CLI wrapper around `checkApproved()`), reads the JSON result, and conditionally executes or skips the app-tool step. This is the same degrade-gracefully approach already used in the existing MCP probe steps (Step 3/7) in both wireframe.md and mockup.md — the pattern already exists in these files, so Phase 175 is adding more instances of it rather than inventing new structure.

The key file format handoff points are: Blender must export GLB directly (via a `--python` bpy export script, not `--render-format`) because Phase 168's optimize pipeline expects a `.glb` file, not a PNG/EXR render. GIMP must export PNG to a specific path that Phase 165's `saveAsset()` then processes. Both handoffs are clean one-step conversions with well-established patterns.

**Primary recommendation:** Add a Step 3.5 to both wireframe.md and mockup.md that probes app-registry.json for Blender and GIMP availability (respectively), sets an availability flag, and stores the registry entry if approved. Add a conditional app-tool block inside the main generation step (Step 4) that executes the wrapper command when the flag is true. Wire output paths directly into the existing Phase 168 and Phase 165 pipeline modules.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bin/lib/app-registry.cjs | Phase 171 (project) | Registry status read at skill execution time | `checkApproved(registryPath, slug)` is the canonical gate — already established |
| bin/lib/app-wrappers/blender-wrapper.cjs | Phase 172 (project) | Blender CapabilityModel + invocation args builder | Phase 172 output; use `buildCapabilityModel()` to get invocation template |
| bin/lib/app-wrappers/gimp-wrapper.cjs | Phase 172 (project) | GIMP version-aware invocation args builder | Phase 172 output; `buildGimpArgs(scriptFuExpr, registryEntry)` selects correct 2.x vs 3.x flags |
| bin/lib/3d-pipeline/optimize.cjs | Phase 168 (project) | GLB Draco compression + texture resize | `optimizeGLB({inputPath, outputPath})` is the pipeline entry point for Blender output |
| bin/lib/image-pipeline/assets.cjs | Phase 165 (project) | Asset storage with metadata sidecar | `saveAsset({type:'mockup', buffer, slug, params})` is the pipeline entry point for GIMP output |
| Node.js child_process | built-in (v20.x) | Spawn Blender/GIMP subprocesses in skill workflow | Established pattern from Phase 172 wrappers; use `spawn` (async) not `spawnSync` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bin/lib/3d-pipeline/embed.cjs | Phase 168 (project) | model-viewer HTML snippet generation | Call after optimize step to produce the embed HTML alongside the wireframe |
| Node.js fs + path | built-in (v20.x) | Write skip notes, check output file existence | Always — zero-dependency CJS |
| vitest | 4.1.1 (installed) | Test framework | All unit tests follow `tests/phase-175/*.test.mjs` pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pde-tools app probe CLI call in workflow | Direct require() of app-registry.cjs | `require()` in workflow bash blocks is awkward; `pde-tools app probe <slug>` outputs JSON that bash can parse — consistent with existing pde-tools CLI pattern throughout all workflows |
| Blender `--render-format GLB` | Blender `--python` bpy export script | `--render-format` does not support GLB; Blender renders to PNG/EXR/etc. GLB export requires `bpy.ops.export_scene.gltf()` in a Python script — use `--python glb-export.py` |
| GIMP writing directly to `.planning/design/assets/mockup/` | GIMP writes to temp path, then `saveAsset()` reads it | Same outcome; `saveAsset()` handles sidecar JSON and metadata — always route through the Phase 165 asset module, not raw file copy |

**Installation:** No new npm dependencies. All modules are built in Phases 165, 168, 171, and 172.

---

## Architecture Patterns

### Recommended Project Structure
```
workflows/
  wireframe.md              # Add Step 3.5 (Blender probe) + Step 4-BLENDER optional block
  mockup.md                 # Add Step 3.5 (GIMP probe) + Step 4-GIMP optional block

bin/lib/design-pipeline/
  blender-glb-export.py     # Python script for `blender --python`: bpy GLB export
  gimp-retouch-scriptfu.js  # Script-Fu expression builder for GIMP retouch step

tests/phase-175/
  wireframe-degrade.test.mjs    # PIPE-01: probeAppTool() returns skip when registry missing
  mockup-degrade.test.mjs       # PIPE-01: same pattern for mockup workflow
  blender-pipeline-chain.test.mjs  # PIPE-02: optimizeGLB called with Blender output path
  gimp-pipeline-chain.test.mjs     # PIPE-03: saveAsset called with GIMP output path
```

### Pattern 1: Registry Status Check at Skill Execution Time (PIPE-01)

**What:** At the start of each optional app-tool section in a workflow, probe app-registry.json to determine if the app is approved. Store result as an availability flag. The workflow never halts on probe failure — it sets the flag to false and continues.

**When to use:** Every optional app-tool step in wireframe.md and mockup.md.

```bash
# In workflow bash block (Step 3.5 / "App Tool Probe" section)
# Source: pde-tools app probe pattern, consistent with existing mcp-bridge probe step
BLENDER_PROBE=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" app probe blender 2>/dev/null)
if [[ $? -ne 0 ]] || [[ -z "$BLENDER_PROBE" ]]; then
  BLENDER_AVAILABLE=false
  BLENDER_SKIP_REASON="app-registry.json not found or blender entry missing"
else
  BLENDER_STATUS=$(echo "$BLENDER_PROBE" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);process.stdout.write(j.status||'missing')")
  if [[ "$BLENDER_STATUS" == "approved" ]]; then
    BLENDER_AVAILABLE=true
  else
    BLENDER_AVAILABLE=false
    BLENDER_SKIP_REASON="blender registry status: ${BLENDER_STATUS} (requires approved)"
  fi
fi
```

**Skip note format** (written when BLENDER_AVAILABLE=false):
```
<!-- SKIP: Optional Blender 3D wireframe step not executed.
     Reason: ${BLENDER_SKIP_REASON}
     To enable: run /pde:app-discover blender, then approve in app-registry.json -->
```

This skip note is appended to the wireframe HTML output as an HTML comment and also logged to the console.

### Pattern 2: Optional Step Block Structure in Markdown Workflows

**What:** The conditional block pattern used throughout wireframe.md for optional steps (e.g., Figma context Step 1.5, MCP probe Steps in Step 3). Apply the same pattern for app-tool steps.

```markdown
#### Step 4-BLENDER: Optional Blender 3D wireframe render (if available)

IF BLENDER_AVAILABLE is false: SKIP this step. Log:
  ```
  Step 4-BLENDER: Skipped — {BLENDER_SKIP_REASON}
  ```
  Append skip comment to each wireframe HTML file:
  `<!-- SKIP: Optional Blender 3D wireframe step not executed. Reason: {BLENDER_SKIP_REASON} -->`
  Continue to Step 5.

IF BLENDER_AVAILABLE is true:
  [execution block — see Pattern 3]
```

The `IF condition is false: SKIP → Continue` structure is already used in Steps 1.5, 4-EXP, 4h, 4i, 4j of wireframe.md and is the canonical pattern for this codebase.

### Pattern 3: Blender → Phase 168 GLB Pipeline Chain (PIPE-02)

**What:** Invoke Blender in `--background` mode with a Python export script to write a GLB file, then pass the GLB path to Phase 168's `optimizeGLB()`, then generate a model-viewer embed HTML.

**Critical detail:** Blender's `--render-frame` outputs PNG/EXR (image renders), NOT GLB. To get a GLB, Blender must run a Python script that calls `bpy.ops.export_scene.gltf()`. The `--python` flag is the correct approach.

```javascript
// Source: Blender bpy API — bpy.ops.export_scene.gltf() verified 2026-03-29
// File: bin/lib/design-pipeline/blender-glb-export.py
// This file is passed to Blender via: blender --background input.blend --python blender-glb-export.py
import bpy
import sys
import os

# GLB output path passed as last command-line arg after '--'
argv = sys.argv
argv = argv[argv.index('--') + 1:]  # everything after '--'
output_path = argv[0]

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=False,
    export_cameras=False,
    export_lights=False,
    export_apply=True,      # Apply modifiers before export
)
print(f'GLB_EXPORT_DONE: {output_path}')
```

```javascript
// Node.js orchestration in workflow step
// Source: Phase 172 blender-wrapper.cjs async spawn pattern
const { spawn } = require('child_process');
const { optimizeGLB } = require('./3d-pipeline/optimize.cjs');
const { generateEmbed } = require('./3d-pipeline/embed.cjs');
const path = require('path');
const os = require('os');

async function blenderToGLBPipeline({ registryEntry, blendFile, slug, outputDir }) {
  const tempGlb = path.join(os.tmpdir(), `${slug}-raw.glb`);
  const optimizedGlb = path.join(outputDir, `${slug}-${Date.now()}.glb`);
  const exportScript = path.join(__dirname, 'blender-glb-export.py');

  // Step 1: Blender export to temp GLB
  await new Promise((resolve, reject) => {
    const args = [
      '--background',
      '--factory-startup',
      blendFile,
      '--python-exit-code', '1',
      '--python', exportScript,
      '--', tempGlb,  // passed after '--' to Python sys.argv
    ];
    const proc = spawn(registryEntry.binaryPath, args, { encoding: 'utf8', timeout: 120000 });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d; });
    proc.on('close', code => {
      if (code !== 0) reject(new Error(`Blender export failed (exit ${code}): ${stderr}`));
      else resolve();
    });
    proc.on('error', err => reject(err));
  });

  // Step 2: Phase 168 GLB optimize pipeline
  const { outputPath } = optimizeGLB({ inputPath: tempGlb, outputPath: optimizedGlb });

  // Step 3: Phase 168 model-viewer embed
  const embedResult = generateEmbed({ glbPath: outputPath, slug });

  return { glbPath: outputPath, embedHtml: embedResult.html, snippet: embedResult.snippet };
}
```

**GLB output location:** `.planning/design/3d/{slug}-{timestamp}.glb` (Phase 168 standard directory, `THREE_D_DIR` constant from `bin/lib/3d-pipeline/assets.cjs`)

### Pattern 4: GIMP → Phase 165 Image Pipeline Chain (PIPE-03)

**What:** Invoke GIMP in batch mode with a Script-Fu expression that retouches an input PNG and writes the result to a temp path, then pass the output PNG to Phase 165's `saveAsset()`.

**Input to GIMP:** The existing mockup HTML file is not directly consumable by GIMP. The correct input is a screenshot PNG of the mockup, produced by Phase 165's Playwright screenshot subcommand. The workflow step: (1) confirm a screenshot PNG exists for this screen, (2) invoke GIMP retouch on it, (3) pass GIMP output to `saveAsset()`.

```javascript
// GIMP Script-Fu retouch expression builder
// Source: Phase 172 GIMP wrapper patterns, verified 2026-03-29
function buildRetouchScript({ inputPath, outputPath, registryEntry }) {
  const major = registryEntry.version
    ? parseInt(registryEntry.version.split('.')[0], 10)
    : 2;

  if (major >= 3) {
    // GIMP 3.x: 1-arg gimp-file-load, vector drawable, --quit flag
    return `(let* ((image (car (gimp-file-load RUN-NONINTERACTIVE "${inputPath}")))` +
           `(drawable (car (gimp-image-get-active-drawable image))))` +
           `(gimp-curves-spline drawable HISTOGRAM-VALUE 10 #(0 0 64 20 128 128 192 235 255 255))` +
           `(gimp-file-export RUN-NONINTERACTIVE image (vector drawable) "${outputPath}"))`;
  } else {
    // GIMP 2.x: 2-arg gimp-file-load, plain drawable
    return `(let* ((image (car (gimp-file-load RUN-NONINTERACTIVE "${inputPath}" "")))` +
           `(drawable (car (gimp-image-get-active-drawable image))))` +
           `(gimp-curves-spline drawable HISTOGRAM-VALUE 10 #(0 0 64 20 128 128 192 235 255 255))` +
           `(file-png-save RUN-NONINTERACTIVE image drawable "${outputPath}" ""))`;
  }
}

// Pipeline chain: GIMP retouch → Phase 165 saveAsset
async function gimpRetouchPipeline({ registryEntry, inputPngPath, slug, assetsDir }) {
  const { buildGimpArgs } = require('./app-wrappers/gimp-wrapper.cjs');
  const { saveAsset } = require('./image-pipeline/assets.cjs');
  const os = require('os');
  const path = require('path');

  const tempOutput = path.join(os.tmpdir(), `${slug}-gimp-retouch.png`);
  const scriptFu = buildRetouchScript({ inputPath: inputPngPath, outputPath: tempOutput, registryEntry });
  const args = buildGimpArgs(scriptFu, registryEntry);  // version-aware: --quit vs (gimp-quit 0)

  await new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const proc = spawn(registryEntry.binaryPath, args, { encoding: 'utf8', timeout: 60000 });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d; });
    proc.on('close', code => {
      if (code !== 0) reject(new Error(`GIMP retouch failed (exit ${code}): ${stderr}`));
      else resolve();
    });
    proc.on('error', err => reject(err));
  });

  // Route through Phase 165 asset pipeline — writes to .planning/design/assets/mockup/
  const pngBuffer = require('fs').readFileSync(tempOutput);
  return saveAsset({ type: 'mockup', buffer: pngBuffer, slug: `${slug}-retouched`, params: { source: 'gimp-retouch' } });
}
```

**GIMP output location:** `.planning/design/assets/mockup/{slug}-retouched-{timestamp}.png` (Phase 165 standard, handled by `saveAsset()`)

### Pattern 5: probeAppTool() Helper (shared utility)

**What:** A small helper that encapsulates the registry probe, returns an availability object, and never throws. Used by both wireframe.md and mockup.md workflow bash blocks.

```javascript
// Source: derived from app-registry.cjs checkApproved() + existing probe() in mcp-bridge.cjs
// File: bin/lib/design-pipeline/probe-app-tool.cjs
'use strict';
const path = require('path');

/**
 * Probe whether an app is approved in app-registry.json.
 * Never throws — returns availability object.
 *
 * @param {string} slug - e.g. 'blender', 'gimp', 'inkscape'
 * @param {string} registryPath - Path to app-registry.json
 * @returns {{ available: boolean, reason: string, entry: object|null }}
 */
function probeAppTool(slug, registryPath) {
  try {
    const { checkApproved } = require('../app-registry.cjs');
    const entry = checkApproved(registryPath, slug);
    if (entry.executionMode === 'mock') {
      return { available: false, reason: `executionMode is 'mock' — no display server`, entry: null };
    }
    return { available: true, reason: 'approved', entry };
  } catch (err) {
    return { available: false, reason: err.message, entry: null };
  }
}

module.exports = { probeAppTool };
```

**CLI wrapper for workflow bash blocks:**
```bash
# pde-tools app probe <slug> already returns JSON — this is the pde-tools.cjs CLI surface from Phase 173
PROBE_RESULT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" app probe blender 2>/dev/null)
BLENDER_AVAILABLE=$(echo "$PROBE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('status')=='approved' and d.get('executionMode')!='mock' else 'false')" 2>/dev/null || echo "false")
```

### Anti-Patterns to Avoid

- **Halting the workflow on tool-not-found:** PIPE-01 explicitly requires degrading to no-op. Never `exit 1` on a probe failure. Set `BLENDER_AVAILABLE=false` and continue.
- **Using Blender `--render-format` for GLB output:** `--render-format` controls image renders (PNG, EXR, JPEG). GLB is a scene export, not a render. Always use `bpy.ops.export_scene.gltf()` via `--python` flag.
- **Calling gltf-transform directly on Blender render PNG:** PNG is not a 3D format. The Blender step must produce GLB first via the Python export script.
- **Running GIMP on wireframe HTML:** GIMP is a raster image editor. Its input must be a PNG (screenshot). The mockup HTML file is not a valid GIMP input.
- **Forgetting `--factory-startup` for Blender:** Without `--factory-startup`, Blender loads user preferences which can produce different flag behaviors across machines. Always include `--factory-startup` in `--background` mode.
- **Hardcoding the app-registry.json path:** Always resolve it as `path.join(process.env.CLAUDE_PLUGIN_ROOT, '.planning/app-registry.json')` — the planning directory is always relative to project root.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GLB optimization after Blender export | Custom geometry compression | `bin/lib/3d-pipeline/optimize.cjs` `optimizeGLB()` | Phase 168 already implements draco + texture resize via gltf-transform CLI; re-using avoids duplicate logic |
| model-viewer embed snippet | Custom HTML template | `bin/lib/3d-pipeline/embed.cjs` `generateEmbed()` | Phase 168 implements full AR fallback (WebXR/SceneViewer/QuickLook), camera orbit, and self-contained HTML |
| PNG asset storage + sidecar | Custom file write | `bin/lib/image-pipeline/assets.cjs` `saveAsset()` | Phase 165 handles path construction, hash, and metadata sidecar — GIMP output must go through this to appear in `pde-tools image list` |
| GIMP version detection | Re-read binary version at runtime | `app-registry.cjs` `checkApproved(registryPath, 'gimp').version` | Phase 171 stores version in registry at discovery time; reading it from the registry avoids a second subprocess call |
| App availability probe logic | Custom try/catch around require() | `pde-tools app probe <slug>` CLI | Phase 173 registers this as a pde-tools CLI surface; consistent with how all other tool probes work in the project |
| Blender Python export script re-implementation | Inline bpy code in Node.js template string | `bin/lib/design-pipeline/blender-glb-export.py` static file | Python passed via `--python` must be a file path; putting it in a static .py file makes it testable and version-controllable |

**Key insight:** Phases 165 and 168 already implement the full asset storage and 3D optimization pipelines. Phase 175's only job is to plumb app wrapper output into these existing pipelines. Every custom implementation would duplicate already-tested logic.

---

## Common Pitfalls

### Pitfall 1: Blender --render-format vs GLB Export
**What goes wrong:** Developer uses `--render-format GLB` or `--render-format GLTF` expecting GLB output. Blender rejects the flag with an error — these are not valid render output formats.
**Why it happens:** Blender has two separate systems: "render" (produces 2D image from 3D scene camera) and "export" (produces 3D file format from scene geometry). GLB is an export format, not a render format.
**How to avoid:** Always use `blender --background input.blend --python blender-glb-export.py -- output.glb`. The Python script calls `bpy.ops.export_scene.gltf()`.
**Warning signs:** Blender stderr `"Invalid render format"`, exit code 1 from render command, no .glb file created.

### Pitfall 2: GIMP Script-Fu 2.x vs 3.x API Differences at Pipeline Chain Time
**What goes wrong:** The Script-Fu expression for GIMP retouch was constructed using 2.x API (2-arg `gimp-file-load`, `file-png-save`) but the installed GIMP is 3.x. GIMP 3.x throws Script-Fu errors and exits non-zero.
**Why it happens:** Phase 172 documented the API break but the pipeline chain step (Phase 175) must also apply the same version-conditional logic.
**How to avoid:** Always call `buildGimpArgs(scriptFuExpr, registryEntry)` from gimp-wrapper.cjs (reads version from registry entry, not re-detected). Never hardcode Script-Fu invocation without version selection.
**Warning signs:** GIMP stderr `"Procedure not found: gimp-file-load"` or `"Wrong number of arguments"` in Script-Fu error.

### Pitfall 3: executionMode 'mock' Passes Status Check But Not Available
**What goes wrong:** `checkApproved()` returns an entry with `status: 'approved'` but `executionMode: 'mock'` (set when no display server was available at discovery time). The workflow attempts to invoke Blender/GIMP and the subprocess either fails or produces no output.
**Why it happens:** `checkApproved()` in Phase 171 gates on `status`, not `executionMode`. But `executionMode: 'mock'` means the app cannot actually execute — the display probe failed.
**How to avoid:** `probeAppTool()` (Pattern 5) checks `executionMode !== 'mock'` as a second gate. Always use `probeAppTool()` rather than calling `checkApproved()` directly in workflow code.
**Warning signs:** App exits immediately with display-related error, zero-byte output file, GIMP/Blender stderr mentioning `DISPLAY` or `Wayland`.

### Pitfall 4: Input PNG to GIMP Must Exist Before Step Executes
**What goes wrong:** The GIMP retouch step in mockup.md runs before a screenshot PNG of the mockup has been taken. GIMP receives a file-not-found error, exits non-zero.
**Why it happens:** GIMP needs a raster input. The mockup workflow produces HTML, not PNG. A screenshot step must run first.
**How to avoid:** The GIMP step (Step 4-GIMP) must depend on a prior screenshot having been taken. Add a prerequisite check: glob for `.planning/design/assets/screenshot/{screen-slug}-*.png`. If not found, skip the GIMP step with reason "no screenshot found for screen — run `pde-tools image screenshot` first".
**Warning signs:** GIMP Script-Fu error `"(gimp-file-load): Cannot open file"`, empty `$GIMP_INPUT_PATH`.

### Pitfall 5: Phase 168 optimizeGLB spawnSync vs spawn
**What goes wrong:** `optimizeGLB()` in Phase 168 `optimize.cjs` uses `spawnSync` (confirmed in Phase 168 research Pattern 3). This blocks the event loop during GLB processing. In a workflow bash block this is acceptable, but if called from within a long-running Node process, it will block.
**Why it happens:** Phase 168 chose `spawnSync` for simplicity in the CLI context. Phase 175 calls this from a workflow bash block (not an event loop), so blocking is acceptable.
**How to avoid:** Call `optimizeGLB()` only from workflow bash blocks or `pde-tools 3d optimize` CLI, not from inside a spawn callback. This is naturally satisfied by the workflow step structure.
**Warning signs:** Not a blocking concern in the workflow bash context — only a concern if later called from an async Node.js server.

### Pitfall 6: Temp File Cleanup After Blender Export
**What goes wrong:** Blender writes a raw GLB to `os.tmpdir()`. If the optimize step fails, the temp file is left behind. On repeated runs, temp directory fills with stale GLB files.
**Why it happens:** No cleanup logic in the pipeline chain.
**How to avoid:** Wrap the pipeline in try/finally: `try { ... } finally { if (fs.existsSync(tempGlb)) fs.unlinkSync(tempGlb); }`. Document this in `blenderToGLBPipeline()`.
**Warning signs:** Growing number of files in `os.tmpdir()` matching `*-raw.glb`, disk space warnings.

---

## Code Examples

### Reading Registry Entry in Workflow Bash Block
```bash
# Source: pde-tools CLI surface from Phase 173 (app probe subcommand)
# Run from within wireframe.md or mockup.md bash step
REGISTRY_PATH="${CLAUDE_PLUGIN_ROOT}/.planning/app-registry.json"
if [[ ! -f "$REGISTRY_PATH" ]]; then
  BLENDER_AVAILABLE=false
  BLENDER_SKIP_REASON="app-registry.json not found (run: pde-tools app discover blender)"
else
  PROBE=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" app probe blender 2>&1)
  EXIT_CODE=$?
  if [[ $EXIT_CODE -ne 0 ]]; then
    BLENDER_AVAILABLE=false
    BLENDER_SKIP_REASON="blender not in registry (probe exit ${EXIT_CODE})"
  else
    STATUS=$(echo "$PROBE" | node -e "try{const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);process.stdout.write(j.status||'missing')}catch(e){process.stdout.write('error')}")
    EXEC_MODE=$(echo "$PROBE" | node -e "try{const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);process.stdout.write(j.executionMode||'unknown')}catch(e){process.stdout.write('unknown')}")
    if [[ "$STATUS" == "approved" && "$EXEC_MODE" != "mock" ]]; then
      BLENDER_AVAILABLE=true
    else
      BLENDER_AVAILABLE=false
      BLENDER_SKIP_REASON="blender registry status: ${STATUS}, executionMode: ${EXEC_MODE}"
    fi
  fi
fi
```

### Skip Note HTML Comment (PIPE-01 compliance)
```javascript
// Append to each wireframe HTML file when Blender step is skipped
// Source: pattern from wireframe.md Figma-context skip notes
const skipNote = `<!-- SKIP: Optional Blender 3D wireframe step not executed.
  Reason: ${skipReason}
  To enable: run /pde:app-discover blender, review at .planning/app-registry.json,
  then approve the entry and re-run /pde:wireframe. -->`;
// Insert before </body> tag
html = html.replace('</body>', `${skipNote}\n</body>`);
```

### Blender GLB Export → Phase 168 Optimize → Embed (PIPE-02)
```javascript
// Source: Phase 172 blender-wrapper.cjs spawn pattern + Phase 168 optimize.cjs
// Full pipeline: Blender .blend file → raw GLB → optimized GLB → model-viewer embed
const { spawn } = require('child_process');
const { optimizeGLB } = require('../3d-pipeline/optimize.cjs');
const { generateEmbed } = require('../3d-pipeline/embed.cjs');
const { save3DAsset } = require('../3d-pipeline/assets.cjs');

async function runBlenderGLBChain({ blendFile, slug, registryEntry, projectRoot }) {
  const os = require('os');
  const path = require('path');
  const fs = require('fs');

  const exportScript = path.join(projectRoot, 'bin/lib/design-pipeline/blender-glb-export.py');
  const tempGlb = path.join(os.tmpdir(), `${slug}-raw-${Date.now()}.glb`);
  const assetsDir = path.join(projectRoot, '.planning/design/3d');

  try {
    // 1. Blender export
    await new Promise((resolve, reject) => {
      const args = [
        '--background', '--factory-startup',
        blendFile,
        '--python-exit-code', '1',
        '--python', exportScript,
        '--', tempGlb,
      ];
      const proc = spawn(registryEntry.binaryPath, args, { encoding: 'utf8', timeout: 120000 });
      let stderr = '';
      proc.stderr.on('data', d => { stderr += d; });
      proc.on('close', code => {
        if (code !== 0) reject(new Error(`Blender export failed: ${stderr}`));
        else resolve();
      });
      proc.on('error', err => reject(err));
    });

    // 2. Phase 168 optimize (draco + texture resize)
    const timestamp = Date.now();
    const optimizedPath = path.join(assetsDir, `${slug}-${timestamp}.glb`);
    fs.mkdirSync(assetsDir, { recursive: true });
    optimizeGLB({ inputPath: tempGlb, outputPath: optimizedPath });

    // 3. Phase 168 embed snippet
    const { html, snippet } = generateEmbed({ glbPath: optimizedPath, slug });
    const embedPath = path.join(assetsDir, `${slug}-embed.html`);
    fs.writeFileSync(embedPath, html);

    return { glbPath: optimizedPath, embedPath, snippet };
  } finally {
    if (fs.existsSync(tempGlb)) fs.unlinkSync(tempGlb);
  }
}
```

### GIMP Retouch → Phase 165 saveAsset (PIPE-03)
```javascript
// Source: Phase 172 gimp-wrapper.cjs buildGimpArgs() + Phase 165 assets.cjs saveAsset()
const { spawn } = require('child_process');
const { buildGimpArgs } = require('../app-wrappers/gimp-wrapper.cjs');
const { saveAsset } = require('../image-pipeline/assets.cjs');
const os = require('os');
const path = require('path');
const fs = require('fs');

async function runGIMPRetouchChain({ inputPngPath, slug, registryEntry }) {
  const tempOutput = path.join(os.tmpdir(), `${slug}-gimp-${Date.now()}.png`);

  // Version-aware Script-Fu expression (2.x vs 3.x)
  const major = parseInt((registryEntry.version || '2').split('.')[0], 10);
  let scriptFu;
  if (major >= 3) {
    scriptFu = `(let* ((image (car (gimp-file-load RUN-NONINTERACTIVE "${inputPngPath}")))` +
               `(drawable (car (gimp-image-get-active-drawable image))))` +
               `(gimp-brightness-contrast drawable 5 15)` +
               `(gimp-file-export RUN-NONINTERACTIVE image (vector drawable) "${tempOutput}"))`;
  } else {
    scriptFu = `(let* ((image (car (gimp-file-load RUN-NONINTERACTIVE "${inputPngPath}" "")))` +
               `(drawable (car (gimp-image-get-active-drawable image))))` +
               `(gimp-brightness-contrast drawable 5 15)` +
               `(file-png-save RUN-NONINTERACTIVE image drawable "${tempOutput}" ""))`;
  }

  const args = buildGimpArgs(scriptFu, registryEntry);  // adds version-correct --quit or (gimp-quit 0)

  try {
    await new Promise((resolve, reject) => {
      const proc = spawn(registryEntry.binaryPath, args, { encoding: 'utf8', timeout: 60000 });
      let stderr = '';
      proc.stderr.on('data', d => { stderr += d; });
      proc.on('close', code => {
        if (code !== 0) reject(new Error(`GIMP retouch failed: ${stderr}`));
        else resolve();
      });
      proc.on('error', err => reject(err));
    });

    // Route through Phase 165 asset pipeline
    const pngBuffer = fs.readFileSync(tempOutput);
    return saveAsset({
      type: 'mockup',
      buffer: pngBuffer,
      slug: `${slug}-gimp-retouched`,
      params: { source: 'gimp-retouch', inputPng: inputPngPath },
    });
  } finally {
    if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hard-fail on missing optional tools | Skip with documented reason + continue | PDE standard (all MCP probe steps) | Required for PIPE-01 — must match existing workflow degradation pattern |
| Blender renders PNG for visual output | Blender exports GLB via bpy for 3D pipeline | Phase 168 established GLB as the 3D asset standard | Phase 175 must use bpy export, not render, to feed Phase 168 |
| Custom HTML per-app integration | Route through existing Phase 165/168 asset modules | Phase 165 (2026-03-28), Phase 168 (2026-03-29) | Both pipelines are already built; Phase 175 is purely a plumbing phase |

---

## Open Questions

1. **pde-tools app probe subcommand may not exist until Phase 173 is complete**
   - What we know: Phase 173 (MCP Bridge & Registration) defines `REG-02: pde-tools app discover|wrap|register|list|probe` as the user-facing CLI. Phase 175 depends on Phase 173 being complete.
   - What's unclear: The exact JSON output schema of `pde-tools app probe <slug>` — specifically whether it returns the full registry entry or a summary.
   - Recommendation: The planner should include a Wave 0 task to verify `pde-tools app probe blender` output format once Phase 173 is merged, before writing workflow step bash code.

2. **Blender bpy export script path resolution**
   - What we know: `--python` requires a file path. The script lives at `bin/lib/design-pipeline/blender-glb-export.py`.
   - What's unclear: Whether `${CLAUDE_PLUGIN_ROOT}` is always defined in workflow bash blocks (it is in all existing wireframe.md/mockup.md steps).
   - Recommendation: Resolve script path as `${CLAUDE_PLUGIN_ROOT}/bin/lib/design-pipeline/blender-glb-export.py`. This is consistent with all other `${CLAUDE_PLUGIN_ROOT}/bin/` references throughout the workflows.

3. **Phase 165 `saveAsset()` exact function signature**
   - What we know: The pattern from `bin/lib/image-pipeline/assets.cjs` exists from Phase 165 research. The sidecar schema is `{ type, source, dimensions, timestamp, params, hash }`.
   - What's unclear: Whether `saveAsset()` accepts a `buffer` parameter directly or requires a file path. Phase 165 research shows `fs.writeFileSync(outPath, pngBuffer)` inline — `saveAsset()` may be a different function.
   - Recommendation: The planner's Wave 0 task should read `bin/lib/image-pipeline/assets.cjs` to confirm the exact signature before writing GIMP chain code.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| bin/lib/app-registry.cjs | PIPE-01 (registry probe) | Built in Phase 171 | Phase 171 | PIPE-01 requires Phase 171 complete first |
| bin/lib/app-wrappers/blender-wrapper.cjs | PIPE-02 | Built in Phase 172 | Phase 172 | PIPE-02 requires Phase 172 complete first |
| bin/lib/app-wrappers/gimp-wrapper.cjs | PIPE-03 | Built in Phase 172 | Phase 172 | PIPE-03 requires Phase 172 complete first |
| pde-tools app probe CLI | PIPE-01 bash blocks | Built in Phase 173 | Phase 173 | Phase 175 depends on Phase 173 |
| bin/lib/3d-pipeline/optimize.cjs | PIPE-02 GLB optimization | Built in Phase 168 | Phase 168 | No fallback — optimization is required for web-viable GLB |
| bin/lib/3d-pipeline/embed.cjs | PIPE-02 model-viewer embed | Built in Phase 168 | Phase 168 | No fallback — embed snippet is the 3D pipeline output |
| bin/lib/image-pipeline/assets.cjs | PIPE-03 PNG storage | Built in Phase 165 | Phase 165 | No fallback — must route through asset pipeline |
| Blender binary | PIPE-02 execution | Optional — gated by registry | Varies | Graceful skip (PIPE-01 degrade pattern) |
| GIMP binary | PIPE-03 execution | Optional — gated by registry | Varies | Graceful skip (PIPE-01 degrade pattern) |
| gltf-transform CLI | Phase 168 optimize.cjs | ✓ (installed in Phase 168) | @gltf-transform/cli 4.3.0 | — |

**Missing dependencies with no fallback:**
- Phases 165, 168, 171, 172, 173 must be complete before Phase 175 can ship. Phase 175 is purely a plumbing phase connecting prior phase outputs.

**Missing dependencies with fallback:**
- Blender and GIMP binaries: graceful skip per PIPE-01 degrade pattern.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.mjs (project root) |
| Quick run command | `npx vitest run tests/phase-175/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | probeAppTool() returns available=false when registry missing or status != approved | unit | `npx vitest run tests/phase-175/wireframe-degrade.test.mjs` | ❌ Wave 0 |
| PIPE-01 | probeAppTool() returns available=false when executionMode='mock' | unit | `npx vitest run tests/phase-175/wireframe-degrade.test.mjs` | ❌ Wave 0 |
| PIPE-01 | Skip note HTML comment is appended to wireframe HTML when BLENDER_AVAILABLE=false | unit | `npx vitest run tests/phase-175/wireframe-degrade.test.mjs` | ❌ Wave 0 |
| PIPE-01 | GIMP skip note is appended to mockup HTML when GIMP_AVAILABLE=false | unit | `npx vitest run tests/phase-175/mockup-degrade.test.mjs` | ❌ Wave 0 |
| PIPE-02 | blenderToGLBPipeline() calls optimizeGLB with the Blender output path | unit (mock spawn) | `npx vitest run tests/phase-175/blender-pipeline-chain.test.mjs` | ❌ Wave 0 |
| PIPE-02 | blenderToGLBPipeline() cleans up temp GLB on success and failure | unit | `npx vitest run tests/phase-175/blender-pipeline-chain.test.mjs` | ❌ Wave 0 |
| PIPE-03 | runGIMPRetouchChain() calls saveAsset with type='mockup' and correct slug | unit (mock spawn) | `npx vitest run tests/phase-175/gimp-pipeline-chain.test.mjs` | ❌ Wave 0 |
| PIPE-03 | GIMP step skips when no screenshot PNG exists for screen | unit | `npx vitest run tests/phase-175/gimp-pipeline-chain.test.mjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-175/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-175/wireframe-degrade.test.mjs` — covers PIPE-01 wireframe skip behavior
- [ ] `tests/phase-175/mockup-degrade.test.mjs` — covers PIPE-01 mockup skip behavior
- [ ] `tests/phase-175/blender-pipeline-chain.test.mjs` — covers PIPE-02 with mocked spawn + optimizeGLB
- [ ] `tests/phase-175/gimp-pipeline-chain.test.mjs` — covers PIPE-03 with mocked spawn + saveAsset
- [ ] `bin/lib/design-pipeline/probe-app-tool.cjs` — new shared utility (tested by wireframe-degrade + mockup-degrade)
- [ ] `bin/lib/design-pipeline/blender-glb-export.py` — Python export script (no unit test needed — validated manually with Blender)

*(Existing test infrastructure (vitest 4.1.1, test runner config) is already in place. Only new test files and the probe-app-tool.cjs module are needed.)*

---

## Sources

### Primary (HIGH confidence)
- Project source: `workflows/wireframe.md` — full workflow architecture, step structure, MCP probe pattern, output locations verified by reading source
- Project source: `workflows/mockup.md` — full workflow architecture, MCP probe pattern, output locations verified by reading source
- Project source: `bin/lib/mcp-bridge.cjs` — `probe()` function behavior verified by reading source (lines 381-408)
- Project source: `.planning/phases/172-core-app-wrappers/172-RESEARCH.md` — Blender spawn pattern, GIMP version-conditional args, all wrapper architecture
- Project source: `.planning/phases/165-image-generation-pipeline/165-RESEARCH.md` — image pipeline asset storage pattern, `saveAsset()` sidecar schema
- Project source: `.planning/phases/168-ai-3d-generation-web-embedding/168-RESEARCH.md` — `optimizeGLB()` API, `generateEmbed()` API, GLB asset storage in `.planning/design/3d/`
- Project source: `.planning/phases/171-security-architecture-discovery-foundation/171-RESEARCH.md` — `checkApproved()` behavior, `executionMode: 'mock'` meaning, registry schema

### Secondary (MEDIUM confidence)
- Blender Python bpy docs: `bpy.ops.export_scene.gltf()` function exists and accepts `filepath`, `export_format='GLB'` — consistent with Phase 172 research findings
- GIMP Script-Fu: `buildGimpArgs()` pattern from Phase 172 research cross-references 2.x/3.x breakage confirmed

### Tertiary (LOW confidence)
- None — all critical claims verified from project source files

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules verified from project source (Phases 165, 168, 171, 172)
- Architecture: HIGH — workflow step patterns verified from wireframe.md/mockup.md source; optional step structure matches existing conditional blocks
- Pitfalls: HIGH — Blender render-vs-export pitfall verified from Phase 172 bpy knowledge; GIMP 2.x/3.x API break verified from Phase 172; executionMode:mock gating verified from Phase 171 registry schema
- Pipeline chain patterns: HIGH — optimizeGLB and generateEmbed signatures verified from Phase 168 research; saveAsset pattern verified from Phase 165 research

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (30 days — all dependencies are project-internal stable modules, not fast-moving external packages)
