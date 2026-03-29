'use strict';

/**
 * mermaid-renderer.cjs -- Mermaid diagram rendering module with mmdr/mmdc auto-detection.
 *
 * Provides:
 *   - detectRenderer()   -- Auto-detect mmdr (Rust) or mmdc (mermaid-cli) binary
 *   - renderMermaid()    -- Render a Mermaid diagram file to SVG/PNG using detected renderer
 *
 * Binary detection follows the CadQuery pattern from bin/lib/3d-pipeline/cad.cjs.
 * Dependency injection via _execFn enables full unit testing without mmdr/mmdc installed.
 *
 * Requirements: UTL-01
 * User setup: Install mmdr (preferred) or mmdc (fallback)
 *   brew tap 1jehuang/mmdr && brew install mmdr
 *   OR: npm install -g @mermaid-js/mermaid-cli
 */

const { execFileSync } = require('child_process');

const MMDR_PATH = process.env.MMDR_PATH || 'mmdr';

const MMDR_INSTALL_MSG =
  'No Mermaid renderer found. Install one of:\n' +
  '  mmdr (preferred, 500-1000x faster):\n' +
  '    brew tap 1jehuang/mmdr && brew install mmdr\n' +
  '  mmdc (mermaid-cli fallback):\n' +
  '    npm install -g @mermaid-js/mermaid-cli';

/**
 * Detect which Mermaid renderer binary is available.
 *
 * Tries mmdr first (Rust-native, fast), falls back to mmdc (mermaid-cli).
 * Uses process.env.MMDR_PATH for the mmdr binary path (default: 'mmdr').
 *
 * @param {Function} [_execFn] - Override for execFileSync (for testing)
 * @returns {'mmdr' | 'mmdc' | null} Name of the available renderer, or null if none found
 */
function detectRenderer(_execFn) {
  const execFn = _execFn || execFileSync;

  // Try mmdr (preferred: Rust binary, fast)
  try {
    execFn(MMDR_PATH, ['--version'], { encoding: 'utf8', timeout: 5000 });
    return 'mmdr';
  } catch (_) {}

  // Try mmdc (fallback: mermaid-cli, slower)
  try {
    execFn('mmdc', ['--version'], { encoding: 'utf8', timeout: 5000 });
    return 'mmdc';
  } catch (_) {}

  return null;
}

/**
 * Render a Mermaid diagram file to SVG or PNG using the detected renderer.
 *
 * For mmdr: calls binary with [-i, input, -o, outputPath, -e, format]
 * For mmdc: calls binary with [-i, input, -o, outputPath] (format inferred from extension)
 * When no renderer found: throws Error with install instructions.
 *
 * @param {object} opts
 * @param {string} opts.input       - Path to the .mmd input file
 * @param {string} opts.outputPath  - Path for the output file (e.g. 'diagram.svg')
 * @param {string} [opts.format]    - Output format: 'svg' (default) or 'png'
 * @param {Function} [opts._execFn] - Override for execFileSync (for testing)
 * @throws {Error} When no Mermaid renderer is found
 */
function renderMermaid({ input, outputPath, format, _execFn }) {
  const execFn = _execFn || execFileSync;
  const renderer = detectRenderer(execFn);

  if (!renderer) {
    throw new Error(MMDR_INSTALL_MSG);
  }

  const fmt = format || 'svg';

  if (renderer === 'mmdr') {
    // mmdr flags: -i <input> -o <output> -e <format>
    execFn(MMDR_PATH, ['-i', input, '-o', outputPath, '-e', fmt], {
      encoding: 'utf8',
      timeout: 10000,
    });
  } else {
    // mmdc flags: -i <input> -o <output> (format inferred from file extension)
    execFn('mmdc', ['-i', input, '-o', outputPath], {
      encoding: 'utf8',
      timeout: 30000, // mermaid-cli is slow; 30s safe
    });
  }
}

module.exports = { detectRenderer, renderMermaid };
