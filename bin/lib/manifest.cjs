'use strict';

/**
 * manifest.cjs — SHA256 file-hash manifest CRUD
 *
 * Tracks which PDE framework files are stock vs user-modified via SHA256
 * hash comparison. Used by the update workflow to safely update framework
 * files without overwriting user modifications.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Compute SHA256 hash of a file's contents.
 * @param {string} absolutePath
 * @returns {string|null} 64-char hex hash or null if file missing
 */
function hashFile(absolutePath) {
  try {
    const content = fs.readFileSync(absolutePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}

/**
 * List of glob patterns for files the manifest should track.
 * Covers: protected-files.json entries + workflows + commands + agents + references + templates + bin/lib.
 * Excludes: .planning/, tests/, auto-generated JSON.
 */
const TRACKED_GLOBS = [
  'workflows/*.md',
  'commands/pde/*.md',
  'agents/pde-*.md',
  'references/*.md',
  'templates/*.md',
  'bin/lib/*.cjs',
  'bin/pde-tools.cjs',
  'protected-files.json',
  'CLAUDE.md',
  'skill-registry.md',
];

/**
 * Resolve tracked globs to actual file paths relative to pluginRoot.
 * Uses fs.readdirSync — no external glob library needed because patterns are single-level.
 */
function resolveTrackedFiles(pluginRoot) {
  const files = [];
  for (const pattern of TRACKED_GLOBS) {
    const parts = pattern.split('/');
    if (parts.length === 1) {
      // Root-level file (no directory separator)
      const abs = path.resolve(pluginRoot, pattern);
      if (fs.existsSync(abs)) files.push(pattern);
    } else if (parts[parts.length - 1].includes('*')) {
      // Directory glob like 'workflows/*.md' or 'agents/pde-*.md'
      const dir = parts.slice(0, -1).join('/');
      const wildcardPart = parts[parts.length - 1];
      const absDir = path.resolve(pluginRoot, dir);
      try {
        const entries = fs.readdirSync(absDir);
        for (const entry of entries) {
          if (matchesWildcard(entry, wildcardPart)) {
            files.push(dir + '/' + entry);
          }
        }
      } catch { /* directory doesn't exist */ }
    } else {
      // Specific file path like 'bin/pde-tools.cjs'
      const abs = path.resolve(pluginRoot, pattern);
      if (fs.existsSync(abs)) files.push(pattern);
    }
  }
  return files.sort();
}

/**
 * Match a filename against a simple wildcard pattern like '*.md' or 'pde-*.md'.
 * Supports only a single '*' wildcard.
 */
function matchesWildcard(filename, wildcardPart) {
  if (!wildcardPart.includes('*')) {
    return filename === wildcardPart;
  }
  const [prefix, suffix] = wildcardPart.split('*');
  return filename.startsWith(prefix) && filename.endsWith(suffix) &&
    filename.length >= prefix.length + suffix.length;
}

/**
 * Initialize manifest CSV from scratch.
 * @param {string} pluginRoot - absolute path to PDE plugin root
 * @returns {number} number of entries written
 */
function manifestInit(pluginRoot) {
  const trackedFiles = resolveTrackedFiles(pluginRoot);
  const today = new Date().toISOString().split('T')[0];
  const csvLines = ['path,sha256,source,last_updated'];

  for (const relPath of trackedFiles) {
    const absPath = path.resolve(pluginRoot, relPath);
    const sha256 = hashFile(absPath);
    if (sha256) {
      csvLines.push(`${relPath},${sha256},stock,${today}`);
    }
  }

  const manifestDir = path.join(process.cwd(), '.planning', 'config');
  fs.mkdirSync(manifestDir, { recursive: true });
  const manifestPath = path.join(manifestDir, 'files-manifest.csv');
  fs.writeFileSync(manifestPath, csvLines.join('\n') + '\n', 'utf-8');
  return csvLines.length - 1;
}

/**
 * Parse manifest CSV content into array of entry objects.
 * @param {string} csvContent - raw CSV string
 * @returns {Array<{path: string, sha256: string, source: string, last_updated: string}>}
 */
function parseManifest(csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  return lines.slice(1).map(line => {
    const [filePath, sha256, source, lastUpdated] = line.split(',');
    return { path: filePath, sha256, source, last_updated: lastUpdated };
  });
}

/**
 * Determine update disposition for a single managed file.
 * @param {string} relPath - relative file path
 * @param {Array} manifestEntries - parsed manifest entries
 * @param {string} diskHash - current SHA256 of file on disk
 * @returns {{action: string, reason: string}}
 */
function classifyFile(relPath, manifestEntries, diskHash) {
  const entry = manifestEntries.find(e => e.path === relPath);
  if (!entry || !entry.sha256) {
    return { action: 'preserve', reason: 'no-manifest-entry' };
  }
  if (diskHash === entry.sha256) {
    return { action: 'auto-update', reason: 'unmodified' };
  }
  return { action: 'preserve', reason: 'user-modified' };
}

/**
 * Update a single entry in the manifest CSV.
 * @param {string} manifestPath - absolute path to files-manifest.csv
 * @param {string} relPath - relative file path
 * @param {string} newHash - new SHA256 hash
 * @param {string} source - 'stock' or 'user-modified'
 */
function updateManifestEntry(manifestPath, relPath, newHash, source) {
  const today = new Date().toISOString().split('T')[0];
  let content;
  try {
    content = fs.readFileSync(manifestPath, 'utf-8');
  } catch {
    content = 'path,sha256,source,last_updated\n';
  }
  const entries = parseManifest(content);
  const idx = entries.findIndex(e => e.path === relPath);
  if (idx >= 0) {
    entries[idx] = { path: relPath, sha256: newHash, source, last_updated: today };
  } else {
    entries.push({ path: relPath, sha256: newHash, source, last_updated: today });
  }
  const csvLines = ['path,sha256,source,last_updated'];
  for (const e of entries) {
    csvLines.push(`${e.path},${e.sha256},${e.source},${e.last_updated}`);
  }
  fs.writeFileSync(manifestPath, csvLines.join('\n') + '\n', 'utf-8');
}

module.exports = {
  hashFile,
  manifestInit,
  parseManifest,
  classifyFile,
  updateManifestEntry,
  resolveTrackedFiles,
  TRACKED_GLOBS,
};
