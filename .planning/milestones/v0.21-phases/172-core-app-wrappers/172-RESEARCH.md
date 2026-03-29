# Phase 172: Core App Wrappers - Research

**Researched:** 2026-03-29 (maxdepth pass)
**Domain:** Blender / GIMP / Inkscape headless CLI wrappers, version-aware capability models, MCP tool registration, SKILL.md auto-generation
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WRAP-01 | Blender CLI wrapper with `--background` headless mode, version-aware (3.x vs 4.x), `startupMs` declaration, async-only MCP server | All flags verified from Debian man page; async spawn pattern identified; `startupMs` stored in `wrapper-metadata.json` (not in Zod-validated CapabilityModel meta) |
| WRAP-02 | GIMP CLI wrapper with `--no-interface --batch` Script-Fu mode, GIMP 2.x vs 3.x version detection and flag adaptation | `--quit` flag confirmed GIMP 2.99.12+ only; `(gimp-quit 0)` for 2.x; `gimp-file-load` 2-arg vs 1-arg verified from developer.gimp.org; GIMP 3.x exit codes documented |
| WRAP-03 | Inkscape CLI wrapper with `inkscape --export-type` pure CLI mode, no headless flags needed | `--export-overwrite` behavior confirmed from wiki.inkscape.org: without it, numbered copies created; deprecated 0.9x flags documented |
| WRAP-04 | SKILL.md auto-generation for all three wrapped apps extending Phase 164 machinery | `skill-gen.cjs` read directly; `generateSkillMd(model)` and `writeSkillMd(outputDir, model)` are exact entry points; invocation path hardcoded to `.planning/cli-anything/` — needs override for app-wrappers output |
| WRAP-05 | JSON structured output mode for every wrapped app command (required for pipeline chaining) | `server-gen.cjs` `generateToolHandler()` uses `spawnSync` and wraps stdout in JSON envelope — confirmed from source read; async override required for Blender |
| WRAP-06 | Version-aware capability models that reflect the actual installed version's API surface | Version stored in `app-registry.json` by Phase 171; Phase 172 reads version from registry and selects correct invocation template per major version |
</phase_requirements>

---

## Summary

Phase 172 wraps three specific desktop apps — Blender, GIMP, and Inkscape — as agent-invokable MCP tools. Each app demonstrates a distinct execution pattern: Blender is `headless` (requires `--background` for GPU-free operation), GIMP is `headless` but version-sensitive (2.x vs 3.x Script-Fu API break), and Inkscape is `headless` with no flags needed (pure CLI surface since 1.0).

The implementation creates three app-specific wrapper modules under `bin/lib/app-wrappers/` — `blender-wrapper.cjs`, `gimp-wrapper.cjs`, `inkscape-wrapper.cjs` — each exporting a `buildCapabilityModel(registryEntry)` function that reads the version from the Phase 171 registry and returns a properly shaped CapabilityModel. MCP server files are generated from these models using the existing Phase 164 `server-gen.cjs` machinery, with a required `asyncMode` extension for Blender. SKILL.md files are generated using the existing `skill-gen.cjs`. The `pde-tools app wrap <slug>` subcommand does not yet exist and must be added to `bin/pde-tools.cjs` as part of this phase.

The critical GIMP 3.x finding confirmed by this maxdepth research pass: `--quit` was introduced in GIMP **2.99.12** (August 2022) and is GIMP 3.x-only. The GIMP 3.x man page confirms Script-Fu is still the default batch interpreter when `--batch-interpreter` is omitted. GIMP 3.x exit codes are: 0=success, 69=service unavailable, 64=usage error, 70=execution error, 130=cancellation. The `(gimp-quit 1)` pattern in batch scripts should NOT be used in GIMP 3.x — use `--quit` flag only.

**Primary recommendation:** Three wrapper modules under `bin/lib/app-wrappers/` each produce a CapabilityModel fed into the existing Phase 164 `server-gen.cjs` + `skill-gen.cjs` pipeline. Add `asyncMode: true` option to `server-gen.cjs` `generateServerSource()`. Add `pde-tools app wrap <slug>` as a new subcommand in `pde-tools.cjs`. Async `spawn` (never `spawnSync`) in generated server files for all three apps. Version-conditional Script-Fu template selection in the GIMP wrapper. `wrapper-metadata.json` alongside `capability-model.json` for `startupMs` and other non-schema fields.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js child_process | built-in (v20.20.0) | `spawn` for async subprocess invocation in generated MCP servers | Established pattern from server-gen.cjs; `spawn` is non-blocking unlike `spawnSync` |
| Node.js fs + path | built-in (v20.20.0) | Registry reads, output directory creation, model file writes | Zero-dependency CJS pattern from all prior phases |
| @modelcontextprotocol/sdk | installed in packages/pde-mcp-server | McpServer + StdioServerTransport for generated MCP servers | Already used by server-gen.cjs; path is `packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/cjs` |
| zod | installed in packages/pde-mcp-server | CapabilityModelSchema validation via model.cjs | Already used by model.cjs validateCapabilityModel() |
| vitest | 4.1.1 (installed) | Test framework for Nyquist tests | All unit tests follow `tests/phase-172/*.test.mjs` pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bin/lib/cli-anything/skill-gen.cjs | Phase 164 (project) | SKILL.md generation from CapabilityModel | Call `writeSkillMd(outputDir, model)` for each wrapped app — note: invocation path in generated SKILL.md is hardcoded to `.planning/cli-anything/` and needs override |
| bin/lib/cli-anything/server-gen.cjs | Phase 164 (project) | MCP server CJS file generation from CapabilityModel | Call `writeServer(outputDir, caps, meta, projectRoot)` — must extend with `asyncMode` option for Blender |
| bin/lib/cli-anything/model.cjs | Phase 164 (project) | CapabilityModel schema validation | Call `validateCapabilityModel(data)` before writing; throws on invalid shape; meta fields are all strings — `startupMs` (number) cannot go here |
| bin/lib/app-registry.cjs | Phase 171 (project) | Registry read and approval gate | Call `checkApproved(registryPath, slug)` as first step in every wrapper; returns full entry including `version`, `binaryPath`, `executionMode`, `displayProbe` |
| bin/lib/app-discovery.cjs | Phase 171 (project) | APP_CATALOG definitions | `APP_CATALOG` array exported — use for slug validation; wrapper reads from registry, not catalog |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| spawn (async) | spawnSync (sync) | spawnSync blocks the Node.js event loop — WRAP-01 explicitly requires async-only; Blender startup takes 3-8s; GIMP startup takes 5-30s; use spawn for all three apps |
| Handcrafted MCP server per app | Generated from CapabilityModel via server-gen.cjs | Phase 164 machinery is proven and tested; handcrafting creates drift; extend the generator |
| Script-Fu for GIMP 3.x | Python-Fu for GIMP 3.x | Script-Fu is the default batch interpreter in GIMP 3.x (confirmed from man page); Python-Fu requires `--batch-interpreter python-fu-eval`; Script-Fu is simpler and sufficient |
| `--batch-interpreter plug-in-script-fu-eval` explicit | Omit flag (default) | Man page confirms Script-Fu is the default; forum thread confirms "No batch interpreter specified, using the default 'plug-in-script-fu-eval'"; explicit is cleaner but both work |
| Xvfb for display faking | No display workaround needed | Inkscape 1.x, Blender `--background`, and GIMP `--no-interface` all suppress display requirements; Xvfb is legacy workaround from pre-1.0 tooling |

