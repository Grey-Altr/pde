import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bridge = require('../../bin/lib/mcp-bridge.cjs');
const { probeFirecrawl } = bridge;

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'pde-fc-integ-'));
  mkdirSync(join(dir, '.planning'), { recursive: true });
  return dir;
}
function writeConfig(dir, config) {
  writeFileSync(join(dir, '.planning', 'config.json'), JSON.stringify(config, null, 2), 'utf-8');
}
function cfgPath(dir) { return join(dir, '.planning', 'config.json'); }

describe('probeFirecrawl integration helper', () => {
  test('returns available:false with reason no_api_key when FIRECRAWL_API_KEY not set', () => {
    const saved = process.env.FIRECRAWL_API_KEY;
    delete process.env.FIRECRAWL_API_KEY;
    try {
      const result = probeFirecrawl({ skipMcpProbe: true });
      assert.equal(result.available, false);
      assert.equal(result.reason, 'no_api_key');
      assert.equal(result.credits, null);
    } finally {
      if (saved !== undefined) process.env.FIRECRAWL_API_KEY = saved;
    }
  });

  test('returns available:false with reason quota_exhausted when credits are 0', () => {
    const dir = makeTempDir();
    writeConfig(dir, { quota: { firecrawl: { remaining: 0, total: 100000, last_checked: new Date().toISOString(), cache_ttl_ms: 300000, warning_threshold_pct: 80 } } });
    const saved = process.env.FIRECRAWL_API_KEY;
    process.env.FIRECRAWL_API_KEY = 'fc-test-key';
    try {
      const result = probeFirecrawl({ configPath: cfgPath(dir), skipMcpProbe: true });
      assert.equal(result.available, false);
      assert.equal(result.reason, 'quota_exhausted');
      assert.equal(result.credits.remaining, 0);
    } finally {
      if (saved !== undefined) process.env.FIRECRAWL_API_KEY = saved;
      else delete process.env.FIRECRAWL_API_KEY;
    }
  });

  test('returns available:true with reason quota_warning when credits at 80%+ usage', () => {
    const dir = makeTempDir();
    writeConfig(dir, { quota: { firecrawl: { remaining: 10000, total: 100000, last_checked: new Date().toISOString(), cache_ttl_ms: 300000, warning_threshold_pct: 80 } } });
    const saved = process.env.FIRECRAWL_API_KEY;
    process.env.FIRECRAWL_API_KEY = 'fc-test-key';
    try {
      const result = probeFirecrawl({ configPath: cfgPath(dir), skipMcpProbe: true });
      assert.equal(result.available, true);
      assert.equal(result.reason, 'quota_warning');
      assert.equal(result.warning, true);
      assert.equal(result.credits.remaining, 10000);
    } finally {
      if (saved !== undefined) process.env.FIRECRAWL_API_KEY = saved;
      else delete process.env.FIRECRAWL_API_KEY;
    }
  });

  test('returns available:true with reason ok when credits healthy', () => {
    const dir = makeTempDir();
    writeConfig(dir, { quota: { firecrawl: { remaining: 85000, total: 100000, last_checked: new Date().toISOString(), cache_ttl_ms: 300000, warning_threshold_pct: 80 } } });
    const saved = process.env.FIRECRAWL_API_KEY;
    process.env.FIRECRAWL_API_KEY = 'fc-test-key';
    try {
      const result = probeFirecrawl({ configPath: cfgPath(dir), skipMcpProbe: true });
      assert.equal(result.available, true);
      assert.equal(result.reason, 'ok');
      assert.equal(result.warning, false);
      assert.equal(result.credits.remaining, 85000);
    } finally {
      if (saved !== undefined) process.env.FIRECRAWL_API_KEY = saved;
      else delete process.env.FIRECRAWL_API_KEY;
    }
  });

  test('returns available:false with reason skipped when opts.skipProbe is true', () => {
    const result = probeFirecrawl({ skipProbe: true });
    assert.equal(result.available, false);
    assert.equal(result.reason, 'skipped');
  });

  test('probeFirecrawl is exported from mcp-bridge.cjs', () => {
    assert.equal(typeof bridge.probeFirecrawl, 'function');
  });
});
