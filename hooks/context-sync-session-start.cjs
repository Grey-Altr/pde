#!/usr/bin/env node
'use strict';

/**
 * context-sync-session-start.cjs — SessionStart hook for reconciliation
 *
 * Runs reconcileOnStart() to scan monitored editor files for changes
 * since last emission. Produces ZERO stdout (SessionStart stdout = Claude context).
 *
 * Contracts:
 * - ZERO stdout — SessionStart stdout is injected into Claude's context
 * - Always exits 0
 * - async: true in hooks.json — non-blocking startup
 */

const path = require('path');

function handleSessionStart(hookData) {
  try {
    var cwd = (hookData && hookData.cwd) || process.cwd();
    var contextSync = require('../bin/lib/context-sync.cjs');
    contextSync.reconcileOnStart(cwd);
    // Result is NOT printed — zero stdout contract
  } catch {
    // Swallow all errors — hook failures must never affect Claude Code startup
  }
}

module.exports = { handleSessionStart };

if (require.main === module) {
  var raw = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', function(chunk) { raw += chunk; });
  process.stdin.on('end', function() {
    var hookData;
    try { hookData = JSON.parse(raw); } catch { process.exit(0); }
    handleSessionStart(hookData);
    process.exit(0);
  });
}