**Installation:** No new npm dependencies. All tooling is Node.js built-ins + existing project modules + system CLIs (blender, gimp/gimp-3.0, inkscape).

---

## Architecture Patterns

### Recommended Project Structure
```
bin/
  pde-tools.cjs              # ADD: case 'wrap': in 'app' switch (Phase 172)
  lib/
    app-wrappers/
      blender-wrapper.cjs    # WRAP-01: Blender CapabilityModel builder
      gimp-wrapper.cjs       # WRAP-02: GIMP version-aware CapabilityModel builder
      inkscape-wrapper.cjs   # WRAP-03: Inkscape CapabilityModel builder
      index.cjs              # Registry of slug → wrapper module
    app-registry.cjs         # Phase 171: checkApproved(), loadRegistry()
    cli-anything/
      skill-gen.cjs          # Phase 164: writeSkillMd() — reused as-is
      server-gen.cjs         # Phase 164: writeServer() — EXTEND with asyncMode option
      model.cjs              # Phase 164: validateCapabilityModel() — reused as-is

.planning/
  app-registry.json          # Phase 171 registry (read by wrappers)
  app-wrappers/
    blender/
      capability-model.json
      wrapper-metadata.json  # startupMs: 5000, asyncRequired: true
      server/
        server.cjs           # Generated async MCP server
        SKILL.md             # Auto-generated
    gimp/
      capability-model.json
      wrapper-metadata.json
      server/
        server.cjs
        SKILL.md
    inkscape/
      capability-model.json
      wrapper-metadata.json
      server/
        server.cjs
        SKILL.md

tests/phase-172/
  blender-wrapper.test.mjs
  gimp-wrapper.test.mjs
  inkscape-wrapper.test.mjs
  skill-gen-integration.test.mjs
```

### Pattern 1: App Wrapper Module Contract

Each wrapper exports `buildCapabilityModel(registryEntry)` returning a validated CapabilityModel. The `registryEntry` comes from Phase 171's `checkApproved()` call (contains `version`, `binaryPath`, `executionMode`, `displayProbe`).

```javascript
// Source: model.cjs CapabilityModelSchema (read directly from project, 2026-03-29)
'use strict';

const { validateCapabilityModel } = require('../cli-anything/model.cjs');

/**
 * Build a CapabilityModel for Blender from an approved registry entry.
 * @param {object} registryEntry - From checkApproved() — status is 'approved'
 * @returns {object} Validated CapabilityModel
 */
function buildCapabilityModel(registryEntry) {
  const { binaryPath, version } = registryEntry;
  const major = parseMajorVersion(version) || 4;

  return validateCapabilityModel({
    meta: {
      source: binaryPath,
      type: 'cli',
      version: version || 'unknown',
      auth: {},
      generatedAt: new Date().toISOString(),
      // NOTE: startupMs is NOT valid here — CapabilityModelSchema meta uses only string fields
      // Store in wrapper-metadata.json alongside capability-model.json
    },
    capabilities: buildBlenderCapabilities(binaryPath, major),
  });
}

function parseMajorVersion(versionString) {
  if (!versionString) return null;
  const match = versionString.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

module.exports = { buildCapabilityModel };
```

### Pattern 2: server-gen.cjs asyncMode Extension

The existing `generateToolHandler()` in `server-gen.cjs` emits `spawnSync`. For long-running apps (Blender, GIMP), an `asyncMode: true` option must be added to `generateServerSource()`. This is an extension to the existing file, not a rewrite.

```javascript
// Source: server-gen.cjs generateToolHandler (read directly, 2026-03-29) + async extension
// Add asyncMode option to generateServerSource signature:
// function generateServerSource(capabilities, meta, sdkBasePath, options = {})
// const { asyncMode = false } = options;

// In header: if asyncMode, import spawn instead of spawnSync
// asyncMode header line (replaces spawnSync import):
// `const { spawn } = require('child_process');`

// asyncMode handler body:
`async (input) => {
  const args = [...${subPath}];
  // ... arg building same as sync handler ...
  if (DRY_RUN) {
    return { content: [{ type: 'text', text: JSON.stringify({ dryRun: true, command: [BINARY, ...args] }) }] };
  }
  return new Promise((resolve, reject) => {
    const proc = spawn(BINARY, args, { timeout: 120000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      let data;
      try { data = JSON.parse(stdout); }
      catch (_) { data = { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code !== null ? code : -1 }; }
      resolve({ content: [{ type: 'text', text: JSON.stringify(data) }] });
    });
    proc.on('error', reject);
  });
}`

// writeServer gains options parameter:
// function writeServer(outputDir, capabilities, meta, projectRoot, options = {})
```

### Pattern 3: pde-tools app wrap Subcommand

`pde-tools app wrap <slug>` is not yet implemented. It must be added to the `case 'app':` block in `pde-tools.cjs`.

```javascript
// Source: pde-tools.cjs lines 1515-1597 (read directly, 2026-03-29) — 'wrap' is missing
// Add inside case 'app': switch:
case 'wrap': {
  const slug = args[2];
  if (!slug) { console.error('Usage: pde-tools app wrap <slug>'); process.exit(1); }
  const wrappers = require('./lib/app-wrappers/index.cjs');
  const wrapper = wrappers[slug];
  if (!wrapper) {
    console.error(`No wrapper defined for slug "${slug}". Known: ${Object.keys(wrappers).join(', ')}`);
    process.exit(1);
  }
  try {
    const entry = registry.checkApproved(registryPath, slug);
    const model = wrapper.buildCapabilityModel(entry);
    const { generateAppWrapper } = require('./lib/app-wrappers/generate.cjs');
    const result = generateAppWrapper(slug, model, cwd, entry);
    if (raw) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Wrapped: ${slug}`);
      console.log(`  capability-model: ${result.modelPath}`);
      console.log(`  server: ${result.serverPath}`);
      console.log(`  SKILL.md: ${result.skillPath}`);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  break;
}
```

**Note:** Available subcommands line also needs updating to include `wrap`.

### Pattern 4: Blender Async MCP Server Handler

The generated server must use `spawn` (async), never `spawnSync`. The `startupMs: 5000` declaration reflects that Blender takes 3-8 seconds to initialize in `--background` mode.

```javascript
// Source: Blender Debian man page verified 2026-03-29
// Argument order is CRITICAL: .blend file BEFORE --python
function blenderRender(binaryPath, blendFile, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      '--background',                    // Suppress GUI
      '--factory-startup',               // Skip user prefs (reproducibility)
      blendFile,                         // Load file FIRST — order matters
      '--python-exit-code', '1',         // Python exceptions become exit code 1
    ];

    if (options.pythonScript) {
      args.push('--python', options.pythonScript);
    }
    if (options.pythonExpr) {
      args.push('--python-expr', options.pythonExpr);
    }

    args.push(
      '--render-output', outputPath,     // Use // prefix for relative paths
      '--render-format', options.format || 'PNG',
      '--render-frame', String(options.frame || 1)
    );

    const proc = spawn(binaryPath, args, { timeout: 120000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      resolve({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: code === 0,
        outputPath,
      });
    });
    proc.on('error', reject);
  });
}
```

### Pattern 5: GIMP Version-Conditional Script-Fu Invocation

GIMP 2.x and 3.x have breaking Script-Fu API differences. The wrapper reads the major version from the registry entry and selects the correct invocation template.

**GIMP 2.10 pattern (`--batch '(gimp-quit 0)'` to quit):**
```bash
# Source: GIMP man page + GIMP Basic Batch Tutorial verified 2026-03-29
gimp --no-interface -d -f \
  --batch '(let* ((image (car (gimp-file-load RUN-NONINTERACTIVE "/in.png" "")))
                  (drawable (car (gimp-image-get-active-drawable image))))
             (file-png-save RUN-NONINTERACTIVE image drawable "/out.png" "")
             (gimp-image-delete image))' \
  --batch '(gimp-quit 0)'
