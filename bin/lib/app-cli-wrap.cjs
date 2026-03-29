'use strict';

/**
 * app-cli-wrap.cjs — Dual-strategy CLI-Anything router
 *
 * Implements the core routing logic for Phase 174:
 * - detectHarness: 3-tier harness binary detection (PATH, pipxBinDir, well-known)
 * - wrapViaHarness: Fast path using pre-built CLI-Anything harness binary
 * - wrapViaNativeHelp: Fallback path using native --help parsing
 * - cmdCliWrap: Main orchestrator (approval gate → detect → wrap → register)
 * - resolvePipxBinDir: PIPX_BIN_DIR resolution via 3 strategies
 * - storePipxBinDir: Direct config.json write (bypasses config.cjs key validation)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

// ─── detectHarness ────────────────────────────────────────────────────────────

/**
 * Three-tier harness binary detection.
 *
 * Tier 1: Check PATH via spawnSync('which', ...)
 * Tier 2: Check pipxBinDir if provided
 * Tier 3: Check well-known dirs (~/.local/bin, /usr/local/bin)
 *
 * @param {string} slug - App slug (e.g. 'blender')
 * @param {string|null} pipxBinDir - Path to pipx bin dir from config, or null
 * @returns {{ found: boolean, binaryPath: string|null }}
 */
function detectHarness(slug, pipxBinDir) {
  const binaryName = 'cli-anything-' + slug;

  // Tier 1: PATH check via which
  const whichResult = spawnSync('which', [binaryName], { encoding: 'utf8', timeout: 3000 });
  if (whichResult.status === 0 && whichResult.stdout && whichResult.stdout.trim()) {
    return { found: true, binaryPath: whichResult.stdout.trim() };
  }

  // Tier 2: Explicit pipxBinDir
  if (pipxBinDir) {
    const candidate = path.join(pipxBinDir, binaryName);
    if (fs.existsSync(candidate)) {
      return { found: true, binaryPath: candidate };
    }
  }

  // Tier 3: Well-known dirs
  const wellKnown = [path.join(os.homedir(), '.local', 'bin'), '/usr/local/bin'];
  for (const dir of wellKnown) {
    const candidate = path.join(dir, binaryName);
    if (fs.existsSync(candidate)) {
      return { found: true, binaryPath: candidate };
    }
  }

  return { found: false, binaryPath: null };
}

// ─── wrapViaHarness ───────────────────────────────────────────────────────────

/**
 * Fast path: wrap using a pre-built CLI-Anything harness binary.
 *
 * @param {string} cwd - Project root
 * @param {string} slug - App slug
 * @param {string} harnessBinaryPath - Path to cli-anything-<slug> binary
 * @param {object} registryEntry - Approved registry entry
 * @returns {{ strategy: string, outDir: string, serverDir: string, capabilities: number }}
 */
async function wrapViaHarness(cwd, slug, harnessBinaryPath, registryEntry) {
  console.log('[cli-wrap] FAST PATH: using CLI-Anything harness at ' + harnessBinaryPath);

  const { discoverCapabilities } = require('./cli-anything/help-parser.cjs');
  const { validateCapabilityModel } = require('./cli-anything/model.cjs');
  const { writeServer } = require('./cli-anything/server-gen.cjs');
  const { writeSkillMd } = require('./cli-anything/skill-gen.cjs');

  const capabilities = discoverCapabilities(harnessBinaryPath);

  const modelData = {
    meta: {
      source: harnessBinaryPath,
      type: 'cli',
      version: registryEntry.version || 'unknown',
      auth: {},
      generatedAt: new Date().toISOString(),
    },
    capabilities,
  };

  const model = validateCapabilityModel(modelData);

  const outDir = path.join(cwd, '.planning', 'app-wrappers', slug);
  fs.mkdirSync(outDir, { recursive: true });

  // Write capability-model.json
  fs.writeFileSync(path.join(outDir, 'capability-model.json'), JSON.stringify(model, null, 2));

  const serverDir = path.join(outDir, 'server');
  fs.mkdirSync(serverDir, { recursive: true });

  writeServer(serverDir, capabilities, model.meta, cwd);
  writeSkillMd(serverDir, model);

  return { strategy: 'harness', outDir, serverDir, capabilities: capabilities.length };
}

