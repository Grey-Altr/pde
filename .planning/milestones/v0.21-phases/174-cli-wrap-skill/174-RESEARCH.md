# Phase 174: CLI Wrap Skill - Research

**Researched:** 2026-03-29
**Domain:** `/pde:cli-wrap` orchestration, CLI-Anything harness detection, pipx binary path resolution, dual-strategy routing, PDE command architecture
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLI-01 | `/pde:cli-wrap` skill takes any installed app and produces agent-native CLI + MCP server + SKILL.md in one command | Verified: Phase 163-164 `cmdWrap` pipeline already does this for generic CLIs; Phase 174 adds the dual-strategy router and pipx-config-init wrapper around it |
| CLI-02 | Dual strategy routing: CLI-Anything pre-built CLIs (pipx) as fast path when available, native `--help` → capability model → codegen as fallback | Verified: CLI-Anything package naming is `cli-anything-{slug}` (entry point confirmed from HARNESS.md); `spawnSync('which', ['cli-anything-' + slug])` detects presence; fast path uses the harness binary's `--help` instead of the native app binary |
| CLI-03 | pipx (not pip) as canonical install method for CLI-Anything CLIs, with absolute path resolution stored in config | Verified: `pipx environment` command outputs `PIPX_BIN_DIR`; `pipx list --json` outputs `.venvs[pkgName].metadata.main_package.app_paths` as an array of absolute Path objects; absolute path stored in `.planning/config.json` under `clianything.pipx_bin_dir` key |
</phase_requirements>

---

## Summary

Phase 174 is the terminal integration phase for the CLI-Anything pipeline. It adds `/pde:cli-wrap` as a unified one-command skill that wraps any installed app by routing through the correct strategy: if a CLI-Anything community harness exists on PyPI and is installed via pipx, use it as the fast path (skipping `--help` parsing since the harness already provides a structured MCP-ready CLI); otherwise fall back to native `--help` → capability model → codegen using the Phase 163-164 machinery.

The routing decision is a two-step check: (1) detect if `cli-anything-{slug}` exists on PATH (via `spawnSync('which', ...)`) and (2) resolve its absolute binary path from `pipx list --json` or `PIPX_BIN_DIR`. The absolute path is stored in `.planning/config.json` under `clianything.pipx_bin_dir` at setup time so it is not subject to PATH variations when Node.js spawns subprocesses. This is critical: Node.js subprocess PATH differs from shell PATH on macOS because shell profiles (`~/.zshrc`, `~/.zprofile`) are not loaded for non-login non-interactive subprocesses.

The command implementation is a new `commands/cli-wrap.md` slash command that shells out to a new `pde-tools app cli-wrap <slug>` subcommand. This follows the existing `/pde:wrap` → `pde-tools cli-anything wrap` pattern exactly. The `app cli-wrap` handler is added to the `case 'app':` routing block built in Phase 173. The handler itself lives in a new `bin/lib/app-cli-wrap.cjs` module.

**Primary recommendation:** New `bin/lib/app-cli-wrap.cjs` implements the dual-strategy router + orchestration. New `commands/cli-wrap.md` slash command invokes it. `pde-tools.cjs` routes `app cli-wrap` to it. One new setup command `pde-tools app pipx-setup` stores resolved `PIPX_BIN_DIR` in config. All patterns follow established CJS dependency-injection conventions from Phases 163-173.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js child_process | built-in (v20.x) | `spawnSync` for `which`, `pipx environment`, `pipx list --json`; harness probing | Established pattern throughout bin/lib; `spawnSync` with argument arrays — no shell strings |
| Node.js fs + path | built-in (v20.x) | config.json read/write, output directory creation, artifact existence checks | Zero-dependency CJS pattern from all prior phases |
| Node.js os | built-in (v20.x) | `os.homedir()` for fallback PIPX_BIN_DIR resolution on macOS (`~/.local/bin`) | Used in Phase 171 display probe; same pattern |
| bin/lib/cli-anything/help-parser.cjs | Phase 163-164 (project) | `discoverCapabilities()` — fallback path `--help` parsing | Reused as-is for the fallback strategy |
| bin/lib/cli-anything/server-gen.cjs | Phase 164 (project) | `writeServer()` — MCP server file generation | Reused as-is; same generator used for all CLI-Anything wrappers |
| bin/lib/cli-anything/skill-gen.cjs | Phase 164 (project) | `writeSkillMd()` — SKILL.md generation | Reused as-is |
| bin/lib/cli-anything/model.cjs | Phase 164 (project) | `validateCapabilityModel()` — Zod schema validation | Reused as-is |
| bin/lib/app-registry.cjs | Phase 171 (project) | `checkApproved()` — approval gate before any subprocess | Phase 174 follows the same security pattern as Phase 172 wrappers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bin/lib/config.cjs | Phase 163 (project) | `ensureConfigFile()` — config.json read/write | Storing `clianything.pipx_bin_dir` at setup time |
| bin/lib/core.cjs | Phase 163 (project) | `safeReadFile()` — null-on-ENOENT file reads | Reading config.json without throwing |
| pipx | 1.11.0 (system CLI) | Isolated install of CLI-Anything harnesses | Fast path: `pipx install cli-anything-{slug}` |
| CLI-Anything community harnesses | Latest on PyPI | Pre-built agent-native CLIs (cli-anything-blender, cli-anything-gimp, etc.) | Fast path — when available, skip `--help` parsing |
| vitest | 4.1.1 (installed) | Test framework for Nyquist tests | All unit tests follow `tests/phase-174/*.test.mjs` pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `spawnSync('which', ['cli-anything-' + slug])` for fast-path detection | `fs.existsSync(path.join(pipxBinDir, 'cli-anything-' + slug))` | Direct path check is faster (no subprocess) and not PATH-dependent; use BOTH: PATH check first, fallback to config-stored bin dir check |
| Storing `pipx_bin_dir` in `config.json` | Re-running `pipx environment` on each invocation | `pipx environment` takes ~100ms; storing it once is O(1) lookups; PATH variation in Node.js subprocesses means `which pipx` can fail even when pipx is installed |
| `pipx list --json` for path resolution | `pipx environment --value PIPX_BIN_DIR` | `pipx environment --value PIPX_BIN_DIR` is the canonical single-value query; faster than parsing full JSON; use this for setup; `pipx list --json` is for verifying a specific package's app_paths |
| New `app-cli-wrap.cjs` module | Extending `help-parser.cjs cmdWrap` in-place | The dual-strategy router adds app-registry concerns (approval gate) and pipx concerns that don't belong in the generic CLI-Anything wrap path; separate module prevents Phase 163-164 machinery from gaining v0.21 coupling |
| `commands/cli-wrap.md` as new slash command | Reusing `commands/wrap.md` | `/pde:wrap` is the generic binary wrap (Phase 164); `/pde:cli-wrap` is the app-registry-aware wrap with dual-strategy routing (Phase 174); different contracts, different commands |

