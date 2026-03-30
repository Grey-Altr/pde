'use strict';

/**
 * remote-managed.cjs — Managed backend detection for Phase 193 Cloud Web Backend
 *
 * Phase 193: Cloud Dispatch & State Sync
 * Satisfies: CLD-08 (OAuth probe for claude.ai auth)
 *
 * Replaced the Phase 146 stub with a real OAuth probe.
 * Probes `claude auth status --json` to check if the user is logged in
 * with claude.ai OAuth (authMethod === 'claude.ai').
 *
 * Note: CONTEXT.md referenced github_connected but that field does not exist in
 * claude auth status --json (v2.1.87). Using authMethod === 'claude.ai' per research.
 *
 * CRITICAL: Use '--json' NOT '--output-format json' — that flag does not exist per research.
 */

const childProcess = require('node:child_process');

/**
 * Default execCommand: safe child_process.execFile wrapper.
 * Splits command string into binary + args array (no shell injection).
 *
 * @param {string} cmd - Full command string
 * @returns {Promise<string>} Resolves to stdout.trim()
 */
function defaultExecCommand(cmd) {
  const parts = cmd.split(/\s+/);
  const bin = parts[0];
  const args = parts.slice(1);
  return new Promise((resolve, reject) => {
    childProcess.execFile(bin, args, { timeout: 10000 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

/**
 * Detect whether the managed backend (claude.ai OAuth) is available for dispatch.
 * Probes `claude auth status --json` to check authMethod === 'claude.ai'.
 *
 * @param {object} [_deps]               - Optional dependency injection for testing
 * @param {function} [_deps.execCommand] - Injectable execCommand
 * @returns {Promise<{ available: boolean, reason?: string }>}
 */
async function detectManagedBackend(_deps) {
  const execCommand = (_deps && _deps.execCommand) || defaultExecCommand;

  try {
    const raw = await execCommand('claude auth status --json');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return { available: false, reason: 'claude auth status --json returned non-JSON output' };
    }

    if (parsed.loggedIn === true && parsed.authMethod === 'claude.ai') {
      return { available: true };
    }
    return { available: false, reason: 'Not logged in with claude.ai OAuth' };
  } catch (err) {
    return { available: false, reason: 'claude auth status failed: ' + err.message };
  }
}

module.exports = { detectManagedBackend };
