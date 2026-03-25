'use strict';

/**
 * test-relay-e2e.cjs — Integration tests: NDJSON file -> relay -> mock HTTP endpoint
 *
 * Phase 134, Plan 03 — End-to-end relay pipeline verification
 *
 * Tests the full pipeline:
 *   NDJSON file write -> TailCursor reads -> createEnvelope wraps
 *   -> WireEnvelopeSchema validates -> BatchQueue batches
 *   -> postEvents sends -> mock HTTP server receives
 *
 * Uses in-process startRelay for testability (not spawned daemon).
 * Uses node:http to create a mock ingest server on port 0 (auto-assigned).
 */

const http   = require('node:http');
const fs     = require('node:fs');
const os     = require('node:os');
const path   = require('node:path');
const crypto = require('node:crypto');

const { startRelay } = require('../../bin/lib/relay.cjs');

/**
 * Create a mock HTTP ingest server on a random port.
 * Collects all received event batches in `server.receivedBatches`.
 *
 * @param {object} opts
 * @param {number} [opts.statusCode=200] — HTTP status to respond with
 * @returns {Promise<{ server: http.Server, url: string, receivedBatches: Array, close: Function }>}
 */
function createMockServer(opts = {}) {
  const statusCode = opts.statusCode ?? 200;
  const receivedBatches = [];

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.setEncoding('utf-8');
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const batch = JSON.parse(body);
          receivedBatches.push(batch);
        } catch {
          receivedBatches.push({ parseError: body });
        }
        res.writeHead(statusCode);
        res.end();
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const url = `http://127.0.0.1:${port}/api/ingest`;
      resolve({
        server,
        url,
        receivedBatches,
        close: () => new Promise(r => server.close(r)),
      });
    });

    server.on('error', reject);
  });
}

/**
 * Wait for condition() to return true within timeoutMs.
 * Polls every intervalMs.
 */
