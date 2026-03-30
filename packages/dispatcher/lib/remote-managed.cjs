'use strict';

/**
 * remote-managed.cjs — Managed backend detection for PDE parallel dispatch
 *
 * Phase 193: Cloud Web Backend
 * Satisfies: CLD-08
 *
 * Probes `claude auth status --json` to determine whether the Claude AI
 * OAuth-based cloud backend is available for dispatch.
 *
 * Detection logic:
 *   1. Run `claude auth status --json`
 *   2. Parse JSON response
 *   3. Check loggedIn === true AND authMethod === 'claude.ai'
 *   4. Return { available: true } if both conditions are met
 *   5. Return { available: false, reason } otherwise
 *
 * Note: CONTEXT.md referenced github_connected but that field does not exist
 * in `claude auth status --json` (v2.1.87). Using authMethod === 'claude.ai'
 * per research. The '--json' flag is the correct form; '--output-format json'
 * does not exist in this CLI version.
 */

const childProcess = require('node:child_process');

/**
 * Default execCommand: safe execFile wrapper.
 * Splits a command string into binary + args array (no shell interpretation).
 * Returns a promise resolving to stdout.trim().
 *
 * @param {string} cmd - Full command string (e.g. "claude auth status --json")
 * @returns {Promise<string>}
 */
function defaultExecCommand(cmd) {
  return new Promise((resolve, reject) => {
    const parts = cmd.split(/\s+/);
    const bin = parts[0];
    const args = parts.slice(1);
    childProcess.execFile(bin, args, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * Detect whether the managed backend (Claude AI cloud) is available for dispatch.
 *
 * Probes `claude auth status --json` for OAuth authentication via claude.ai.
 * The managed backend requires authMethod === 'claude.ai' (not API key, not other OAuth).
 *
 * @param {object} [_deps] - DI: { execCommand } for testing
 * @returns {Promise<{ available: boolean, reason?: string }>}
 */
async function detectManagedBackend(_deps) {
  const execCommand = (_deps && _deps.execCommand) || defaultExecCommand;

  try {
    const raw = await execCommand('claude auth status --json');
    const parsed = JSON.parse(raw);

    if (parsed.loggedIn === true && parsed.authMethod === 'claude.ai') {
      return { available: true };
    }

    return {
      available: false,
      reason: 'Not logged in with claude.ai OAuth',
    };
  } catch (err) {
    return {
      available: false,
      reason: 'claude auth status failed: ' + err.message,
    };
  }
}

module.exports = { detectManagedBackend };
