'use strict';

/**
 * Event Bus — In-process EventEmitter wrapper, session ID management, NDJSON appender
 *
 * Phase 58: Event Infrastructure Core
 * Satisfies: EVNT-01, EVNT-02, EVNT-05, EVNT-06
 *
 * CRITICAL: This module has NO top-level side effects.
 * Do NOT require this at the top of pde-tools.cjs — lazy-require inside case blocks only.
 */

const { EventEmitter } = require('events');
const { randomUUID } = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ─── Session ID state ─────────────────────────────────────────────────────────

let _sessionId = null;

/**
 * Generate a new session ID (UUID v4) and store it module-level.
 * @returns {string} The new session ID
 */
function generateSessionId() {
  _sessionId = randomUUID();
  return _sessionId;
}

/**
 * Return the current session ID, or null if none has been generated.
 * @returns {string|null}
 */
function getSessionId() {
  return _sessionId;
}

// ─── NDJSON append ────────────────────────────────────────────────────────────

/**
 * Append a single NDJSON event line to /tmp/pde-session-{sessionId}.ndjson.
 * Swallows ALL errors silently — event log failure must never crash a PDE workflow.
 *
 * @param {string} sessionId  The session UUID (used in the filename)
 * @param {object} envelope   The event envelope object to serialize
 */
function safeAppendEvent(sessionId, envelope) {
  const logPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
  try {
    fs.appendFileSync(logPath, JSON.stringify(envelope) + '\n', 'utf-8');
  } catch {
    // Swallow silently — event log failure must NEVER crash a PDE workflow
  }
}

// ─── Event Bus class ──────────────────────────────────────────────────────────

/**
 * PdeEventBus wraps Node.js EventEmitter for in-process fan-out within a single
 * pde-tools.cjs invocation. Consumers subscribe to specific event types or the
 * wildcard '*' event.
 *
 * dispatch() defers via setImmediate so the calling operation is not blocked.
 */
class PdeEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20); // supports 6 dashboard panes + log + cost + context
  }

  /**
   * Dispatch an event asynchronously (setImmediate-deferred).
   *
   * Builds the envelope, emits to specific event_type subscribers, emits to
   * wildcard '*' subscribers (for NDJSON writer), and appends to session log.
   *
   * @param {string} eventType  The event type (e.g. 'subagent_start', 'file_changed')
   * @param {object} payload    Optional payload fields merged into the envelope
   */
  dispatch(eventType, payload) {
    setImmediate(() => {
      const sessionId = (payload && payload.session_id) || _sessionId || 'unknown';
      const envelope = {
        schema_version: '1.0',
        ts: new Date().toISOString(),
        event_type: eventType,
        session_id: sessionId,
        ...payload,
        extensions: (payload && payload.extensions) || {},
      };
      this.emit(eventType, envelope);
      this.emit('*', envelope); // wildcard subscriber for NDJSON writer
      safeAppendEvent(sessionId, envelope);
    });
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

const bus = new PdeEventBus();

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { PdeEventBus, bus, generateSessionId, getSessionId, safeAppendEvent };
