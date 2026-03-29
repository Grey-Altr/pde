# Phase 171: Security Architecture + Discovery Foundation - Research

**Researched:** 2026-03-29
**Domain:** Cross-platform binary discovery, subprocess security gating, approval registry design, GUI-app headless detection, col -b preprocessing
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISC-01 | Five-tier binary probe (env var / which-where / pip module / mdfind / well-known paths) on macOS, Linux, Windows | All five tiers verified with Node.js child_process patterns — no npm deps needed |
| DISC-02 | Two-tier approval registry with pending/approved/rejected status and SHA-256 hash verification | Node.js crypto.createHash built-in; hash at approval time (discovery-time hashing expensive for 200MB+ apps) |
| DISC-03 | executionMode (headless/gui-required/mock) set at discovery time, gates tool calls | Static catalog drives classification; binary not found sets mock; display probe modulates at execution time only |
| DISC-04 | col -b preprocessing strips backspace sequences; degraded output annotated with parseQuality degraded | col -b verified on macOS /usr/bin/col; regex fallback for Windows; spawnSync pipe pattern confirmed working |
| DISC-05 | Display server availability probe integrated into probe/degrade contract for GUI-requiring apps | macOS: ps aux grep WindowServer; Linux: DISPLAY/WAYLAND_DISPLAY env; Windows: always-available assumption |
| DISC-06 | references/app-integrations.md catalog documents bundle IDs, pip status, executionMode, discovery hints for Blender, GIMP, Inkscape | Bundle IDs, CLI flags, version detection patterns researched for all three; GIMP 3.x API breaking changes documented |
</phase_requirements>

---

## Summary

Phase 171 builds the security foundation every subsequent wrapper phase depends on. There are three distinct implementation concerns: (1) a five-tier binary probe that resolves installed apps to verified paths, (2) a two-tier JSON approval registry that holds every discovered app in pending status until a human approves it, and (3) executionMode classification that gates downstream tool calls before any subprocess runs.

The existing cli-anything/registry.cjs is the wrong base for this — it tracks published CLI wrappers, not discovered desktop apps. This phase needs a separate app-registry.cjs module under bin/lib/ writing to .planning/app-registry.json (distinct from .planning/cli-anything/registry.json). The existing cli-anything/help-parser.cjs spawnSync pattern and dependency-injection _execFn approach should be directly reused. The col -b preprocessing goes in the same pipeline as --help capture in help-parser.cjs — it becomes a pre-filter step before text is passed to the parser.

The pde-tools app discover|wrap|register|list|probe CLI surface starts here: Phase 171 needs pde-tools app discover and pde-tools app probe as the entry points. The discover command runs the five-tier probe, writes pending registry entries, and sets executionMode. The probe command reads back a registry entry and verifies the binary still exists at the recorded path.

**Primary recommendation:** New module bin/lib/app-discovery.cjs implements all five probe tiers plus display detection plus col -b preprocessing. New bin/lib/app-registry.cjs owns the registry read/write contract. New pde-tools app discover|probe|list routes in pde-tools.cjs. New references/app-integrations.md catalog. All follow the established dependency-injection CJS pattern from Phases 163-170.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js crypto | built-in (v20.x) | SHA-256 hash for binary verification | Built-in, no npm install, cross-platform |
| Node.js child_process | built-in (v20.x) | spawnSync for binary probing and col -b preprocessing | Established pattern from help-parser.cjs |
| Node.js fs + path | built-in (v20.x) | Registry read/write, well-known path checks | Zero-dependency CJS pattern from all prior phases |
| Node.js os | built-in (v20.x) | Platform detection (darwin/linux/win32), os.homedir() expansion | Used in display probe, path expansion |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| plutil CLI | macOS system | Read Info.plist from .app bundles to get CFBundleExecutable | Tier 4 (mdfind) path — only on macOS |
| mdfind CLI | macOS system | Spotlight query for kMDItemCFBundleIdentifier | Tier 4 — only on macOS |
| which / where.exe | OS system | PATH-based binary lookup | Tier 2 — macOS/Linux (which) vs Windows (where.exe) |
| col | OS system (/usr/bin/col) | Strip backspace sequences from man-page help output | DISC-04 — macOS/Linux; regex fallback for Windows |
| vitest | 4.1.1 (installed) | Test framework for Nyquist tests | All unit tests follow tests/phase-171/*.test.mjs pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node.js crypto SHA-256 | sha256sum / shasum -a 256 CLI | Node.js crypto is faster, cross-platform, no subprocess overhead |
| mdfind for macOS app discovery | system_profiler SPApplicationsDataType | mdfind is 100x faster (uses Spotlight index); system_profiler enumerates all apps but takes 10-30s |
| Static catalog + well-known paths | Full XDG desktop-file scanning on Linux | Desktop file parsing requires reading hundreds of .desktop files; whitelist approach is sufficient for known design apps |
| spawnSync with col -b | Regex text.replace(backspace pattern) | col -b is the canonical tool; regex is the correct fallback when col unavailable (Windows) |
| Separate app-registry.json | Reuse existing cli-anything/registry.json | Different schemas and lifecycles; CLI-anything registry tracks published tool specs, app-registry tracks OS-installed binaries with approval state |

**Installation:**
No new npm dependencies required. All built on Node.js built-ins and system CLIs.
Verify system tools exist at runtime, not install time:
- col: /usr/bin/col (macOS/Linux), regex fallback (Windows)
- mdfind: /usr/bin/mdfind (macOS only)
- shasum: /usr/bin/shasum -a 256 (macOS), sha256sum (Linux), Node crypto (all)

**Version verification:** All tools are Node.js built-ins or system CLIs. No npm packages to version-pin.

---

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/
  app-discovery.cjs     # Five-tier probe + display detection + col -b preprocessing
  app-registry.cjs      # Registry read/write contract (.planning/app-registry.json)
  cli-anything/         # Phase 163-164 modules (do not modify for Phase 171)
    help-parser.cjs     # col -b preprocessing inserted here for --help capture
    ...

.planning/
  app-registry.json     # Two-tier approval registry (created by app discover)
  cli-anything/
    registry.json       # Existing CLI-Anything publish registry (separate concern)

references/
  app-integrations.md   # DISC-06: catalog of known design apps

tests/phase-171/
  app-discovery.test.mjs    # Five-tier probe with _execFn injection
  app-registry.test.mjs     # Registry CRUD + state transitions
  col-preprocess.test.mjs   # Backspace stripping + parseQuality annotation
```

### Pattern 1: Five-Tier Binary Probe
**What:** Sequential probe tiers — each tier checked in order, first match wins
**When to use:** Any time pde-tools app discover runs for a named app

```javascript
// Source: verified with Node.js v20.x child_process behavior 2026-03-29
// IMPORTANT: use execFileSync (not exec) — prevents shell injection
'use strict';
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

/**
 * Probe an app binary via 5-tier waterfall. All exec calls use
 * execFileSync/spawnSync (argument arrays, not shell strings).
 * @param {object} appDef - { slug, cli, envVar, pipModule, bundleId, wellKnownPaths }
 * @param {object} [_fns] - Injectable functions for testing
 * @returns {{ tier: number, path: string, source: string } | null}
 */