```

**GIMP 3.x pattern (`--quit` flag, 1-arg gimp-file-load, vector drawable):**
```bash
# Source: GIMP 2.99.12 release notes (--quit introduced) + developer.gimp.org porting guide
gimp-3.0 --no-interface -d -f \
  --batch '(let* ((image (car (gimp-file-load RUN-NONINTERACTIVE "/in.png")))
                  (drawable (car (gimp-image-get-active-drawable image))))
             (gimp-file-export RUN-NONINTERACTIVE image (vector drawable) "/out.png")
             (gimp-image-delete image))' \
  --quit
```

```javascript
// Version-conditional argument builder
function buildGimpArgs(scriptFuExpr, registryEntry) {
  const major = registryEntry.version
    ? parseInt(registryEntry.version.split('.')[0], 10)
    : 2;

  const baseArgs = ['--no-interface', '-d', '-f', '--batch', scriptFuExpr];

  if (major >= 3) {
    // GIMP 3.x: --quit flag exits after batch completes
    // Do NOT use (gimp-quit 0) — double-quit causes issues
    // --batch-interpreter defaults to plug-in-script-fu-eval; explicit is acceptable
    return [...baseArgs, '--quit'];
  } else {
    // GIMP 2.x: append (gimp-quit 0) as second --batch command
    // --quit flag does NOT exist in GIMP 2.10
    return [...baseArgs, '--batch', '(gimp-quit 0)'];
  }
}
```

**Key differences GIMP 2.x vs 3.x (verified from official sources):**

| Feature | GIMP 2.x | GIMP 3.x | Source |
|---------|----------|----------|--------|
| Quit method | `--batch '(gimp-quit 0)'` | `--quit` flag | GIMP 2.99.12 release notes |
| `gimp-file-load` args | `(gimp-file-load RUN-NONINTERACTIVE "/path" "")` — 2 strings | `(gimp-file-load RUN-NONINTERACTIVE "/path")` — 1 string | developer.gimp.org porting guide |
| Drawable parameters | `drawable` (single ID) | `(vector drawable)` for multi-drawable ops | developer.gimp.org porting guide |
| File export | `(file-png-save ...)` | `(gimp-file-export RUN-NONINTERACTIVE image (vector drawable) "/path")` | developer.gimp.org porting guide |
| Booleans | `TRUE` / `FALSE` | `#t` / `#f` | developer.gimp.org script-fu-changes-v3 |
| Boolean in SF_TOGGLE | `TRUE` / `FALSE` (still valid) | `TRUE` / `FALSE` (special case) | developer.gimp.org script-fu-changes-v3 |
| Resource lookup | String name | Integer object ID via `gimp-font-get-by-name` etc. | developer.gimp.org porting guide |
| Array returns | Count + array | Vector only (no count wrapper) | developer.gimp.org porting guide |
| Exit codes | N/A (no guarantee) | 0=success, 64=usage, 69=service unavailable, 70=execution, 130=cancellation | GIMP 2.99.12 release notes |

### Pattern 6: Inkscape Pure CLI Export (No Headless Flags)

Inkscape 1.x suppresses its GUI automatically when export flags are present. No `--without-gui`, `--batch-process`, or display variables are needed.

```javascript
// Source: Inkscape Debian man page 1.4.2 verified 2026-03-29
// Source: wiki.inkscape.org/wiki/Using_the_Command_Line (--export-overwrite behavior confirmed)
function inkscapeExport(binaryPath, inputSvg, outputFile, options = {}) {
  return new Promise((resolve, reject) => {
    const exportType = options.exportType || 'png';
    const args = [
      inputSvg,                                      // Input SVG — positional first
      '--export-type=' + exportType,
      '--export-filename=' + outputFile,
      '--export-area-page',                          // Use page bounds (default for PNG)
      '--export-dpi=' + (options.dpi || '96'),
      '--export-overwrite',                          // REQUIRED: without this, Inkscape creates
                                                     // numbered copies (file_out.svg) not overwriting
    ];

    if (options.width) args.push('--export-width=' + options.width);
    if (options.height) args.push('--export-height=' + options.height);

    const proc = spawn(binaryPath, args, { timeout: 30000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      resolve({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: code === 0,
        outputFile,
      });
    });
    proc.on('error', reject);
  });
}
```

**Inkscape export types (from man page 1.4.2):** `svg`, `png`, `ps`, `eps`, `pdf`, `emf`, `wmf`, and any installed export extensions. Multiple types can be exported simultaneously via comma-separated list: `--export-type=svg,png`.

### Pattern 7: SKILL.md Generation with Correct Output Path

The existing `skill-gen.cjs` `generateSkillMd()` hardcodes the invocation path to `.planning/cli-anything/{slug}/server/server.cjs`. For app-wrappers, the correct path is `.planning/app-wrappers/{slug}/server/server.cjs`. Either pass the correct `meta.source` so the slug resolves correctly, or post-process the generated SKILL.md to fix the invocation line.

```javascript
// Source: skill-gen.cjs lines 60-61 (read directly, 2026-03-29)
// The invocation section generates:
//   `Start the MCP server: \`node .planning/cli-anything/${slug}/server/server.cjs\``
// For app-wrappers, this should be:
//   `Start the MCP server: \`node .planning/app-wrappers/${slug}/server/server.cjs\``
//
// Two options:
// Option A: Post-process — replace `.planning/cli-anything/` with `.planning/app-wrappers/` in generated output
// Option B: Extend skill-gen.cjs with an `outputBasePath` option
//
// RECOMMENDATION: Option A (post-process) is simpler and avoids modifying Phase 164 machinery.
// The fix is one string replace on the generated content before writing.

