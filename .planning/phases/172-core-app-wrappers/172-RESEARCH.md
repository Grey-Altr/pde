# Phase 172: Core App Wrappers - Research

**Researched:** 2026-03-29
**Domain:** Blender / GIMP / Inkscape headless CLI wrappers, version-aware capability models, MCP tool registration, SKILL.md auto-generation
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WRAP-01 | Blender CLI wrapper with `--background` headless mode, version-aware (3.x vs 4.x), `startupMs` declaration, async-only MCP server | Exact flags verified from Debian man page; async spawn pattern from existing server-gen.cjs; startupMs is a custom field added to capability model meta |
| WRAP-02 | GIMP CLI wrapper with `--no-interface --batch` Script-Fu mode, GIMP 2.x vs 3.x version detection and flag adaptation | gimp-file-load 2-arg vs 1-arg change verified; TRUE/FALSE vs #t/#f confirmed; --quit flag documented; version detection pattern from Phase 171 |
| WRAP-03 | Inkscape CLI wrapper with `inkscape --export-type` pure CLI mode, no headless flags needed | Confirmed from Debian man page: --without-gui removed, GUI suppressed automatically for export flags; --export-type and --export-filename verified |
| WRAP-04 | SKILL.md auto-generation for all three wrapped apps extending Phase 164 machinery | skill-gen.cjs fully understood; generateSkillMd(model) and writeSkillMd(outputDir, model) are the exact entry points; capability model shape is fixed in model.cjs |
| WRAP-05 | JSON structured output mode for every wrapped app command (required for pipeline chaining) | stdout JSON wrapping pattern from server-gen.cjs generateToolHandler; raw stdout captured and JSON-wrapped when not valid JSON |
| WRAP-06 | Version-aware capability models that reflect the actual installed version's API surface | Version stored in app-registry.json by Phase 171; Phase 172 reads version from registry and selects correct invocation template per major version |
</phase_requirements>

---

## Summary

Phase 172 wraps three specific desktop apps — Blender, GIMP, and Inkscape — as agent-invokable MCP tools. Each app demonstrates a distinct execution pattern: Blender is `headless` (requires `--background` for GPU-free operation), GIMP is `headless` but version-sensitive (2.x vs 3.x Script-Fu API break), and Inkscape is `headless` with no flags needed (pure CLI surface since 1.0).

The implementation strategy is to create three app-specific wrapper modules under `bin/lib/app-wrappers/` — `blender-wrapper.cjs`, `gimp-wrapper.cjs`, `inkscape-wrapper.cjs` — each exporting a `buildCapabilityModel(registryEntry)` function that reads the version from the Phase 171 registry and returns a properly shaped CapabilityModel. The server files are generated from these models using the existing Phase 164 `server-gen.cjs` machinery. SKILL.md files are generated using the existing `skill-gen.cjs`. No new generation machinery is needed — Phase 164 machinery is extended, not replaced.

