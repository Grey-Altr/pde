'use strict';

// vitest globals: describe, it, expect, vi are injected by vitest (globals: true in config)

const { routeSession } = require('../../packages/dispatcher/lib/remote-router.cjs');
const { detectManagedBackend } = require('../../packages/dispatcher/lib/remote-managed.cjs');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const sshConfig = {
  host: 'build.example.com',
  username: 'deploy',
  repo_path: '/home/deploy/project',
  preferred_backend: 'ssh',
};

// ─── Tests: routeSession ─────────────────────────────────────────────────────

describe('routeSession', () => {
  it('returns local for interactive sessions', async () => {
    // isAutonomous=false → always 'local' regardless of remote config (RMT-05)
    const result = await routeSession({ isAutonomous: false, remoteConfig: sshConfig });
    expect(result).toBe('local');
  });

  it('returns local when no remoteConfig', async () => {
    // Autonomous but no remote config → local fallback
    const result = await routeSession({ isAutonomous: true, remoteConfig: undefined });
    expect(result).toBe('local');
  });

  it('returns local when remoteConfig has no host', async () => {
    // Autonomous, config exists but host missing → local fallback
    const result = await routeSession({ isAutonomous: true, remoteConfig: {} });
    expect(result).toBe('local');
  });

  it('returns ssh for autonomous session with host configured', async () => {
    // Standard SSH dispatch — host set, preferred_backend: 'ssh'
    const result = await routeSession({ isAutonomous: true, remoteConfig: sshConfig });
    expect(result).toBe('ssh');
  });

  it('returns managed when preferred_backend is managed and backend available', async () => {
    // Inject a managed backend that reports available
    const managedConfig = { ...sshConfig, preferred_backend: 'managed' };
    const result = await routeSession({
      isAutonomous: true,
      remoteConfig: managedConfig,
      _detectManaged: async () => ({ available: true }),
    });
    expect(result).toBe('managed');
  });

  it('falls back to ssh when preferred_backend is managed but backend unavailable', async () => {
    // Managed probed and unavailable → fall through to SSH
    const managedConfig = { ...sshConfig, preferred_backend: 'managed' };
    const result = await routeSession({
      isAutonomous: true,
      remoteConfig: managedConfig,
      _detectManaged: async () => ({ available: false }),
    });
    expect(result).toBe('ssh');
  });

  it('returns ssh when preferred_backend is explicitly ssh', async () => {
    // Explicit SSH preference — same as default but confirms explicit config works
    const result = await routeSession({
      isAutonomous: true,
      remoteConfig: { ...sshConfig, preferred_backend: 'ssh' },
    });
    expect(result).toBe('ssh');
  });
});

// ─── Tests: detectManagedBackend ─────────────────────────────────────────────

describe('detectManagedBackend', () => {
  // Phase 193: detectManagedBackend now probes 'claude auth status --json' (CLD-08).
  // Updated from v0.18 stub (always false) to real OAuth probe via _deps injection.
  it('returns unavailable when authMethod !== "claude.ai" (stubbed _deps)', async () => {
    const execCommand = vi.fn().mockResolvedValue(
      JSON.stringify({ loggedIn: false, authMethod: 'none' })
    );
    const result = await detectManagedBackend({ execCommand });
    expect(result).toMatchObject({
      available: false,
      reason: expect.any(String),
    });
  });

  it('returns available when authMethod === "claude.ai" (stubbed _deps)', async () => {
    const execCommand = vi.fn().mockResolvedValue(
      JSON.stringify({ loggedIn: true, authMethod: 'claude.ai' })
    );
    const result = await detectManagedBackend({ execCommand });
    expect(result).toMatchObject({ available: true });
  });

  it('returns unavailable when CLI fails (stubbed _deps)', async () => {
    const execCommand = vi.fn().mockRejectedValue(new Error('command not found'));
    const result = await detectManagedBackend({ execCommand });
    expect(result).toMatchObject({
      available: false,
      reason: expect.stringContaining('claude auth status failed'),
    });
  });
});
