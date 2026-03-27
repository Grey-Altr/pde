'use strict';

/**
 * remote-router.cjs — Session routing decision layer for Phase 146 Remote Dispatch
 *
 * Satisfies: RMT-04 (routing decision tree), RMT-05 (interactive always local),
 *            RMT-06 (managed backend integration point)
 *
 * Determines whether a given session should run:
 *   - 'local'   — spawned in the current process (interactive or no remote config)
 *   - 'ssh'     — dispatched to a remote host over SSH
 *   - 'managed' — dispatched via claude --remote managed backend (deferred post-v0.18)
 *
 * Decision tree (evaluated in order):
 *   1. !isAutonomous         → 'local'   (RMT-05: interactive sessions are always local)
 *   2. !remoteConfig.host    → 'local'   (no SSH target configured)
 *   3. preferred_backend === 'managed'
 *        → probe managed backend
 *        → if available: 'managed'
 *        → if unavailable: continue to next rule
 *   4. remoteConfig.host set → 'ssh'
 *   5. default               → 'local'
 */

const _defaultDetectManaged =
  require('./remote-managed.cjs').detectManagedBackend;

/**
 * Route a session to the appropriate execution backend.
 *
 * @param {object} opts
 * @param {boolean} opts.isAutonomous       - True if the session is non-interactive (autonomous agent)
 * @param {object|null|undefined} opts.remoteConfig - dispatch.remote config block from project config.
 *   Shape: { host, username, identity_file, repo_path, plugin_dir, preferred_backend, env }
 * @param {Function} [opts._detectManaged]  - Injectable override for detectManagedBackend (testing only)
 *
 * @returns {Promise<'local' | 'ssh' | 'managed'>}
 */
async function routeSession({ isAutonomous, remoteConfig, _detectManaged }) {
  const detectManaged = _detectManaged || _defaultDetectManaged;

  // Rule 1: Interactive sessions always run locally (RMT-05)
  if (!isAutonomous) return 'local';

  // Rule 2: No remote config or no host → local
  if (!remoteConfig || !remoteConfig.host) return 'local';

  // Rule 3: Caller prefers managed backend — probe availability
  if (remoteConfig.preferred_backend === 'managed') {
    const probe = await detectManaged();
    if (probe.available) return 'managed';
    // Managed unavailable — fall through to SSH
  }

  // Rule 4: SSH target is configured
  if (remoteConfig.host) return 'ssh';

  // Rule 5: Default fallback (defensive)
  return 'local';
}

module.exports = { routeSession };
