'use strict';

/**
 * bin/lib/utils/handoff-verifier.cjs
 *
 * Handoff spec vs source code gap detection (UTL-07, UTL-08).
 * Parses HND-handoff-spec-v*.md markdown tables and greps source files
 * for component exports to produce a structured gap report.
 *
 * All FS and subprocess calls use dependency injection for testability.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_HANDOFF_DIR = '.planning/design/handoff';
const DEFAULT_SRC_DIR = 'src';

// ---------------------------------------------------------------------------
// parseHandoffSpec
// ---------------------------------------------------------------------------

/**
 * Parse a HANDOFF-SPEC.md markdown table and extract component entries.
 *
 * Expects a table with columns: Component | Props | File
 * Skips the header row and separator rows (containing ---).
 *
 * @param {string} specContent - Raw markdown string
 * @returns {Array<{component:string, props:string, file:string}>}
 */
function parseHandoffSpec(specContent) {
  const results = [];
  const lines = specContent.split('\n');

  for (const line of lines) {
    // Only process lines that look like table rows
    if (!line.trim().startsWith('|')) continue;

    // Split by | and trim each cell
    const cells = line.split('|').map(function(c) { return c.trim(); }).filter(function(c) { return c.length > 0; });

    if (cells.length < 3) continue;

    // Skip separator rows (containing ---)
    if (cells[0].includes('---')) continue;

    // Skip header row
    if (cells[0] === 'Component') continue;

    results.push({
      component: cells[0],
      props: cells[1],
      file: cells[2],
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// searchForExport
// ---------------------------------------------------------------------------

/**
 * Search source directory for files that export a named component.
 * Uses grep -r -l to find files containing `export.*ComponentName`.
 *
 * @param {string} componentName - Component name to search for
 * @param {string} srcDir - Source directory to search
 * @param {function} [_execFn] - Injected execFileSync for testing
 * @returns {string[]} Array of file paths containing the export
 */
function searchForExport(componentName, srcDir, _execFn) {
  var execFn = _execFn || execFileSync;
  try {
    var result = execFn('grep', [
      '-r',
      '--include=*.ts',
      '--include=*.tsx',
      '--include=*.js',
      '--include=*.jsx',
      '-l',
      'export.*' + componentName,
      srcDir,
    ], { encoding: 'utf8', timeout: 10000 });
    return result.trim().split('\n').filter(function(p) { return p.length > 0; });
  } catch (_) {
    // grep exits 1 when no matches found — treat as empty
    return [];
  }
}

// ---------------------------------------------------------------------------
// findLatestHandoffSpec
// ---------------------------------------------------------------------------

/**
 * Auto-detect the latest HND-handoff-spec-v*.md file in the handoff directory.
 *
 * @param {string} [designDir] - Path to design handoff directory
 * @param {function} [_readdirFn] - Injected readdirSync for testing
 * @returns {string|null} Full path to latest spec file, or null if none found
 */
function findLatestHandoffSpec(designDir, _readdirFn) {
  var dir = designDir || DEFAULT_HANDOFF_DIR;
  var readdirFn = _readdirFn || fs.readdirSync;

  var files;
  try {
    files = readdirFn(dir);
  } catch (_) {
    return null;
  }

  var specFiles = files.filter(function(f) {
    return /^HND-handoff-spec-v\d+\.md$/.test(f);
  });

  if (specFiles.length === 0) return null;

  specFiles.sort(function(a, b) {
    var vA = parseInt(a.match(/v(\d+)/)[1], 10);
    var vB = parseInt(b.match(/v(\d+)/)[1], 10);
    return vB - vA;
  });

  return path.join(dir, specFiles[0]);
}

// ---------------------------------------------------------------------------
// verifyHandoff
// ---------------------------------------------------------------------------

/**
 * Compare HANDOFF-SPEC.md component list against source exports and produce
 * a gap report classifying each component as matched/missing/diverged.
 *
 * @param {object} opts
 * @param {string} opts.specPath - Path to the handoff spec file
 * @param {string} [opts.srcDir] - Source directory to search (default: 'src')
 * @param {function} [opts._readFn] - Injected fs.readFileSync for testing
 * @param {function} [opts._execFn] - Injected execFileSync for testing
 * @returns {object} Gap report: { status, gaps, markdown, stats } or { status: 'no-spec', message }
 */
function verifyHandoff(opts) {
  var specPath = opts.specPath;
  var srcDir = opts.srcDir || DEFAULT_SRC_DIR;
  var readFn = opts._readFn || fs.readFileSync;
  var execFn = opts._execFn || execFileSync;

  // Read the spec file — return friendly error if missing
  var specContent;
  try {
    specContent = readFn(specPath, 'utf8');
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.message.includes('ENOENT'))) {
      return {
        status: 'no-spec',
        message: 'Run /pde:handoff first to generate a handoff spec',
      };
    }
    throw err;
  }

  // Parse components from spec
  var components = parseHandoffSpec(specContent);

  // Build gap report by searching for each export
  var gaps = components.map(function(entry) {
    var files = searchForExport(entry.component, srcDir, execFn);
    var found = files.length > 0;

    return {
      component: entry.component,
      specStatus: 'defined',
      codeStatus: found ? 'found' : 'not-found',
      gapType: found ? 'matched' : 'missing',
      files: files,
    };
  });

  // Build stats
  var matched = gaps.filter(function(g) { return g.gapType === 'matched'; }).length;
  var missing = gaps.filter(function(g) { return g.gapType === 'missing'; }).length;
  var diverged = gaps.filter(function(g) { return g.gapType === 'diverged'; }).length;

  var stats = {
    total: gaps.length,
    matched: matched,
    missing: missing,
    diverged: diverged,
  };

  // Build markdown table
  var markdownLines = [
    '| Component | Spec Status | Code Status | Gap Type |',
    '|-----------|-------------|-------------|----------|',
  ];

  for (var i = 0; i < gaps.length; i++) {
    var g = gaps[i];
    markdownLines.push(
      '| ' + g.component + ' | ' + g.specStatus + ' | ' + g.codeStatus + ' | ' + g.gapType + ' |'
    );
  }

  var markdown = markdownLines.join('\n');

  return {
    status: 'complete',
    gaps: gaps,
    markdown: markdown,
    stats: stats,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { parseHandoffSpec, searchForExport, verifyHandoff, findLatestHandoffSpec };