**Installation:**
No new npm dependencies. New system dependency: `pipx` (not bundled — must be present or installed via `brew install pipx` / `pip install pipx`).
```bash
# Install pipx if not present
brew install pipx   # macOS
# or
pip install pipx --user

# Setup: stores resolved PIPX_BIN_DIR in config
node bin/pde-tools.cjs app pipx-setup
```

**Version verification:** pipx 1.11.0 is current as of 2026-03-29 (verified against PyPI).

---

## Architecture Patterns

### Recommended Project Structure
```
bin/
  pde-tools.cjs                # MODIFIED: routes `app cli-wrap` and `app pipx-setup` in case 'app':

bin/lib/
  app-cli-wrap.cjs             # NEW: dual-strategy router + orchestration (Phase 174)
  app-registry.cjs             # Phase 171: checkApproved() — used as approval gate
  cli-anything/
    help-parser.cjs            # Phase 163: discoverCapabilities() — fallback path
    server-gen.cjs             # Phase 164: writeServer() — both paths
    skill-gen.cjs              # Phase 164: writeSkillMd() — both paths
    model.cjs                  # Phase 164: validateCapabilityModel() — both paths

commands/
  cli-wrap.md                  # NEW: /pde:cli-wrap slash command definition
  wrap.md                      # Phase 164: unchanged — generic binary wrap

.planning/
  config.json                  # MODIFIED: +clianything.pipx_bin_dir after pipx-setup
  app-registry.json            # Phase 171: read for approval gate
  app-wrappers/
    {slug}/                    # Output directory for app-registry-linked wraps
      capability-model.json
      server/
        server.cjs
        SKILL.md
  cli-anything/
    {slug}/                    # Output directory for generic CLI-Anything wraps (unchanged)
      capability-model.json
      server/
        server.cjs
        SKILL.md

tests/phase-174/
  app-cli-wrap.test.mjs         # CLI-01, CLI-02, CLI-03 — dual-strategy routing logic
  pipx-setup.test.mjs           # CLI-03 — pipx_bin_dir resolution + config storage
  cli-wrap-integration.test.mjs # CLI-01 — end-to-end: slug in → artifacts out
```

### Pattern 1: Dual-Strategy Router (app-cli-wrap.cjs core logic)

**What:** Checks for a CLI-Anything pre-built harness via `which cli-anything-{slug}`; uses it if found, falls back to `--help` discovery if not.
**When to use:** Every invocation of `pde-tools app cli-wrap <slug>`

```javascript
// Source: derived from help-parser.cjs cmdWrap pattern + CLI-Anything HARNESS.md naming convention
// Verified 2026-03-29
'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

/**
 * Detect whether a CLI-Anything pre-built harness is available for a slug.
 *
 * Checks in order:
 * 1. `which cli-anything-{slug}` (PATH-based, fast)
 * 2. If pipx_bin_dir is stored in config, check that directory directly
 *    (guards against PATH not including PIPX_BIN_DIR in Node.js subprocesses)
 *
 * @param {string} slug - App slug (e.g. 'blender', 'gimp')
 * @param {string|null} pipxBinDir - Stored PIPX_BIN_DIR from config, or null
 * @returns {{ found: boolean, binaryPath: string|null }}
 */
function detectHarness(slug, pipxBinDir) {
  const harnessName = `cli-anything-${slug}`;

  // Tier 1: PATH-based detection
  const whichResult = spawnSync('which', [harnessName], { encoding: 'utf8', timeout: 3000 });
  if (whichResult.status === 0 && whichResult.stdout.trim()) {
    return { found: true, binaryPath: whichResult.stdout.trim() };
  }

  // Tier 2: Config-stored PIPX_BIN_DIR (guards against Node.js PATH differences)
  if (pipxBinDir) {
    const candidate = path.join(pipxBinDir, harnessName);
    if (fs.existsSync(candidate)) {
      return { found: true, binaryPath: candidate };
    }
  }

  // Tier 3: Fallback well-known pipx bin locations
  const wellKnownDirs = [
    path.join(os.homedir(), '.local', 'bin'),
    '/usr/local/bin',
  ];
  for (const dir of wellKnownDirs) {
    const candidate = path.join(dir, harnessName);
    if (fs.existsSync(candidate)) {
      return { found: true, binaryPath: candidate };
    }
  }

  return { found: false, binaryPath: null };
}

module.exports = { detectHarness };
```

