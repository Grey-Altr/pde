/**
 * mcp-bridge-firecrawl.test.mjs
 * Phase 198 — Foundation: MCP Registration & Credit Guards
 *
 * Tests: FND-01 (APPROVED_SERVERS firecrawl entry, TOOL_MAP firecrawl entries)
 *        FND-02 (AUTH_INSTRUCTIONS firecrawl array)
 * Nyquist coverage for Firecrawl MCP bridge registration.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const require = createRequire(import.meta.url);

const bridge = require(`${ROOT}/bin/lib/mcp-bridge.cjs`);
const { APPROVED_SERVERS, AUTH_INSTRUCTIONS, TOOL_MAP, assertApproved, probe } = bridge;

describe('FND-01: APPROVED_SERVERS firecrawl entry', () => {
  test('APPROVED_SERVERS.firecrawl exists', () => {
    assert.ok('firecrawl' in APPROVED_SERVERS, 'firecrawl key missing from APPROVED_SERVERS');
  });

  test('APPROVED_SERVERS.firecrawl.displayName === "Firecrawl"', () => {
    assert.strictEqual(APPROVED_SERVERS.firecrawl.displayName, 'Firecrawl');
  });

  test('APPROVED_SERVERS.firecrawl.transport === "stdio"', () => {
    assert.strictEqual(APPROVED_SERVERS.firecrawl.transport, 'stdio');
  });

  test('APPROVED_SERVERS.firecrawl.url === null', () => {
    assert.strictEqual(APPROVED_SERVERS.firecrawl.url, null);
  });

  test('APPROVED_SERVERS.firecrawl.installCmd === null', () => {
    assert.strictEqual(APPROVED_SERVERS.firecrawl.installCmd, null);
  });

  test('APPROVED_SERVERS.firecrawl.probeTimeoutMs === 15000', () => {
    assert.strictEqual(APPROVED_SERVERS.firecrawl.probeTimeoutMs, 15000);
  });

  test('APPROVED_SERVERS.firecrawl.probeTool === "mcp__firecrawl__search"', () => {
    assert.strictEqual(APPROVED_SERVERS.firecrawl.probeTool, 'mcp__firecrawl__search');
  });

  test('APPROVED_SERVERS.firecrawl.probeArgs deep equals { query: "test", limit: 1 }', () => {
    assert.deepStrictEqual(APPROVED_SERVERS.firecrawl.probeArgs, { query: 'test', limit: 1 });
  });
});

describe('FND-01: TOOL_MAP firecrawl entries', () => {
  test('TOOL_MAP has exactly 12 firecrawl:* entries', () => {
    const firecrawlKeys = Object.keys(TOOL_MAP).filter(k => k.startsWith('firecrawl:'));
    assert.strictEqual(firecrawlKeys.length, 12, `Expected 12 firecrawl:* entries, got ${firecrawlKeys.length}: ${firecrawlKeys.join(', ')}`);
  });

  test('TOOL_MAP["firecrawl:probe"] === "mcp__firecrawl__search"', () => {
    assert.strictEqual(TOOL_MAP['firecrawl:probe'], 'mcp__firecrawl__search');
  });

  test('TOOL_MAP["firecrawl:scrape"] === "mcp__firecrawl__scrape"', () => {
    assert.strictEqual(TOOL_MAP['firecrawl:scrape'], 'mcp__firecrawl__scrape');
  });

  test('TOOL_MAP["firecrawl:search"] === "mcp__firecrawl__search"', () => {
    assert.strictEqual(TOOL_MAP['firecrawl:search'], 'mcp__firecrawl__search');
  });

  test('TOOL_MAP["firecrawl:map"] === "mcp__firecrawl__map"', () => {
    assert.strictEqual(TOOL_MAP['firecrawl:map'], 'mcp__firecrawl__map');
  });

  test('TOOL_MAP["firecrawl:crawl"] === "mcp__firecrawl__crawl"', () => {
    assert.strictEqual(TOOL_MAP['firecrawl:crawl'], 'mcp__firecrawl__crawl');
  });

  test('TOOL_MAP["firecrawl:check-crawl-status"] === "mcp__firecrawl__check_crawl_status"', () => {
    assert.strictEqual(TOOL_MAP['firecrawl:check-crawl-status'], 'mcp__firecrawl__check_crawl_status');
  });

  test('TOOL_MAP["firecrawl:extract"] === "mcp__firecrawl__extract"', () => {
    assert.strictEqual(TOOL_MAP['firecrawl:extract'], 'mcp__firecrawl__extract');
  });

  test('TOOL_MAP["firecrawl:agent"] === "mcp__firecrawl__agent"', () => {
    assert.strictEqual(TOOL_MAP['firecrawl:agent'], 'mcp__firecrawl__agent');
  });

  test('TOOL_MAP["firecrawl:agent-status"] === "mcp__firecrawl__agent_status"', () => {
    assert.strictEqual(TOOL_MAP['firecrawl:agent-status'], 'mcp__firecrawl__agent_status');
  });

  test('TOOL_MAP["firecrawl:interact"] === "mcp__firecrawl__interact"', () => {
    assert.strictEqual(TOOL_MAP['firecrawl:interact'], 'mcp__firecrawl__interact');
  });

  test('TOOL_MAP["firecrawl:browser-create"] === "mcp__firecrawl__browser_create"', () => {
    assert.strictEqual(TOOL_MAP['firecrawl:browser-create'], 'mcp__firecrawl__browser_create');
  });

  test('TOOL_MAP["firecrawl:browser-delete"] === "mcp__firecrawl__browser_delete"', () => {
    assert.strictEqual(TOOL_MAP['firecrawl:browser-delete'], 'mcp__firecrawl__browser_delete');
  });

  test('every firecrawl:* TOOL_MAP line in source contains TOOL_MAP_VERIFY_REQUIRED comment', () => {
    const sourceFile = resolve(ROOT, 'bin', 'lib', 'mcp-bridge.cjs');
    const source = readFileSync(sourceFile, 'utf-8');
    const lines = source.split('\n');

    const firecrawlToolMapLines = lines.filter(line => {
      return line.includes("'firecrawl:") && line.includes("'mcp__firecrawl__");
    });

    assert.ok(
      firecrawlToolMapLines.length > 0,
      'No firecrawl:* TOOL_MAP lines found in source file'
    );

    assert.strictEqual(
      firecrawlToolMapLines.length,
      12,
      `Expected 12 firecrawl:* TOOL_MAP lines in source, found ${firecrawlToolMapLines.length}`
    );

    for (const line of firecrawlToolMapLines) {
      assert.ok(
        line.includes('TOOL_MAP_VERIFY_REQUIRED'),
        `TOOL_MAP line missing TOOL_MAP_VERIFY_REQUIRED comment:\n  ${line.trim()}`
      );
    }
  });
});

describe('FND-02: AUTH_INSTRUCTIONS firecrawl', () => {
  test('AUTH_INSTRUCTIONS.firecrawl is an array with 6 elements', () => {
    assert.ok(Array.isArray(AUTH_INSTRUCTIONS.firecrawl), 'AUTH_INSTRUCTIONS.firecrawl is not an array');
    assert.strictEqual(AUTH_INSTRUCTIONS.firecrawl.length, 6, `Expected 6 elements, got ${AUTH_INSTRUCTIONS.firecrawl.length}`);
  });

  test('AUTH_INSTRUCTIONS.firecrawl[0] contains "firecrawl.dev/app/api-keys"', () => {
    assert.ok(
      AUTH_INSTRUCTIONS.firecrawl[0].includes('firecrawl.dev/app/api-keys'),
      `firecrawl[0] = "${AUTH_INSTRUCTIONS.firecrawl[0]}" — does not contain "firecrawl.dev/app/api-keys"`
    );
  });

  test('AUTH_INSTRUCTIONS.firecrawl[3] contains "npx -y firecrawl-mcp"', () => {
    assert.ok(
      AUTH_INSTRUCTIONS.firecrawl[3].includes('npx -y firecrawl-mcp'),
      `firecrawl[3] = "${AUTH_INSTRUCTIONS.firecrawl[3]}" — does not contain "npx -y firecrawl-mcp"`
    );
  });

  test('AUTH_INSTRUCTIONS.firecrawl[5] contains "/pde:connect firecrawl --confirm"', () => {
    assert.ok(
      AUTH_INSTRUCTIONS.firecrawl[5].includes('/pde:connect firecrawl --confirm'),
      `firecrawl[5] = "${AUTH_INSTRUCTIONS.firecrawl[5]}" — does not contain "/pde:connect firecrawl --confirm"`
    );
  });
});

test('assertApproved("firecrawl") does not throw', () => {
  assert.doesNotThrow(() => assertApproved('firecrawl'));
});

test('probe("firecrawl") returns object with probeTool field', () => {
  const result = probe('firecrawl');
  assert.ok(result !== null && typeof result === 'object', 'probe("firecrawl") did not return an object');
  assert.ok('probeTool' in result || 'status' in result, 'probe("firecrawl") result missing expected properties');
});