function writeAppWrapperSkillMd(outputDir, model, slug) {
  const { generateSkillMd } = require('../cli-anything/skill-gen.cjs');
  let content = generateSkillMd(model);
  // Fix invocation path for app-wrappers context
  content = content.replace(
    `.planning/cli-anything/${slug}/server/server.cjs`,
    `.planning/app-wrappers/${slug}/server/server.cjs`
  );
  const outputPath = require('path').join(outputDir, 'SKILL.md');
  require('fs').mkdirSync(outputDir, { recursive: true });
  require('fs').writeFileSync(outputPath, content, 'utf8');
  return outputPath;
}
```

### Pattern 8: Version Detection from Registry

Version was already detected and stored by Phase 171. Wrappers read from registry, never re-run `--version`.

```javascript
// Source: Phase 171 app-registry.cjs (read directly, 2026-03-29)
function loadAppEntry(registryPath, slug) {
  const { checkApproved } = require('./app-registry.cjs');
  // throws descriptive error for non-approved or mock entries
  return checkApproved(registryPath, slug);
  // Returns: { slug, binaryPath, version, executionMode, status, displayProbe, ... }
}

// Blender 4.x --version format changed — use flexible regex
function parseBlenderVersion(versionOutput) {
  const line = versionOutput.split('\n')[0].trim();
  // Blender 4.x: "Blender: version: 4.0.0, branch: blender-v4.0-release, ..."
  let match = line.match(/version[:\s]+(\d+)\.(\d+)(?:\.(\d+))?/i);
  if (!match) {
    // Blender 2.x/3.x: "Blender 2.93 (sub 5)"
    match = line.match(/Blender\s+(\d+)\.(\d+)/i);
  }
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: match[3] ? parseInt(match[3], 10) : 0,
    raw: match[1] + '.' + match[2] + (match[3] ? '.' + match[3] : ''),
  };
}

// GIMP version: "GNU Image Manipulation Program version 3.0.2" or "GIMP 2.10.38"
function parseGimpVersion(versionOutput) {
  const line = versionOutput.split('\n')[0].trim();
  const match = line.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: match[3] ? parseInt(match[3], 10) : 0,
    raw: match[0],
  };
}

