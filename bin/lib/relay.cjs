'use strict';

/**
 * relay.cjs — Core relay module: TailCursor, BatchQueue, CircuitBreaker, postEvents
 *
 * Phase 134, Plan 02 — Relay Protocol and Transport Module
 * Requirements: RLY-01 (tailing + HTTP POST), RLY-02 (wire envelope wrapping + validation),
 *               RLY-03 (circuit breaker)
 *
 * Zero npm dependencies — only node: built-ins plus sibling relay-protocol.cjs.
 */

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const http = require('node:http');
const os = require('node:os');
const { createEnvelope, WireEnvelopeSchema } = require('./relay-protocol.cjs');

// ─── Circuit breaker state constants ──────────────────────────────────────────

const CB_CLOSED    = 'CLOSED';
const CB_OPEN      = 'OPEN';
const CB_HALF_OPEN = 'HALF_OPEN';

// ─── TailCursor ───────────────────────────────────────────────────────────────

/**
 * TailCursor — polls a single NDJSON file for new lines using byte-offset tracking.
 *
 * Handles:
 *   - File not existing yet (polls until it appears)
 *   - Truncation (stat.size < position → reset cursor to 0)
 *   - Rotation/replacement (inode change → reset cursor to 0)
 *   - Partial-line buffering (remainder accumulates until '\n')
 */
class TailCursor {
  /**
   * @param {string} filePath   — Absolute path to the NDJSON file to tail
   * @param {function} onLine   — Callback(lineString) invoked for each complete line
   */
  constructor(filePath, onLine) {
    this.filePath  = filePath;
    this.onLine    = onLine;
    this.position  = 0;
    this.lastIno   = null;
    this.remainder = '';
    this._interval = null;
  }

  /**
   * Start polling the file every intervalMs milliseconds.
   * @param {number} intervalMs — Poll interval (default 500ms)
   */
  start(intervalMs = 500) {
    this._interval = setInterval(() => this._poll(), intervalMs);
  }

  /**
   * Stop polling. Clears the interval.
   */
  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  /**
   * Internal poll — called by setInterval on each tick.
   * Reads new bytes from file since last position, emits complete lines.
   */
  _poll() {
    let stat;
    try {
      stat = fs.statSync(this.filePath);
    } catch {
      return; // file not yet created — wait silently
    }

    // Rotation detection: inode changed (file was replaced)
    if (this.lastIno !== null && stat.ino !== this.lastIno) {
      this.position  = 0;
      this.remainder = '';
    }
    this.lastIno = stat.ino;

    // Truncation detection: file shrunk
    if (stat.size < this.position) {
      this.position  = 0;
      this.remainder = '';
    }

    // No new data
    if (stat.size === this.position) return;

    const length = stat.size - this.position;
    const buf    = Buffer.allocUnsafe(length);
    const fd     = fs.openSync(this.filePath, 'r');
    let bytesRead = 0;
    try {
      bytesRead = fs.readSync(fd, buf, 0, length, this.position);
    } finally {
      fs.closeSync(fd);
    }

    this.position += bytesRead;

    const chunk = this.remainder + buf.slice(0, bytesRead).toString('utf8');
    const lines = chunk.split('\n');
    this.remainder = lines.pop(); // last element may be incomplete

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) this.onLine(trimmed);
    }
  }
}

// ─── BatchQueue ───────────────────────────────────────────────────────────────

/**
 * BatchQueue — accumulates events and flushes on count threshold or timer.
 *
 * Buffer cap: when queue.length >= maxBufferSize, oldest event is dropped (ring-buffer
 * semantics — monitoring data prefers recency).
 */
class BatchQueue {
  /**
   * @param {object} opts
   * @param {number} opts.maxBatchSize     — Flush when queue reaches this count (default 50)
   * @param {number} opts.flushIntervalMs  — Time-based flush interval in ms (default 2000)
   * @param {number} opts.maxBufferSize    — Hard cap on in-memory queue size (default 1000)
   * @param {function} opts.onFlush        — async (events[]) => void — called on each flush
   */
  constructor({ maxBatchSize = 50, flushIntervalMs = 2000, maxBufferSize = 1000, onFlush }) {
    this.queue          = [];
    this.maxBatchSize   = maxBatchSize;
    this.flushIntervalMs = flushIntervalMs;
    this.maxBufferSize  = maxBufferSize;
    this.onFlush        = onFlush;
    this._timer         = null;
  }

