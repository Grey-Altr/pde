#!/usr/bin/env node
'use strict';

/**
 * context-sync-hook.cjs — PostToolUse hook that auto-regenerates editor context files
 *
 * Fires when Write or Edit tools are used. Detects whether the modified file is
 * inside the .planning/ directory. If so, computes a composite SHA-256 hash and
 * compares it to the last-written hash (stored in a per-session tmpdir marker file).
 * Only calls emitAll() when the hash has actually changed — ensuring idempotency.
 *
 * Contracts:
 * - ZERO stdout — Claude Code displays hook stdout to the user
 * - Always exits 0 — hook failures must never affect Claude Code execution
 * - async: true in hooks.json — non-blocking, best-effort context update
 *
 * Exports: handleHookPayload(hookData, opts) for unit testing with dependency injection
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

// ─── Core logic (exported for testing) ───────────────────────────────────────

/**
 * Handle a PostToolUse hook payload.
 *
 * @param {object} hookData - Parsed JSON payload from Claude Code hook stdin
 * @param {object} [opts] - Dependency injection for testing
 * @param {function} [opts.emitAllFn] - Replacement for emitAll (default: real emitAll)
 * @param {function} [opts.computeHashFn] - Replacement for computeSourceHash (default: real fn)
 * @param {string}   [opts.markerDir]  - Directory to write marker files (default: os.tmpdir())
 */
function handleHookPayload(hookData, opts) {
  try {
    // 1. Extract file_path — exit silently if not present
    const filePath = hookData && hookData.tool_input && hookData.tool_input.file_path;
    if (!filePath) return;

    // 2. Only act on .planning/ writes (unix and windows path separators)
    const isPlanning = filePath.includes('/.planning/') || filePath.includes('\\.planning\\');
    if (!isPlanning) return;

    // 3. Resolve cwd from hook payload (same pattern as idle-suggestions.cjs)
    const cwd = (hookData && hookData.cwd) || process.cwd();

    // 4. Read session ID from .planning/config.json
    const configPath = path.join(cwd, '.planning', 'config.json');
    let sessionId = 'unknown';
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (cfg.monitoring && cfg.monitoring.session_id) {
        sessionId = cfg.monitoring.session_id;
      }
    } catch { /* config not found — use 'unknown' */ }

    // 5. Resolve marker path (injected markerDir for testing; default: os.tmpdir())
    const markerBaseDir = (opts && opts.markerDir) ? opts.markerDir : os.tmpdir();
    const markerPath = path.join(markerBaseDir, `pde-context-sync-${sessionId}.last-hash`);

    // 6. Read last hash from marker file (empty string if first run)
    let lastHash = '';
    try { lastHash = fs.readFileSync(markerPath, 'utf-8').trim(); } catch { /* first run */ }

    // 7. Compute current hash (injected for testing; default: real computeSourceHash)
    const planningDir = path.join(cwd, '.planning');
    const computeHash = (opts && opts.computeHashFn)
      ? opts.computeHashFn
      : require('../bin/lib/context-sync.cjs').computeSourceHash;
    const currentHash = computeHash(planningDir);

    // 8. Skip if hash unchanged (idempotency gate)
    if (currentHash === lastHash) return;

    // 9. Phase 129: scan monitored files for mtime changes before deciding emitAll vs ingestAll
    var contextSyncMod = require('../bin/lib/context-sync.cjs');
    var state = contextSyncMod.readStateFile(planningDir);
    var changed = scanMonitoredFiles(cwd, state);

    if (changed.length > 0) {
      // Editor files changed — ingestAll processes queue, merges, and calls emitAll internally
      var doIngest = (opts && opts.ingestAllFn) ? opts.ingestAllFn : contextSyncMod.ingestAll;
      doIngest(cwd);
    } else {
      // No editor changes — plain emitAll
      var doEmit = (opts && opts.emitAllFn) ? opts.emitAllFn : contextSyncMod.emitAll;
      doEmit(cwd);
    }

    // 10. Write new hash to marker file
    fs.writeFileSync(markerPath, currentHash, 'utf-8');
  } catch { /* swallow all errors — hook failures must never affect Claude Code execution */ }
}

// ─── scanMonitoredFiles ───────────────────────────────────────────────────────

var GRACE_MS = 500;
var DEBOUNCE_MS = 200;

/**
 * Scan MONITORED_FILES for files with mtime newer than lastEmittedAt + GRACE_MS.
 * Applies debounce: skips files already in pendingIngest within DEBOUNCE_MS.
 * Returns array of { path, detectedAt } for changed files.
 *
 * @param {string} cwd - Project root directory
 * @param {object|null} state - Parsed state file or null
 * @returns {Array<{path: string, detectedAt: string}>}
 */
function scanMonitoredFiles(cwd, state) {
  var contextSync = require('../bin/lib/context-sync.cjs');
  var monitoredFiles = contextSync.MONITORED_FILES;
  var lastEmitted = state && state.lastEmittedAt
    ? new Date(state.lastEmittedAt).getTime() : 0;
  var pendingIngest = (state && state.pendingIngest) || [];
  var changed = [];

  for (var i = 0; i < monitoredFiles.length; i++) {
    var entry = monitoredFiles[i];
    var absPath = path.join(cwd, entry.path);
    var stat;
    try { stat = fs.statSync(absPath); } catch { continue; }

    // Skip files within grace period
    if (stat.mtimeMs <= lastEmitted + GRACE_MS) continue;

    // Debounce: skip if already queued in pendingIngest within 200ms
    var now = Date.now();
    var alreadyQueued = pendingIngest.some(function(e) {
      return e.path === entry.path &&
        (now - new Date(e.detectedAt).getTime()) < DEBOUNCE_MS;
    });
    if (alreadyQueued) continue;

    changed.push({ path: entry.path, detectedAt: new Date().toISOString() });
  }
  return changed;
}

module.exports = { handleHookPayload, scanMonitoredFiles };

// ─── Stdin reader (production entry point) ───────────────────────────────────

// Only run stdin handler when invoked directly (not during require() in tests)
if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', chunk => { raw += chunk; });
  process.stdin.on('end', () => {
    let hookData;
    try { hookData = JSON.parse(raw); } catch { process.exit(0); }
    handleHookPayload(hookData);
    process.exit(0);
  });
}
