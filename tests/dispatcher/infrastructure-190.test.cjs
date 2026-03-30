'use strict';

/**
 * infrastructure-190.test.cjs — Tests for Phase 190 infrastructure extensions
 *
 * Covers:
 *   INF-01: lock.cjs cloud/docker session guard (never reclaim cloud/docker locks)
 *   INF-02: aggregator.cjs RemoteAggregator routing for cloud/docker sessions
 *   INF-06: config.cjs VALID_CONFIG_KEYS includes 6 new cloud/docker keys
 *   CLD-06: packages/cloud-adapter/ scaffold is requireable with correct package name
 *
 * Uses vitest globals (no require('vitest') — globals: true in vitest.config.ts).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { acquireLock } = require('../../packages/dispatcher/lib/lock.cjs');
const { Aggregator } = require('../../packages/dispatcher/lib/aggregator.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTempRoot() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-lock-190-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
  return tmpDir;
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

// ─── MockTailCursor ───────────────────────────────────────────────────────────

class MockTailCursor {
  constructor(filePath, onLine) {
    this.filePath = filePath;
    this.onLine = onLine;
    this.started = false;
    this.stopped = false;
    MockTailCursor.instances.push(this);
  }
  start(ms) { this.started = true; this.ms = ms; }
  stop() { this.stopped = true; }
}
MockTailCursor.instances = [];

// ─── MockRemoteAggregator ─────────────────────────────────────────────────────

class MockRemoteAggregator {
  constructor(filePath, onLine) {
    this.filePath = filePath;
    this.onLine = onLine;
    this.started = false;
    this.stopped = false;
    MockRemoteAggregator.instances.push(this);
  }
  start(ms) { this.started = true; this.ms = ms; }
  stop() { this.stopped = true; }
}
MockRemoteAggregator.instances = [];

// ─── INF-01: lock.cjs cloud/docker guard ──────────────────────────────────────

describe('INF-01: acquireLock — cloud/docker session guard', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = makeTempRoot();
    MockTailCursor.instances.length = 0;
    MockRemoteAggregator.instances.length = 0;
  });

  afterEach(() => {
    cleanup(tmpRoot);
  });

  it('returns { acquired: false } when existing lock has sessionType="cloud" and pid=null', () => {
    const lockPath = path.join(tmpRoot, '.planning', 'dispatcher.lock');
    fs.writeFileSync(lockPath, JSON.stringify({ pid: null, ts: Date.now(), sessionType: 'cloud' }));
    const result = acquireLock(tmpRoot);
    expect(result.acquired).toBe(false);
  });

  it('returns { acquired: false } when existing lock has sessionType="docker" and pid=null', () => {
    const lockPath = path.join(tmpRoot, '.planning', 'dispatcher.lock');
    fs.writeFileSync(lockPath, JSON.stringify({ pid: null, ts: Date.now(), sessionType: 'docker' }));
    const result = acquireLock(tmpRoot);
    expect(result.acquired).toBe(false);
  });

  it('still reclaims stale local locks (dead pid, no sessionType) — backward compat', () => {
    const lockPath = path.join(tmpRoot, '.planning', 'dispatcher.lock');
    // PID 999999 is virtually guaranteed dead on any system
    fs.writeFileSync(lockPath, JSON.stringify({ pid: 999999, ts: Date.now() }));
    const result = acquireLock(tmpRoot);
    expect(result.acquired).toBe(true);
    // Cleanup: release the lock we just acquired
    try { fs.unlinkSync(lockPath); } catch (_) {}
  });

  it('acquires fresh lock when no lock file exists — backward compat', () => {
    const result = acquireLock(tmpRoot);
    expect(result.acquired).toBe(true);
    expect(result.lockPath).toBeDefined();
    // Cleanup
    try { fs.unlinkSync(result.lockPath); } catch (_) {}
  });
});

// ─── INF-02: aggregator.cjs RemoteAggregator routing ─────────────────────────

describe('INF-02: Aggregator — RemoteAggregator routing for cloud/docker sessions', () => {
  beforeEach(() => {
    MockTailCursor.instances.length = 0;
    MockRemoteAggregator.instances.length = 0;
  });

  it('watch(sid, "cloud") creates RemoteAggregator, not TailCursor', () => {
    const agg = new Aggregator(MockTailCursor, MockRemoteAggregator);
    agg.watch('test-cloud', 'cloud');
    expect(MockRemoteAggregator.instances).toHaveLength(1);
    expect(MockTailCursor.instances).toHaveLength(0);
  });

  it('watch(sid, "docker") creates RemoteAggregator, not TailCursor', () => {
    const agg = new Aggregator(MockTailCursor, MockRemoteAggregator);
    agg.watch('test-docker', 'docker');
    expect(MockRemoteAggregator.instances).toHaveLength(1);
    expect(MockTailCursor.instances).toHaveLength(0);
  });

  it('watch(sid) with no sessionType creates TailCursor (backward compat)', () => {
    const agg = new Aggregator(MockTailCursor, MockRemoteAggregator);
    agg.watch('test-local');
    expect(MockTailCursor.instances).toHaveLength(1);
    expect(MockRemoteAggregator.instances).toHaveLength(0);
  });

  it('RemoteAggregator has start() and stop() methods (interface parity)', () => {
    const { RemoteAggregator } = require('../../packages/dispatcher/lib/aggregator.cjs');
    const instance = new RemoteAggregator('/tmp/test.ndjson', () => {});
    expect(typeof instance.start).toBe('function');
    expect(typeof instance.stop).toBe('function');
  });

  it('watch() with cloud and docker creates 2 RemoteAggregator instances total', () => {
    const agg = new Aggregator(MockTailCursor, MockRemoteAggregator);
    agg.watch('test-cloud', 'cloud');
    agg.watch('test-docker', 'docker');
    expect(MockRemoteAggregator.instances).toHaveLength(2);
    expect(MockTailCursor.instances).toHaveLength(0);
  });
});

// ─── INF-06: config.cjs — cloud/docker dispatch keys ─────────────────────────

describe('INF-06: config.cjs VALID_CONFIG_KEYS — cloud/docker dispatch keys', () => {
  const configSource = fs.readFileSync(
    path.join(__dirname, '../../bin/lib/config.cjs'),
    'utf-8'
  );

  it('config.cjs contains "dispatch.cloud.enabled"', () => {
    expect(configSource).toContain("'dispatch.cloud.enabled'");
  });

  it('config.cjs contains "dispatch.cloud.provider"', () => {
    expect(configSource).toContain("'dispatch.cloud.provider'");
  });

  it('config.cjs contains "dispatch.cloud.idle_timeout"', () => {
    expect(configSource).toContain("'dispatch.cloud.idle_timeout'");
  });

  it('config.cjs contains "dispatch.docker.enabled"', () => {
    expect(configSource).toContain("'dispatch.docker.enabled'");
  });

  it('config.cjs contains "dispatch.docker.image"', () => {
    expect(configSource).toContain("'dispatch.docker.image'");
  });

  it('config.cjs contains "dispatch.docker.idle_timeout"', () => {
    expect(configSource).toContain("'dispatch.docker.idle_timeout'");
  });
});

// ─── CLD-06: packages/cloud-adapter/ scaffold ────────────────────────────────

describe('CLD-06: packages/cloud-adapter scaffold', () => {
  const cloudAdapterPkgPath = path.join(__dirname, '../../packages/cloud-adapter/package.json');

  it('packages/cloud-adapter/package.json exists', () => {
    expect(fs.existsSync(cloudAdapterPkgPath)).toBe(true);
  });

  it('packages/cloud-adapter/package.json has name "@pde/cloud-adapter"', () => {
    const pkg = JSON.parse(fs.readFileSync(cloudAdapterPkgPath, 'utf-8'));
    expect(pkg.name).toBe('@pde/cloud-adapter');
  });

  it('require("../../packages/cloud-adapter") does not throw', () => {
    expect(() => require('../../packages/cloud-adapter')).not.toThrow();
  });
});