  /**
   * Add an event to the queue. Drops oldest if buffer is at capacity.
   * Flushes immediately if count threshold is reached.
   * @param {*} event
   */
  push(event) {
    if (this.queue.length >= this.maxBufferSize) {
      this.queue.shift(); // drop oldest — prefer recency
    }
    this.queue.push(event);
    if (this.queue.length >= this.maxBatchSize) {
      this._flush();
    }
  }

  /**
   * Start the time-based flush timer.
   */
  start() {
    this._timer = setInterval(() => this._flush(), this.flushIntervalMs);
  }

  /**
   * Stop the timer and flush any remaining events.
   * @returns {Promise<void>}
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    return this._flush();
  }

  /**
   * Flush up to maxBatchSize events from the front of the queue.
   * Errors from onFlush are swallowed — circuit breaker handles retry logic.
   * @returns {Promise<void>}
   */
  _flush() {
    if (this.queue.length === 0) return Promise.resolve();
    const batch = this.queue.splice(0, this.maxBatchSize);
    return this.onFlush(batch).catch(() => {}); // swallow errors
  }
}

// ─── CircuitBreaker ───────────────────────────────────────────────────────────

/**
 * CircuitBreaker — tracks consecutive failures and temporarily stops attempts.
 *
 * States:
 *   CLOSED    — Normal operation. All attempts allowed.
 *   OPEN      — Failing fast. Attempts blocked until cooldown elapses.
 *   HALF_OPEN — Probe state. One attempt allowed; if it succeeds → CLOSED,
 *               if it fails → OPEN again.
 */
class CircuitBreaker {
  /**
   * @param {object} opts
   * @param {number} opts.failureThreshold — Consecutive failures before opening (default 5)
   * @param {number} opts.cooldownMs       — Time in OPEN before probing (default 30000)
   */
  constructor({ failureThreshold = 5, cooldownMs = 30000 }) {
    this.state            = CB_CLOSED;
    this.failureCount     = 0;
    this.failureThreshold = failureThreshold;
    this.cooldownMs       = cooldownMs;
    this._openedAt        = null;
  }

  /**
   * Returns true if an attempt should be allowed through.
   * Side-effect: transitions OPEN → HALF_OPEN when cooldown has elapsed.
   * @returns {boolean}
   */
  canAttempt() {
    if (this.state === CB_CLOSED) return true;
    if (this.state === CB_OPEN) {
      if (Date.now() - this._openedAt >= this.cooldownMs) {
        this.state = CB_HALF_OPEN;
        return true; // one probe allowed
      }
      return false; // still in cooldown
    }
    if (this.state === CB_HALF_OPEN) return true;
    return false;
  }

  /**
   * Record a successful attempt. Resets failure count and closes the circuit.
   */
  recordSuccess() {
    this.failureCount = 0;
    this.state        = CB_CLOSED;
  }

  /**
   * Record a failed attempt.
   * - HALF_OPEN → OPEN immediately (probe failed)
   * - CLOSED → if failureCount >= threshold, transition to OPEN
   */
  recordFailure() {
    this.failureCount++;
    if (this.state === CB_HALF_OPEN) {
      // Probe failed — re-open the circuit
      this.state     = CB_OPEN;
      this._openedAt = Date.now();
    } else if (this.failureCount >= this.failureThreshold) {
      this.state     = CB_OPEN;
      this._openedAt = Date.now();
    }
  }
}

// ─── postEvents — HTTP POST transport ────────────────────────────────────────

/**
 * postEvents — Send a batch of wire envelopes via HTTP POST.
 *
 * Uses node:https or node:http based on URL scheme.
 * Sets Content-Type: application/json and Authorization: Bearer {token}.
 * Always drains the response body (res.resume()) to release the socket.
 *
 * @param {string} url          — Full URL of the ingest endpoint
 * @param {string} bearerToken  — Bearer token for Authorization header
 * @param {Array}  events       — Array of wire envelope objects to transmit
 * @returns {Promise<{ok: boolean, status: number}>}
 */
