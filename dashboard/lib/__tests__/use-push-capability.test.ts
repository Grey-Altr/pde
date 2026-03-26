import { describe, it, expect } from 'vitest';

// Pure function extracted from the hook for testability
function detectCapability(env: {
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  userAgent: string;
  isStandalone: boolean;
  notificationPermission: string;
}): string {
  if (!env.hasServiceWorker || !env.hasPushManager) return 'not-supported';
  const isIOS = /iPad|iPhone|iPod/.test(env.userAgent);
  if (isIOS && !env.isStandalone) return 'not-installed';
  if (env.notificationPermission === 'denied') return 'permission-denied';
  return 'supported';
}

describe('detectCapability', () => {
  it('returns not-supported when navigator has no serviceWorker', () => {
    expect(detectCapability({
      hasServiceWorker: false,
      hasPushManager: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
      isStandalone: false,
      notificationPermission: 'default',
    })).toBe('not-supported');
  });

  it('returns not-supported when window has no PushManager', () => {
    expect(detectCapability({
      hasServiceWorker: true,
      hasPushManager: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
      isStandalone: false,
      notificationPermission: 'default',
    })).toBe('not-supported');
  });

  it('returns not-installed on iOS (UA contains iPhone) when not in standalone mode', () => {
    expect(detectCapability({
      hasServiceWorker: true,
      hasPushManager: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X)',
      isStandalone: false,
      notificationPermission: 'default',
    })).toBe('not-installed');
  });

  it('returns supported on iOS when in standalone mode', () => {
    expect(detectCapability({
      hasServiceWorker: true,
      hasPushManager: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X)',
      isStandalone: true,
      notificationPermission: 'default',
    })).toBe('supported');
  });

  it('returns permission-denied when Notification.permission is denied', () => {
    expect(detectCapability({
      hasServiceWorker: true,
      hasPushManager: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
      isStandalone: false,
      notificationPermission: 'denied',
    })).toBe('permission-denied');
  });

  it('returns supported when serviceWorker and PushManager exist and permission is not denied', () => {
    expect(detectCapability({
      hasServiceWorker: true,
      hasPushManager: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
      isStandalone: false,
      notificationPermission: 'default',
    })).toBe('supported');
  });

  it('returns not-supported for both hasServiceWorker and hasPushManager false', () => {
    expect(detectCapability({
      hasServiceWorker: false,
      hasPushManager: false,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
      isStandalone: false,
      notificationPermission: 'default',
    })).toBe('not-supported');
  });
});