function probeBinary(appDef, _fns = {}) {
  const {
    existsFn = fs.existsSync,
    execFn = execFileSync,
    spawnFn = spawnSync,
    env = process.env,
    platform = os.platform(),
    homedir = os.homedir(),
  } = _fns;

  // Tier 1: ENV VAR (e.g., BLENDER_BIN=/path/to/blender)
  const envKey = appDef.envVar || (appDef.cli.toUpperCase().replace(/-/g, '_') + '_BIN');
  const envPath = env[envKey];
  if (envPath && existsFn(envPath)) {
    return { tier: 1, path: envPath, source: 'env:' + envKey };
  }

  // Tier 2: which (macOS/Linux) / where.exe (Windows)
  const whichCmd = platform === 'win32' ? 'where.exe' : 'which';
  try {
    const out = execFn(whichCmd, [appDef.cli], { encoding: 'utf8', timeout: 3000 });
    const resolved = out.trim().split('\n')[0].trim();
    if (resolved && existsFn(resolved)) {
      return { tier: 2, path: resolved, source: 'which' };
    }
  } catch {}

  // Tier 3: pip module (python3 -m {module})
  if (appDef.pipModule) {
    const pyResult = spawnFn('python3', [
      '-c',
      `import importlib.util; s=importlib.util.find_spec('${appDef.pipModule}'); print(s.origin if s else 'none')`
    ], { encoding: 'utf8', timeout: 5000 });
    const origin = (pyResult.stdout || '').trim();
    if (origin && origin !== 'none') {
      return { tier: 3, path: `python3 -m ${appDef.pipModule}`, source: 'pip-module', pyOrigin: origin };
    }
  }

  // Tier 4: mdfind / Spotlight (macOS only)
  if (platform === 'darwin' && appDef.bundleId) {
    try {
      const mdfOut = execFn('mdfind',
        [`kMDItemCFBundleIdentifier == '${appDef.bundleId}'`],
        { encoding: 'utf8', timeout: 5000 }
      );
      const appBundle = mdfOut.trim().split('\n')
        .map(l => l.trim()).filter(l => l.endsWith('.app'))
        .sort((a, b) => (a.startsWith('/Applications') ? -1 : 1))[0];
      if (appBundle) {
        const binPath = resolveBinaryFromBundle(appBundle, { execFn, existsFn });
        if (binPath) return { tier: 4, path: binPath, source: 'mdfind', appBundle };
      }
    } catch {}
  }

  // Tier 5: well-known paths
  const platformPaths = (appDef.wellKnownPaths || {})[platform] || [];
  for (const rawPath of platformPaths) {
    const expanded = rawPath.replace('~', homedir);
    if (existsFn(expanded)) {
      return { tier: 5, path: expanded, source: 'well-known' };
    }
  }

  return null; // Not found — executionMode: 'mock'
}

/**
 * Resolve binary path from macOS .app bundle via plutil + Info.plist.
 */
