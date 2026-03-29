'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

// ---------------------------------------------------------------------------
// APP_CATALOG - Known desktop app definitions
// ---------------------------------------------------------------------------
const APP_CATALOG = [
  {
    slug: 'blender',
    displayName: 'Blender',
    cli: 'Blender',
    cliAlias: ['blender'],
    envVar: 'BLENDER_BIN',
    pipModule: 'bpy',
    bundleId: 'org.blenderfoundation.blender',
    executionMode: 'headless',
    headlessFlag: '--background',
    versionFlag: '--version',
    wellKnownPaths: {
      darwin: [
        '/Applications/Blender.app/Contents/MacOS/Blender',
        '~/Applications/Blender.app/Contents/MacOS/Blender',
      ],
      linux: [
        '/usr/bin/blender',
        '/usr/local/bin/blender',
        '/snap/bin/blender',
      ],
      win32: [
        'C:\\Program Files\\Blender Foundation\\Blender\\blender.exe',
        'C:\\Program Files (x86)\\Blender Foundation\\Blender\\blender.exe',
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
      darwin: [
        '/Applications/GIMP.app/Contents/MacOS/gimp',
        '/Applications/GIMP-2.10.app/Contents/MacOS/gimp',
      ],
      linux: [
        '/usr/bin/gimp',
        '/usr/local/bin/gimp',
        '/snap/bin/gimp',
      ],
      win32: [
        'C:\\Program Files\\GIMP 2\\bin\\gimp-2.10.exe',
        'C:\\Program Files\\GIMP 3\\bin\\gimp-3.0.exe',
      ],
    },
  },
  {
    slug: 'inkscape',
    displayName: 'Inkscape',
    cli: 'inkscape',
    cliAlias: [],
    envVar: 'INKSCAPE_BIN',
    pipModule: null,
    bundleId: 'org.inkscape.Inkscape',
    executionMode: 'headless',
    headlessFlag: null,
    versionFlag: '--version',
    wellKnownPaths: {
      darwin: [
        '/Applications/Inkscape.app/Contents/MacOS/inkscape',
        '~/Applications/Inkscape.app/Contents/MacOS/inkscape',
      ],
      linux: [
        '/usr/bin/inkscape',
        '/usr/local/bin/inkscape',
        '/snap/bin/inkscape',
      ],
      win32: [
        'C:\\Program Files\\Inkscape\\bin\\inkscape.exe',
        'C:\\Program Files (x86)\\Inkscape\\bin\\inkscape.exe',
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// resolveBinaryFromBundle - macOS .app bundle resolution
// ---------------------------------------------------------------------------
/**
 * Resolve binary path from macOS .app bundle via plutil + Info.plist.
 * @param {string} appBundlePath - Path to the .app bundle
 * @param {object} opts - { execFn, existsFn }
 * @returns {string|null}
 */
function resolveBinaryFromBundle(appBundlePath, { execFn = execFileSync, existsFn = fs.existsSync } = {}) {
  const plistPath = path.join(appBundlePath, 'Contents', 'Info.plist');
  if (!existsFn(plistPath)) return null;
  try {
    const json = execFn('plutil', ['-convert', 'json', '-o', '-', plistPath], { encoding: 'utf8' });
    const execName = JSON.parse(json).CFBundleExecutable;
    if (execName) {
      const binPath = path.join(appBundlePath, 'Contents', 'MacOS', execName);
      if (existsFn(binPath)) return binPath;
    }
  } catch (_) {
    // plutil failed; fall through to fallback
  }
  // Fallback: first file in Contents/MacOS/
  const macosDir = path.join(appBundlePath, 'Contents', 'MacOS');
  if (existsFn(macosDir)) {
    try {
      const files = fs.readdirSync(macosDir).filter(f => !f.startsWith('.'));
      if (files.length > 0) return path.join(macosDir, files[0]);
    } catch (_) {
      // readdirSync failed
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// probeBinary - Five-tier waterfall probe
// ---------------------------------------------------------------------------
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
  } catch (_) {
    // which/where.exe failed; continue to next tier
  }

  // Tier 3: pip module (python3 -m {module})
  if (appDef.pipModule) {
    try {
      const pyResult = spawnFn('python3', [
        '-c',
        `import importlib.util; s=importlib.util.find_spec('${appDef.pipModule}'); print(s.origin if s else 'none')`,
      ], { encoding: 'utf8', timeout: 5000 });
      const origin = (pyResult.stdout || '').trim();
      if (origin && origin !== 'none' && pyResult.status === 0) {
        return { tier: 3, path: `python3 -m ${appDef.pipModule}`, source: 'pip-module', pyOrigin: origin };
      }
    } catch (_) {
      // python3 not available; continue
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
        .sort((a, _b) => (a.startsWith('/Applications') ? -1 : 1))[0];
      if (appBundle) {
        const binPath = resolveBinaryFromBundle(appBundle, { execFn, existsFn });
        if (binPath) return { tier: 4, path: binPath, source: 'mdfind', appBundle };
      }
    } catch (_) {
      // mdfind failed; continue
    }
  }

  // Tier 5: well-known paths
  const platformPaths = (appDef.wellKnownPaths || {})[platform] || [];
  for (const rawPath of platformPaths) {
    const expanded = rawPath.replace('~', homedir);
    if (existsFn(expanded)) {
      return { tier: 5, path: expanded, source: 'well-known' };
    }
  }

  return null; // Not found - executionMode: 'mock'
}

// ---------------------------------------------------------------------------
// probeDisplay - Cross-platform display server detection
// ---------------------------------------------------------------------------
/**
 * Probe display server availability cross-platform.
 * Uses spawnSync (argument array, not shell) for security.
 * @param {object} [_fns] - Injectable for testing
 * @returns {{ available: boolean, method: string }}
 */
function probeDisplay(_fns = {}) {
  const { platform = os.platform(), env = process.env, spawnFn = spawnSync } = _fns;

  if (platform === 'darwin') {
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

// ---------------------------------------------------------------------------
// preprocessHelpText - col -b preprocessing with parseQuality annotation
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// discoverApp - Main discovery orchestrator
// ---------------------------------------------------------------------------
/**
 * Discover an app by slug. Looks up in APP_CATALOG, probes binary, probes display.
 * @param {string} slug - App slug (e.g., 'blender')
 * @param {object} [_fns] - Injectable functions for testing
 * @returns {object} Discovery result
 */
function discoverApp(slug, _fns = {}) {
  const catalogEntry = APP_CATALOG.find(a => a.slug === slug);
  if (!catalogEntry) {
    throw new Error(`Unknown app slug: "${slug}". Known apps: ${APP_CATALOG.map(a => a.slug).join(', ')}`);
  }

  const probeResult = probeBinary(catalogEntry, _fns);
  const displayProbe = probeDisplay(_fns);

  if (!probeResult) {
    return {
      slug,
      displayName: catalogEntry.displayName,
      binaryPath: null,
      executionMode: 'mock',
      probeSource: null,
      displayProbe,
      parseQuality: null,
    };
  }

  return {
    slug,
    displayName: catalogEntry.displayName,
    binaryPath: probeResult.path,
    executionMode: catalogEntry.executionMode,
    probeSource: {
      tier: probeResult.tier,
      source: probeResult.source,
      ...(probeResult.appBundle ? { appBundle: probeResult.appBundle } : {}),
      ...(probeResult.pyOrigin ? { pyOrigin: probeResult.pyOrigin } : {}),
    },
    displayProbe,
    parseQuality: null,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  probeBinary,
  resolveBinaryFromBundle,
  probeDisplay,
  preprocessHelpText,
  discoverApp,
  APP_CATALOG,
};
