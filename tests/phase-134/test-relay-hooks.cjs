'use strict';

/**
 * test-relay-hooks.cjs — Unit tests for hook scripts: start-relay.cjs, stop-relay.cjs
 *
 * Phase 134, Plan 03 — Hook integration with PDE_REMOTE env gate and zero-impact isolation
 * Phase 134.1, Plan 01 — Updated to use config.json session ID (not hook payload session_id)
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

/**
 * Write a temp config.json with monitoring.session_id set.
 * Returns the temp directory path (which should be used as CLAUDE_PLUGIN_ROOT).
 */
function writeTempConfig(dir, sessionId) {
  const planningDir = path.join(dir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(
    path.join(planningDir, 'config.json'),
    JSON.stringify({ monitoring: { session_id: sessionId } }),
    'utf-8'
  );
  return dir;
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
    const configSessionId = crypto.randomUUID();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    const pidFile = path.join(os.tmpdir(), `pde-relay-${configSessionId}.pid`);

    // Ensure no pre-existing PID file
    try { fs.unlinkSync(pidFile); } catch {}

    // Write config.json with the PDE session UUID (fixed: hook now reads from config, not payload)
    writeTempConfig(tmpDir, configSessionId);

    // Hook payload may carry a different session_id (Claude conversation ID) — relay must ignore it
    const hookPayloadSessionId = crypto.randomUUID();

    const result = spawnSync(process.execPath, [startRelayScript], {
      input: makeSessionStartPayload(hookPayloadSessionId),
      env: {
        ...process.env,
        CLAUDE_PLUGIN_ROOT: tmpDir,
        PDE_REMOTE: 'http://localhost:9999/api/ingest',
        PDE_RELAY_TOKEN: 'test-token',
      },
      timeout: 5000,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);

    // PID file should be created using the config UUID (not the hook payload session_id)
    expect(fs.existsSync(pidFile)).toBe(true);

    // Clean up spawned daemon
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
      process.kill(pid, 'SIGTERM');
    } catch {}
    try { fs.unlinkSync(pidFile); } catch {}
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  });

  it('Test 5: swallows spawn errors and exits 0 (zero-impact)', () => {
    const configSessionId = crypto.randomUUID();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));

    // Write config.json so hook gets past the session ID check before hitting the bad relay script
    writeTempConfig(tmpDir, configSessionId);

    // Provide an invalid node path to force a spawn error scenario by using a bad relay script path
    // We test error swallowing by pointing to a non-existent relay script
    const result = spawnSync(process.execPath, [startRelayScript], {
      input: makeSessionStartPayload(crypto.randomUUID()),
      env: {
        ...process.env,
        CLAUDE_PLUGIN_ROOT: tmpDir,
        PDE_REMOTE: 'http://localhost:9999/api/ingest',
        PDE_RELAY_SCRIPT_OVERRIDE: '/nonexistent/path/relay.cjs', // custom override for testing
      },
      timeout: 5000,
      encoding: 'utf-8',
    });

    // Even if spawn fails, hook must exit 0
    expect(result.status).toBe(0);

    // Clean up
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  });

  it('Test 6: does not spawn duplicate when alive PID file already exists', { timeout: 8000 }, async () => {
    const configSessionId = crypto.randomUUID();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    const pidFile = path.join(os.tmpdir(), `pde-relay-${configSessionId}.pid`);

    // Write config.json with the same session ID that the PID file uses
    writeTempConfig(tmpDir, configSessionId);

    // Write our own PID to simulate an alive relay (using the config UUID for the filename)
    fs.writeFileSync(pidFile, String(process.pid), 'utf-8');

    const result = spawnSync(process.execPath, [startRelayScript], {
      input: makeSessionStartPayload(crypto.randomUUID()),
      env: {
        ...process.env,
        CLAUDE_PLUGIN_ROOT: tmpDir,
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
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  });
});

describe('stop-relay.cjs hook', () => {
  it('Test 3: reads PID file and sends SIGTERM, then removes PID file', { timeout: 8000 }, async () => {
    const configSessionId = crypto.randomUUID();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    const pidFile = path.join(os.tmpdir(), `pde-relay-${configSessionId}.pid`);

    // Write config.json with the same session ID that the PID file uses
    writeTempConfig(tmpDir, configSessionId);

    // Start a long-running child process to kill
    const { spawn } = require('node:child_process');
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    const childPid = child.pid;

    // Write its PID to the expected file (using config UUID for filename)
    fs.writeFileSync(pidFile, String(childPid), 'utf-8');

    // Now run stop-relay — it reads config.json for session UUID to find the PID file
    const result = spawnSync(process.execPath, [stopRelayScript], {
      input: makeSessionEndPayload(crypto.randomUUID()),
      env: {
        ...process.env,
        CLAUDE_PLUGIN_ROOT: tmpDir,
      },
      timeout: 5000,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    // PID file should be removed
    expect(fs.existsSync(pidFile)).toBe(false);

    // Clean up
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  });

  it('Test 4: exits 0 with no PID file present', () => {
    const configSessionId = crypto.randomUUID();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    const pidFile = path.join(os.tmpdir(), `pde-relay-${configSessionId}.pid`);

    // Write config.json so stop-relay can determine which PID file to look for
    writeTempConfig(tmpDir, configSessionId);

    // Ensure no PID file exists
    try { fs.unlinkSync(pidFile); } catch {}

    const result = spawnSync(process.execPath, [stopRelayScript], {
      input: makeSessionEndPayload(crypto.randomUUID()),
      env: {
        ...process.env,
        CLAUDE_PLUGIN_ROOT: tmpDir,
      },
      timeout: 5000,
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);

    // Clean up
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  });
});