// Inkscape version: "Inkscape 1.3.2 (091e20e, 2023-11-25)\nPango version: 1.50.14"
function parseInkscapeVersion(versionOutput) {
  const firstLine = versionOutput.split('\n')[0].trim();
  const match = firstLine.match(/Inkscape\s+(\d+)\.(\d+)(?:\.(\d+))?/i);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: match[3] ? parseInt(match[3], 10) : 0,
    raw: match[1] + '.' + match[2] + (match[3] ? '.' + match[3] : ''),
  };
}
```

### Pattern 9: Wrapper Metadata File

Fields that do not fit the Zod-validated CapabilityModelSchema meta (which only allows string values) are stored in `wrapper-metadata.json`.

```javascript
// Store app-specific metadata alongside capability-model.json
const wrapperMetadata = {
  slug: 'blender',
  startupMs: 5000,           // WRAP-01: declared startup time
  executionMode: 'headless',
  asyncRequired: true,       // Server must use spawn not spawnSync
  versionRequires: '3.x|4.x',
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(outputDir, 'wrapper-metadata.json'),
  JSON.stringify(wrapperMetadata, null, 2)
);
```

### Anti-Patterns to Avoid

- **Using `spawnSync` in any MCP server tool handler:** Blocks the Node.js event loop. Blender startup is 3-8s; GIMP startup is 5-30s. Use `spawn` with Promise wrapper for all three apps.
- **Using `--quit` in GIMP 2.x invocation:** The `--quit` flag was introduced in GIMP 2.99.12 (Aug 2022). GIMP 2.10.x does NOT have this flag. Using it on GIMP 2.x will cause an unknown option error.
- **Using `(gimp-quit 1)` in GIMP 3.x batch scripts:** GIMP 2.99.12 release notes explicitly state "Do not call (gimp-quit 1) anymore." Use `--quit` flag instead.
- **Using both `--quit` AND `(gimp-quit 0)` in GIMP 3.x:** Double-quit causes premature exit before batch completes.
- **Omitting `--export-overwrite` for Inkscape:** Without it, Inkscape generates numbered copies (`file_out.svg`, `file_out-1.svg`) instead of overwriting. The agent's requested filename will be missing.
- **Using deprecated Inkscape flags:** `--export-png=`, `--export-pdf=`, `--without-gui`, `--verb=` — all removed in Inkscape 1.0. Use `--export-type` and `--export-filename`.
- **Loading .blend file after `--python` in Blender:** Blender processes arguments sequentially. `--python script.py file.blend` runs the script before the file is loaded — `bpy.data.objects` will be empty. Always: `blender --background file.blend --python script.py`.
- **Omitting `--python-exit-code 1` for Blender:** By default, Python exceptions exit with code 0. Without this flag, the MCP tool reports success even when the render failed.
- **Omitting `--factory-startup` for Blender:** User preferences can alter render settings. Always pass for headless reproducibility.
- **Not wrapping GIMP 3.x drawables in `(vector drawable)`:** `gimp-file-export`, `gimp-edit-copy`, filters all require `(vector drawable)` in GIMP 3.x. Passing a bare drawable ID raises a PDB type error.
- **Storing `startupMs` inside the Zod-validated CapabilityModel meta:** `CapabilityModelSchema` meta fields are all `z.string()`. `startupMs` is a number. Store in `wrapper-metadata.json`.
- **Writing app-wrapper output to `.planning/cli-anything/`:** App wrappers go to `.planning/app-wrappers/{slug}/`, not the CLI-Anything registry directory.
- **Calling `(gimp-quit 0)` in GIMP 2.x with arg `0` thinking it always succeeds:** `gimp-quit` argument is the error code returned to the OS. `0` means success. Using `(gimp-quit 1)` in GIMP 2.x was the old "error" pattern; `(gimp-quit 0)` is the success pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SKILL.md generation | Custom markdown template per app | `writeSkillMd()` from `bin/lib/cli-anything/skill-gen.cjs` + path fix | Phase 164 machinery tested; SKILL.md format is fixed |
| MCP server file generation | Custom server.cjs per app | Extended `writeServer()` with `asyncMode` option | Same generator used for all CLI-Anything wrappers; extending is safer than forking |
| CapabilityModel validation | Custom JSON schema check | `validateCapabilityModel(data)` from `model.cjs` | Zod schema is single source of truth |
| Registry approval gating | Custom `if status !== 'approved'` checks | `checkApproved(registryPath, slug)` from `app-registry.cjs` | Phase 171 guard includes all edge cases: missing, pending, rejected, mock status |
| Version parsing at wrap time | Re-spawning `blender --version` | `registryEntry.version` from Phase 171 registry | Version already detected; re-spawning takes seconds |
| JSON output wrapping | Custom stdout parser per app | `try { JSON.parse(stdout) } catch { wrap }` pattern | Identical to existing CLI-Anything servers; agents expect same envelope |
| Display server re-probe | Live probe at tool call time | Read `registryEntry.displayProbe.available` from registry | Phase 171 already probed; re-probing per call is expensive |
| GIMP 3.x Script-Fu template | Hand-write Scheme expressions | Version-conditional template functions in `gimp-wrapper.cjs` | Version detection is O(1) from registry; template functions keep templates testable |

**Key insight:** Phase 172 is an orchestration phase, not an infrastructure phase. All infrastructure (registry, validation, generation) was built in Phases 163-171. Phase 172 feeds app-specific CLI knowledge into existing machinery and adds the missing `pde-tools app wrap` subcommand.

---

## Common Pitfalls

### Pitfall 1: Blender Argument Order — .blend File Must Come Before --python

**What goes wrong:** `blender --background --python script.py file.blend` — script runs before the file is loaded.
**Why it happens:** Blender processes CLI arguments sequentially. `--python` executes the script immediately at the point it appears in the argument list.
**How to avoid:** Always load the `.blend` file BEFORE `--python`: `blender --background file.blend --python script.py`
**Warning signs:** `bpy.data.objects` is empty inside the Python script despite the `.blend` containing objects.

### Pitfall 2: Blender Python Exceptions Silently Exit 0 Without --python-exit-code

**What goes wrong:** A Python script throws an exception but Blender exits with code 0. The MCP tool reports success; the render never happened.
**Why it happens:** Default behavior confirmed by Blender issue T82494: Blender ignores Python exceptions at exit.
**How to avoid:** Always pass `--python-exit-code 1` so any Python exception causes exit code 1.
**Warning signs:** Exit code 0 from Blender but expected output file missing.

### Pitfall 3: GIMP 2.x vs 3.x --quit Flag Incompatibility

**What goes wrong:** Using `--quit` on GIMP 2.10 fails with "Unknown option --quit". Using `(gimp-quit 0)` in GIMP 3.x batch scripts still works but the new idiomatic approach is `--quit`.
**Why it happens:** `--quit` was introduced in GIMP 2.99.12 (August 2022 dev release). GIMP 2.10 (stable) predates this.
**How to avoid:** Check `registryEntry.version` major version. Use `--quit` for major >= 3. Use `--batch '(gimp-quit 0)'` for major < 3.
**Warning signs:** GIMP exits with "unknown option" error on GIMP 2.x; or GIMP hangs waiting for input on GIMP 3.x if `--quit` is omitted.

### Pitfall 4: GIMP 3.x gimp-file-export Requires (vector drawable)

**What goes wrong:** `(gimp-file-export RUN-NONINTERACTIVE image drawable "/out.png")` raises PDB error on GIMP 3.x: "expected array of drawables."
**Why it happens:** GIMP 3.0 changed file export PDB to accept a vector (array) of drawable IDs instead of a single drawable ID. Affects `gimp-file-export`, `gimp-edit-copy`, filter procedures.
**How to avoid:** Always use `(gimp-file-export RUN-NONINTERACTIVE image (vector drawable) "/out.png")` in 3.x templates. Same pattern for other multi-drawable procedures.
**Warning signs:** PDB error mentioning "drawable" type mismatch; operation succeeds on GIMP 2.x but fails on GIMP 3.x.

### Pitfall 5: GIMP Startup is Slow Even in Batch Mode — Set Adequate Timeout

**What goes wrong:** Subprocess timeout too low (e.g., 30s) causes GIMP batch operations to time out during initialization.
**Why it happens:** GIMP loads plugins, brushes, and fonts at startup even in `--no-interface` mode. Startup takes 5-30s on first run.
**How to avoid:** Use `-d` (no-data) and `-f` (no-fonts) to minimize startup. Set subprocess timeout to at least 120000ms. These flags are in the base args for all GIMP invocations.
**Warning signs:** GIMP process terminates before batch output is produced.

### Pitfall 6: server-gen.cjs writeServer() Generates spawnSync — Incompatible with Long-Running Apps

**What goes wrong:** Using `writeServer()` without `asyncMode` for Blender generates a server that calls `spawnSync`, blocking the Node.js event loop during Blender's 5-second startup.
**Why it happens:** `server-gen.cjs` `generateToolHandler()` uses `spawnSync` with hardcoded 30-second timeout. Confirmed from source read.
**How to avoid:** Extend `server-gen.cjs` with `asyncMode: true` option passed to `generateServerSource()`. This option swaps the import and handler body to use async `spawn`.
**Warning signs:** MCP client times out waiting for Blender or GIMP response.

### Pitfall 7: Inkscape --export-overwrite Is Required to Replace Existing Files

**What goes wrong:** Inkscape export silently generates a numbered variant (`file_out.svg`) instead of overwriting `out.svg` if `--export-overwrite` is absent.
**Why it happens:** Inkscape 1.x default behavior is to avoid overwriting files. Confirmed from wiki.inkscape.org: "to overwrite a file, one must use `--export-overwrite`, otherwise a new filename will be generated."
**How to avoid:** Always pass `--export-overwrite`. Read the actual output path from stdout if needed (Inkscape reports the output file).
**Warning signs:** Expected output file missing; a numbered variant found instead.

### Pitfall 8: Blender Version Output Format Changed in 4.x

**What goes wrong:** Version regex expecting `Blender X.Y (sub Z)` (old format) fails on Blender 4.x.
**Why it happens:** Blender 4.x changed `--version` format to multi-field: `Blender: version: 4.0.0, branch: blender-v4.0-release, commit date: ...`
**How to avoid:** Use flexible regex that handles both formats (see Pattern 8 version parsing code).
**Warning signs:** `null` returned from version parse despite Blender being installed.

### Pitfall 9: Inkscape --version Output Has Two Lines

**What goes wrong:** Version string parsed incorrectly because Inkscape 1.0.1+ outputs two lines.
**Why it happens:** `inkscape --version` outputs `Inkscape 1.3.2 (091e20e, 2023-11-25)\nPango version: 1.50.14`
**How to avoid:** Use `.split('\n')[0]` before matching. Already handled in Phase 171 version detection.
**Warning signs:** Regex match failure on valid Inkscape install.

### Pitfall 10: pde-tools app wrap Subcommand Does Not Exist Yet

**What goes wrong:** Calling `pde-tools app wrap blender` fails with "Unknown app subcommand: wrap. Available: discover, probe, list, approve".
**Why it happens:** Phase 172 must ADD the `wrap` case to the `app` switch in `pde-tools.cjs`. This was confirmed by reading lines 1592-1594 of `pde-tools.cjs`.
**How to avoid:** Add `case 'wrap':` before the `default:` case in the `app` switch block. Update the error message in `default:` to include `wrap`.
**Warning signs:** N/A — this is a known gap that must be implemented.

### Pitfall 11: GIMP 3.x gimp-file-load Changed from 2-Arg to 1-Arg

**What goes wrong:** `(gimp-file-load RUN-NONINTERACTIVE "/path" "")` fails on GIMP 3.x — the second empty string argument is invalid.
**Why it happens:** GIMP 3.0 changed `gimp-file-load` from `(path, URI)` pair to `(GFile*)` — a single path argument.
**How to avoid:** Use version-conditional templates. GIMP 2.x: 2-string call. GIMP 3.x: 1-string call.
**Warning signs:** PDB error about wrong number of arguments to gimp-file-load on GIMP 3.x.

### Pitfall 12: GIMP 3.x Booleans — TRUE/FALSE vs #t/#f

**What goes wrong:** Scripts using `TRUE` or `FALSE` may fail type checks on GIMP 3.x Script-Fu v3 dialect.
**Why it happens:** GIMP 3.x Script-Fu v3 uses native Scheme booleans `#t` and `#f`. `TRUE` and `FALSE` are GIMP 2.x-era aliases.
**Exception:** `SF_TOGGLE` arguments to `script-fu-register` still use `TRUE`/`FALSE` for declaration/comparison.
**How to avoid:** Use `#t`/`#f` in Script-Fu 3.x batch expressions. Use `TRUE`/`FALSE` only for `SF_TOGGLE` arguments.
**Warning signs:** Type errors on boolean comparisons in GIMP 3.x batch scripts.