function postEvents(url, bearerToken, events) {
  return new Promise((resolve, reject) => {
    const body    = JSON.stringify(events);
    const urlObj  = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port:     urlObj.port || (isHttps ? 443 : 80),
      path:     urlObj.pathname + (urlObj.search || ''),
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization':  `Bearer ${bearerToken}`,
      },
      timeout: 10000, // socket inactivity timeout
    };

    const req = httpModule.request(options, (res) => {
      // CRITICAL: drain response body to release socket back to keep-alive pool
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve({ ok: true, status: res.statusCode });
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });

    req.on('timeout', () => {
      req.destroy(new Error('request timeout'));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Module-level relay instance ──────────────────────────────────────────────

/** Active relay handle (set by startRelay, cleared by stopRelay) */
let _activeRelay = null;

// ─── startRelay ───────────────────────────────────────────────────────────────

/**
 * startRelay — Wire up TailCursor, BatchQueue, and CircuitBreaker into a relay daemon.
 *
 * The onLine callback wraps each parsed PDE event in a wire envelope via createEnvelope,
 * then validates with WireEnvelopeSchema.safeParse before queueing. Events that fail
 * validation are silently dropped — they are NEVER transmitted (RLY-02).
 *
 * The onFlush callback sends via postEvents, guarded by the circuit breaker.
 *
 * @param {string} sessionId   — PDE session UUID (used in createEnvelope)
 * @param {object} opts
 * @param {string} opts.ingestUrl         — Target URL for HTTP POST (required)
 * @param {string} opts.bearerToken       — Bearer token for Authorization header
 * @param {number} opts.pollIntervalMs    — TailCursor poll interval (default 500)
 * @param {number} opts.batchSize         — BatchQueue maxBatchSize (default 50)
 * @param {number} opts.flushIntervalMs   — BatchQueue flush interval (default 2000)
 * @param {number} opts.failureThreshold  — CircuitBreaker threshold (default 5)
 * @param {number} opts.cooldownMs        — CircuitBreaker cooldown (default 30000)
 * @returns {{ stop: function }} — Handle with stop() to teardown all components
 */
function startRelay(sessionId, opts = {}) {
  const {
    ingestUrl        = '',
    bearerToken      = '',
    pollIntervalMs   = 500,
    batchSize        = 50,
    flushIntervalMs  = 2000,
    failureThreshold = 5,
    cooldownMs       = 30000,
  } = opts;

  const filePath = require('node:path').join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);

  // Circuit breaker for the HTTP transport
  const breaker = new CircuitBreaker({ failureThreshold, cooldownMs });

  // Batch queue — flushes via circuit-breaker-guarded postEvents
  const batchQueue = new BatchQueue({
    maxBatchSize:   batchSize,
    flushIntervalMs,
    onFlush: async (events) => {
      if (!breaker.canAttempt()) return; // circuit open — skip batch
      try {
        await postEvents(ingestUrl, bearerToken, events);
        breaker.recordSuccess();
      } catch (err) {
        breaker.recordFailure();
        // Error swallowed — RLY-05: relay failures must never surface to PDE
      }
    },
  });

  // Tail cursor — parses each line, wraps with createEnvelope, validates, then queues
  const tail = new TailCursor(filePath, (line) => {
    let parsedEvent;
    try {
      parsedEvent = JSON.parse(line);
    } catch {
      return; // skip unparseable lines
    }

    // RLY-02: wrap in wire envelope
    const envelope = createEnvelope(sessionId, parsedEvent);

    // RLY-02: validate against WireEnvelopeSchema before queueing
    const result = WireEnvelopeSchema.safeParse(envelope);
    if (!result.success) return; // drop invalid envelopes — never transmit

    // Queue validated envelope for batch transmission
    batchQueue.push(envelope);
  });

  tail.start(pollIntervalMs);
  batchQueue.start();

  const handle = {
    stop() {
      tail.stop();
      return batchQueue.stop();
    },
  };

  _activeRelay = handle;
  return handle;
}

// ─── stopRelay ────────────────────────────────────────────────────────────────

/**
 * stopRelay — Stop the currently active relay (if any).
 * Calls stop() on the active relay handle, then clears the reference.
 */
function stopRelay() {
  if (_activeRelay) {
    _activeRelay.stop();
    _activeRelay = null;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { TailCursor, BatchQueue, CircuitBreaker, postEvents, startRelay, stopRelay };
