'use strict';
/**
 * test-relay-hook-session-id.cjs — Integration test: hook spawn path uses config.json UUID
 *
 * Phase 134.1 — Session ID namespace mismatch fix
 * Requirement: RLY-01 (re-verify after fix)
 *
 * Proves the relay daemon tails the config.json PDE UUID file,
 * NOT the hook payload session_id file, when spawned via the hook.
 *
 * Key distinction:
 *   - config UUID (pde-uuid-*): written by emit-event.cjs → pde-tools.cjs session-start
 *                               used by event-bus.cjs for NDJSON filename
 *                               must be used by start-relay.cjs for PID file + daemon arg
 *   - hook UUID (claude-conv-*): Claude conversation ID from the hook payload
 *                                must NOT be used for NDJSON file tailing
 */

const { spawnSync } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const hooksDir = path.join(__dirname, '..', '..', 'hooks');
const binLibDir = path.join(__dirname, '..', '..', 'bin', 'lib');
const startRelayScript = path.join(hooksDir, 'start-relay.cjs');
const stopRelayScript = path.join(hooksDir, 'stop-relay.cjs');
const relayScriptPath = path.join(binLibDir, 'relay.cjs');

/**
 * Build a valid PDE NDJSON event line that passes WireEnvelopeSchema validation.
 * The schema requires:
 *   - session_id: valid UUID v4
 *   - ts: ISO datetime string
 *   - schema_version: string
 *   - event_type: string
 *   - machine_id: string
 *   - approval_id: UUID string or null
 */
function makePdeEvent(sessionId, seq) {
  return JSON.stringify({
    seq,
    session_id: sessionId,
    schema_version: '1.0',
    machine_id: 'test-machine',
    ts: new Date().toISOString(),
    approval_id: null,
    event_type: 'phase_start',
    extensions: {},
    payload: { phase: 'test', seq },
  }) + '\n';
}

/**
 * Write a temp config.json with monitoring.session_id set.
 * Returns the temp directory path (CLAUDE_PLUGIN_ROOT).
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

/**
 * Start a mock HTTP ingest server. Returns { server, port, requests }.
 * Each POST body is pushed to requests[].
 */
function startMockServer() {
  const requests = [];
  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        requests.push(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port, requests });
    });
  });
}

/**
 * Poll until condition() is true or timeout is reached.
 */
function pollUntil(condition, { intervalMs = 200, timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - start >= timeoutMs) {
        reject(new Error(`pollUntil timed out after ${timeoutMs}ms`));
      } else {
        setTimeout(check, intervalMs);
      }
    };
    check();
  });
}