---

## Code Examples

### Blender Complete Headless Render Invocation

```javascript
// Source: Blender Debian man page verified 2026-03-29
// Argument order: .blend file BEFORE --python is critical
const { spawn } = require('child_process');

function blenderRender(binaryPath, blendFile, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      '--background',
      '--factory-startup',
      blendFile,                          // File FIRST
      '--python-exit-code', '1',
    ];
    if (options.pythonScript) args.push('--python', options.pythonScript);
    if (options.pythonExpr) args.push('--python-expr', options.pythonExpr);
    args.push(
      '--render-output', outputPath,
      '--render-format', options.format || 'PNG',
      '--render-frame', String(options.frame || 1)
    );
    const proc = spawn(binaryPath, args, { timeout: 120000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      resolve({ exitCode: code, stdout: stdout.trim(), stderr: stderr.trim(), success: code === 0, outputPath });
    });
    proc.on('error', reject);
  });
}
```

### Blender `--version` Output Parsing (3.x and 4.x)

```javascript
// Source: Blender 4.x format from blenderartists.org; 2.x/3.x from man page
// 4.x: "Blender: version: 4.0.0, branch: blender-v4.0-release, ..."
// 2.x/3.x: "Blender 2.93 (sub 5)" or "Blender 3.6.4"
function parseBlenderVersion(versionOutput) {
  const line = versionOutput.split('\n')[0].trim();
  let match = line.match(/version[:\s]+(\d+)\.(\d+)(?:\.(\d+))?/i);
  if (!match) match = line.match(/Blender\s+(\d+)\.(\d+)/i);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: match[3] ? parseInt(match[3], 10) : 0,
    raw: match[1] + '.' + match[2] + (match[3] ? '.' + match[3] : ''),
  };
}
```

### GIMP 2.x Batch Invocation (Script-Fu)

```bash
# Source: GIMP man page + GIMP Basic Batch Tutorial verified 2026-03-29
# Resize image to 800px wide, export as PNG
gimp --no-interface -d -f \
  --batch '(let* ((image (car (gimp-file-load RUN-NONINTERACTIVE "/in.png" "")))
                  (drawable (car (gimp-image-get-active-drawable image)))
                  (width (car (gimp-image-width image)))
                  (height (car (gimp-image-height image)))
                  (new-w 800)
                  (new-h (/ (* height new-w) width)))
             (gimp-image-scale-full image new-w new-h INTERPOLATION-LINEAR)
             (file-png-save RUN-NONINTERACTIVE image
               (car (gimp-image-get-active-drawable image)) "/out.png" "")
             (gimp-image-delete image))' \
  --batch '(gimp-quit 0)'
```

### GIMP 3.x Batch Invocation (Script-Fu v3)

```bash
# Source: GIMP 2.99.12 release notes (--quit introduced Aug 2022)
# Source: developer.gimp.org porting guide (1-arg gimp-file-load, vector drawable)
# Key changes vs 2.x:
#   1. gimp-file-load takes 1 string (not 2)
#   2. gimp-file-export uses (vector drawable) not bare drawable
#   3. --quit flag replaces --batch '(gimp-quit 0)'
gimp-3.0 --no-interface -d -f \
  --batch '(let* ((image (car (gimp-file-load RUN-NONINTERACTIVE "/in.png")))
                  (drawable (car (gimp-image-get-active-drawable image)))
                  (width (car (gimp-image-width image)))
                  (height (car (gimp-image-height image)))
                  (new-w 800)
                  (new-h (/ (* height new-w) width)))
             (gimp-image-scale-full image new-w new-h INTERPOLATION-LINEAR)
             (gimp-file-export RUN-NONINTERACTIVE image
               (vector (car (gimp-image-get-active-drawable image))) "/out.png")
             (gimp-image-delete image))' \
  --quit
```

### GIMP 3.x Exit Codes

```javascript
// Source: GIMP 2.99.12 release notes (August 2022)
// These exit codes apply to GIMP 3.x (major >= 3) only
const GIMP_EXIT_CODES = {
  0: 'success',
  64: 'usage error (bad arguments)',
  69: 'service unavailable (GIMP internal error)',
  70: 'execution error (batch script failed)',
  130: 'cancellation (SIGINT)',
};

function interpretGimpExitCode(code) {
  return GIMP_EXIT_CODES[code] || `unknown (${code})`;
}
```

### Inkscape SVG to PNG Export

```javascript
// Source: Inkscape Debian man page 1.4.2 verified 2026-03-29
// Source: wiki.inkscape.org/wiki/Using_the_Command_Line (--export-overwrite confirmed)
const { spawn } = require('child_process');

function inkscapeExport(binaryPath, inputSvg, outputFile, options = {}) {
  return new Promise((resolve, reject) => {
    const exportType = options.exportType || 'png';
    const args = [
      inputSvg,
      '--export-type=' + exportType,
      '--export-filename=' + outputFile,
      '--export-area-page',
      '--export-dpi=' + (options.dpi || '96'),
      '--export-overwrite',
    ];
    if (options.width) args.push('--export-width=' + options.width);
    if (options.height) args.push('--export-height=' + options.height);
    const proc = spawn(binaryPath, args, { timeout: 30000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      resolve({ exitCode: code, stdout: stdout.trim(), stderr: stderr.trim(), success: code === 0, outputFile });
    });
    proc.on('error', reject);
  });
}
```

### JSON Envelope Wrapping Pattern (WRAP-05)