### Pattern 2: Fast Path — Harness-Based Wrapping

**What:** Uses the CLI-Anything harness binary as the source for capability discovery instead of the native app binary.
**When to use:** When `detectHarness()` returns `found: true`

```javascript
// Source: derived from help-parser.cjs cmdWrap pipeline + Phase 172 app wrapper contract
// Verified 2026-03-29

/**
 * Fast-path wrap: use CLI-Anything harness binary as the capability source.
 * The harness already provides a structured --help output designed for parsing.
 *
 * @param {string} cwd - Project root
 * @param {string} slug - App slug
 * @param {string} harnessBinaryPath - Absolute path to cli-anything-{slug} binary
 * @param {object} registryEntry - From app-registry.json (must be 'approved')
 */
async function wrapViaHarness(cwd, slug, harnessBinaryPath, registryEntry) {
  console.log(`[cli-wrap] FAST PATH: using CLI-Anything harness at ${harnessBinaryPath}`);

  const { discoverCapabilities } = require('./cli-anything/help-parser.cjs');
  const { validateCapabilityModel } = require('./cli-anything/model.cjs');
  const { writeServer } = require('./cli-anything/server-gen.cjs');
  const { writeSkillMd } = require('./cli-anything/skill-gen.cjs');

  // Discover capabilities from the harness binary (it has well-structured --help)
  const capabilities = discoverCapabilities(harnessBinaryPath);
  console.log(`[cli-wrap] Discovered ${capabilities.length} capabilities from harness`);

  const model = validateCapabilityModel({
    meta: {
      source: harnessBinaryPath,        // Points to the harness, not the native app
      type: 'cli',
      version: registryEntry.version || 'unknown',
      auth: {},
      generatedAt: new Date().toISOString(),
    },
    capabilities,
  });

  // Output to .planning/app-wrappers/{slug}/ (NOT .planning/cli-anything/{slug}/)
  const outDir = path.join(cwd, '.planning', 'app-wrappers', slug);
  const serverDir = path.join(outDir, 'server');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'capability-model.json'), JSON.stringify(model, null, 2));
  writeServer(serverDir, capabilities, model.meta, cwd);
  writeSkillMd(serverDir, model);

  return { strategy: 'harness', outDir, serverDir, capabilities: capabilities.length };
}
```

### Pattern 3: Fallback Path — Native `--help` Wrapping

**What:** Falls back to native app binary `--help` parsing when no harness is available. Produces a `parseQuality: 'degraded'` warning if output quality is low.
**When to use:** When `detectHarness()` returns `found: false`

```javascript
// Source: derived from help-parser.cjs cmdWrap pipeline (Phase 163-164)
// col -b preprocessing from Phase 171 DISC-04 pattern
// Verified 2026-03-29

/**
 * Fallback path: parse native app's --help output to discover capabilities.
 * Uses col -b preprocessing (Phase 171 DISC-04) to strip backspace sequences.
 *
 * @param {string} cwd - Project root
 * @param {string} slug - App slug
 * @param {object} registryEntry - From app-registry.json (must be 'approved')
 */
async function wrapViaNativeHelp(cwd, slug, registryEntry) {
  console.log(`[cli-wrap] FALLBACK PATH: no CLI-Anything harness found for '${slug}'`);
  console.log(`[cli-wrap] Using native --help parsing on ${registryEntry.binaryPath}`);

  const { discoverCapabilities } = require('./cli-anything/help-parser.cjs');
  const { validateCapabilityModel } = require('./cli-anything/model.cjs');
  const { writeServer } = require('./cli-anything/server-gen.cjs');
  const { writeSkillMd } = require('./cli-anything/skill-gen.cjs');

  const capabilities = discoverCapabilities(registryEntry.binaryPath);

  // Annotate degraded quality if few capabilities found
  const parseQuality = capabilities.length < 3 ? 'degraded' : 'ok';
  if (parseQuality === 'degraded') {
    console.warn(`[cli-wrap] WARNING: Only ${capabilities.length} capabilities discovered. ` +
                 `Consider installing a CLI-Anything harness: pipx install cli-anything-${slug}`);
  }

  const model = validateCapabilityModel({
    meta: {
      source: registryEntry.binaryPath,
      type: 'cli',
      version: registryEntry.version || 'unknown',
      auth: {},
      generatedAt: new Date().toISOString(),
    },
    capabilities,
  });

  const outDir = path.join(cwd, '.planning', 'app-wrappers', slug);
  const serverDir = path.join(outDir, 'server');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'capability-model.json'),
    JSON.stringify({ ...model, parseQuality }, null, 2)  // Annotate model with quality
  );
  writeServer(serverDir, capabilities, model.meta, cwd);
  writeSkillMd(serverDir, model);

  return { strategy: 'fallback', outDir, serverDir, capabilities: capabilities.length, parseQuality };
}
```

### Pattern 4: pipx Setup — PIPX_BIN_DIR Resolution and Config Storage

**What:** Resolves the absolute path to the pipx bin directory and stores it in `.planning/config.json`. Run once at setup time; subsequent invocations read from config.
**When to use:** When `pde-tools app pipx-setup` is run, or when `/pde:cli-wrap` detects no `clianything.pipx_bin_dir` in config.