// ─── wrapViaNativeHelp ────────────────────────────────────────────────────────

/**
 * Fallback path: wrap using native --help parsing from the app binary itself.
 *
 * @param {string} cwd - Project root
 * @param {string} slug - App slug
 * @param {object} registryEntry - Approved registry entry (must have binaryPath)
 * @returns {{ strategy: string, outDir: string, serverDir: string, capabilities: number, parseQuality: string }}
 */
async function wrapViaNativeHelp(cwd, slug, registryEntry) {
  console.log("[cli-wrap] FALLBACK PATH: no CLI-Anything harness found for '" + slug + "'");

  const { discoverCapabilities } = require('./cli-anything/help-parser.cjs');
  const { validateCapabilityModel } = require('./cli-anything/model.cjs');
  const { writeServer } = require('./cli-anything/server-gen.cjs');
  const { writeSkillMd } = require('./cli-anything/skill-gen.cjs');

  const capabilities = discoverCapabilities(registryEntry.binaryPath);

  // parseQuality: fewer than 3 capabilities is degraded
  const parseQuality = capabilities.length < 3 ? 'degraded' : 'ok';

  const modelData = {
    meta: {
      source: registryEntry.binaryPath,
      type: 'cli',
      version: registryEntry.version || 'unknown',
      auth: {},
      generatedAt: new Date().toISOString(),
    },
    capabilities,
  };

  // Validate the model (parseQuality is NOT inside meta — Zod schema is strict)
  const model = validateCapabilityModel(modelData);

  const outDir = path.join(cwd, '.planning', 'app-wrappers', slug);
  fs.mkdirSync(outDir, { recursive: true });

  // Write capability-model.json with parseQuality at top level OUTSIDE the validated model
  fs.writeFileSync(
    path.join(outDir, 'capability-model.json'),
    JSON.stringify({ ...model, parseQuality }, null, 2)
  );

  const serverDir = path.join(outDir, 'server');
  fs.mkdirSync(serverDir, { recursive: true });

  writeServer(serverDir, capabilities, model.meta, cwd);
  writeSkillMd(serverDir, model);

  return { strategy: 'fallback', outDir, serverDir, capabilities: capabilities.length, parseQuality };
}

// ─── cmdCliWrap ───────────────────────────────────────────────────────────────

/**
 * Main orchestrator: approval gate → harness detect → wrap → MCP register.
 *
 * @param {string} cwd - Project root
 * @param {string[]} args - CLI args (args[0] = slug)
 */