describe('hook spawn path uses config.json UUID for relay', () => {
  it('Test 1: relay tails config.json UUID file, not hook payload session_id', { timeout: 15000 }, async () => {
    // Two distinct valid UUIDs: config UUID (PDE) vs hook UUID (Claude conversation ID)
    // Both must be valid UUIDs to pass WireEnvelopeSchema validation
    const configUuid = crypto.randomUUID(); // PDE-generated UUID stored in config.json
    const hookUuid = crypto.randomUUID();   // Claude conversation ID from hook payload (different!)

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    writeTempConfig(tmpDir, configUuid);

    // NDJSON files — relay must tail the config UUID file, NOT the hook UUID file
    const configNdjson = path.join(os.tmpdir(), `pde-session-${configUuid}.ndjson`);
    const hookNdjson = path.join(os.tmpdir(), `pde-session-${hookUuid}.ndjson`);
    const pidFile = path.join(os.tmpdir(), `pde-relay-${configUuid}.pid`);
    const hookPidFile = path.join(os.tmpdir(), `pde-relay-${hookUuid}.pid`);

    // Clean up any leftover files
    for (const f of [configNdjson, hookNdjson, pidFile, hookPidFile]) {
      try { fs.unlinkSync(f); } catch {}
    }

    // Start mock HTTP ingest server
    const { server, port, requests } = await startMockServer();
    const ingestUrl = `http://127.0.0.1:${port}/api/ingest`;

    try {
      // Spawn start-relay.cjs with CLAUDE_PLUGIN_ROOT pointing to temp dir
      // Hook payload has DIFFERENT session_id than config UUID — relay must ignore hook UUID
      const hookPayload = JSON.stringify({
        hook_event_name: 'SessionStart',
        session_id: hookUuid,
      });

      const result = spawnSync(process.execPath, [startRelayScript], {
        input: hookPayload,
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: tmpDir,
          PDE_REMOTE: ingestUrl,
          PDE_RELAY_TOKEN: 'test-token',
          // Override relay script path to point to worktree's relay.cjs
          // (CLAUDE_PLUGIN_ROOT is a temp dir without bin/lib/relay.cjs)
          PDE_RELAY_SCRIPT_OVERRIDE: relayScriptPath,
        },
        timeout: 5000,
        encoding: 'utf-8',
      });

      expect(result.status).toBe(0);

      // PID file must use config UUID, NOT hook UUID
      expect(fs.existsSync(pidFile)).toBe(true);
      expect(fs.existsSync(hookPidFile)).toBe(false);

      // Give the relay daemon time to start up and initialize the tail cursor
      // The daemon is spawned detached and needs ~500ms to start polling
      await new Promise(resolve => setTimeout(resolve, 800));

      // Write 3 NDJSON events to the config UUID file (the one relay should be tailing)
      // Events must use the correct PDE event format to pass WireEnvelopeSchema validation
      const events = [1, 2, 3].map(seq => makePdeEvent(configUuid, seq));
      fs.writeFileSync(configNdjson, events.join(''), 'utf-8');

      // Wait up to 8 seconds for the mock server to receive at least 1 request
      // The relay flushes every 2000ms by default, so allow multiple flush cycles
      await pollUntil(() => requests.length >= 1, { intervalMs: 200, timeoutMs: 8000 });

      // Assert: mock server received requests containing events from the config UUID file
      expect(requests.length).toBeGreaterThanOrEqual(1);
      const allBodies = requests.join('\n');
      // The request body should contain the config UUID (events were written to config UUID NDJSON)
      expect(allBodies).toContain(configUuid);
      // The request body must NOT contain the hook UUID (relay must not have tailed the hook UUID file)
      expect(allBodies).not.toContain(hookUuid);
    } finally {
      // Cleanup: kill daemon via PID file
      try {
        const pidContent = fs.readFileSync(pidFile, 'utf-8').trim();
        const pid = parseInt(pidContent, 10);
        if (!isNaN(pid)) process.kill(pid, 'SIGTERM');
      } catch {}

      // Close mock server
      await new Promise(resolve => server.close(resolve));

      // Remove temp files
      for (const f of [configNdjson, hookNdjson, pidFile, hookPidFile]) {
        try { fs.unlinkSync(f); } catch {}
      }
      try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
    }
  });

  it('Test 2: stop-relay.cjs kills daemon using config UUID PID file', { timeout: 15000 }, async () => {
    // Two distinct valid UUIDs: config UUID (PDE) vs hook UUID (Claude conversation ID)
    const configUuid = crypto.randomUUID(); // PDE-generated UUID stored in config.json
    const hookUuid = crypto.randomUUID();   // Claude conversation ID from hook payload (different!)

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    writeTempConfig(tmpDir, configUuid);

    const pidFile = path.join(os.tmpdir(), `pde-relay-${configUuid}.pid`);

    // Clean up any leftover PID file
    try { fs.unlinkSync(pidFile); } catch {}

    // Start mock HTTP ingest server (relay needs a valid URL to spawn)
    const { server, port } = await startMockServer();
    const ingestUrl = `http://127.0.0.1:${port}/api/ingest`;

    try {
      // Spawn relay daemon via start-relay.cjs hook
      const startPayload = JSON.stringify({
        hook_event_name: 'SessionStart',
        session_id: hookUuid,  // hook UUID — relay must ignore this
      });

      const startResult = spawnSync(process.execPath, [startRelayScript], {
        input: startPayload,
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: tmpDir,
          PDE_REMOTE: ingestUrl,
          PDE_RELAY_TOKEN: 'test-token',
          // Override relay script path to point to worktree's relay.cjs
          // (CLAUDE_PLUGIN_ROOT is a temp dir without bin/lib/relay.cjs)
          PDE_RELAY_SCRIPT_OVERRIDE: relayScriptPath,
        },
        timeout: 5000,
        encoding: 'utf-8',
      });

      expect(startResult.status).toBe(0);
      expect(fs.existsSync(pidFile)).toBe(true);

      // Read the PID and verify daemon is alive
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
      expect(isNaN(pid)).toBe(false);

      // Verify daemon is alive via signal 0
      let isAlive = false;
      try {
        process.kill(pid, 0);
        isAlive = true;
      } catch {}
      expect(isAlive).toBe(true);

      // Now stop the relay via stop-relay.cjs hook with DIFFERENT hook UUID than config
      const stopPayload = JSON.stringify({
        hook_event_name: 'SessionEnd',
        session_id: hookUuid,  // hook UUID — stop-relay must ignore this, use config UUID
      });

      const stopResult = spawnSync(process.execPath, [stopRelayScript], {
        input: stopPayload,
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: tmpDir,
        },
        timeout: 5000,
        encoding: 'utf-8',
      });

      expect(stopResult.status).toBe(0);

      // PID file must be removed
      expect(fs.existsSync(pidFile)).toBe(false);

      // Daemon must be dead — give it a moment to receive SIGTERM
      await new Promise(resolve => setTimeout(resolve, 100));
      let isDead = false;
      try {
        process.kill(pid, 0);
      } catch {
        isDead = true;
      }
      expect(isDead).toBe(true);
    } finally {
      // Close mock server
      await new Promise(resolve => server.close(resolve));

      // Cleanup PID file if still present
      try { fs.unlinkSync(pidFile); } catch {}
      try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
    }
  });
});
