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
  it('returns unavailable in v0.18 (always { available: false })', async () => {
    const result = await detectManagedBackend();
    expect(result).toMatchObject({
      available: false,
      reason: expect.stringContaining('GitHub'),
    });
  });
});