The critical integration constraint is the approval gate: every wrapper must call `checkApproved(registryPath, slug)` from `app-registry.cjs` before invoking any subprocess. A missing or incompatible display server (surfaced by Phase 171's display probe) results in `executionMode: 'mock'` in the registry, which the guard catches before any subprocess call is made.

**Primary recommendation:** Three wrapper modules under `bin/lib/app-wrappers/` each produce a CapabilityModel fed into the existing Phase 164 `server-gen.cjs` + `skill-gen.cjs` pipeline. The `pde-tools app wrap <slug>` subcommand orchestrates this. Async `spawn` (never `spawnSync`) in generated server files. Version-conditional Script-Fu template selection in the GIMP wrapper.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js child_process | built-in (v20.x) | `spawn` for async subprocess invocation in generated MCP servers | Established pattern from existing server-gen.cjs; `spawn` is non-blocking unlike `spawnSync` |
| Node.js fs + path | built-in (v20.x) | Registry reads, output directory creation, model file writes | Zero-dependency CJS pattern from all prior phases |
| @modelcontextprotocol/sdk | installed in packages/pde-mcp-server | McpServer + StdioServerTransport for generated MCP servers | Already used by server-gen.cjs; path is `packages/pde-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/cjs` |
| zod | installed in packages/pde-mcp-server | CapabilityModelSchema validation via model.cjs | Already used by model.cjs validateCapabilityModel() |
| vitest | 4.1.1 (installed) | Test framework for Nyquist tests | All unit tests follow `tests/phase-172/*.test.mjs` pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bin/lib/cli-anything/skill-gen.cjs | Phase 164 (project) | SKILL.md generation from CapabilityModel | Call `writeSkillMd(outputDir, model)` for each wrapped app |
| bin/lib/cli-anything/server-gen.cjs | Phase 164 (project) | MCP server CJS file generation from CapabilityModel | Call `writeServer(outputDir, capabilities, meta, projectRoot)` for each wrapped app |
| bin/lib/cli-anything/model.cjs | Phase 164 (project) | CapabilityModel schema validation | Call `validateCapabilityModel(data)` before writing; throws on invalid shape |
| bin/lib/app-registry.cjs | Phase 171 (project) | Registry read and approval gate | Call `checkApproved(registryPath, slug)` as first step in every wrapper |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| spawn (async) | spawnSync (sync) | spawnSync blocks the Node.js event loop — WRAP-01 explicitly requires async-only; Blender startup can take 5+ seconds; use spawn |
| Handcrafted MCP server per app | Generated from CapabilityModel via server-gen.cjs | Phase 164 machinery is proven and tested; handcrafting three servers creates drift; use the generator |
| Script-Fu for GIMP 3.x | Python-Fu for GIMP 3.x | Script-Fu is the default batch interpreter in both 2.x and 3.x; Python-Fu requires specifying `--batch-interpreter python-fu-eval`; Script-Fu is simpler and sufficient |
| Xvfb for display faking | No display workaround | Inkscape 1.x does not need a display for export; Blender uses `--background` (no display needed); GIMP uses `--no-interface` (no display needed) — Xvfb is never needed |

**Installation:** No new npm dependencies. All tooling is Node.js built-ins + existing project modules + system CLIs (blender, gimp/gimp-3.0, inkscape).

---

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/
  app-wrappers/
    blender-wrapper.cjs     # WRAP-01: Blender CapabilityModel builder
    gimp-wrapper.cjs        # WRAP-02: GIMP version-aware CapabilityModel builder
    inkscape-wrapper.cjs    # WRAP-03: Inkscape CapabilityModel builder
    index.cjs               # Registry of slug → wrapper module
  app-registry.cjs          # Phase 171: checkApproved(), loadRegistry()
  cli-anything/
    skill-gen.cjs           # Phase 164: writeSkillMd() — reused as-is
    server-gen.cjs          # Phase 164: writeServer() — reused as-is
    model.cjs               # Phase 164: validateCapabilityModel() — reused as-is

.planning/
  app-registry.json         # Phase 171 registry (read by wrappers)
  app-wrappers/
    blender/
      capability-model.json
      server/
        server.cjs          # Generated async MCP server
        SKILL.md            # Auto-generated
    gimp/
      capability-model.json
      server/
        server.cjs
        SKILL.md
    inkscape/
      capability-model.json
      server/
        server.cjs
        SKILL.md

tests/phase-172/
  blender-wrapper.test.mjs
  gimp-wrapper.test.mjs
  inkscape-wrapper.test.mjs
  skill-gen-integration.test.mjs  # Verifies SKILL.md output for each app
```

### Pattern 1: App Wrapper Module Contract

Each wrapper exports `buildCapabilityModel(registryEntry)` returning a validated CapabilityModel. The `registryEntry` comes from Phase 171's registry (contains `version`, `binaryPath`, `executionMode`, `displayProbe`).

```javascript
// Source: derived from model.cjs schema + server-gen.cjs patterns, verified 2026-03-29
'use strict';

const { validateCapabilityModel } = require('../cli-anything/model.cjs');

/**
 * Build a CapabilityModel for Blender from a registry entry.
 * @param {object} registryEntry - From app-registry.json (status must be 'approved')
 * @returns {object} Validated CapabilityModel
 */
function buildCapabilityModel(registryEntry) {
  const { binaryPath, version } = registryEntry;
  const major = version ? parseInt(version.split('.')[0], 10) : 4;

  return validateCapabilityModel({
    meta: {
      source: binaryPath,
      type: 'cli',
      version: version || 'unknown',
      auth: {},
      generatedAt: new Date().toISOString(),
      // Extended fields (not in base CapabilityModelSchema — store in separate metadata file)
      // startupMs: 5000,   // WRAP-01: declared separately in wrapper metadata
    },
    capabilities: buildBlenderCapabilities(binaryPath, major),
  });
}

module.exports = { buildCapabilityModel };
```

**Note on `startupMs`:** The `CapabilityModelSchema` in `model.cjs` does not have a `startupMs` field. Store this in a separate `wrapper-metadata.json` alongside the capability model, or extend the registry entry. Do NOT try to add it to the Zod-validated capability model meta — it will fail validation.

### Pattern 2: Blender Async MCP Server Handler

The generated server must use `spawn` (async), never `spawnSync`. The `startupMs: 5000` declaration reflects that Blender takes 3-8 seconds to initialize in `--background` mode before executing a Python script.

```javascript
// Source: Blender man page verified 2026-03-29 + server-gen.cjs async pattern
'use strict';
const { spawn } = require('child_process');

// In generated server tool handler:
async function renderFrame(input) {
  return new Promise((resolve, reject) => {
    // Argument order matters: load .blend BEFORE --python
    const args = [
      '--background',
      '--factory-startup',   // Skip user prefs for clean state
      input.blendFile,
      '--python-exit-code', '1',  // Exit non-zero on Python exception
      '--python', input.scriptPath,
      '--render-output', input.outputPath,
      '--render-format', input.format || 'PNG',
      '--render-frame', String(input.frame || 1),
    ];

    const proc = spawn(BINARY, args, { encoding: 'utf8', timeout: 120000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });
    proc.on('close', code => {
      // Wrap raw stdout as JSON — WRAP-05
      let result;
      try { result = JSON.parse(stdout); }
      catch (_) { result = { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code }; }
      resolve({ content: [{ type: 'text', text: JSON.stringify(result) }] });
    });
    proc.on('error', err => reject(err));
  });
}
```

### Pattern 3: GIMP Version-Conditional Script-Fu Invocation

GIMP 2.x and 3.x have breaking Script-Fu API differences. The wrapper reads the major version from the registry entry and selects the correct invocation template.

```javascript
// Source: GIMP developer docs, verified 2026-03-29
// GIMP 2.10 batch invocation:
// gimp --no-interface --batch '(let* ((image (car (gimp-file-load RUN-NONINTERACTIVE "/in.png" "")))(drawable (car (gimp-image-get-active-drawable image))))(file-png-save RUN-NONINTERACTIVE image drawable "/out.png" ""))' --batch '(gimp-quit 0)'

// GIMP 3.0 batch invocation:
// gimp-3.0 --no-interface --batch '(let* ((image (car (gimp-file-load RUN-NONINTERACTIVE "/in.png")))(drawable (car (gimp-image-get-active-drawable image))))(gimp-file-export RUN-NONINTERACTIVE image (vector drawable) "/out.png"))' --quit

function buildGimpArgs(scriptFuExpr, registryEntry) {
  const major = registryEntry.version
    ? parseInt(registryEntry.version.split('.')[0], 10)
    : 2;

  if (major >= 3) {
    // GIMP 3.x: --quit flag closes GIMP; no trailing --batch '(gimp-quit 0)' needed
    return ['--no-interface', '--batch', scriptFuExpr, '--quit'];
  } else {
    // GIMP 2.x: must append (gimp-quit 0) as a second --batch command
    return ['--no-interface', '--batch', scriptFuExpr, '--batch', '(gimp-quit 0)'];
  }
}
```

**Key differences GIMP 2.x vs 3.x:**
- `(gimp-file-load RUN-NONINTERACTIVE "/path" "")` → 3.x: `(gimp-file-load RUN-NONINTERACTIVE "/path")` (1 string not 2)
- `(gimp-file-export RUN-NONINTERACTIVE image drawable "/path" "")` → 3.x: `(gimp-file-export RUN-NONINTERACTIVE image (vector drawable) "/path")`
- `TRUE` / `FALSE` → 3.x: `#t` / `#f`
- Quit: `--batch '(gimp-quit 0)'` → 3.x: `--quit` flag (replaces trailing batch command)

### Pattern 4: Inkscape Pure CLI Export (No Headless Flags)

Inkscape 1.x suppresses its GUI automatically when export flags are present. No `--without-gui`, `--batch-process`, or display variables are needed.

```javascript
// Source: Inkscape Debian man page verified 2026-03-29
// CORRECT — Inkscape 1.x export to PNG:
const args = [
  inputFile,                          // Input SVG — positional, before flags
  '--export-type=png',
  '--export-filename=' + outputFile,
  '--export-area-page',               // Export page bounds (default for PNG)
  '--export-dpi=' + (options.dpi || '96'),
  '--export-overwrite',               // Overwrite existing output file
];

// CORRECT — Inkscape 1.x export to PDF:
const args = [
  inputFile,
  '--export-type=pdf',
  '--export-filename=' + outputFile,
  '--export-area-page',
];

// WRONG — do NOT use deprecated 0.9x flags:
// '--export-png=/path/out.png'    (removed in 1.x)
// '--without-gui'                 (removed in 1.x)
// '--export-pdf=/path/out.pdf'    (removed in 1.x)
```

### Pattern 5: SKILL.md Generation via Phase 164 Machinery

The SKILL.md generator takes a CapabilityModel and writes to an output directory. Call the same function used by the CLI-Anything wrapping pipeline.

```javascript
// Source: bin/lib/cli-anything/skill-gen.cjs (Phase 164, verified by reading source)
const { writeSkillMd } = require('../cli-anything/skill-gen.cjs');
const { writeServer } = require('../cli-anything/server-gen.cjs');
const { validateCapabilityModel } = require('../cli-anything/model.cjs');

function generateAppWrapper(slug, model, projectRoot) {
  const outputDir = path.join(projectRoot, '.planning', 'app-wrappers', slug);
  const serverDir = path.join(outputDir, 'server');

  // Write capability model
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'capability-model.json'),
    JSON.stringify(model, null, 2)
  );

  // Generate MCP server (uses spawn internally — NOT spawnSync)
  // WARNING: server-gen.cjs generates spawnSync by default — MUST override for Blender (WRAP-01)
  writeServer(serverDir, model.capabilities, model.meta, projectRoot);

  // Generate SKILL.md
  writeSkillMd(serverDir, model);

  return { outputDir, serverDir };
}
```

**CRITICAL WARNING:** The existing `server-gen.cjs` `generateToolHandler()` uses `spawnSync`, not `spawn`. For Blender (WRAP-01: "async MCP server"), a custom async handler template must be used. Either extend `server-gen.cjs` with an `asyncMode` option or write the Blender server file manually.

### Pattern 6: Version Detection from Registry (not re-detected at wrap time)

Version was already detected and stored by Phase 171 `app discover`. Wrappers read from registry, never re-run `--version`.

```javascript
// Source: Phase 171 registry schema (app-registry.cjs)
function loadAppEntry(registryPath, slug) {
  const { checkApproved } = require('./app-registry.cjs');
  // checkApproved throws descriptive error for non-approved or mock entries
  return checkApproved(registryPath, slug);
  // Returns: { slug, binaryPath, version, executionMode, status, displayProbe, ... }
}

// Version parsing for template selection
function parseMajorVersion(versionString) {
  if (!versionString) return null;
  const match = versionString.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
```

### Anti-Patterns to Avoid

- **Using `spawnSync` in any MCP server tool handler:** It blocks the Node.js event loop. Blender startup takes 3-8 seconds. Use `spawn` with Promise wrapper. WRAP-01 is explicit: "async MCP server never uses synchronous subprocess variants."
- **Re-detecting version at wrap time:** Phase 171 already stored the version. Reading from registry is O(1) vs spawning `blender --version` which takes several seconds.
- **Using old Inkscape `--export-png=` flag:** Removed in Inkscape 1.0. Always use `--export-type=png --export-filename=`.
- **Omitting `--factory-startup` for Blender:** User preferences can change render settings and break reproducibility. Always pass `--factory-startup` for headless operations.
- **Not wrapping GIMP 3.x exports in `(vector drawable)`:** `(gimp-file-export RUN-NONINTERACTIVE image drawable "/path")` fails silently on GIMP 3.x — the wrapper must use `(vector drawable)`.
- **Adding display flags for Inkscape:** Setting `DISPLAY=:99` or using Xvfb for Inkscape is a legacy workaround from Inkscape 0.9x. It wastes resources and may cause issues on macOS.
- **Storing `startupMs` inside the Zod-validated CapabilityModel meta:** The schema uses `z.string()` for all meta fields; `startupMs` is a number. Store in a separate `wrapper-metadata.json` file alongside `capability-model.json`.
- **Outputting to `.planning/cli-anything/` for app wrappers:** CLI-Anything registry and app-wrappers registry are separate concerns. App wrapper output goes to `.planning/app-wrappers/{slug}/`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SKILL.md generation | Custom markdown template per app | `writeSkillMd(outputDir, model)` from `bin/lib/cli-anything/skill-gen.cjs` | Phase 164 machinery already tested; SKILL.md format is fixed per GSD convention |
| MCP server file generation | Custom server.cjs per app | `writeServer(outputDir, caps, meta, root)` from `bin/lib/cli-anything/server-gen.cjs` | Same generator used for all CLI-Anything wrappers; only need to extend for async mode |
| CapabilityModel validation | Custom JSON schema check | `validateCapabilityModel(data)` from `bin/lib/cli-anything/model.cjs` | Zod schema is the single source of truth; re-implementing validation creates drift |
| Registry approval gating | Custom `if status !== 'approved'` checks | `checkApproved(registryPath, slug)` from `bin/lib/app-registry.cjs` | Phase 171's guard includes all edge cases: missing, pending, rejected, mock status |
| Version parsing | Custom regex per app | `registryEntry.version` directly from Phase 171 registry | Version was already detected and stored; no need to spawn `--version` again |
| JSON output wrapping | Custom stdout parser per app | Consistent `try { JSON.parse(stdout) } catch { wrap }` pattern (same as server-gen.cjs) | Identical pattern to existing CLI-Anything servers; agents expect same envelope format |
| Display server check | Live re-probe at tool call time | Read `registryEntry.displayProbe.available` from registry | Phase 171 already probed; re-probing on every tool call is expensive and unnecessary |

**Key insight:** Phase 172 is an orchestration phase, not an infrastructure phase. All infrastructure (registry, validation, generation) was built in Phases 163-171. Phase 172 feeds app-specific CLI knowledge into existing machinery.

---

## Common Pitfalls

### Pitfall 1: Blender Argument Order Matters

**What goes wrong:** `blender --background --python script.py file.blend` — script runs before `.blend` file is loaded.
**Why it happens:** Blender processes arguments sequentially in order given. `--python` executes the script at the point it appears, so the `.blend` file is not yet loaded.
**How to avoid:** Always load the `.blend` file BEFORE `--python`: `blender --background file.blend --python script.py`
**Warning signs:** `bpy.data.objects` is empty in the Python script despite the `.blend` file containing objects.

### Pitfall 2: Blender Python Exceptions Don't Fail Without `--python-exit-code`

**What goes wrong:** A Python script throws an exception but Blender exits with code 0. The MCP tool reports success, but the render never happened.
**Why it happens:** By default, Blender ignores Python exceptions at exit. The bug in Blender issue T82494 confirmed this behavior.
**How to avoid:** Always pass `--python-exit-code 1` so any Python exception causes exit code 1. The wrapper can then detect failure from the non-zero exit code.
**Warning signs:** Exit code 0 from Blender but expected output file missing.

### Pitfall 3: GIMP 3.x `(gimp-quit 0)` vs `--quit` Flag Conflict

**What goes wrong:** Using both `--quit` and `--batch '(gimp-quit 0)'` in GIMP 3.x invocation causes double-quit behavior or unexpected exit before batch completes.
**Why it happens:** `--quit` is a CLI flag that tells GIMP to exit after all actions complete. `(gimp-quit 0)` in a batch expression also quits. Using both can cause premature exit.
**How to avoid:** For GIMP 3.x, use `--quit` flag only (no `(gimp-quit 0)` batch command). For GIMP 2.x, use `--batch '(gimp-quit 0)'` only (no `--quit` flag — it may not exist in 2.10).
**Warning signs:** GIMP exits before the batch script finishes processing, or exits with an error about double-quit.

### Pitfall 4: GIMP 3.x `gimp-file-export` Requires `(vector drawable)` Not `drawable`

**What goes wrong:** `(gimp-file-export RUN-NONINTERACTIVE image drawable "/out.png")` raises PDB error on GIMP 3.x: "expected array of drawables."
**Why it happens:** GIMP 3.0 changed file export PDB to accept a vector (array) of drawable IDs instead of a single drawable ID.
**How to avoid:** Always use `(gimp-file-export RUN-NONINTERACTIVE image (vector drawable) "/out.png")` in 3.x invocation templates.
**Warning signs:** PDB error in batch output mentioning "drawable" type mismatch.

### Pitfall 5: Inkscape Version Output Has Two Lines (Multi-Line Parsing)

**What goes wrong:** `inkscape --version` output is parsed with `.split('\n')[0]` assuming single-line, but Inkscape 1.0.1+ outputs a second line with Pango version. Most parsers handle this correctly, but if stripping newlines incorrectly, version detection fails.
**Why it happens:** Inkscape 1.0.1 added a Pango version line to `--version` output. Example: `Inkscape 1.3.2 (091e20e, 2023-11-25)\nPango version: 1.50.14`
**How to avoid:** Use `.split('\n')[0]` to take only the first line. Then match `/Inkscape (\d+\.\d+[\.\d]*)/` against the first line.
**Warning signs:** Regex match failing on valid Inkscape install.

### Pitfall 6: Blender Version Output Format Changed in 4.x

**What goes wrong:** Version regex expecting `Blender X.Y (sub Z)` (old format) fails on Blender 4.x output.
**Why it happens:** Blender 4.x changed `--version` output format. Old format: `Blender 2.93 (sub 0)`. New format (4.x): multi-field output including `Blender: version: 4.0.0, branch: blender-v4.0-release, commit date: 2023-11-13 17:26, hash: 878f71061b8e, type: release`.
**How to avoid:** Use a flexible regex: `/Blender[: ]+(?:version[: ]+)?(\d+)\.(\d+)(?:\.(\d+))?/i` that handles both the old sub-format and the new version field format.
**Warning signs:** `null` returned from version parse despite Blender being installed.

### Pitfall 7: GIMP Startup is Slow Even in Batch Mode

**What goes wrong:** Subprocess timeout set too low (e.g., 30 seconds) causes GIMP batch operations to time out during GIMP initialization.
**Why it happens:** GIMP loads plugins, brushes, and fonts at startup even in `--no-interface` mode. Startup takes 5-30 seconds on first run and 3-10 seconds on subsequent runs.
**How to avoid:** Use `--no-data` (`-d`) and `--no-fonts` (`-f`) flags in batch mode when fonts/brushes are not needed. Set subprocess timeout to at least 120 seconds. Pass `-d -f` as part of the batch invocation.
**Warning signs:** GIMP process terminates before any batch output is produced.

### Pitfall 8: `server-gen.cjs` Generates `spawnSync` — Incompatible with WRAP-01

**What goes wrong:** Using `writeServer()` from `server-gen.cjs` for Blender generates a server that calls `spawnSync`, which blocks the Node.js event loop during Blender's 5-second startup.
**Why it happens:** `server-gen.cjs` `generateToolHandler()` uses `spawnSync` by design for fast CLI tools. Blender is not a fast CLI tool.
**How to avoid:** Extend `server-gen.cjs` with an `asyncMode: true` option in `generateServerSource()` that emits `spawn` with Promise wrapper instead of `spawnSync`. Or write the Blender server.cjs manually and add it to the test suite.
**Warning signs:** MCP client times out waiting for Blender render response.

### Pitfall 9: Display Probe `available: false` Should Surface as Capability Degradation, Not Crash

**What goes wrong:** Blender or GIMP wrapper called on a headless server with no display; subprocess hangs waiting for display.
**Why it happens:** Despite using `--background` (Blender) and `--no-interface` (GIMP), some plugin initialization code in GIMP may still attempt X11 connection.
**How to avoid:** Read `registryEntry.displayProbe.available` from Phase 171 registry. If `false` and the app is `gui-required`, the Phase 171 `checkApproved` guard already blocks this (executionMode would be `mock`). For `headless` apps with display probe false, log a warning but proceed — these apps are designed to run without display.
**Warning signs:** Subprocess hangs without producing stdout/stderr; process never emits `close` event.

### Pitfall 10: Inkscape `--export-overwrite` Required to Replace Existing Files

**What goes wrong:** Inkscape export silently generates a new filename (e.g., `out-1.png`) instead of overwriting `out.png` if `--export-overwrite` is absent.
**Why it happens:** Inkscape 1.x default behavior is to generate a new filename rather than overwrite, to prevent accidental data loss.
**How to avoid:** Always pass `--export-overwrite` in wrapper invocations. The MCP tool output should include the actual output filename from stdout, not assume the agent's requested filename.
**Warning signs:** Expected output file missing; a numbered variant (e.g., `out-1.png`) found instead.

---

## Code Examples

### Blender Complete Headless Render Invocation

```javascript
// Source: Blender Debian man page + blenderartists.org verified 2026-03-29
// Renders frame 1 of a blend file to PNG, using a Python script for configuration
const { spawn } = require('child_process');
const path = require('path');

function blenderRender(binaryPath, blendFile, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      '--background',                    // No GUI
      '--factory-startup',               // Skip user prefs
      blendFile,                         // Load file FIRST (order matters)
      '--python-exit-code', '1',         // Treat Python exceptions as errors
    ];

    if (options.pythonScript) {
      args.push('--python', options.pythonScript);
    }

    args.push(
      '--render-output', outputPath,     // Output path (supports // for relative)
      '--render-format', options.format || 'PNG',
      '--render-frame', String(options.frame || 1)
    );

    const proc = spawn(binaryPath, args, {
      timeout: 120000,   // 2 min — Blender can be slow
    });
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

### Blender `--version` Output Parsing (Handles Both 3.x and 4.x Formats)

```javascript
// Source: blenderartists.org verified format for Blender 4.0.0, 2026-03-29
// Blender 4.x output: "Blender: version: 4.0.0, branch: blender-v4.0-release, ..."
// Blender 2.x output: "Blender 2.93 (sub 5)"
function parseBlenderVersion(versionOutput) {
  const line = versionOutput.split('\n')[0].trim();
  // Try Blender 4.x colon format first
  let match = line.match(/version[:\s]+(\d+)\.(\d+)(?:\.(\d+))?/i);
  if (!match) {
    // Try Blender 2.x/3.x space format
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
```

### GIMP 2.x Batch Invocation (Script-Fu)

```bash
# Source: GIMP man page + GIMP Basic Batch Tutorial verified 2026-03-29
# Resize image to 800px wide and export as PNG
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
# Source: GIMP 3.0 developer docs verified 2026-03-29
# Key changes: single string for file load, vector drawable for export, --quit flag
gimp-3.0 --no-interface -d -f \
  --batch '(let* ((image (car (gimp-file-load RUN-NONINTERACTIVE "/in.png")))
                  (drawable (car (gimp-image-get-active-drawable image)))
                  (new-w 800)
                  (width (car (gimp-image-width image)))
                  (height (car (gimp-image-height image)))
                  (new-h (/ (* height new-w) width)))
             (gimp-image-scale-full image new-w new-h INTERPOLATION-LINEAR)
             (gimp-file-export RUN-NONINTERACTIVE image
               (vector (car (gimp-image-get-active-drawable image))) "/out.png")
             (gimp-image-delete image))' \
  --quit
```

### GIMP Version Detection

```javascript
// Source: Phase 171 detectGimpVersion pattern, adapted 2026-03-29
// "GNU Image Manipulation Program version 3.0.2" (3.x) or "GIMP 2.10.38" (2.x)
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
```

### Inkscape Export SVG to PNG

```javascript
// Source: Inkscape man page (Debian testing) verified 2026-03-29
// Inkscape 1.x: no headless flags needed; GUI suppressed automatically
const { spawn } = require('child_process');

function inkscapeExport(binaryPath, inputSvg, outputFile, options = {}) {
  return new Promise((resolve, reject) => {
    const exportType = options.exportType || 'png';
    const args = [
      inputSvg,                                    // Input SVG — positional first
      '--export-type=' + exportType,
      '--export-filename=' + outputFile,
      '--export-area-page',                        // Use page bounds
      '--export-dpi=' + (options.dpi || '96'),
      '--export-overwrite',                        // Required to overwrite existing file
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

### Inkscape Version Parsing (Multi-Line Output)

```javascript
// Source: Inkscape 1.0.1+ outputs two lines; Pango version on second line
// "Inkscape 1.3.2 (091e20e, 2023-11-25)\nPango version: 1.50.14"
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

### SKILL.md Generation (Phase 164 Machinery)

```javascript
// Source: bin/lib/cli-anything/skill-gen.cjs (read directly from project, 2026-03-29)
// generateSkillMd(model) → string
// writeSkillMd(outputDir, model) → absolute path to written SKILL.md
// model must conform to CapabilityModelSchema from model.cjs

const { writeSkillMd } = require('../cli-anything/skill-gen.cjs');
const { writeServer }  = require('../cli-anything/server-gen.cjs');

// Generated SKILL.md includes:
//   <!-- PDE-GENERATED | hash:{sha256_of_model} | generated:{iso_date} -->
//   ---
//   name: {slug}
//   description: {first capability description}
//   binary: {meta.source}
//   ---
//   ## Goal ... ## Invocation ... ## Tools ... ## Flags ... ## Constraints

// writeSkillMd creates outputDir if needed and writes SKILL.md
const skillPath = writeSkillMd(serverDir, validatedModel);
```

### Wrapper Metadata File (for startupMs and extra fields)

```javascript
// Store app-specific metadata that does not fit into CapabilityModelSchema
// alongside capability-model.json in .planning/app-wrappers/{slug}/
const wrapperMetadata = {
  slug: 'blender',
  startupMs: 5000,          // WRAP-01: declared startup time
  executionMode: 'headless',
  versionRequires: '3.x|4.x',
  asyncRequired: true,      // Server must use spawn not spawnSync
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(outputDir, 'wrapper-metadata.json'),
  JSON.stringify(wrapperMetadata, null, 2)
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inkscape requires X11 / `--without-gui` | Inkscape 1.x suppresses GUI for export automatically | Inkscape 1.0 (2020) | No Xvfb or display vars needed; executionMode: headless |
| GIMP Script-Fu `gimp-file-load` takes 2 strings | GIMP 3.0: takes 1 string (GFile) | GIMP 3.0 (March 2025) | Version detection and template selection critical |
| GIMP `TRUE`/`FALSE` booleans | GIMP 3.0 Script-Fu v3: `#t`/`#f` | GIMP 3.0 (March 2025) | Scripts not updated break silently on GIMP 3.x |
| GIMP quit via `--batch '(gimp-quit 0)'` | GIMP 3.0: `--quit` CLI flag | GIMP 3.0 (March 2025) | Simplified quit; still must not use both |
| Blender `--version` → `Blender X.Y (sub Z)` | Blender 4.x → `Blender: version: X.Y.Z, branch: ...` | Blender 4.0 (2023) | Flexible regex needed for version parsing |
| Python context overrides via dict argument | Blender 3.2+: `bpy.context.temp_override()` context manager | Blender 3.2 (2022) | Use `with bpy.context.temp_override(scene=scene)` for headless rendering |
| Inkscape `--export-png=filename.png` | Inkscape 1.x: `--export-type=png --export-filename=filename.png` | Inkscape 1.0 (2020) | Old per-format export flags removed |

**Deprecated/outdated:**
- `inkscape --export-png=out.png`: Removed in Inkscape 1.0 — use `--export-type=png --export-filename=out.png`
- `inkscape --without-gui`: Removed in Inkscape 1.0 — not needed at all for export
- `inkscape --verb=...`: Removed in Inkscape 1.1 — use `--actions=...`
- `(gimp-file-load RUN-NONINTERACTIVE "/path" "")`: GIMP 2.x syntax — fails on 3.x
- `gimp -b '(your-script)' -b '(gimp-quit 0)'` (using `gimp-quit 0` for GIMP 3.x): Use `--quit` instead
- `bpy.context.scene` mutation without `temp_override` for Blender 3.2+: deprecated in favor of context manager

---

## Open Questions

1. **GIMP 3.0 `--quit` vs `(gimp-quit 0)` coexistence**
   - What we know: `--quit` is documented in GIMP 3.0 man page; `(gimp-quit 0)` is the 2.x pattern; using both may cause issues
   - What's unclear: Whether `(gimp-quit 0)` in a batch script body still works in GIMP 3.x alongside `--quit`
   - Recommendation: Use `--quit` for GIMP 3.x only (no `(gimp-quit 0)` in batch body); test with the installed GIMP version during implementation

2. **Blender `bpy.context.temp_override` required for headless render?**
   - What we know: Blender 3.2+ requires `temp_override` for context overrides; headless rendering with `bpy.ops.render.render(write_still=True)` may need it
   - What's unclear: Whether the simple `bpy.ops.render.render(write_still=True)` still works in Blender 4.x headless without `temp_override`
   - Recommendation: Use `with bpy.context.temp_override(scene=bpy.context.scene): bpy.ops.render.render(write_still=True)` in all Blender render scripts for forward compatibility

3. **`server-gen.cjs` async extension approach**
   - What we know: Current `generateToolHandler()` emits `spawnSync`; Blender needs async `spawn`
   - What's unclear: Whether to add `asyncMode` option to existing `server-gen.cjs` or write Blender server manually
   - Recommendation: Add `asyncMode: true` option to `generateServerSource()` in `server-gen.cjs`; pass it through from the app-wrapper when building Blender's server. This benefits any future long-running tool.

4. **GIMP on macOS: binary name may be versioned**
   - What we know: Phase 171 catalog has `cliAlias: ['gimp-3.0', 'gimp-2.10', 'gimp-2.99']`; macOS Homebrew installs `gimp` as symlink
   - What's unclear: Whether `gimp-3.0` binary name is available on macOS Homebrew vs just `gimp`
   - Recommendation: Phase 172 wrapper uses `registryEntry.binaryPath` (absolute path from Phase 171 probe) — no alias logic needed at wrap time

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js v20 | All wrapper modules | Yes | v20.20.0 | — |
| vitest | Nyquist tests | Yes | 4.1.1 | — |
| @modelcontextprotocol/sdk | Generated MCP servers | Yes (in packages/pde-mcp-server) | installed | — |
| zod | model.cjs validation | Yes (in packages/pde-mcp-server) | installed | — |
| Blender | WRAP-01 (live invocation) | Not installed | — | executionMode: 'mock'; wrapper module and tests are fully stub-testable |
| GIMP | WRAP-02 (live invocation) | Not installed | — | executionMode: 'mock'; wrapper module and tests are fully stub-testable |
| Inkscape | WRAP-03 (live invocation) | Not installed | — | executionMode: 'mock'; wrapper module and tests are fully stub-testable |
| bin/lib/app-registry.cjs | Approval gate | Pending (Phase 171) | — | Must be implemented in Phase 171 before Phase 172 can run integration tests |

**Missing dependencies with no fallback:**
- `bin/lib/app-registry.cjs` (Phase 171 output) — Phase 172 wrapper modules depend on `checkApproved()` from this module. Phase 171 must be merged before Phase 172 integration tests can run.

**Missing dependencies with fallback:**
- Blender/GIMP/Inkscape not installed — all three wrapper modules are fully unit-testable with mock registry entries; `executionMode: 'mock'` prevents subprocess calls in tests.

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
| WRAP-01 | Blender capability model built with correct headless flags and startupMs | unit | `npx vitest run tests/phase-172/blender-wrapper.test.mjs` | Wave 0 |
| WRAP-01 | Blender MCP server uses async spawn not spawnSync | unit | `npx vitest run tests/phase-172/blender-wrapper.test.mjs` | Wave 0 |
| WRAP-02 | GIMP 2.x invocation uses 2-arg gimp-file-load and (gimp-quit 0) | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | Wave 0 |
| WRAP-02 | GIMP 3.x invocation uses 1-arg gimp-file-load and --quit flag | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | Wave 0 |
| WRAP-03 | Inkscape args contain no display flags; export-type and export-filename present | unit | `npx vitest run tests/phase-172/inkscape-wrapper.test.mjs` | Wave 0 |
| WRAP-04 | SKILL.md auto-generated for each wrapped app via writeSkillMd() | unit | `npx vitest run tests/phase-172/skill-gen-integration.test.mjs` | Wave 0 |
| WRAP-05 | JSON structured output: raw stdout wrapped in JSON envelope if not valid JSON | unit | `npx vitest run tests/phase-172/blender-wrapper.test.mjs` | Wave 0 |
| WRAP-06 | GIMP wrapper selects correct invocation template based on major version | unit | `npx vitest run tests/phase-172/gimp-wrapper.test.mjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-172/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-172/blender-wrapper.test.mjs` — covers WRAP-01, WRAP-05
- [ ] `tests/phase-172/gimp-wrapper.test.mjs` — covers WRAP-02, WRAP-06
- [ ] `tests/phase-172/inkscape-wrapper.test.mjs` — covers WRAP-03
- [ ] `tests/phase-172/skill-gen-integration.test.mjs` — covers WRAP-04 (uses existing skill-gen.cjs)

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/cli-anything/skill-gen.cjs` (project source, read directly) — generateSkillMd, writeSkillMd signatures and output format
- `bin/lib/cli-anything/server-gen.cjs` (project source, read directly) — generateServerSource, generateToolHandler, spawnSync usage confirmed
- `bin/lib/cli-anything/model.cjs` (project source, read directly) — CapabilityModelSchema Zod definition, validateCapabilityModel
- `bin/lib/cli-anything/help-parser.cjs` (project source, read directly) — discoverCapabilities, cmdWrap pipeline
- `.planning/phases/171-security-architecture-discovery-foundation/171-RESEARCH.md` (project, read directly) — GIMP 3.x breaking changes, registry schema, checkApproved pattern, version detection
- Debian testing man page for blender (`manpages.debian.org/testing/blender-data`) — all Blender CLI flags verified: --background, --python, --python-expr, --python-exit-code, --factory-startup, -F, -f, -o, -a, -s, -e
- Debian testing man page for inkscape (`manpages.debian.org/testing/inkscape`) — all Inkscape CLI flags verified: --export-type, --export-filename, --export-area-page, --export-dpi, --export-overwrite, --actions, --shell, exit code 0/non-zero
- GIMP man page (`gimp.org/man/gimp.html`) — --no-interface, --batch, --quit, --batch-interpreter flags
- GIMP developer docs `developer.gimp.org/resource/script-fu/porting_scriptfu_scripts/` — gimp-file-load 2→1 arg, (vector drawable) requirement
- GIMP developer docs `developer.gimp.org/resource/script-fu/script-fu-changes-v3/` — TRUE/FALSE → #t/#f, script-fu-register deprecation

### Secondary (MEDIUM confidence)
- Inkscape wiki `wiki.inkscape.org/wiki/Using_the_Command_Line` — deprecated flag list, --batch-process, --export-overwrite behavior verified against man page
- blenderartists.org Blender 4.0 `--version` output format — `Blender: version: 4.0.0, branch: blender-v4.0-release, commit date: ...` format confirmed
- Blender Debian man page (Ubuntu Jammy) — --factory-startup, --python-exit-code, --enable-autoexec flags
- GIMP developer docs `developer.gimp.org/api/3.0/libgimp/func.file_load.html` — `gimp_file_load(GimpRunMode, GFile*)` C signature confirms single GFile argument

### Tertiary (LOW confidence — requires validation during implementation)
- GIMP 3.0 `--quit` flag exact behavior: documented in man page but interaction with `(gimp-quit 0)` not definitively tested
- Blender `bpy.context.temp_override` requirement for headless: documented for 3.2+ but exact behavior in 4.x headless scripts needs testing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all modules read directly from project source; Node.js built-ins verified
- Architecture patterns: HIGH — Phase 164 machinery read directly; CLI flags verified from Debian man pages
- Pitfalls: HIGH — most from Phase 171 research + official docs; GIMP 3.x quit interaction is MEDIUM
- Version parsing: HIGH — Blender 4.x format verified from blenderartists.org; Inkscape multi-line from issue tracker

**Research date:** 2026-03-29
**Valid until:** 2026-06-29 (90 days) — Blender and Inkscape are stable; GIMP 3.x is new (March 2025) so GIMP patterns should be reverified if implementation is delayed beyond 30 days
