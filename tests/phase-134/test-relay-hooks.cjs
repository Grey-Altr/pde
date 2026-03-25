'use strict';

/**
 * test-relay-hooks.cjs — Unit tests for hook scripts: start-relay.cjs, stop-relay.cjs
 *
 * Phase 134, Plan 03 — Hook integration with PDE_REMOTE env gate and zero-impact isolation
 * Requirements: RLY-04 (env gate), RLY-05 (zero-impact)
 *
 * Tests invoke hook scripts via spawnSync to validate actual hook behavior end-to-end.
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const hooksDir = path.join(__dirname, '..', '..', 'hooks');
const startRelayScript = path.join(hooksDir, 'start-relay.cjs');
const stopRelayScript = path.join(hooksDir, 'stop-relay.cjs');

/**
 * Build a minimal SessionStart hook payload.
 */
function makeSessionStartPayload(sessionId) {
  return JSON.stringify({
    hook_event_name: 'SessionStart',
    session_id: sessionId,
  });
}

/**
 * Build a minimal SessionEnd hook payload.
 */
function makeSessionEndPayload(sessionId) {
  return JSON.stringify({
    hook_event_name: 'SessionEnd',
    session_id: sessionId,
  });
}

describe('start-relay.cjs hook', () => {
  it('Test 1: exits 0 without spawning when PDE_REMOTE is unset', () => {
    const sessionId = crypto.randomUUID();
    const pidFile = path.join(os.tmpdir(), `pde-relay-${sessionId}.pid`);

    // Ensure no pre-existing PID file
    try { fs.unlinkSync(pidFile); } catch {}

    const envWithoutRemote = { ...process.env };
    delete envWithoutRemote.PDE_REMOTE;

    const result = spawnSync(process.execPath, [startRelayScript], {
      input: makeSessionStartPayload(sessionId),
      env: envWithoutRemote,
      timeout: 5000,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    // PID file must NOT be created when PDE_REMOTE is unset (no relay spawned)
    expect(fs.existsSync(pidFile)).toBe(false);
  });

  it('Test 2: exits 0 and writes PID file when PDE_REMOTE is set', { timeout: 8000 }, async () => {
    const sessionId = crypto.randomUUID();
    const pidFile = path.join(os.tmpdir(), `pde-relay-${sessionId}.pid`);

    // Ensure no pre-existing PID file
    try { fs.unlinkSync(pidFile); } catch {}

    const result = spawnSync(process.execPath, [startRelayScript], {
      input: makeSessionStartPayload(sessionId),
      env: {
        ...process.env,
        PDE_REMOTE: 'http://localhost:9999/api/ingest',
        PDE_RELAY_TOKEN: 'test-token',
      },
      timeout: 5000,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);

    // PID file should be created
    expect(fs.existsSync(pidFile)).toBe(true);

    // Clean up spawned daemon
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
      process.kill(pid, 'SIGTERM');
    } catch {}
    try { fs.unlinkSync(pidFile); } catch {}
  });

  it('Test 5: swallows spawn errors and exits 0 (zero-impact)', () => {
    const sessionId = crypto.randomUUID();

    // Provide an invalid node path to force a spawn error scenario by using a bad relay script path
    // We test error swallowing by pointing to a non-existent relay script
    const result = spawnSync(process.execPath, [startRelayScript], {
      input: makeSessionStartPayload(sessionId),
      env: {
        ...process.env,
        PDE_REMOTE: 'http://localhost:9999/api/ingest',
        PDE_RELAY_SCRIPT_OVERRIDE: '/nonexistent/path/relay.cjs', // custom override for testing
      },
      timeout: 5000,
      encoding: 'utf-8',
    });

    // Even if spawn fails, hook must exit 0
    expect(result.status).toBe(0);
  });

  it('Test 6: does not spawn duplicate when alive PID file already exists', { timeout: 8000 }, async () => {
    const sessionId = crypto.randomUUID();
    const pidFile = path.join(os.tmpdir(), `pde-relay-${sessionId}.pid`);

    // Write our own PID to simulate an alive relay
    fs.writeFileSync(pidFile, String(process.pid), 'utf-8');

    const result = spawnSync(process.execPath, [startRelayScript], {
      input: makeSessionStartPayload(sessionId),
      env: {
        ...process.env,
        PDE_REMOTE: 'http://localhost:9999/api/ingest',
        PDE_RELAY_TOKEN: 'test-token',
      },
      timeout: 5000,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    // PID file should still contain our PID (not overwritten with a new one)
    const pidContent = fs.readFileSync(pidFile, 'utf-8').trim();
    expect(parseInt(pidContent, 10)).toBe(process.pid);

    // Clean up
    try { fs.unlinkSync(pidFile); } catch {}
  });
});

describe('stop-relay.cjs hook', () => {
  it('Test 3: reads PID file and sends SIGTERM, then removes PID file', { timeout: 8000 }, async () => {
    const sessionId = crypto.randomUUID();
    const pidFile = path.join(os.tmpdir(), `pde-relay-${sessionId}.pid`);

    // Start a long-running child process to kill
    const { spawn } = require('node:child_process');
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    const childPid = child.pid;

    // Write its PID to the expected file
    fs.writeFileSync(pidFile, String(childPid), 'utf-8');

    // Now run stop-relay
    const result = spawnSync(process.execPath, [stopRelayScript], {
      input: makeSessionEndPayload(sessionId),
      env: { ...process.env },
      timeout: 5000,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    // PID file should be removed
    expect(fs.existsSync(pidFile)).toBe(false);
  });

  it('Test 4: exits 0 with no PID file present', () => {
    const sessionId = crypto.randomUUID();
    const pidFile = path.join(os.tmpdir(), `pde-relay-${sessionId}.pid`);

    // Ensure no PID file exists
    try { fs.unlinkSync(pidFile); } catch {}

    const result = spawnSync(process.execPath, [stopRelayScript], {
      input: makeSessionEndPayload(sessionId),
      env: { ...process.env },
      timeout: 5000,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
  });
});