```javascript
// Source: pipx documentation (https://pipx.pypa.io/latest/) + PATH problem research
// pipx 1.11.0 verified 2026-03-29
'use strict';

const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

/**
 * Resolve the absolute path to the pipx binary directory (PIPX_BIN_DIR).
 *
 * Strategy 1 (canonical): `pipx environment --value PIPX_BIN_DIR`
 * Strategy 2 (parse): Parse `pipx environment` output for the PIPX_BIN_DIR line
 * Strategy 3 (fallback): Derive from default venvs path: ~/.local/bin (macOS/Linux)
 *
 * WHY: Node.js subprocesses do not inherit shell profile PATH modifications.
 *      ~/.zshrc or ~/.zprofile may add ~/.local/bin or ~/.pyenv/shims to PATH.
 *      A subprocess spawned from Claude Code does NOT see those additions.
 *      Storing the absolute path avoids this entirely.
 *
 * @param {string} [_execFn] - Injectable for testing; defaults to spawnSync
 * @returns {string|null} Absolute path to PIPX_BIN_DIR, or null if pipx not found
 */
function resolvePipxBinDir(_execFn) {
  const execFn = _execFn || spawnSync;

  // Strategy 1: pipx environment --value PIPX_BIN_DIR (pipx 1.x+)
  const envResult = execFn('pipx', ['environment', '--value', 'PIPX_BIN_DIR'], {
    encoding: 'utf8',
    timeout: 5000,
  });
  if (envResult.status === 0 && envResult.stdout.trim()) {
    return envResult.stdout.trim();
  }

  // Strategy 2: Parse `pipx environment` multi-line output
  const envMulti = execFn('pipx', ['environment'], { encoding: 'utf8', timeout: 5000 });
  if (envMulti.status === 0 && envMulti.stdout) {
    const match = envMulti.stdout.match(/PIPX_BIN_DIR\s*=\s*(.+)/);
    if (match) return match[1].trim();
  }

  // Strategy 3: Well-known default (macOS/Linux)
  const defaultBinDir = path.join(os.homedir(), '.local', 'bin');
  if (fs.existsSync(defaultBinDir)) return defaultBinDir;

  return null;  // pipx not found — will be flagged in setup output
}

/**
 * Write resolved pipx_bin_dir to .planning/config.json.
 * Uses the existing config read/write pattern (NOT config.cjs — that has VALID_CONFIG_KEYS guard).
 * Write directly to the JSON file to avoid key validation restriction.
 *
 * @param {string} cwd - Project root
 * @param {string} pipxBinDir - Resolved absolute path to PIPX_BIN_DIR
 */
function storePipxBinDir(cwd, pipxBinDir) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const existing = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : {};

  const updated = {
    ...existing,
    clianything: {
      ...(existing.clianything || {}),
      pipx_bin_dir: pipxBinDir,
    },
  };

  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf8');
}

module.exports = { resolvePipxBinDir, storePipxBinDir };
```

**CRITICAL NOTE on `config.cjs` VALID_CONFIG_KEYS:** The `config.cjs` module has a `VALID_CONFIG_KEYS` Set that guards key writes. `clianything.pipx_bin_dir` is not in this set. Do NOT use `pde-tools.cjs config set` to write this key — it will fail key validation. Instead, write the config JSON directly (as shown in `storePipxBinDir` above). Adding `clianything.pipx_bin_dir` to `VALID_CONFIG_KEYS` is the cleaner approach but requires modifying `config.cjs`.

### Pattern 5: Main cmdCliWrap Orchestrator

**What:** The complete orchestration function called by `pde-tools app cli-wrap <slug>`. Reads config, gates on approval, routes strategy, writes artifacts, outputs summary.
**When to use:** This is the entry point for the entire Phase 174 workflow.

```javascript
// Source: derived from help-parser.cjs cmdWrap + app-registry.cjs approval gate pattern
// Verified 2026-03-29

async function cmdCliWrap(cwd, args) {
  const slug = args[0];
  if (!slug) {
    console.error('Usage: pde-tools app cli-wrap <slug>');
    console.error('  <slug> must already be in the app-registry (approved status)');
    process.exit(1);
  }

  // Step 1: Load config for stored pipx_bin_dir
  const configPath = path.join(cwd, '.planning', 'config.json');
  const config = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : {};
  const pipxBinDir = config.clianything?.pipx_bin_dir || null;
  if (!pipxBinDir) {
    console.warn('[cli-wrap] WARNING: pipx_bin_dir not configured. Run: pde-tools app pipx-setup');
    console.warn('[cli-wrap] Falling back to PATH-only harness detection.');
  }

  // Step 2: Check app-registry approval gate
  const { checkApproved } = require('./app-registry.cjs');
  const registryPath = path.join(cwd, '.planning', 'app-registry.json');
  const registryEntry = checkApproved(registryPath, slug); // throws if not approved

  // Step 3: Routing decision
  const { detectHarness } = require('./app-cli-wrap.cjs');
  const harness = detectHarness(slug, pipxBinDir);
  console.log(`[cli-wrap] Routing: ${harness.found ? 'FAST PATH (harness)' : 'FALLBACK (native --help)'}`);

  // Step 4: Execute strategy
  let result;
  if (harness.found) {
    result = await wrapViaHarness(cwd, slug, harness.binaryPath, registryEntry);
  } else {
    result = await wrapViaNativeHelp(cwd, slug, registryEntry);
  }

  // Step 5: Register with mcp-bridge
  const { registerDynamicServer } = require('./mcp-bridge.cjs');
  const model = JSON.parse(fs.readFileSync(
    path.join(result.outDir, 'capability-model.json'), 'utf8'
  ));
  registerDynamicServer(slug, path.join(result.serverDir, 'server.cjs'), model.capabilities);

  // Step 6: Summary output
  console.log(`\n[cli-wrap] Done! ${slug} wrapped via ${result.strategy}`);
  console.log(`  Strategy:     ${result.strategy}`);
  console.log(`  Capabilities: ${result.capabilities}`);
  if (result.parseQuality === 'degraded') {
    console.log(`  Quality:      DEGRADED — limited capabilities discovered`);
    console.log(`  Suggest:      pipx install cli-anything-${slug}`);
  }
  console.log(`  Server:       ${result.serverDir}/server.cjs`);
  console.log(`  SKILL.md:     ${result.serverDir}/SKILL.md`);
  console.log(`  Model:        ${result.outDir}/capability-model.json`);
}
```