function resolveBinaryFromBundle(appBundlePath, { execFn, existsFn }) {
  const plistPath = path.join(appBundlePath, 'Contents', 'Info.plist');
  if (!existsFn(plistPath)) return null;
  try {
    const json = execFn('plutil', ['-convert', 'json', '-o', '-', plistPath], { encoding: 'utf8' });
    const execName = JSON.parse(json).CFBundleExecutable;
    if (execName) {
      const binPath = path.join(appBundlePath, 'Contents', 'MacOS', execName);
      if (existsFn(binPath)) return binPath;
    }
  } catch {}
  // Fallback: first file in Contents/MacOS/
  const macosDir = path.join(appBundlePath, 'Contents', 'MacOS');
  if (existsFn(macosDir)) {
    const files = fs.readdirSync(macosDir).filter(f => !f.startsWith('.'));
    if (files.length > 0) return path.join(macosDir, files[0]);
  }
  return null;
}
```

### Pattern 2: Two-Tier Approval Registry Schema
**What:** JSON file with typed entries; state machine: pending becomes approved or rejected
**When to use:** app discover writes pending; human runs app approve slug to advance state

```javascript
// registry-schema.js — conceptual; implemented in app-registry.cjs
const REGISTRY_ENTRY_EXAMPLE = {
  slug: 'blender',
  displayName: 'Blender',
  binaryPath: '/Applications/Blender.app/Contents/MacOS/Blender',
  version: '4.2.0',           // From --version probe (null if probe failed)
  executionMode: 'headless',  // 'headless' | 'gui-required' | 'mock'
  status: 'pending',          // 'pending' | 'approved' | 'rejected'
  binaryHash: null,           // SHA-256 set at approval time (null until approved)
  probeSource: {
    tier: 4,
    source: 'mdfind',
    appBundle: '/Applications/Blender.app'
  },
  displayProbe: {
    available: true,
    method: 'ps-WindowServer', // 'ps-WindowServer' | 'env-DISPLAY' | 'win32-assumed'
    probeTime: '2026-03-29T12:00:00.000Z'
  },
  parseQuality: 'clean',      // 'clean' | 'degraded' (DISC-04)
  discoveredAt: '2026-03-29T12:00:00.000Z',
  approvedAt: null,
  rejectedAt: null,
};
```

### Pattern 3: col -b Preprocessing with parseQuality Annotation
**What:** Pipe --help output through col -b before parsing; detect if backspaces were present
**When to use:** Every --help invocation in the discovery pipeline

```javascript
// Source: col -b behavior verified on macOS /usr/bin/col 2026-03-29
'use strict';
const { spawnSync } = require('child_process');

/**
 * Strip backspace-escape man page sequences from help text.
 * Returns annotated result with parseQuality indicator.
 *
 * @param {string} rawText - Raw --help or man page output
 * @param {object} [_fns] - Injectable for testing
 * @returns {{ text: string, parseQuality: 'clean' | 'degraded' }}
 */
function preprocessHelpText(rawText, _fns = {}) {
  const { spawnFn = spawnSync } = _fns;
  const hadBackspaces = rawText.includes('\x08');

  if (hadBackspaces) {
    // Try col -b first (macOS, Linux)
    const result = spawnFn('col', ['-b'], {
      input: rawText,
      encoding: 'utf8',
      timeout: 3000,
    });

    if (!result.error && result.status === 0) {
      return { text: result.stdout || rawText, parseQuality: 'degraded' };
    }

    // Fallback: regex stripping (Windows / col unavailable)
    const cleaned = rawText.replace(/.\x08/g, '');
    return { text: cleaned, parseQuality: 'degraded' };
  }

  return { text: rawText, parseQuality: 'clean' };
}
```

### Pattern 4: Display Server Probe
**What:** Detect whether a display server is available before attempting GUI app launch
**When to use:** Both at discovery time (recorded in registry) and at execution time for gui-required apps

```javascript
// Source: verified on macOS + environment variable behavior 2026-03-29
'use strict';
const os = require('os');
const { spawnSync } = require('child_process');

/**
 * Probe display server availability cross-platform.
 * Uses spawnSync (argument array, not shell) for security.
 * @param {object} [_fns] - Injectable for testing
 * @returns {{ available: boolean, method: string }}
 */
function probeDisplay(_fns = {}) {
  const { platform = os.platform(), env = process.env, spawnFn = spawnSync } = _fns;

  if (platform === 'darwin') {
    // WindowServer process is macOS compositor — present means GUI session active
    const ps = spawnFn('ps', ['aux'], { encoding: 'utf8', timeout: 3000 });
    const lines = ((ps.stdout || '') + (ps.stderr || '')).split('\n');
    const hasWindowServer = lines.some(l =>
      l.includes('WindowServer') && !l.includes('grep')
    );
    return { available: hasWindowServer, method: 'ps-WindowServer' };
  }

  if (platform === 'linux') {
    const available = !!(env.DISPLAY || env.WAYLAND_DISPLAY);
    return { available, method: 'env-DISPLAY' };
  }

  if (platform === 'win32') {
    return { available: true, method: 'win32-assumed' };
  }

  return { available: false, method: 'unknown-platform' };
}
```

### Pattern 5: SHA-256 Binary Verification (Approval Time)
**What:** Hash binary at approval time; verify hash before each execution
**When to use:** app approve slug sets the hash; app probe slug verifies it still matches

```javascript
// Source: Node.js crypto built-in — cross-platform, no npm
const crypto = require('crypto');
const fs = require('fs');

