'use strict';

/**
 * relay-protocol.cjs
 *
 * Wire protocol envelope schema and factory for the PDE relay daemon.
 * Phase 134 — Plan 01: Wire Protocol Schema
 * Requirement: RLY-02
 *
 * All events transmitted over HTTP must conform to WireEnvelopeSchema.
 * The schema uses zod for validation at call sites; createEnvelope does
 * NOT validate internally — callers validate as needed.
 */

const path = require('path');
const os = require('node:os');

// ─── Zod resolution ───────────────────────────────────────────────────────────
// Prefer zod from packages/pde-mcp-server/node_modules (locked version ^3.25.0)
// Fall back to bare require('zod') if project-level zod is available.

let z;
try {
  const zodPath = require.resolve('zod', {
    paths: [path.join(__dirname, '../../packages/pde-mcp-server')],
  });
  z = require(zodPath);
} catch (_e1) {
  try {
    z = require('zod');
  } catch (_e2) {
    throw new Error(
      'relay-protocol.cjs: Cannot resolve zod. Install zod or ensure packages/pde-mcp-server/node_modules/zod exists.'
    );
  }
}

// ─── Wire envelope schema ─────────────────────────────────────────────────────

/**
 * WireEnvelopeSchema
 *
 * Validates a relay wire envelope. All relay events must include these fields.
 * Additional PDE event fields (e.g. tool_name, file_path) pass through
 * unchanged via .passthrough().
 *
 * Required fields (RLY-02):
 *   seq          — Monotonic sequence number per session (non-negative integer)
 *   session_id   — PDE session UUID (v4)
 *   machine_id   — Hostname of the machine running the relay daemon
 *   relay_ts     — ISO 8601 datetime when the relay daemon processed this event
 *   approval_id  — UUID of a pending approval gate, or null if none
 *
 * Inherited PDE event fields:
 *   schema_version — Event schema version (e.g. "1.0")
 *   ts             — Original event timestamp from PDE
 *   event_type     — Event type string (e.g. "session_start")
 *   extensions     — Optional key-value extension map
 */
const WireEnvelopeSchema = z.object({
  seq:            z.number().int().nonnegative(),
  session_id:     z.string().uuid(),
  machine_id:     z.string().min(1),
  relay_ts:       z.string().datetime(),
  approval_id:    z.string().uuid().nullable(),
  schema_version: z.string(),
  ts:             z.string().datetime(),
  event_type:     z.string().min(1),
  extensions:     z.record(z.unknown()).optional(),
}).passthrough();

// ─── Module-level state ───────────────────────────────────────────────────────

/** Per-session monotonic sequence counter */
let _seq = 0;

/** Machine identifier — hostname of the relay daemon's host */
const _machineId = os.hostname();

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * createEnvelope(sessionId, pdeEvent) → wire envelope object
 *
 * Wraps a parsed PDE event in the relay wire envelope with relay-side fields.
 * Sequence counter is auto-incremented on each call.
 * Does NOT validate — callers should use WireEnvelopeSchema.safeParse() if needed.
 *
 * @param {string} sessionId   — Session UUID (v4)
 * @param {object} pdeEvent    — Parsed PDE event object from NDJSON line
 * @returns {object}           — Wire envelope ready for HTTP transmission
 */
function createEnvelope(sessionId, pdeEvent) {
  return {
    seq:        _seq++,
    session_id: sessionId,
    machine_id: _machineId,
    relay_ts:   new Date().toISOString(),
    approval_id: (pdeEvent && pdeEvent.approval_id != null) ? pdeEvent.approval_id : null,
    ...pdeEvent,
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * resetSequence() — Reset the monotonic sequence counter to 0.
 *
 * Used in tests to isolate sequence state between test runs.
 * In production, counter resets naturally on process restart.
 */
function resetSequence() {
  _seq = 0;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { WireEnvelopeSchema, createEnvelope, resetSequence };