async function waitFor(condition, timeoutMs = 5000, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * Build a valid PDE event for testing.
 */
function makeEvent(eventType = 'session_start') {
  return {
    schema_version: '1.0',
    ts:             new Date().toISOString(),
    event_type:     eventType,
    extensions:     {},
  };
}

describe('relay end-to-end integration', () => {
  it('Test 1: 3 NDJSON events arrive at mock server within 5 seconds', { timeout: 15000 }, async () => {
    const sessionId  = crypto.randomUUID();
    const ndjsonPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
    const mock       = await createMockServer({ statusCode: 200 });

    let relayHandle;
    try {
      relayHandle = startRelay(sessionId, {
        ingestUrl:       mock.url,
        bearerToken:     'test-token',
        pollIntervalMs:  100,
        flushIntervalMs: 300,
        batchSize:       10,
        failureThreshold: 5,
        cooldownMs:      1000,
      });

      // Write 3 events to the NDJSON file
      const events = [
        makeEvent('session_start'),
        makeEvent('file_changed'),
        makeEvent('bash_called'),
      ];
      for (const event of events) {
        fs.appendFileSync(ndjsonPath, JSON.stringify(event) + '\n');
      }

      // Wait until mock server has received at least one batch containing all 3 events
      const arrived = await waitFor(
        () => {
          const total = mock.receivedBatches.reduce((sum, batch) => {
            return sum + (Array.isArray(batch) ? batch.length : 0);
          }, 0);
          return total >= 3;
        },
        5000,
        100
      );

      expect(arrived).toBe(true);

      // Verify we received the right number of events
      const totalReceived = mock.receivedBatches.reduce((sum, batch) => {
        return sum + (Array.isArray(batch) ? batch.length : 0);
      }, 0);
      expect(totalReceived).toBeGreaterThanOrEqual(3);
    } finally {
      if (relayHandle) await relayHandle.stop();
      await mock.close();
      try { fs.unlinkSync(ndjsonPath); } catch {}
    }
  });

  it('Test 2: events received at mock server are valid JSON arrays (batched)', { timeout: 15000 }, async () => {
    const sessionId  = crypto.randomUUID();
    const ndjsonPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
    const mock       = await createMockServer({ statusCode: 200 });

    let relayHandle;
    try {
      relayHandle = startRelay(sessionId, {
        ingestUrl:       mock.url,
        bearerToken:     'test-token',
        pollIntervalMs:  100,
        flushIntervalMs: 300,
        batchSize:       10,
        failureThreshold: 5,
        cooldownMs:      1000,
      });

      // Write 2 events
      fs.appendFileSync(ndjsonPath, JSON.stringify(makeEvent('tool_called')) + '\n');
      fs.appendFileSync(ndjsonPath, JSON.stringify(makeEvent('session_end')) + '\n');

      // Wait for events to arrive
      const arrived = await waitFor(
        () => mock.receivedBatches.length > 0,
        5000,
        100
      );

      expect(arrived).toBe(true);
      // Each batch must be an array (batched envelope format)
      for (const batch of mock.receivedBatches) {
        expect(Array.isArray(batch)).toBe(true);
        // Each item in the batch is a wire envelope with required fields
        for (const envelope of batch) {
          expect(typeof envelope.seq).toBe('number');
          expect(typeof envelope.session_id).toBe('string');
          expect(typeof envelope.machine_id).toBe('string');
          expect(typeof envelope.relay_ts).toBe('string');
          expect(typeof envelope.event_type).toBe('string');
        }
      }
    } finally {
      if (relayHandle) await relayHandle.stop();
      await mock.close();
      try { fs.unlinkSync(ndjsonPath); } catch {}
    }
  });

  it('Test 3: circuit breaker opens after failureThreshold 500 errors', { timeout: 15000 }, async () => {
    const sessionId  = crypto.randomUUID();
    const ndjsonPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
    // Mock server always returns 500
    const mock       = await createMockServer({ statusCode: 500 });

    let relayHandle;
    try {
      relayHandle = startRelay(sessionId, {
        ingestUrl:        mock.url,
        bearerToken:      'test-token',
        pollIntervalMs:   100,
        flushIntervalMs:  200,
        batchSize:        1,    // flush every 1 event to trigger failures fast
        failureThreshold: 3,    // open after 3 failures
        cooldownMs:       60000, // long cooldown to keep it open during test
      });

      // Write events to trigger HTTP failures
      for (let i = 0; i < 5; i++) {
        fs.appendFileSync(ndjsonPath, JSON.stringify(makeEvent('tool_called')) + '\n');
      }

      // Wait for circuit breaker to open (failureThreshold=3, so expect 3+ requests)
      const circuitOpened = await waitFor(
        () => mock.receivedBatches.length >= 3,
        5000,
        100
      );

      expect(circuitOpened).toBe(true);

      // Record the count when circuit opened
      const countWhenOpened = mock.receivedBatches.length;

      // Wait to see if more requests are sent (they shouldn't be with circuit open)
      await new Promise(r => setTimeout(r, 800));

      // With circuit open, should not have sent significantly more requests
      // (circuit may get a few more in-flight, allow small variance)
      expect(mock.receivedBatches.length).toBeLessThan(countWhenOpened + 5);
    } finally {
      if (relayHandle) await relayHandle.stop();
      await mock.close();
      try { fs.unlinkSync(ndjsonPath); } catch {}
    }
  });

  it('Test 4: circuit breaker transitions to HALF_OPEN after cooldown elapses', { timeout: 15000 }, async () => {
    const sessionId  = crypto.randomUUID();
    const ndjsonPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);

    let respondWith500 = true;
    let requestCount   = 0;

    // Server that starts returning 500 then switches to 200
    const mock500 = await new Promise((resolve) => {
      const receivedBatches = [];
      const server = http.createServer((req, res) => {
        let body = '';
        req.setEncoding('utf-8');
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          requestCount++;
          try { receivedBatches.push(JSON.parse(body)); } catch {}
          const code = respondWith500 ? 500 : 200;
          res.writeHead(code);
          res.end();
        });
      });
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        resolve({
          server,
          url: `http://127.0.0.1:${port}/api/ingest`,
          receivedBatches,
          close: () => new Promise(r => server.close(r)),
        });
      });
    });

    let relayHandle;
    try {
      relayHandle = startRelay(sessionId, {
        ingestUrl:        mock500.url,
        bearerToken:      'test-token',
        pollIntervalMs:   100,
        flushIntervalMs:  200,
        batchSize:        1,
        failureThreshold: 2,    // open after 2 failures
        cooldownMs:       500,  // short cooldown for testing
      });

      // Write initial events
      for (let i = 0; i < 5; i++) {
        fs.appendFileSync(ndjsonPath, JSON.stringify(makeEvent('tool_called')) + '\n');
      }

      // Wait for circuit to open (2+ failures)
      await waitFor(() => requestCount >= 2, 3000, 100);
      const countAfterOpen = requestCount;

      // Now switch server to 200 and wait for cooldown
      respondWith500 = false;
      await new Promise(r => setTimeout(r, 700)); // wait for cooldown (500ms)

      // Write another event to trigger HALF_OPEN probe
      fs.appendFileSync(ndjsonPath, JSON.stringify(makeEvent('session_start')) + '\n');

      // Wait for relay to probe and succeed (circuit should close)
      const probed = await waitFor(() => requestCount > countAfterOpen, 5000, 100);

      expect(probed).toBe(true);
    } finally {
      if (relayHandle) await relayHandle.stop();
      await mock500.close();
      try { fs.unlinkSync(ndjsonPath); } catch {}
    }
  });

  it('Test 5: relay with invalid/unreachable URL does not crash', { timeout: 15000 }, async () => {
    const sessionId  = crypto.randomUUID();
    const ndjsonPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);

    let relayHandle;
    try {
      // Use a port that nothing is listening on
      relayHandle = startRelay(sessionId, {
        ingestUrl:        'http://127.0.0.1:19999/api/ingest',
        bearerToken:      'test-token',
        pollIntervalMs:   100,
        flushIntervalMs:  200,
        batchSize:        5,
        failureThreshold: 2,
        cooldownMs:       500,
      });

      // Write events — they will fail to send but must not crash
      for (let i = 0; i < 5; i++) {
        fs.appendFileSync(ndjsonPath, JSON.stringify(makeEvent('tool_called')) + '\n');
      }

      // Wait a bit to let flush attempts run
      await new Promise(r => setTimeout(r, 800));

      // relay handle must still exist (no crash) — stop should not throw
      await expect(relayHandle.stop()).resolves.not.toThrow();
    } finally {
      if (relayHandle) {
        try { await relayHandle.stop(); } catch {}
      }
      try { fs.unlinkSync(ndjsonPath); } catch {}
    }
  });
});
