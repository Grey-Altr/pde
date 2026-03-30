/**
 * firecrawl-credit-guard.test.mjs
 * Phase 198 — Firecrawl Credit Guards & Concurrency Semaphore (FND-03, FND-04)
 *
 * Tests: readFirecrawlCredits, checkFirecrawlCredits, incrementFirecrawlUsage,
 *        acquireFirecrawlSemaphore functions
 * All functions accept optional configPath / semaphoreDir for test isolation.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bridge = require('../../bin/lib/mcp-bridge.cjs');

const {
  checkFirecrawlCredits,
  readFirecrawlCredits,
  incrementFirecrawlUsage,
  acquireFirecrawlSemaphore,
} = bridge;

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'pde-credit-test-'));
  mkdirSync(join(dir, '.planning'), { recursive: true });
  return dir;
}

function writeConfig(dir, config) {
  writeFileSync(join(dir, '.planning', 'config.json'), JSON.stringify(config, null, 2), 'utf-8');
}

function readConfig(dir) {
  return JSON.parse(readFileSync(join(dir, '.planning', 'config.json'), 'utf-8'));
}

function cfgPath(dir) {
  return join(dir, '.planning', 'config.json');
}

function makeSemaphoreDir() {
  return mkdtempSync(join(tmpdir(), 'pde-sem-test-'));
}

// ─── FND-03: readFirecrawlCredits ────────────────────────────────────────────

describe('FND-03: readFirecrawlCredits', () => {
  test('returns null when config.json has no quota.firecrawl block', () => {
    const dir = makeTempDir();
    try {
      writeConfig(dir, { mode: 'yolo' });
      const result = readFirecrawlCredits(cfgPath(dir));
      assert.strictEqual(result, null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns {remaining, total, ...} when config.json has valid firecrawl quota block', () => {
    const dir = makeTempDir();
    try {
      writeConfig(dir, {
        quota: {
          firecrawl: {
            remaining: 85000,
            total: 100000,
            last_checked: '2026-03-30T20:00:00Z',
            cache_ttl_ms: 300000,
            warning_threshold_pct: 80,
          },
        },
      });
      const result = readFirecrawlCredits(cfgPath(dir));
      assert.ok(result !== null, 'should return non-null');
      assert.strictEqual(result.remaining, 85000);
      assert.strictEqual(result.total, 100000);
      assert.strictEqual(result.cache_ttl_ms, 300000);
      assert.strictEqual(result.warning_threshold_pct, 80);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns cached data without modifying config.json (read-only)', () => {
    const dir = makeTempDir();
    try {
      const originalConfig = {
        quota: {
          firecrawl: {
            remaining: 50000,
            total: 100000,
            last_checked: '2026-03-30T20:00:00Z',
            cache_ttl_ms: 300000,
            warning_threshold_pct: 80,
          },
        },
      };
      writeConfig(dir, originalConfig);
      const before = readFileSync(cfgPath(dir), 'utf-8');
      readFirecrawlCredits(cfgPath(dir));
      const after = readFileSync(cfgPath(dir), 'utf-8');
      assert.strictEqual(before, after, 'config.json should not be modified by readFirecrawlCredits');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ─── FND-03/FND-04: checkFirecrawlCredits ────────────────────────────────────

describe('FND-03/FND-04: checkFirecrawlCredits', () => {
  test('returns {allowed: true, remaining: null, reason: "no_quota_configured"} when no quota block', () => {
    const dir = makeTempDir();
    try {
      writeConfig(dir, { mode: 'yolo' });
      const result = checkFirecrawlCredits(cfgPath(dir));
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.remaining, null);
      assert.strictEqual(result.reason, 'no_quota_configured');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns {allowed: true, remaining: 85000, reason: "ok"} when 15% used (below 80% threshold)', () => {
    const dir = makeTempDir();
    try {
      writeConfig(dir, {
        quota: {
          firecrawl: {
            remaining: 85000,
            total: 100000,
            last_checked: '2026-03-30T20:00:00Z',
            cache_ttl_ms: 300000,
            warning_threshold_pct: 80,
          },
        },
      });
      const result = checkFirecrawlCredits(cfgPath(dir));
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.remaining, 85000);
      assert.strictEqual(result.reason, 'ok');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns {allowed: true, remaining: 10000, reason: "quota_warning", pct: 90} when 90% used', () => {
    const dir = makeTempDir();
    try {
      writeConfig(dir, {
        quota: {
          firecrawl: {
            remaining: 10000,
            total: 100000,
            last_checked: '2026-03-30T20:00:00Z',
            cache_ttl_ms: 300000,
            warning_threshold_pct: 80,
          },
        },
      });
      const result = checkFirecrawlCredits(cfgPath(dir));
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.remaining, 10000);
      assert.strictEqual(result.reason, 'quota_warning');
      assert.strictEqual(result.pct, 90);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns {allowed: false, remaining: 0, reason: "quota_exhausted"} when remaining=0', () => {
    const dir = makeTempDir();
    try {
      writeConfig(dir, {
        quota: {
          firecrawl: {
            remaining: 0,
            total: 100000,
            last_checked: '2026-03-30T20:00:00Z',
            cache_ttl_ms: 300000,
            warning_threshold_pct: 80,
          },
        },
      });
      const result = checkFirecrawlCredits(cfgPath(dir));
      assert.strictEqual(result.allowed, false);
      assert.strictEqual(result.remaining, 0);
      assert.strictEqual(result.reason, 'quota_exhausted');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns {allowed: false, remaining: 0, reason: "quota_exhausted"} when remaining is negative', () => {
    const dir = makeTempDir();
    try {
      writeConfig(dir, {
        quota: {
          firecrawl: {
            remaining: -500,
            total: 100000,
            last_checked: '2026-03-30T20:00:00Z',
            cache_ttl_ms: 300000,
            warning_threshold_pct: 80,
          },
        },
      });
      const result = checkFirecrawlCredits(cfgPath(dir));
      assert.strictEqual(result.allowed, false);
      assert.strictEqual(result.remaining, 0);
      assert.strictEqual(result.reason, 'quota_exhausted');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ─── FND-03: incrementFirecrawlUsage ─────────────────────────────────────────

describe('FND-03: incrementFirecrawlUsage', () => {
  test('decrements remaining by the credit amount passed (e.g., 5 for extract)', () => {
    const dir = makeTempDir();
    try {
      writeConfig(dir, {
        quota: {
          firecrawl: {
            remaining: 100000,
            total: 100000,
            last_checked: '2026-03-30T20:00:00Z',
            cache_ttl_ms: 300000,
            warning_threshold_pct: 80,
          },
        },
      });
      const result = incrementFirecrawlUsage(5, cfgPath(dir));
      assert.strictEqual(result.remaining, 99995);
      assert.strictEqual(result.total, 100000);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('auto-initializes quota block with total=100000, remaining=100000 when missing', () => {
    const dir = makeTempDir();
    try {
      writeConfig(dir, { mode: 'yolo' });
      const result = incrementFirecrawlUsage(10, cfgPath(dir));
      assert.strictEqual(result.remaining, 99990);
      assert.strictEqual(result.total, 100000);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('persists updated remaining to config.json (read file after call, verify remaining decreased)', () => {
    const dir = makeTempDir();
    try {
      writeConfig(dir, {
        quota: {
          firecrawl: {
            remaining: 50000,
            total: 100000,
            last_checked: '2026-03-30T20:00:00Z',
            cache_ttl_ms: 300000,
            warning_threshold_pct: 80,
          },
        },
      });
      incrementFirecrawlUsage(100, cfgPath(dir));
      // Read back from disk to verify persistence
      const config = readConfig(dir);
      assert.strictEqual(config.quota.firecrawl.remaining, 49900);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ─── Concurrency: acquireFirecrawlSemaphore ──────────────────────────────────

describe('Concurrency: acquireFirecrawlSemaphore', () => {
  test('returns a release function when slot available', () => {
    const semDir = makeSemaphoreDir();
    try {
      const result = acquireFirecrawlSemaphore({ semaphoreDir: semDir });
      assert.ok(typeof result.release === 'function', 'should return a release function');
      assert.ok(typeof result.lockPath === 'string', 'should return a lockPath string');
      // Verify lockfile was created
      const locks = readdirSync(semDir).filter(f => f.endsWith('.lock'));
      assert.strictEqual(locks.length, 1, 'should have one lockfile');
      result.release();
    } finally {
      rmSync(semDir, { recursive: true, force: true });
    }
  });

  test('respects max concurrent limit (default 2)', () => {
    const semDir = makeSemaphoreDir();
    try {
      const s1 = acquireFirecrawlSemaphore({ semaphoreDir: semDir });
      const s2 = acquireFirecrawlSemaphore({ semaphoreDir: semDir });
      // Verify we have 2 locks
      const locks = readdirSync(semDir).filter(f => f.endsWith('.lock'));
      assert.strictEqual(locks.length, 2, 'should have 2 lockfiles before third acquire');
      // Third should throw
      let threw = false;
      try {
        acquireFirecrawlSemaphore({ semaphoreDir: semDir });
      } catch (err) {
        threw = true;
        assert.strictEqual(err.code, 'FIRECRAWL_CONCURRENCY_LIMIT');
      }
      assert.ok(threw, 'should have thrown FIRECRAWL_CONCURRENCY_LIMIT');
      s1.release();
      s2.release();
    } finally {
      rmSync(semDir, { recursive: true, force: true });
    }
  });

  test('release function removes lockfile from semaphore directory', () => {
    const semDir = makeSemaphoreDir();
    try {
      const result = acquireFirecrawlSemaphore({ semaphoreDir: semDir });
      const locksBefore = readdirSync(semDir).filter(f => f.endsWith('.lock'));
      assert.strictEqual(locksBefore.length, 1, 'should have one lockfile before release');
      result.release();
      const locksAfter = readdirSync(semDir).filter(f => f.endsWith('.lock'));
      assert.strictEqual(locksAfter.length, 0, 'should have no lockfiles after release');
    } finally {
      rmSync(semDir, { recursive: true, force: true });
    }
  });
});
