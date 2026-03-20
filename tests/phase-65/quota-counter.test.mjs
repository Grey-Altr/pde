/**
 * quota-counter.test.mjs
 * Phase 65 — Quota Counter Infrastructure (QUOTA-01, QUOTA-02, QUOTA-03)
 *
 * Tests: readStitchQuota, incrementStitchQuota, checkStitchQuota functions
 * All three functions accept an optional configPath parameter for test isolation.
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const bridge = require('../../bin/lib/mcp-bridge.cjs');

const { readStitchQuota, incrementStitchQuota, checkStitchQuota } = bridge;

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'pde-quota-test-'));
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

// A date in the past (first of a past month) for lazy reset tests
function pastResetDate() {
  return new Date(Date.UTC(2020, 0, 1, 0, 0, 0, 0)).toISOString(); // 2020-01-01
}

// A date in the future (first of a future month) for active quota tests
function futureResetDate() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0));
  return next.toISOString();
}

// ─── QUOTA-01: readStitchQuota ─────────────────────────────────────────────────

test('QUOTA-01: readStitchQuota returns null when config.json has no quota block', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, { mode: 'yolo' });
    const result = readStitchQuota('standard', cfgPath(dir));
    assert.strictEqual(result, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-01: readStitchQuota returns null when config.json does not exist', () => {
  const dir = makeTempDir();
  try {
    // No config.json written
    const result = readStitchQuota('standard', cfgPath(dir));
    assert.strictEqual(result, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-01: readStitchQuota returns correct structure for standard quota', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, {
      quota: {
        stitch: {
          standard: { limit: 350, used: 10, reset_at: futureResetDate() },
        },
      },
    });
    const result = readStitchQuota('standard', cfgPath(dir));
    assert.ok(result !== null, 'should return non-null');
    assert.strictEqual(result.used, 10);
    assert.strictEqual(result.limit, 350);
    assert.ok(typeof result.reset_at === 'string', 'reset_at should be a string');
    assert.strictEqual(result.wasReset, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-01: readStitchQuota returns correct structure for experimental quota', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, {
      quota: {
        stitch: {
          experimental: { limit: 50, used: 5, reset_at: futureResetDate() },
        },
      },
    });
    const result = readStitchQuota('experimental', cfgPath(dir));
    assert.ok(result !== null, 'should return non-null');
    assert.strictEqual(result.used, 5);
    assert.strictEqual(result.limit, 50);
    assert.strictEqual(result.wasReset, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-01: readStitchQuota returns wasReset:true and used:0 when reset_at is in the past', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, {
      quota: {
        stitch: {
          standard: { limit: 350, used: 200, reset_at: pastResetDate() },
        },
      },
    });
    const result = readStitchQuota('standard', cfgPath(dir));
    assert.ok(result !== null, 'should return non-null');
    assert.strictEqual(result.used, 0);
    assert.strictEqual(result.limit, 350);
    assert.strictEqual(result.wasReset, true);
    // reset_at should be advanced to first of next month
    assert.ok(new Date(result.reset_at) > new Date(), 'new reset_at should be in the future');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── QUOTA-01: incrementStitchQuota ──────────────────────────────────────────

test('QUOTA-01: incrementStitchQuota increments used from 0 to 1', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, {
      quota: {
        stitch: {
          standard: { limit: 350, used: 0, reset_at: futureResetDate() },
        },
      },
    });
    const result = incrementStitchQuota('standard', cfgPath(dir));
    assert.strictEqual(result.used, 1);
    assert.strictEqual(result.limit, 350);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-01: incrementStitchQuota called 3 times results in used:3', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, {
      quota: {
        stitch: {
          standard: { limit: 350, used: 0, reset_at: futureResetDate() },
        },
      },
    });
    incrementStitchQuota('standard', cfgPath(dir));
    incrementStitchQuota('standard', cfgPath(dir));
    const result = incrementStitchQuota('standard', cfgPath(dir));
    assert.strictEqual(result.used, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-01: incrementStitchQuota auto-initializes quota block if missing', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, { mode: 'yolo' });
    const result = incrementStitchQuota('standard', cfgPath(dir));
    assert.strictEqual(result.used, 1);
    assert.strictEqual(result.limit, 350);
    assert.ok(typeof result.reset_at === 'string', 'reset_at should be set');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-01: incrementStitchQuota writes result to config.json (persists)', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, { mode: 'yolo' });
    incrementStitchQuota('standard', cfgPath(dir));
    incrementStitchQuota('standard', cfgPath(dir));
    // Read back from disk — not from return value
    const config = readConfig(dir);
    assert.strictEqual(config.quota.stitch.standard.used, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-01: incrementStitchQuota auto-initializes experimental with limit 50', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, { mode: 'yolo' });
    const result = incrementStitchQuota('experimental', cfgPath(dir));
    assert.strictEqual(result.used, 1);
    assert.strictEqual(result.limit, 50);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── QUOTA-02: checkStitchQuota threshold warning ────────────────────────────

test('QUOTA-02: checkStitchQuota returns ok at 0% usage', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, {
      quota: {
        stitch: {
          standard: { limit: 350, used: 0, reset_at: futureResetDate() },
        },
      },
    });
    const result = checkStitchQuota('standard', cfgPath(dir));
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.remaining, 350);
    assert.strictEqual(result.reason, 'ok');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-02: checkStitchQuota returns quota_warning at exactly 80% usage (used:280 of 350)', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, {
      quota: {
        stitch: {
          standard: { limit: 350, used: 280, reset_at: futureResetDate() },
        },
      },
    });
    const result = checkStitchQuota('standard', cfgPath(dir));
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.reason, 'quota_warning');
    assert.strictEqual(result.pct, 80);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-02: checkStitchQuota returns quota_warning at 86% usage (used:300 of 350)', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, {
      quota: {
        stitch: {
          standard: { limit: 350, used: 300, reset_at: futureResetDate() },
        },
      },
    });
    const result = checkStitchQuota('standard', cfgPath(dir));
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.reason, 'quota_warning');
    assert.strictEqual(result.pct, 86);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-02: checkStitchQuota returns quota_warning for experimental at 80% (used:40 of 50)', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, {
      quota: {
        stitch: {
          experimental: { limit: 50, used: 40, reset_at: futureResetDate() },
        },
      },
    });
    const result = checkStitchQuota('experimental', cfgPath(dir));
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.reason, 'quota_warning');
    assert.strictEqual(result.pct, 80);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─── QUOTA-03: checkStitchQuota exhaustion ───────────────────────────────────

test('QUOTA-03: checkStitchQuota returns quota_exhausted when used:350 (standard limit)', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, {
      quota: {
        stitch: {
          standard: { limit: 350, used: 350, reset_at: futureResetDate() },
        },
      },
    });
    const result = checkStitchQuota('standard', cfgPath(dir));
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.remaining, 0);
    assert.strictEqual(result.reason, 'quota_exhausted');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-03: checkStitchQuota returns quota_exhausted when used:50 (experimental limit)', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, {
      quota: {
        stitch: {
          experimental: { limit: 50, used: 50, reset_at: futureResetDate() },
        },
      },
    });
    const result = checkStitchQuota('experimental', cfgPath(dir));
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.remaining, 0);
    assert.strictEqual(result.reason, 'quota_exhausted');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-03: checkStitchQuota returns no_quota_configured when quota block missing', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, { mode: 'yolo' });
    const result = checkStitchQuota('standard', cfgPath(dir));
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.remaining, null);
    assert.strictEqual(result.reason, 'no_quota_configured');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('QUOTA-03: checkStitchQuota returns quota_reset when reset_at is in the past', () => {
  const dir = makeTempDir();
  try {
    writeConfig(dir, {
      quota: {
        stitch: {
          standard: { limit: 350, used: 300, reset_at: pastResetDate() },
        },
      },
    });
    const result = checkStitchQuota('standard', cfgPath(dir));
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.reason, 'quota_reset');
    assert.strictEqual(result.needsWrite, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