```javascript
// Source: server-gen.cjs generateToolHandler (read directly, 2026-03-29)
// Same envelope used by all CLI-Anything servers and app-wrapper servers
function wrapStdoutAsJson(stdout, stderr, exitCode) {
  let data;
  try {
    data = JSON.parse(stdout);
  } catch (_) {
    data = {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: exitCode !== null ? exitCode : -1,
    };
  }
  return { content: [{ type: 'text', text: JSON.stringify(data) }] };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inkscape requires X11 / `--without-gui` | Inkscape 1.x suppresses GUI for export automatically | Inkscape 1.0 (2020) | No Xvfb or display vars needed |
| Inkscape `--export-png=filename` | `--export-type=png --export-filename=filename` | Inkscape 1.0 (2020) | Old per-format flags removed |
| GIMP `(gimp-file-load RUN-NONINTERACTIVE "/path" "")` | GIMP 3.x: `(gimp-file-load RUN-NONINTERACTIVE "/path")` | GIMP 3.0 / 2.99.12 (2022-2025) | 1-arg load; scripts not updated fail silently |
| GIMP `(gimp-file-export RUN-NONINTERACTIVE image drawable "/path")` | GIMP 3.x: `(vector drawable)` required | GIMP 3.0 (March 2025) | PDB type error if not updated |
| GIMP `TRUE` / `FALSE` | GIMP 3.x Script-Fu: `#t` / `#f` | GIMP 3.0 (March 2025) | Use native Scheme booleans |
| GIMP quit via `--batch '(gimp-quit 0)'` | GIMP 3.x: `--quit` CLI flag | GIMP 2.99.12 (August 2022) | `--quit` flag; `(gimp-quit 1)` should not be called |
| GIMP no standardized exit codes | GIMP 3.x: 0/64/69/70/130 exit codes | GIMP 2.99.12 (August 2022) | Batch failure propagates to process exit code |
| Blender `--version` → `Blender X.Y (sub Z)` | Blender 4.x → `Blender: version: X.Y.Z, branch: ...` | Blender 4.0 (2023) | Flexible regex needed |
| Python context overrides via dict argument | Blender 3.2+: `bpy.context.temp_override()` context manager | Blender 3.2 (2022) | Required for context overrides in 4.x |

**Deprecated/outdated:**
- `inkscape --export-png=out.png`: Removed Inkscape 1.0 — use `--export-type=png --export-filename=out.png`
- `inkscape --without-gui`: Removed Inkscape 1.0 — not needed at all
- `inkscape --verb=...`: Removed Inkscape 1.1 — use `--actions=...`
- `(gimp-file-load RUN-NONINTERACTIVE "/path" "")`: GIMP 2.x only — fails on 3.x
- `--batch '(gimp-quit 1)'` for GIMP 3.x: Do not use — use `--quit` flag
- `bpy.context.scene` mutation without `temp_override` for Blender 3.2+: use context manager

---

## Open Questions

1. **GIMP 3.x `(gimp-quit 0)` still works alongside `--quit`?**
   - What we know: `--quit` is the documented 3.x pattern; `(gimp-quit 1)` was explicitly deprecated in 2.99.12 release notes
   - What's unclear: Whether using `(gimp-quit 0)` (not 1) inside a batch body is still valid in 3.x — the man page says `--quit` "immediately quits after opening images and running batch commands" suggesting it runs after the batch; `(gimp-quit 0)` inside the batch body might also work
   - Recommendation: Use `--quit` for GIMP 3.x only; do NOT use `(gimp-quit 0)` or `(gimp-quit 1)` in batch body for 3.x. Test with installed GIMP version during implementation.
   - Confidence: MEDIUM — `--quit` is confirmed; interaction with batch-body gimp-quit is MEDIUM

2. **Blender `bpy.context.temp_override` required for headless render in 4.x?**
   - What we know: Required for context overrides since Blender 3.2; `bpy.ops.render.render(write_still=True)` may still work without it if scene is active
   - What's unclear: Whether simple `bpy.ops.render.render(write_still=True)` works in headless Blender 4.x without `temp_override`
   - Recommendation: Use `with bpy.context.temp_override(scene=bpy.context.scene): bpy.ops.render.render(write_still=True)` for forward compatibility
   - Confidence: MEDIUM

3. **GIMP `--batch-interpreter` explicit vs default**
   - What we know: Man page says Script-Fu is default; forum thread confirms "No batch interpreter specified, using the default 'plug-in-script-fu-eval'"; GIMP developer docs recommend explicit specification
   - What's unclear: Whether any GIMP 3.x build might disable Script-Fu as default
   - Recommendation: Add `--batch-interpreter plug-in-script-fu-eval` explicitly in GIMP 3.x invocations for robustness; omitting it is also safe
   - Confidence: HIGH that omitting is safe; MEDIUM on whether explicit is strictly necessary

4. **`skill-gen.cjs` invocation path fix — Option A vs Option B**
   - What we know: `generateSkillMd()` hardcodes `.planning/cli-anything/` in invocation line
   - What's unclear: Whether to post-process (Option A) or extend skill-gen.cjs with `outputBasePath` parameter (Option B)
   - Recommendation: Option A (post-process string replace) for this phase — simpler, no Phase 164 machinery modification. Option B is a future improvement.
   - Confidence: HIGH on Option A being correct for Phase 172 scope

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js v20 | All wrapper modules | Yes | v20.20.0 | — |
| vitest | Nyquist tests | Yes | 4.1.1 | — |
| @modelcontextprotocol/sdk | Generated MCP servers | Yes (in packages/pde-mcp-server) | installed | — |
| zod | model.cjs validation | Yes (in packages/pde-mcp-server) | installed | — |
| bin/lib/app-registry.cjs | Approval gate | Yes — Phase 171 is COMPLETE | verified by reading source | — |
| bin/lib/app-discovery.cjs | APP_CATALOG definitions | Yes — Phase 171 is COMPLETE | verified by reading source | — |
| Blender | WRAP-01 (live invocation) | Not installed on dev machine | — | executionMode: 'mock'; all wrapper modules and tests are fully stub-testable via mock registry entries |
| GIMP | WRAP-02 (live invocation) | Not installed on dev machine | — | executionMode: 'mock'; wrapper module and tests are fully stub-testable |
| Inkscape | WRAP-03 (live invocation) | Not installed on dev machine | — | executionMode: 'mock'; wrapper module and tests are fully stub-testable |

**Missing dependencies with no fallback:** None — Phase 171 is complete; all generated machinery is unit-testable with mock registry entries.

**Missing dependencies with fallback:**
- Blender/GIMP/Inkscape not installed — tests use mock registry entries with `executionMode: 'mock'`; `checkApproved()` guard prevents any subprocess calls in mock mode. Integration tests (live subprocess) require the app to be installed and approved.

