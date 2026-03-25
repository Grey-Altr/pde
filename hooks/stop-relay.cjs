#!/usr/bin/env node
'use strict';

/**
 * stop-relay.cjs — PDE SessionEnd hook: kills relay daemon via PID file.
 *
 * Phase 134, Plan 03 — Hook integration
 * Requirements: RLY-05 (zero-impact)
 *
 * - Reads PID file written by start-relay.cjs
 * - Sends SIGTERM to the relay daemon
 * - Removes the PID file
 * - Any error silently swallowed — hook always exits 0
 */

const fs   = require('node:fs');
const os   = require('node:os');
const path = require('node:path');

let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    // Parse hook payload to extract session_id
    let hookData;
    try { hookData = JSON.parse(raw); } catch { hookData = {}; }
    const sessionId = hookData.session_id || '';

    if (!sessionId) {
      process.exit(0);
    }

    const pidFile = path.join(os.tmpdir(), `pde-relay-${sessionId}.pid`);

    // Read PID file — if not found, nothing to stop
    let pidContent;
    try {
      pidContent = fs.readFileSync(pidFile, 'utf-8').trim();
    } catch {
      // No PID file — relay was never started (or already cleaned up)
      process.exit(0);
    }

    const pid = parseInt(pidContent, 10);
    if (!isNaN(pid)) {
      // Send SIGTERM to relay daemon — ignore if already dead
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        // Process already dead — ignore
      }
    }

    // Remove PID file
    try {
      fs.unlinkSync(pidFile);
    } catch {
      // Ignore if already removed
    }
  } catch {
    // RLY-05: any error silently swallowed — relay stop failure never affects PDE
  }

  process.exit(0);
});
