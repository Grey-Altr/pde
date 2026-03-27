'use strict';

/**
 * remote-managed.cjs — Managed backend detection for Phase 146 Remote Dispatch
 *
 * Satisfies: RMT-06 (managed backend probe stub)
 *
 * WHY THIS IS A STUB (v0.18):
 *   `claude --remote` creates GitHub-connected web sessions, not programmatic
 *   dispatch backends. Specifically:
 *     - It does not support NDJSON streaming over stdout (required for PDE session tracking)
 *     - It is in active "Research Preview" with known bugs (#38066, #38049, #37713)
 *     - It requires GitHub connectivity and authentication that cannot be programmatically
 *       verified without interactive browser flows
 *     - CLAUDE.md propagation (--plugin-dir) is not confirmed to work in remote sessions
 *
 *   Decision recorded in STATE.md [Phase 146]: SSH-primary architecture; `claude --remote`
 *   deferred — research preview, no NDJSON streaming, no CLAUDE.md propagation.
 *
 * FUTURE (post-v0.18):
 *   When `claude --remote` matures, this function should:
 *     1. Probe `claude auth status --json` to check GitHub connectivity
 *     2. Verify NDJSON streaming support is available in the installed claude version
 *     3. Check for active remote session capacity
 *     4. Return { available: true } only when all checks pass
 */

/**
 * Detect whether the managed backend (claude --remote) is available for dispatch.
 *
 * In v0.18, always returns unavailable. The managed backend requires claude --remote
 * which is a GitHub-connected web session mechanism, not a programmatic dispatch
 * backend. Deferred to post-v0.18 per research findings.
 *
 * @returns {Promise<{ available: boolean, reason: string }>}
 */
async function detectManagedBackend() {
  return {
    available: false,
    reason:
      'claude --remote is a GitHub-connected web session, not a programmatic dispatch backend. ' +
      'Deferred to post-v0.18.',
  };
}

module.exports = { detectManagedBackend };