**New finding:** `pde-tools app wrap` subcommand does NOT yet exist. It must be implemented in this phase. The existing `app` switch in `pde-tools.cjs` (lines 1521-1597) handles `discover`, `probe`, `list`, `approve` — `wrap` is absent.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts (root) |
| Quick run command | `npx vitest run tests/phase-172/` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WRAP-01 | Blender capability model built with correct headless flags | unit | `npx vitest run tests/phase-172/blender-wrapper.test.mjs` | Wave 0 |
| WRAP-01 | Blender MCP server uses async spawn not spawnSync | unit | `npx vitest run tests/phase-172/blender-wrapper.test.mjs` | Wave 0 |
| WRAP-01 | wrapper-metadata.json contains startupMs: 5000 | unit | `npx vitest run tests/phase-172/blender-wrapper.test.mjs` | Wave 0 |
| WRAP-02 | GIMP 2.x invocation uses 2-arg gimp-file-load and (gimp-quit 0) | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | Wave 0 |
| WRAP-02 | GIMP 3.x invocation uses 1-arg gimp-file-load and --quit flag | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | Wave 0 |
| WRAP-02 | GIMP 2.x args do NOT contain --quit flag | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | Wave 0 |
| WRAP-02 | GIMP 3.x args do NOT contain (gimp-quit 0) batch command | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | Wave 0 |
| WRAP-02 | GIMP 3.x file-export uses (vector drawable) | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | Wave 0 |
| WRAP-03 | Inkscape args contain --export-overwrite | unit | `npx vitest run tests/phase-172/inkscape-wrapper.test.mjs` | Wave 0 |
| WRAP-03 | Inkscape args contain no display flags (no DISPLAY, no --without-gui) | unit | `npx vitest run tests/phase-172/inkscape-wrapper.test.mjs` | Wave 0 |
| WRAP-04 | SKILL.md auto-generated for each wrapped app via writeSkillMd() | unit | `npx vitest run tests/phase-172/skill-gen-integration.test.mjs` | Wave 0 |
| WRAP-04 | Generated SKILL.md invocation path uses .planning/app-wrappers/ not .planning/cli-anything/ | unit | `npx vitest run tests/phase-172/skill-gen-integration.test.mjs` | Wave 0 |
| WRAP-05 | JSON structured output: raw stdout wrapped in JSON envelope if not valid JSON | unit | `npx vitest run tests/phase-172/blender-wrapper.test.mjs` | Wave 0 |
| WRAP-06 | GIMP wrapper selects correct invocation template based on major version | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | Wave 0 |
| WRAP-06 | Blender wrapper selects correct bpy API based on major version | unit | `npx vitest run tests/phase-172/blender-wrapper.test.mjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-172/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-172/blender-wrapper.test.mjs` — covers WRAP-01, WRAP-05, WRAP-06 (Blender)
- [ ] `tests/phase-172/gimp-wrapper.test.mjs` — covers WRAP-02, WRAP-06 (GIMP)
- [ ] `tests/phase-172/inkscape-wrapper.test.mjs` — covers WRAP-03
- [ ] `tests/phase-172/skill-gen-integration.test.mjs` — covers WRAP-04 (path fix verification)

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/cli-anything/server-gen.cjs` (project source, read directly 2026-03-29) — `generateToolHandler()` uses `spawnSync` confirmed; `generateServerSource()` signature confirmed
- `bin/lib/cli-anything/skill-gen.cjs` (project source, read directly 2026-03-29) — invocation path hardcoded to `.planning/cli-anything/`; `generateSkillMd(model)` and `writeSkillMd(outputDir, model)` exact signatures
- `bin/lib/cli-anything/model.cjs` (project source, read directly 2026-03-29) — `CapabilityModelSchema` meta fields are all `z.string()`; `startupMs` (number) cannot go in meta
- `bin/lib/app-registry.cjs` (project source, read directly 2026-03-29) — `checkApproved()` throws for mock/non-approved; returns full entry with version, binaryPath, displayProbe
- `bin/lib/app-discovery.cjs` (project source, read directly 2026-03-29) — APP_CATALOG confirmed; `gimp` cliAlias includes `gimp-3.0`, `gimp-2.10`, `gimp-2.99`
- `bin/pde-tools.cjs` (project source, read directly 2026-03-29, lines 1515-1597) — `app` switch confirmed: `wrap` case is MISSING; must be added in Phase 172
- Blender Debian man page (`manpages.debian.org/testing/blender-data`) — all Blender CLI flags verified: `--background`, `--python`, `--python-exit-code`, `--factory-startup`, `-F`, `-f`, `-o`, `-a`, `-s`, `-e`; argument order requirement documented
- Inkscape Debian man page 1.4.2 (`manpages.debian.org/testing/inkscape`) — `--export-type`, `--export-filename`, `--export-area-page`, `--export-dpi`, `--export-overwrite`, `--export-width`, `--export-height` all verified; deprecated 0.9x flags listed
- GIMP man page (`gimp.org/man/gimp.html`) — `--no-interface`, `--batch`, `--quit`, `--batch-interpreter`, `-d`, `-f` flags; Script-Fu confirmed as default batch interpreter
- GIMP developer docs `developer.gimp.org/resource/script-fu/porting_scriptfu_scripts/` — `gimp-file-load` 2→1 arg; `(vector drawable)` requirement; resource lookup changes; array return changes
- GIMP developer docs `developer.gimp.org/resource/script-fu/script-fu-changes-v3/` — `TRUE`/`FALSE` → `#t`/`#f`; `SF_TOGGLE` exception; `script-fu-register` deprecation
- GIMP 2.99.12 release notes (`gimp.org/news/2022/08/27/gimp-2-99-12-released/`) — `--quit` flag introduced; `(gimp-quit 1)` deprecated; GIMP 3.x exit codes (0/64/69/70/130) documented
- Inkscape wiki (`wiki.inkscape.org/wiki/Using_the_Command_Line`) — `--export-overwrite` behavior confirmed: "to overwrite a file, one must use `--export-overwrite`, otherwise a new filename will be generated"

### Secondary (MEDIUM confidence)
- blenderartists.org — Blender 4.0 `--version` output format `Blender: version: 4.0.0, branch: blender-v4.0-release, ...` confirmed
- GIMP forum thread (gimp-forum.net) — "No batch interpreter specified, using the default 'plug-in-script-fu-eval'" verbose output confirmed; `--batch-interpreter` explicit is optional
- WebSearch for GIMP 3.x `--quit` flag history — confirms introduced in 2.99.12 (dev precursor to GIMP 3.0)

### Tertiary (LOW confidence — validate during implementation)
- GIMP 3.x `(gimp-quit 0)` inside batch body alongside `--quit` — interaction not definitively tested; use `--quit` only
- Blender `bpy.context.temp_override` requirement for headless 4.x — documented for 3.2+ but exact behavior in 4.x headless needs testing
- GIMP `--batch-interpreter` explicit vs implicit — omitting is safe per man page and forum; explicit is recommended by developer docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules read directly from project source; Node.js built-ins verified
- Architecture patterns: HIGH — Phase 164 machinery read directly; CLI flags verified from Debian man pages; `pde-tools app wrap` gap confirmed from source read
- Pitfalls: HIGH — GIMP 3.x API changes verified from official docs; `--quit` introduction confirmed from 2.99.12 release notes; exit codes confirmed
- Version parsing: HIGH — Blender 4.x format verified from blenderartists.org; Inkscape multi-line from man page
- GIMP 3.x `--batch-interpreter` default: HIGH — confirmed from man page and forum
- GIMP 3.x `(gimp-quit 0)` interaction with `--quit`: MEDIUM — needs testing

**Research date:** 2026-03-29
**Valid until:** 2026-06-29 (90 days) — Blender and Inkscape are stable; GIMP 3.x is recent (March 2025) and actively developed; reverify GIMP patterns if implementation is delayed beyond 30 days. GIMP 3.2 RC was released December 2025 — check changelog if GIMP 3.2 is the installed version.