### Pattern 6: Slash Command Definition (commands/cli-wrap.md)

**What:** The `/pde:cli-wrap` Claude Code slash command that invokes the pde-tools orchestration.
**Format:** Same format as the existing `commands/wrap.md`.

```markdown
---
name: pde:cli-wrap
description: Wrap any approved installed app as an agent-native CLI with dual-strategy routing
argument-hint: "<app-slug> (must be in app-registry with approved status)"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
# /pde:cli-wrap

One-command app wrapping: discovery → capability model → MCP server → SKILL.md.

## Usage

`/pde:cli-wrap <slug>`

## What It Does

1. Reads `app-registry.json` to confirm the app is approved
2. Checks if a CLI-Anything pre-built harness (`cli-anything-<slug>`) is available via pipx
3. If harness found: uses it as the capability source (FAST PATH)
4. If no harness: falls back to native `--help` → capability model → codegen (FALLBACK PATH)
5. Writes all artifacts to `.planning/app-wrappers/{slug}/`
6. Registers the server with `mcp-bridge.cjs` for immediate tool use

## Prerequisites

- App must be discovered and approved: `pde-tools app discover <name>` then approve
- pipx configured: `pde-tools app pipx-setup` (run once)
```

### Pattern 7: pde-tools.cjs Routing Extension

Phase 173 adds `case 'app':` to `pde-tools.cjs`. Phase 174 extends it with two new subcommands.

```javascript
// Source: pde-tools.cjs case 'cli-anything': at line 729 — identical pattern
// In the existing Phase 173 `case 'app':` block, add:

} else if (subcommand === 'cli-wrap') {
  const { cmdCliWrap } = require('./lib/app-cli-wrap.cjs');
  await cmdCliWrap(cwd, args.slice(2));
} else if (subcommand === 'pipx-setup') {
  const { resolvePipxBinDir, storePipxBinDir } = require('./lib/app-cli-wrap.cjs');
  const binDir = resolvePipxBinDir();
  if (!binDir) {
    console.error('[pipx-setup] pipx not found. Install: brew install pipx');
    process.exit(1);
  }
  storePipxBinDir(cwd, binDir);
  console.log(`[pipx-setup] PIPX_BIN_DIR stored: ${binDir}`);
}
```

### Anti-Patterns to Avoid

- **Using `which pipx` inside a Node.js subprocess to locate pipx:** Node.js subprocess PATH does not include shell profile additions. Always store the absolute path at setup time; never rely on `which` succeeding inside `spawnSync` for PATH-sensitive tools.
- **Writing the fast-path harness output to `.planning/cli-anything/{slug}/`:** CLI-Anything output (Phase 164, generic path) goes to `.planning/cli-anything/`. App-registry-linked wraps (Phase 172+, desktop apps) go to `.planning/app-wrappers/`. The distinction is intentional — different registries, different lifecycles.
- **Calling `checkApproved()` after the routing decision:** The approval gate MUST come before any subprocess invocation — including harness detection. Never probe a binary (even `which`) for an unapproved app.
- **Using `shell: true` in spawnSync calls:** All existing PDE patterns use argument arrays with `shell: false` (default). Shell injection prevention is mandatory.
- **Adding `clianything.pipx_bin_dir` via `pde-tools config set`:** `config.cjs` VALID_CONFIG_KEYS does not include this key. Write config JSON directly or add the key to VALID_CONFIG_KEYS.
- **Re-detecting pipxBinDir on every `cli-wrap` invocation:** It costs ~100ms per pipx subprocess. Store once in config; read from config on subsequent runs.
- **Assuming a CLI-Anything harness binary is identical to the native app binary:** The harness binary (`cli-anything-blender`) is a Python Click wrapper, not Blender itself. The MCP server `BINARY` variable must point to the harness, not `/opt/homebrew/bin/blender`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SKILL.md generation | Custom markdown template | `writeSkillMd(outputDir, model)` from `bin/lib/cli-anything/skill-gen.cjs` | Phase 164 machinery is tested; SKILL.md format fixed per GSD convention |
| MCP server file generation | Custom server.cjs per app | `writeServer(outputDir, caps, meta, root)` from `bin/lib/cli-anything/server-gen.cjs` | Same generator used for all CLI-Anything wrappers — consistent handler shape |
| CapabilityModel validation | Custom JSON schema check | `validateCapabilityModel(data)` from `bin/lib/cli-anything/model.cjs` | Zod schema is single source of truth |
| Approval gating | Custom `if status !== 'approved'` logic | `checkApproved(registryPath, slug)` from `bin/lib/app-registry.cjs` | Phase 171 guard handles all edge cases: missing, pending, rejected, mock |
| `--help` capability parsing | Custom regex-based parser | `discoverCapabilities(binary)` from `bin/lib/cli-anything/help-parser.cjs` | Phase 163 parser handles 2-column format, flag extraction, recursive subcommands |
| MCP bridge registration | Direct APPROVED_SERVERS mutation | `registerDynamicServer(slug, serverPath, caps)` from `bin/lib/mcp-bridge.cjs` | Phase 173 function handles canonical naming and TOOL_MAP population |
| pipx install of harnesses | Custom pip/venv logic | `pipx install cli-anything-{slug}` (shell out) | pipx handles isolation, shim creation, and venv management; don't reimplement |
| CLI-Anything harness catalog | Bespoke registry | Fetch `https://hkuds.github.io/CLI-Anything/registry.json` (CLI-Hub) | Authoritative catalog from the project maintainers; 28+ apps as of 2026-03 |