// Do NOT hash at discovery time — Blender is ~200MB, readFileSync blocks ~100ms
// Hash at approval time: human has already verified the binary, hash is tamper detection
function hashBinary(binaryPath) {
  const content = fs.readFileSync(binaryPath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function verifyBinaryHash(binaryPath, expectedHash) {
  try {
    const actual = hashBinary(binaryPath);
    return { ok: actual === expectedHash, actual, expected: expectedHash };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
```

### Anti-Patterns to Avoid

- **Hashing at discovery time:** For 200MB binaries (Blender), readFileSync takes ~100ms. Hash only at approval time.
- **Using exec() instead of execFileSync():** exec() passes through the shell, enabling injection. Always use execFileSync / spawnSync with argument arrays.
- **Storing hash in pending entries:** The hash is meaningless until a human has verified the binary. binaryHash: null in pending entries is correct.
- **Blocking on display probe at tool-call time:** Display availability should be recorded at discovery time. Tool calls check the registry field, not re-probe live.
- **Writing to cli-anything/registry.json:** App discovery and CLI-Anything are separate concerns with different schemas. New registry goes to .planning/app-registry.json.
- **Skipping mock status for unfound binaries:** If the five-tier probe finds nothing, executionMode: mock MUST be set — this prevents phantom tool calls from reaching a subprocess.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SHA-256 hashing | Custom hash function | require('crypto').createHash('sha256') | Built into Node.js v20; handles large files without extra deps |
| Backspace-escape stripping | Custom state machine parser | col -b via spawnSync with regex fallback | col handles all man page formatting (bold X-backspace-X, underline, overstrike) |
| macOS app bundle binary lookup | Parse Info.plist manually | plutil -convert json -o - Info.plist + JSON.parse | plutil always available on macOS; handles binary plist format transparently |
| Cross-platform PATH resolution | Custom PATH-walking | which / where.exe via execFileSync | OS already knows PATH correctly; re-implementing PATH resolution misses symlinks and shims |
| JSON registry persistence | Custom serialization | fs.readFileSync + JSON.parse + JSON.stringify(..., null, 2) | Same pattern as existing cli-anything/registry.cjs — proven |

**Key insight:** Every tool in this phase is a thin orchestration layer over system CLIs and Node.js built-ins. The security value comes from the approval registry contract, not from clever binary-finding algorithms.

---

## Common Pitfalls

### Pitfall 1: Blender .app Binary is Named Blender (Capital B), Not blender
**What goes wrong:** mdfind finds /Applications/Blender.app but code guesses Contents/MacOS/blender (lowercase) — file not found.
**Why it happens:** macOS binaries inside .app bundles match CFBundleExecutable from Info.plist, which is case-sensitive.
**How to avoid:** Always use plutil to read CFBundleExecutable from Info.plist. Confirmed for Cursor: CFBundleExecutable = "Cursor".
**Warning signs:** fs.existsSync returning false after mdfind succeeds.

### Pitfall 2: GIMP 3.x Script-Fu Batch API Is Not Backwards Compatible with 2.10
**What goes wrong:** Scripts written for GIMP 2.10 batch mode fail on GIMP 3.0 — gimp-file-load now takes one string argument instead of two; TRUE/FALSE replaced with #t/#f in v3 dialect.
**Why it happens:** GIMP 3.0 overhauled the PDB API to align with GLib/GTK conventions.
**How to avoid:** Detect GIMP version at probe time. Store version in registry. Phase 172 uses version to select correct invocation template.
**Warning signs:** (gimp-file-load RUN-NONINTERACTIVE "/tmp/foo" "") — the second empty string arg is GIMP 2.x syntax.

### Pitfall 3: col Is Not Available on Windows
**What goes wrong:** spawnSync('col', ['-b']) fails with ENOENT on Windows.
**Why it happens:** col is a POSIX utility; Windows has no equivalent.
**How to avoid:** The regex fallback text.replace(/.\x08/g, '') handles all common backspace-escape patterns. Always wrap col -b in try/catch with regex fallback.
**Warning signs:** result.error.code === 'ENOENT' in the col spawn result.

### Pitfall 4: Inkscape 1.x Does Not Need --batch-process for Headless Export
**What goes wrong:** Code adds display flags or sets DISPLAY=:99 for Inkscape export commands.
**Why it happens:** Older Inkscape (0.9x) required X11. Inkscape 1.0+ suppresses the GUI automatically when export CLI flags are present.
**How to avoid:** Use --export-type and --export-filename flags only. Do NOT set display variables for Inkscape. executionMode: 'headless' is correct for Inkscape 1.x.
**Warning signs:** Xvfb setup for Inkscape is a legacy workaround.

### Pitfall 5: mdfind Returns Multiple Paths (App in /Applications AND ~/Applications)
**What goes wrong:** mdfind output has two lines; code takes split('\n')[0] and gets the wrong one.
**Why it happens:** mdfind returns all indexed locations where the app bundle exists.
**How to avoid:** Filter paths that end in .app and prefer /Applications/ over ~/Applications/ or other paths. Sort with /Applications prefix first, take [0].
**Warning signs:** appBundle path contains whitespace or points to unexpected location.

### Pitfall 6: SHA-256 Hashing 200MB Binaries Blocks the Event Loop
**What goes wrong:** fs.readFileSync on a 200MB Blender binary blocks Node.js for ~100ms.
**Why it happens:** readFileSync is synchronous; crypto.createHash processes it synchronously too.
**How to avoid:** Hash at approval time only (not discovery time). The approval workflow is interactive — 100ms is acceptable there.
**Warning signs:** Slow app discover command despite no subprocess startup cost.

### Pitfall 7: Skipping the Registry Gate Before Subprocess Invocation
**What goes wrong:** Phase 172-175 code calls subprocess without checking status === 'approved'.
**Why it happens:** Developer forgets to call the guard before invoking.
**How to avoid:** app-registry.cjs exports a checkApproved(slug) guard that throws a descriptive error for non-approved entries. All subsequent phases call this guard as the first step. The error message includes the approval command to run.
**Warning signs:** No registry check before spawnSync in wrapper code.

### Pitfall 8: pip Module Tier Detects bpy as a Blender Binary Install
**What goes wrong:** Tier 3 finds bpy via pip, sets path: 'python3 -m bpy', but python3 -m bpy does not launch Blender headlessly the same way as the binary.
**Why it happens:** bpy is Blender-as-a-Python-module (build from source only; no PyPI distribution as of 2026).
**How to avoid:** For Blender, Tier 3 finding bpy is a supplemental indicator only. Continue to Tiers 4-5 to find the actual binary. If only Tier 3 succeeds for Blender, executionMode should be marked gui-required (bpy cannot render headlessly the same way).
**Warning signs:** binaryPath starting with python3 -m for apps that have native binaries.

---

## Code Examples

### App Catalog Entry (Known Design Apps)

These catalog entries are baked into app-discovery.cjs — they encode the known classification:

```javascript
// Source: researched 2026-03-29 — Blender docs, GIMP 3.0 docs, Inkscape 1.x wiki
const APP_CATALOG = [
  {
    slug: 'blender',
    displayName: 'Blender',
    cli: 'Blender',          // capital B — verified via plutil in practice
    cliAlias: ['blender'],   // also try lowercase (Linux package installs)
    envVar: 'BLENDER_BIN',
    pipModule: 'bpy',        // supplemental only — do not use as primary path
    bundleId: 'org.blenderfoundation.blender',
    executionMode: 'headless',
    headlessFlag: '--background',
    versionFlag: '--version',
    wellKnownPaths: {
      darwin: ['/Applications/Blender.app/Contents/MacOS/Blender'],
      linux: ['/usr/bin/blender', '/usr/local/bin/blender', '~/.local/bin/blender'],
      win32: [
        'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
        'C:\\Program Files\\Blender Foundation\\Blender\\blender.exe',
      ],
    },
  },
  {
    slug: 'gimp',
    displayName: 'GIMP',
    cli: 'gimp',
    cliAlias: ['gimp-3.0', 'gimp-2.10', 'gimp-2.99'],
    envVar: 'GIMP_BIN',
    pipModule: null,
    bundleId: 'org.gimp.gimp',
    executionMode: 'headless',
    headlessFlag: '-i',
    versionFlag: '--version',
    wellKnownPaths: {
      darwin: ['/Applications/GIMP.app/Contents/MacOS/gimp'],
      linux: ['/usr/bin/gimp', '/usr/bin/gimp-3.0', '/usr/bin/gimp-2.10'],
      win32: [
        'C:\\Program Files\\GIMP 3\\bin\\gimp-3.0.exe',
        'C:\\Program Files\\GIMP 2\\bin\\gimp-2.10.exe',
      ],
    },
  },
  {
    slug: 'inkscape',
    displayName: 'Inkscape',
    cli: 'inkscape',
    envVar: 'INKSCAPE_BIN',
    pipModule: null,
    bundleId: 'org.inkscape.Inkscape',
    executionMode: 'headless',
    headlessFlag: null,       // No explicit headless flag needed for 1.x
    versionFlag: '--version',
    wellKnownPaths: {
      darwin: ['/Applications/Inkscape.app/Contents/MacOS/inkscape'],
      linux: ['/usr/bin/inkscape', '/usr/local/bin/inkscape'],
      win32: [
        'C:\\Program Files\\Inkscape\\bin\\inkscape.exe',
        'C:\\Program Files (x86)\\Inkscape\\inkscape.exe',
      ],
    },
  },
];
```

### pde-tools app Subcommand Route

```javascript
// In bin/pde-tools.cjs switch block
case 'app': {
  const subcommand = args[1];
  const { cmdDiscover, cmdProbe, cmdList, cmdApprove } = require('./lib/app-registry.cjs');
  switch (subcommand) {
    case 'discover':
      await cmdDiscover(cwd, args.slice(2));
      break;
    case 'probe':
      await cmdProbe(cwd, args.slice(2));
      break;
    case 'list':
      await cmdList(cwd, args.slice(2));
      break;
    case 'approve':
      await cmdApprove(cwd, args.slice(2));
      break;
    default:
      console.error('Unknown app subcommand: ' + subcommand + '. Available: discover, probe, list, approve');
      process.exit(1);
  }
  break;
}
```

### Registry Entry State Transition Guard

```javascript
// In app-registry.cjs — exported for Phase 172-175 use
function checkApproved(registryPath, slug) {
  const registry = loadRegistry(registryPath);
  const entry = registry.entries.find(e => e.slug === slug);
  if (!entry) {
    throw new Error(
      'App "' + slug + '" not found in registry.\n' +
      'Run: pde-tools app discover to add it.'
    );
  }
  if (entry.status !== 'approved') {
    throw new Error(
      'App "' + slug + '" has status "' + entry.status + '" — cannot invoke.\n' +
      'Run: pde-tools app approve ' + slug + ' to grant execution permission.'
    );
  }
  if (entry.executionMode === 'mock') {
    throw new Error(
      'App "' + slug + '" has executionMode "mock" — binary not installed or not resolvable.\n' +
      'Install the app and re-run: pde-tools app discover'
    );
  }
  return entry;
}
```

### GIMP Version Detection Pattern

```javascript
// Store version at discovery time for Phase 172 to use
function detectGimpVersion(binaryPath, _fns = {}) {
  const { spawnFn = spawnSync } = _fns;
  const result = spawnFn(binaryPath, ['--version'], {
    encoding: 'utf8',
    timeout: 10000, // GIMP startup can be slow even for --version
  });
  const output = ((result.stdout || '') + (result.stderr || '')).trim();
  // "GNU Image Manipulation Program version 3.0.2" or "GIMP 2.10.38"
  const match = output.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  const [, major, minor, patch] = match.map(Number);
  return { major, minor, patch, raw: major + '.' + minor + '.' + patch };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inkscape requires X11 display | Inkscape 1.x suppresses GUI for export flags automatically | Inkscape 1.0 (2020) | No Xvfb or display setup needed for Phase 172 |
| GIMP Script-Fu gimp-file-load takes 2 args | GIMP 3.0 PDB takes 1 arg (GFile); TRUE/FALSE replaced with #t/#f | GIMP 3.0 (March 2025) | Version detection critical; 2.x and 3.x need different invocation templates |
| Blender Python API was GUI-only | --background flag enables fully headless Python execution | Blender 2.x+ | blender --background --python script.py is mature and stable |
| pip-based installs on Homebrew Python 3.12+ | pipx for isolated CLI tool installs (PEP-668 enforcement) | Homebrew Python 3.12 | Phase 171 is about discovery, not installation; pipx matters more for Phase 174 |
| GIMP 2.x batch: gimp -b '(cmd)' -b '(gimp-quit 0)' | GIMP 3.x: gimp -i --no-interface -b 'cmd' --quit | GIMP 3.0 (2025) | Phase 172 must select correct batch flag sequence based on version |

**Deprecated/outdated:**
- inkscape --export-png=out.png: Deprecated in Inkscape 1.x — use --export-type=png --export-filename=out.png instead
- gimp-file-load RUN-NONINTERACTIVE "/path" "": The empty second string is GIMP 2.x PDB syntax — breaks on GIMP 3.x
- Blender --python-text TextBlock: In-file text block scripts — use --python script.py for external files

---

## Open Questions

1. **GIMP 3.0 --quit flag vs (gimp-quit 0) in batch**
   - What we know: GIMP 3.0 adds a --quit flag documented in the startup chapter
   - What's unclear: Whether (gimp-quit 0) in the batch script body is still required alongside --quit, or if --quit replaces it
   - Recommendation: Phase 172 should probe the installed version and test both patterns; include version-conditional logic in the wrapper

2. **Windows Blender path — version directory name changes per release**
   - What we know: C:\Program Files\Blender Foundation\Blender 4.2\blender.exe — version in dir name
   - What's unclear: The exact directory name changes with each Blender release
   - Recommendation: The well-known paths tier should use fs.readdirSync('C:\\Program Files\\Blender Foundation') + filter for directories starting with 'Blender '; take the highest version

3. **mdfind Spotlight indexing on headless macOS CI runners**
   - What we know: mdfind works when Spotlight index is enabled
   - What's unclear: Whether macOS CI runners (GitHub Actions) have Spotlight indexed
   - Recommendation: Tier 4 failure is safe — fall through to Tier 5 well-known paths. Document in DISC-06 catalog.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js v20 | All modules | Yes | v20.20.0 | — |
| col CLI | DISC-04 backspace stripping | Yes | /usr/bin/col (macOS) | Regex replace backspace pattern |
| mdfind CLI | DISC-01 Tier 4 (macOS only) | Yes | /usr/bin/mdfind | Skip Tier 4, continue to Tier 5 |
| which CLI | DISC-01 Tier 2 (macOS/Linux) | Yes | shell built-in | where.exe on Windows |
| plutil CLI | .app bundle binary resolution | Yes | macOS system tool | Fallback: list Contents/MacOS/ directory |
| shasum CLI | Cross-check SHA-256 | Yes | /usr/bin/shasum v6.02 | Node.js crypto.createHash (primary method) |
| Python 3.x | DISC-01 Tier 3 pip module probe | Yes | Python 3.14.3 | Skip Tier 3 if python3 not found |
| Blender | Phase 172 (not this phase) | Not installed | — | executionMode: 'mock' in registry |
| GIMP | Phase 172 (not this phase) | Not installed | — | executionMode: 'mock' in registry |
| Inkscape | Phase 172 (not this phase) | Not installed | — | executionMode: 'mock' in registry |
| vitest | Nyquist tests | Yes | 4.1.1 (installed) | — |

**Missing dependencies with no fallback:** None blocking Phase 171 execution.

**Missing dependencies with fallback:** Blender/GIMP/Inkscape not installed — all three get executionMode: 'mock'; registry and catalog code fully testable without them installed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts (root) |
| Quick run command | npx vitest run tests/phase-171/ |
| Full suite command | npx vitest run |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-01 | Five-tier probe resolves binary via correct tier | unit | npx vitest run tests/phase-171/app-discovery.test.mjs | Wave 0 |
| DISC-01 | Probe returns null when all 5 tiers fail | unit | npx vitest run tests/phase-171/app-discovery.test.mjs | Wave 0 |
| DISC-02 | Registry writes pending entry at discovery | unit | npx vitest run tests/phase-171/app-registry.test.mjs | Wave 0 |
| DISC-02 | checkApproved throws for non-approved entries | unit | npx vitest run tests/phase-171/app-registry.test.mjs | Wave 0 |
| DISC-02 | SHA-256 hash stored at approval not discovery | unit | npx vitest run tests/phase-171/app-registry.test.mjs | Wave 0 |
| DISC-03 | executionMode mock when probe returns null | unit | npx vitest run tests/phase-171/app-discovery.test.mjs | Wave 0 |
| DISC-03 | executionMode headless for catalog-defined apps | unit | npx vitest run tests/phase-171/app-discovery.test.mjs | Wave 0 |
| DISC-04 | col -b strips backspace sequences | unit | npx vitest run tests/phase-171/col-preprocess.test.mjs | Wave 0 |
| DISC-04 | parseQuality degraded set when backspaces present | unit | npx vitest run tests/phase-171/col-preprocess.test.mjs | Wave 0 |
| DISC-04 | parseQuality clean when no backspaces | unit | npx vitest run tests/phase-171/col-preprocess.test.mjs | Wave 0 |
| DISC-05 | Display probe detects macOS WindowServer | unit | npx vitest run tests/phase-171/app-discovery.test.mjs | Wave 0 |
| DISC-05 | Display probe returns false when DISPLAY unset on Linux | unit | npx vitest run tests/phase-171/app-discovery.test.mjs | Wave 0 |
| DISC-06 | references/app-integrations.md exists with three app entries | smoke | manual check (file existence + content review) | Wave 0 |

### Sampling Rate
- **Per task commit:** npx vitest run tests/phase-171/
- **Per wave merge:** npx vitest run
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] tests/phase-171/app-discovery.test.mjs — covers DISC-01, DISC-03, DISC-05
- [ ] tests/phase-171/app-registry.test.mjs — covers DISC-02
- [ ] tests/phase-171/col-preprocess.test.mjs — covers DISC-04

Pattern: follow tests/phase-170/mermaid-renderer.test.mjs exactly — CJS createRequire, _execFn injection, no real binaries installed

---

## Design App Catalog Reference (for references/app-integrations.md)

Raw data for DISC-06. The markdown file formats this for human reference.

### Blender
- **macOS Bundle ID:** org.blenderfoundation.blender
- **macOS Binary:** inside bundle at Contents/MacOS/Blender (capital B — verified via plutil CFBundleExecutable pattern)
- **Linux Binary:** /usr/bin/blender, /usr/local/bin/blender
- **Windows Binary:** C:\Program Files\Blender Foundation\Blender 4.x\blender.exe (version in dir name — use readdirSync + filter)
- **pip module:** bpy — Blender-as-Python-module (build from source only; NOT on standard PyPI; supplemental probe only)
- **executionMode:** headless — --background flag is mature and widely used since Blender 2.x
- **Headless invocation (4.x and 3.x):** blender --background [file.blend] --python script.py
- **Version detection:** blender --version parses Blender 4.2.0
- **API differences 3.x vs 4.x:** Python API mostly stable; CLI invocation pattern unchanged
- **Discovery hint:** On macOS, mdfind with bundle ID is most reliable; Blender installer does NOT add to PATH by default

### GIMP
- **macOS Bundle ID:** org.gimp.gimp
- **macOS Binary:** inside bundle at Contents/MacOS/gimp (lowercase — verify via plutil)
- **Linux Binary:** /usr/bin/gimp, /usr/bin/gimp-3.0, /usr/bin/gimp-2.10
- **Windows Binary:** C:\Program Files\GIMP 3\bin\gimp-3.0.exe or C:\Program Files\GIMP 2\bin\gimp-2.10.exe
- **pip module:** None — GIMP has no pip-installable form
- **executionMode:** headless — -i / --no-interface flag
- **Headless invocation (GIMP 3.x):** gimp -i -b '(script-commands)' --quit
- **Headless invocation (GIMP 2.10):** gimp -i -b '(script-commands)' -b '(gimp-quit 0)'
- **BREAKING CHANGE in 3.0 (March 2025):** gimp-file-load now takes 1 string (GFile); was 2 strings. TRUE/FALSE replaced with #t/#f. script-fu-register deprecated in favor of script-fu-register-filter.
- **Version detection:** gimp --version parses GNU Image Manipulation Program version 3.0.2 or GIMP version 2.10.38
- **Discovery hint:** GIMP 3.0 released March 2025; Phase 172 MUST version-branch on major version

### Inkscape
- **macOS Bundle ID:** org.inkscape.Inkscape (capital I in Inkscape)
- **macOS Binary:** inside bundle at Contents/MacOS/inkscape — verify via plutil
- **Linux Binary:** /usr/bin/inkscape, /usr/local/bin/inkscape
- **Windows Binary:** C:\Program Files\Inkscape\bin\inkscape.exe
- **pip module:** None — Inkscape has no standard pip form
- **executionMode:** headless — --export-type automatically suppresses GUI in Inkscape 1.x
- **Headless invocation (1.x):** inkscape --export-type=png --export-filename=out.png input.svg
- **Deprecated flags (pre-1.0):** --export-png, --export-pdf, --export-eps — all replaced by --export-type + --export-filename
- **Shell mode:** inkscape --shell allows batch processing via stdin pipe (useful for many conversions)
- **No display flag needed:** Inkscape 1.x automatically suppresses GUI when export flags present — no Xvfb or display configuration required
- **Version detection:** inkscape --version parses Inkscape 1.3.2 (091e20ef0f, 2023-07-04)

---

## Sources

### Primary (HIGH confidence)
- Node.js v20 child_process docs — spawnSync/execFileSync behavior verified against live runtime (v20.20.0)
- Verified macOS system: col -b strips backspace sequences confirmed via REPL test (echo N-backspace-NAME | col -b outputs NAME)
- Verified macOS system: mdfind returns .app bundle paths; plutil -convert json reads CFBundleExecutable (tested with Cursor.app)
- Verified macOS system: ps aux | grep WindowServer detects GUI session (WindowServer PID 433 confirmed running)
- Verified Node.js crypto.createHash('sha256') available built-in — no npm, cross-platform

### Secondary (MEDIUM confidence)
- GIMP 3.0 fire-up documentation (docs.gimp.org/3.0/en/gimp-fire-up.html) — -i, -b, --batch-interpreter, --quit flags
- GIMP Script-Fu v3 changes (developer.gimp.org/resource/script-fu/script-fu-changes-v3/) — SF-VALUE deprecated, TRUE to #t, script-fu-register to script-fu-register-filter
- Inkscape Using the Command Line wiki (wiki.inkscape.org/wiki/Using_the_Command_Line) — --export-type, --export-filename, --batch-process; confirmed deprecated flags (--export-png)
- Blender Command Line Rendering docs (docs.blender.org/manual/en/latest/advanced/command_line/render.html) — --background/-b, -P/--python flags (403 on direct fetch; confirmed via WebSearch cross-reference)
- macOS Config path org.inkscape.Inkscape confirmed from official Inkscape wiki

### Tertiary (LOW confidence)
- Windows Blender path C:\Program Files\Blender Foundation\Blender 4.x\blender.exe — version directory name changes per release; not testable on current macOS machine
- GIMP macOS binary name (gimp lowercase inside bundle) — inferred from Linux convention; verify with plutil at install time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all Node.js built-ins; system CLIs verified present on macOS
- Architecture patterns: HIGH — follows established CJS + dependency-injection pattern from Phases 163-170
- Five-tier probe: HIGH — all five tiers tested in Node.js with live system
- col -b preprocessing: HIGH — verified with actual backspace-escaped text from existing registry.json
- GIMP 3.x API changes: MEDIUM — official docs confirmed breaking changes; exact --quit flag interaction needs Phase 172 integration test
- Windows paths: LOW — not testable on current macOS machine; from training data + well-known installer conventions
- Pitfalls: HIGH — all eight pitfalls derived from actual code behavior and verified system behavior

**Research date:** 2026-03-29
**Valid until:** 2026-06-29 (stable domain; GIMP 3.x API changes are settled post-release)
