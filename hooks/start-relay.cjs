#!/usr/bin/env node
'use strict';

/**
 * start-relay.cjs — PDE SessionStart hook: spawns relay daemon if PDE_REMOTE is set.
 *
 * Phase 134, Plan 03 — Hook integration
 * Requirements: RLY-04 (env gate), RLY-05 (zero-impact)
 *
 * - PDE_REMOTE unset → exit 0 immediately, no relay activity
 * - PDE_REMOTE set → spawn relay daemon as detached process, write PID file
 * - Any error → silently swallowed, exit 0 (relay failure must never affect PDE)
 */

const { spawn } = require('node:child_process');
const fs         = require('node:fs');
const os         = require('node:os');
const path       = require('node:path');

// Resolve plugin root: use CLAUDE_PLUGIN_ROOT env var, fall back to parent of hooks/ dir
const pluginRoot  = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
// Allow override for testing (PDE_RELAY_SCRIPT_OVERRIDE)
const relayScript = process.env.PDE_RELAY_SCRIPT_OVERRIDE
  || path.join(pluginRoot, 'bin', 'lib', 'relay.cjs');

let raw = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  // RLY-04: env gate — if PDE_REMOTE is not set, exit immediately with no relay activity
  if (!process.env.PDE_REMOTE) {
    process.exit(0);
  }

  const ingestUrl   = process.env.PDE_REMOTE;
  const bearerToken = process.env.PDE_RELAY_TOKEN || '';

  try {
    // Read PDE session UUID from config.json (written by emit-event.cjs before this hook runs)
    // Do NOT use hookData.session_id — that's the Claude conversation ID, not the PDE UUID
    const configPath = path.join(pluginRoot, '.planning', 'config.json');
    let sessionId = '';
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      sessionId = (cfg.monitoring && cfg.monitoring.session_id) || '';
    } catch {
      // config.json missing or unreadable — cannot operate, exit 0 (RLY-05)
    }

    if (!sessionId) {
      process.exit(0);
    }

    const pidFile = path.join(os.tmpdir(), `pde-relay-${sessionId}.pid`);

    // Duplicate guard: if PID file exists, check if process is still alive
    if (fs.existsSync(pidFile)) {
      try {
        const existingPid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
        if (!isNaN(existingPid)) {
          try {
            process.kill(existingPid, 0); // signal 0 = check if alive
            // Process is alive — do not spawn duplicate
            process.exit(0);
          } catch {
            // Process is dead (stale PID) — continue to spawn new relay
          }
        }
      } catch {
        // Could not read PID file — continue to spawn
      }
    }

    // Response file: relay stdout → named file so PDE can read approval responses
    const responseFile = path.join(os.tmpdir(), `pde-relay-responses-${sessionId}.ndjson`);
    const responseFd = fs.openSync(responseFile, 'a');

    // Spawn relay daemon as a detached background process
    const child = spawn(
      process.execPath,
      [relayScript, sessionId, ingestUrl, bearerToken],
      {
        detached: true,
        stdio:    ['ignore', responseFd, 'ignore'],
        env:      { ...process.env },
      }
    );

    // Close the fd in the parent — child holds its own copy independently
    fs.closeSync(responseFd);

    // Write PID file so stop-relay.cjs can kill the daemon later
    fs.writeFileSync(pidFile, String(child.pid), 'utf-8');

    // Unref allows this hook process to exit without waiting for the daemon
    child.unref();
  } catch {
    // RLY-05: any spawn/IO error silently swallowed — relay failure never affects PDE
  }

  process.exit(0);
});