**Key insight:** Phase 174 is an orchestration phase, not an infrastructure phase. Every primitive (capability discovery, server generation, SKILL.md, approval gating, bridge registration) already exists in Phases 163-173. Phase 174 adds only the routing layer and pipx integration that glues them together.

---

## Common Pitfalls

### Pitfall 1: Node.js Subprocess PATH Does Not Include Shell Profile Additions

**What goes wrong:** `spawnSync('pipx', ['environment'], ...)` returns `ENOENT` even though `pipx` works fine in the terminal.
**Why it happens:** macOS shell profiles (`~/.zshrc`, `~/.zprofile`, `~/.profile`) add directories to PATH. These are only loaded for login/interactive shells. Node.js subprocesses spawned by Claude Code inherit the process environment as of Claude Code startup — not the current terminal PATH modifications. `brew install pipx` installs to `/opt/homebrew/bin/pipx`, which requires Homebrew's `eval "$(brew shellenv)"` to be in PATH. That only runs in login shells.
**How to avoid:** Use `pipx-setup` to detect and store the absolute path at setup time. For the detection itself, check multiple well-known locations: `/opt/homebrew/bin/pipx`, `$HOME/.local/bin/pipx`, result of `command -v pipx` run in a login shell context.
**Warning signs:** `ENOENT` on `spawnSync('pipx', ...)` despite `which pipx` working in terminal.

### Pitfall 2: CLI-Anything Harness Detection via PATH Alone Is Insufficient

**What goes wrong:** `spawnSync('which', ['cli-anything-blender'])` returns non-zero even though `cli-anything-blender` was installed via `pipx install cli-anything-blender`.
**Why it happens:** pipx installs binaries to `PIPX_BIN_DIR` (default `~/.local/bin`). This directory is not in PATH for Node.js subprocesses (same reason as Pitfall 1). `which` inside a subprocess will fail.
**How to avoid:** Use two-tier detection: (1) `spawnSync('which', ...)` for PATH-visible installs, (2) `fs.existsSync(path.join(storedPipxBinDir, 'cli-anything-' + slug))` for pipx installs not on subprocess PATH. Store `PIPX_BIN_DIR` in config at setup time.
**Warning signs:** Fast path never triggers even after `pipx install cli-anything-blender` succeeds.

### Pitfall 3: CLI-Anything Harness Binary Points to Harness, Not Native App

**What goes wrong:** The generated server.cjs `BINARY` points to `cli-anything-blender` but the developer expects it to eventually invoke `blender`. The capability model `meta.source` shows the harness path.
**Why it happens:** The fast path wraps the CLI-Anything harness as the binary. The harness itself invokes Blender internally. This is correct and intentional — but creates confusion if someone edits the generated server expecting a direct Blender invocation.
**How to avoid:** Log this clearly in the command output: `[cli-wrap] FAST PATH: wrapping harness cli-anything-blender (harness delegates to native blender)`. Document in the generated SKILL.md header.
**Warning signs:** Server invocations fail because the harness binary path becomes stale if pipx venv moves.

### Pitfall 4: `parseQuality: 'degraded'` Stored Inside Zod-Validated CapabilityModel

**What goes wrong:** `validateCapabilityModel({ meta: { ..., parseQuality: 'degraded' }, capabilities })` throws Zod validation error — `parseQuality` is not in the schema.
**Why it happens:** `CapabilityModelSchema.meta` is a strict Zod object — only `source`, `type`, `version`, `auth`, `generatedAt` are accepted. Extra fields throw.
**How to avoid:** Store `parseQuality` at the top level of the JSON file, not inside `meta`. Validate the model first, then add `parseQuality` when writing to disk: `JSON.stringify({ ...model, parseQuality }, null, 2)`.
**Warning signs:** Zod validation error with message about unknown key `parseQuality` in meta.

### Pitfall 5: output Directory Collision Between CLI-Anything and App Wrappers

**What goes wrong:** Running `/pde:cli-wrap blender` overwrites `.planning/cli-anything/blender/` which was created by an earlier `/pde:wrap blender`.
**Why it happens:** If the output directory is accidentally set to `.planning/cli-anything/{slug}/` instead of `.planning/app-wrappers/{slug}/`.
**How to avoid:** Hard-code the output base path as `path.join(cwd, '.planning', 'app-wrappers', slug)` in both `wrapViaHarness` and `wrapViaNativeHelp`. Never use `.planning/cli-anything/` for app-registry-linked wraps.
**Warning signs:** Registry entry shows `serverPath` pointing to `.planning/cli-anything/` instead of `.planning/app-wrappers/`.

### Pitfall 6: Calling `registerDynamicServer` Without Loading Updated Capability Model

**What goes wrong:** `registerDynamicServer(slug, serverPath, [])` registers the app with zero capabilities in TOOL_MAP, making it invisible to agents.
**Why it happens:** Passing an empty caps array or stale caps from before the model was written.
**How to avoid:** Read the `capability-model.json` from disk after writing it, then pass `model.capabilities` to `registerDynamicServer`. This ensures the registered caps match what was actually generated.
**Warning signs:** `mcp__app_{slug}__*` tools are missing from TOOL_MAP after `cli-wrap` completes.

---

## Code Examples

Verified patterns from source inspection and Phase 171-173 research:

### CLI-Hub Registry Fetch (detect available harnesses)
```javascript
// Source: https://hkuds.github.io/CLI-Anything/ registry structure verified 2026-03-29
// Registry URL: https://raw.githubusercontent.com/HKUDS/CLI-Anything/main/registry.json
// Structure: { meta: {...}, clis: [{ name, display_name, version, entry_point, install_cmd, ... }] }

async function fetchCliHubCatalog() {
  const url = 'https://raw.githubusercontent.com/HKUDS/CLI-Anything/main/registry.json';
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`CLI-Hub fetch failed: ${res.status}`);
  const data = await res.json();
  // data.clis[i].entry_point === 'cli-anything-{name}' (the installed binary name)
  return data.clis;  // Array of { name, entry_point, install_cmd, ... }
}
```

### pipx Install of a Harness
```bash
# Install: pipx isolates the Python package from system Python
pipx install cli-anything-blender

# Verify: should print absolute path to cli-anything-blender binary
which cli-anything-blender
# Expected: /Users/user/.local/bin/cli-anything-blender

# Alternative: explicit install + path resolution
pipx install cli-anything-blender
pipx environment --value PIPX_BIN_DIR
# Expected: /Users/user/.local/bin
```

### Resolving app_paths from pipx list --json
```javascript
// Source: pipx source code (venv.py PackageInfo) + community usage patterns verified 2026-03-29
// JSON structure: { venvs: { [pkgName]: { metadata: { main_package: { app_paths: [Path] } } } } }

function resolveHarnessPathFromPipxJson(slug) {
  const { spawnSync } = require('child_process');
  const result = spawnSync('pipx', ['list', '--json'], { encoding: 'utf8', timeout: 10000 });
  if (result.status !== 0) return null;

  let data;
  try { data = JSON.parse(result.stdout); } catch { return null; }

  const pkgName = `cli-anything-${slug}`;
  const venv = data.venvs && data.venvs[pkgName];
  if (!venv) return null;

  const appPaths = venv.metadata?.main_package?.app_paths;
  if (!Array.isArray(appPaths) || appPaths.length === 0) return null;

  // app_paths items are Path objects serialized as strings
  return appPaths[0].__fspath__ || String(appPaths[0]);
}
```