async function cmdCliWrap(cwd, args) {
  const slug = args[0];
  if (!slug) {
    console.error('Usage: pde-tools app cli-wrap <slug>');
    process.exit(1);
  }

  // Load pipx_bin_dir from config (do not use config.cjs — clianything key not in the config allowlist)
  const { safeReadFile } = require('./core.cjs');
  const configPath = path.join(cwd, '.planning', 'config.json');
  let pipxBinDir = null;
  const configRaw = safeReadFile(configPath);
  if (configRaw) {
    try {
      const config = JSON.parse(configRaw);
      pipxBinDir = (config.clianything && config.clianything.pipx_bin_dir) || null;
    } catch (_) {
      // malformed config — continue without pipxBinDir
    }
  }
  if (!pipxBinDir) {
    console.warn('[cli-wrap] No pipx_bin_dir configured. Run: pde-tools app pipx-setup');
  }

  // SECURITY GATE: checkApproved BEFORE any harness detection
  const { checkApproved } = require('./app-registry.cjs');
  const registryPath = path.join(cwd, '.planning', 'app-registry.json');
  const registryEntry = checkApproved(registryPath, slug);

  // Route: harness fast path or fallback
  const harness = detectHarness(slug, pipxBinDir);
  console.log('[cli-wrap] Harness detection: ' + (harness.found ? 'FOUND at ' + harness.binaryPath : 'NOT FOUND — using native --help'));

  let result;
  if (harness.found) {
    result = await wrapViaHarness(cwd, slug, harness.binaryPath, registryEntry);
  } else {
    result = await wrapViaNativeHelp(cwd, slug, registryEntry);
  }

  // Read generated model back from disk and register with MCP bridge
  const { registerDynamicServer } = require('./mcp-bridge.cjs');
  const modelPath = path.join(result.outDir, 'capability-model.json');
  const modelRaw = safeReadFile(modelPath);
  let caps = [];
  if (modelRaw) {
    try {
      caps = JSON.parse(modelRaw).capabilities || [];
    } catch (_) {
      console.warn('[cli-wrap] Warning: capability-model.json is malformed for ' + slug);
    }
  }

  const serverPath = path.join(result.serverDir, 'server.cjs');
  registerDynamicServer(slug, serverPath, caps);

  // Summary output
  console.log('\n[cli-wrap] Done: ' + slug);
  console.log('  strategy: ' + result.strategy);
  console.log('  capabilities: ' + result.capabilities);
  console.log('  capability-model: ' + modelPath);
  console.log('  server: ' + serverPath);
  if (result.parseQuality === 'degraded') {
    console.warn('  WARNING: parseQuality=degraded — only ' + result.capabilities + ' capabilities discovered');
    console.warn('  Consider installing CLI-Anything harness: pipx install cli-anything-' + slug);
  }
}

// ─── resolvePipxBinDir ────────────────────────────────────────────────────────

/**
 * Resolve PIPX_BIN_DIR via 3 strategies.
 *
 * @param {Function} [_execFn] - Injectable spawnSync-like function for testing
 * @returns {string|null}
 */
function resolvePipxBinDir(_execFn) {
  const execFn = _execFn || function defaultExec(cmd, args, opts) {
    return spawnSync(cmd, args, opts || { encoding: 'utf8', timeout: 5000 });
  };

  // Strategy 1: pipx environment --value PIPX_BIN_DIR
  const r1 = execFn('pipx', ['environment', '--value', 'PIPX_BIN_DIR'], { encoding: 'utf8', timeout: 5000 });
  if (r1.status === 0 && r1.stdout && r1.stdout.trim()) {
    return r1.stdout.trim();
  }

  // Strategy 2: pipx environment (full output), parse PIPX_BIN_DIR=...
  const r2 = execFn('pipx', ['environment'], { encoding: 'utf8', timeout: 5000 });
  if (r2.status === 0 && r2.stdout) {
    const match = r2.stdout.match(/PIPX_BIN_DIR\s*=\s*(.+)/);
    if (match && match[1] && match[1].trim()) {
      return match[1].trim();
    }
  }

  // Strategy 3: Well-known directory
  const wellKnown = path.join(os.homedir(), '.local', 'bin');
  if (fs.existsSync(wellKnown)) {
    return wellKnown;
  }

  return null;
}

// ─── storePipxBinDir ──────────────────────────────────────────────────────────

/**
 * Write pipx_bin_dir directly to .planning/config.json.
 * Does NOT use config.cjs — clianything.pipx_bin_dir is not in the config key allowlist.
 *
 * @param {string} cwd - Project root
 * @param {string} pipxBinDir - Resolved pipx bin directory path
 */
function storePipxBinDir(cwd, pipxBinDir) {
  const configPath = path.join(cwd, '.planning', 'config.json');

  let existing = {};
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    existing = JSON.parse(raw);
  } catch (_) {
    // File doesn't exist or is malformed — start fresh
  }

  const updated = {
    ...existing,
    clianything: {
      ...(existing.clianything || {}),
      pipx_bin_dir: pipxBinDir,
    },
  };

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2));
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  detectHarness,
  wrapViaHarness,
  wrapViaNativeHelp,
  cmdCliWrap,
  resolvePipxBinDir,
  storePipxBinDir,
};