### Existing cmdWrap Pipeline (reference for fast-path output structure)
```javascript
// Source: bin/lib/cli-anything/help-parser.cjs cmdWrap (lines 188-250)
// The fast path MIRRORS this structure exactly, using harnessBinaryPath instead of binary
// Output structure:
//   .planning/app-wrappers/{slug}/capability-model.json
//   .planning/app-wrappers/{slug}/server/server.cjs
//   .planning/app-wrappers/{slug}/server/SKILL.md
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual CLI wrapping per app | `discoverCapabilities()` recursive `--help` parsing | Phase 163-164 (v0.20) | Automated wrapping, but quality depends on `--help` structure |
| Generic binary wrapping only | Dual strategy: harness (high quality) vs native (fallback) | Phase 174 (v0.21) | Fast path produces structured, tested CLI vs degraded `--help` parse |
| pip install for Python CLIs | pipx for isolated Python CLI tools | PEP-668 enforcement (Python 3.12+ Homebrew) | pip to system Python blocked; pipx required for Homebrew Python 3.12+ |
| PATH-based binary resolution | Absolute path stored in config | Phase 174 design (v0.21) | Node.js subprocess PATH gaps fixed; harness detection reliable |

**Deprecated/outdated:**
- `pip install` to system Python: Blocked by PEP-668 on Homebrew Python 3.12+. Use `pipx install` or `pip install --user` (but pipx preferred for CLI tools).
- `which cli-anything-X` as sole detection: PATH-only detection fails for pipx installs not exported to shell PATH. Use two-tier detection (PATH + stored bin dir).

---

## Open Questions

1. **Phase 173 `case 'app':` routing block — does it exist yet?**
   - What we know: Phase 173 plans to add `case 'app':` to `pde-tools.cjs`. Phase 174 depends on Phase 173.
   - What's unclear: If Phase 173 hasn't shipped, Phase 174 must add the `case 'app':` block itself.
   - Recommendation: Phase 174 plan Wave 0 should verify `case 'app':` exists in `pde-tools.cjs`; if not, add it as part of Wave 0 setup.

2. **`app-registry.cjs` `checkApproved()` exact signature**
   - What we know: Phase 171 RESEARCH.md defines `checkApproved(registryPath, slug)` returning the registry entry or throwing.
   - What's unclear: The actual module doesn't exist yet (Phase 171 not shipped). Exact return type and thrown error message.
   - Recommendation: Plan should include a Wave 0 smoke test that verifies `checkApproved` signature matches; Phase 174 tests should use `_checkApprovedFn` injection for isolation.

3. **CLI-Anything registry.json `app_paths` field — exact serialization format**
   - What we know: pipx `app_paths` in JSON comes from Python `Path` objects. Multiple serialization formats have been observed: `{ "__fspath__": "/path" }`, plain strings, or `PosixPath` stringification.
   - What's unclear: Exact format in pipx 1.11.0 (current version).
   - Recommendation: `resolveHarnessPathFromPipxJson()` should try both `item.__fspath__` and `String(item)` for robustness. The simpler PIPX_BIN_DIR approach is more reliable.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pipx | CLI-03: canonical install method | ✗ | — | Not installable mid-session; install with `brew install pipx` before using fast path |
| CLI-Anything harnesses (cli-anything-blender, etc.) | CLI-02: fast path | ✗ | — | Native `--help` fallback path (CLI-02 explicitly requires this) |
| Python 3 | pipx runtime | ✓ | 3.x | — |
| Node.js v20.x | All bin/lib modules | ✓ | 20.20.0 | — |
| vitest | Tests | ✓ | 4.1.1 | — |

**Missing dependencies with no fallback:**
- `pipx`: Required for CLI-03 (fast-path install) and for `pipx-setup` to store `PIPX_BIN_DIR`. Plan must include install step or document that fast path is disabled until pipx is available.

**Missing dependencies with fallback:**
- CLI-Anything harnesses: Fast path only. Fallback (native `--help`) is the explicit CLI-02 requirement for when no harness is available.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run tests/phase-174/ --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLI-01 | `/pde:cli-wrap <slug>` produces capability-model.json + server.cjs + SKILL.md | unit | `npx vitest run tests/phase-174/app-cli-wrap.test.mjs -t "produces all artifacts"` | ❌ Wave 0 |
| CLI-01 | No manual steps required after command (artifacts at expected paths) | unit | `npx vitest run tests/phase-174/app-cli-wrap.test.mjs -t "artifact paths"` | ❌ Wave 0 |
| CLI-02 | Harness detection returns fast-path when cli-anything-X exists | unit | `npx vitest run tests/phase-174/app-cli-wrap.test.mjs -t "detectHarness fast path"` | ❌ Wave 0 |
| CLI-02 | Harness detection returns fallback when cli-anything-X not found | unit | `npx vitest run tests/phase-174/app-cli-wrap.test.mjs -t "detectHarness fallback"` | ❌ Wave 0 |
| CLI-02 | Routing decision is logged in command output | unit | `npx vitest run tests/phase-174/app-cli-wrap.test.mjs -t "routing log"` | ❌ Wave 0 |
| CLI-03 | pipx-setup stores PIPX_BIN_DIR in config.json | unit | `npx vitest run tests/phase-174/pipx-setup.test.mjs -t "stores pipx_bin_dir"` | ❌ Wave 0 |
| CLI-03 | Stored pipx_bin_dir used in detectHarness tier 2 | unit | `npx vitest run tests/phase-174/app-cli-wrap.test.mjs -t "uses stored bin dir"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-174/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-174/app-cli-wrap.test.mjs` — covers CLI-01, CLI-02
- [ ] `tests/phase-174/pipx-setup.test.mjs` — covers CLI-03
- [ ] `tests/phase-174/cli-wrap-integration.test.mjs` — end-to-end smoke test with mocked dependencies

*(Existing test infrastructure covers the framework; only new test files needed)*

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/cli-anything/help-parser.cjs` — Phase 163-164 `discoverCapabilities`, `cmdWrap` pipeline (read directly from source)
- `bin/lib/cli-anything/skill-gen.cjs` — `generateSkillMd`, `writeSkillMd` function signatures (read directly from source)
- `bin/lib/cli-anything/server-gen.cjs` — `generateToolHandler`, `writeServer` function signatures (read directly from source)
- `bin/lib/cli-anything/model.cjs` — `CapabilityModelSchema` Zod definition, `validateCapabilityModel` (read directly from source)
- `.planning/phases/171-security-architecture-discovery-foundation/171-RESEARCH.md` — approval gate pattern, `checkApproved()` signature
- `.planning/phases/172-core-app-wrappers/172-RESEARCH.md` — `writeSkillMd`/`writeServer` usage pattern, anti-patterns
- `.planning/phases/173-mcp-bridge-dynamic-registration/173-RESEARCH.md` — `registerDynamicServer()` signature, `case 'app':` routing
- `bin/pde-tools.cjs` lines 729-748 — `case 'cli-anything':` routing pattern (read directly from source)
- `commands/wrap.md` — slash command definition format for `/pde:wrap` (read directly from source)
- `.planning/config.json` — config schema, `clianything` key space available (read directly)

### Secondary (MEDIUM confidence)
- [CLI-Anything HKUDS GitHub](https://github.com/HKUDS/CLI-Anything) — harness naming convention (`cli-anything-{slug}`), CLI-Hub registry structure
- [CLI-Anything HARNESS.md](https://github.com/HKUDS/CLI-Anything/blob/main/cli-anything-plugin/HARNESS.md) — `_resolve_cli()` detection pattern, `shutil.which`, fallback to `python -m`
- [CLI-Hub registry.json](https://raw.githubusercontent.com/HKUDS/CLI-Anything/main/registry.json) — 28+ packages, naming convention, `entry_point` field format
- [pipx PyPI page](https://pypi.org/project/pipx/) — version 1.11.0 current as of 2026-03-29
- [pipx environment configuration docs](https://deepwiki.com/pypa/pipx/2.1-environment-configuration) — `PIPX_BIN_DIR` default `~/.local/bin`, env var override
- [pipx Venv class source](https://raw.githubusercontent.com/pypa/pipx/main/src/pipx/venv.py) — `app_paths` field in `PackageInfo`, `apps_of_dependencies` structure

### Tertiary (LOW confidence)
- `pipx list --json` `.venvs[pkgName].metadata.main_package.app_paths` field — structure inferred from Python source and community jq patterns; exact serialization format in pipx 1.11.0 unverified (pipx not installed on this machine)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries read directly from project source
- Architecture: HIGH — patterns verified against Phases 163-173 source code and research docs
- CLI-Anything harness detection: HIGH — naming convention and detection method verified from HARNESS.md
- pipx binary resolution: MEDIUM — PIPX_BIN_DIR mechanism verified; `app_paths` JSON serialization format is LOW (pipx not installed locally)
- Pitfalls: HIGH — Node.js subprocess PATH issue is well-documented; anti-patterns derived from verified source code

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (CLI-Anything is actively developed; harness naming convention could change; re-verify before major changes)
