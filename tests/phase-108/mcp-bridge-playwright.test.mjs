/**
 * mcp-bridge-playwright.test.mjs
 * Phase 108 — Playwright MCP Infrastructure
 *
 * Nyquist structural tests for PLAY-01 through PLAY-07.
 * Tests: APPROVED_SERVERS playwright entry, TOOL_MAP playwright entries,
 * AUTH_INSTRUCTIONS playwright, probe_deferred status, and TOOL_MAP_VERIFY_REQUIRED markers.
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
const { TOOL_MAP, APPROVED_SERVERS, AUTH_INSTRUCTIONS, call, probe } = bridge;

describe('PLAY-01: APPROVED_SERVERS playwright entry', () => {
  test('APPROVED_SERVERS.playwright exists', () => {
    assert.ok('playwright' in APPROVED_SERVERS, 'playwright key missing from APPROVED_SERVERS');
  });

  test('APPROVED_SERVERS.playwright.transport === "stdio"', () => {
    assert.strictEqual(APPROVED_SERVERS.playwright.transport, 'stdio');
  });

  test('APPROVED_SERVERS.playwright.url === null', () => {
    assert.strictEqual(APPROVED_SERVERS.playwright.url, null);
  });

  test('APPROVED_SERVERS.playwright.probeTimeoutMs === 30000', () => {
    assert.strictEqual(APPROVED_SERVERS.playwright.probeTimeoutMs, 30000);
  });

  test('APPROVED_SERVERS.playwright.probeTool === "mcp__playwright__browser_snapshot"', () => {
    assert.strictEqual(APPROVED_SERVERS.playwright.probeTool, 'mcp__playwright__browser_snapshot');
  });

  test('APPROVED_SERVERS.playwright.probeArgs is empty object {}', () => {
    assert.deepStrictEqual(APPROVED_SERVERS.playwright.probeArgs, {});
  });

  test('APPROVED_SERVERS has exactly 7 entries total', () => {
    const keys = Object.keys(APPROVED_SERVERS);
    assert.strictEqual(keys.length, 7, `Expected 7 APPROVED_SERVERS entries, got ${keys.length}: ${keys.join(', ')}`);
  });
});

describe('PLAY-02: TOOL_MAP playwright entries', () => {
  test('TOOL_MAP has exactly 11 playwright:* entries', () => {
    const playwrightKeys = Object.keys(TOOL_MAP).filter(k => k.startsWith('playwright:'));
    assert.strictEqual(playwrightKeys.length, 11, `Expected 11 playwright:* entries, got ${playwrightKeys.length}: ${playwrightKeys.join(', ')}`);
  });

  test('Total TOOL_MAP count is 57', () => {
    const keys = Object.keys(TOOL_MAP);
    assert.strictEqual(keys.length, 57, `Expected 57 TOOL_MAP entries (46 existing + 11 Playwright), got ${keys.length}: ${keys.join(', ')}`);
  });

  test('TOOL_MAP["playwright:probe"] === "mcp__playwright__browser_snapshot"', () => {
    assert.strictEqual(TOOL_MAP['playwright:probe'], 'mcp__playwright__browser_snapshot');
  });

  test('TOOL_MAP["playwright:navigate"] === "mcp__playwright__browser_navigate"', () => {
    assert.strictEqual(TOOL_MAP['playwright:navigate'], 'mcp__playwright__browser_navigate');
  });

  test('TOOL_MAP["playwright:screenshot"] === "mcp__playwright__browser_take_screenshot"', () => {
    assert.strictEqual(TOOL_MAP['playwright:screenshot'], 'mcp__playwright__browser_take_screenshot');
  });

  test('TOOL_MAP["playwright:snapshot"] === "mcp__playwright__browser_snapshot"', () => {
    assert.strictEqual(TOOL_MAP['playwright:snapshot'], 'mcp__playwright__browser_snapshot');
  });

  test('TOOL_MAP["playwright:click"] === "mcp__playwright__browser_click"', () => {
    assert.strictEqual(TOOL_MAP['playwright:click'], 'mcp__playwright__browser_click');
  });

  test('TOOL_MAP["playwright:type"] === "mcp__playwright__browser_type"', () => {
    assert.strictEqual(TOOL_MAP['playwright:type'], 'mcp__playwright__browser_type');
  });

  test('TOOL_MAP["playwright:wait"] === "mcp__playwright__browser_wait_for"', () => {
    assert.strictEqual(TOOL_MAP['playwright:wait'], 'mcp__playwright__browser_wait_for');
  });

  test('TOOL_MAP["playwright:evaluate"] === "mcp__playwright__browser_evaluate"', () => {
    assert.strictEqual(TOOL_MAP['playwright:evaluate'], 'mcp__playwright__browser_evaluate');
  });

  test('TOOL_MAP["playwright:pdf"] === "mcp__playwright__browser_pdf_save"', () => {
    assert.strictEqual(TOOL_MAP['playwright:pdf'], 'mcp__playwright__browser_pdf_save');
  });

  test('TOOL_MAP["playwright:close"] === "mcp__playwright__browser_close"', () => {
    assert.strictEqual(TOOL_MAP['playwright:close'], 'mcp__playwright__browser_close');
  });
});

test('PLAY-02: call() resolves playwright canonical names', () => {
  const result = call('playwright:probe', {});
  assert.strictEqual(result.toolName, 'mcp__playwright__browser_snapshot');
  assert.deepStrictEqual(result.args, {});
});

test('PLAY-02: call("playwright:navigate") resolves correctly with args passthrough', () => {
  const result = call('playwright:navigate', { url: 'about:blank' });
  assert.strictEqual(result.toolName, 'mcp__playwright__browser_navigate');
  assert.deepStrictEqual(result.args, { url: 'about:blank' });
});

describe('PLAY-03: AUTH_INSTRUCTIONS playwright', () => {
  test('AUTH_INSTRUCTIONS.playwright is an array with length >= 4', () => {
    assert.ok(Array.isArray(AUTH_INSTRUCTIONS.playwright), 'AUTH_INSTRUCTIONS.playwright is not an array');
    assert.ok(AUTH_INSTRUCTIONS.playwright.length >= 4, `Expected >= 4 elements, got ${AUTH_INSTRUCTIONS.playwright.length}`);
  });

  test('AUTH_INSTRUCTIONS.playwright contains "--headless"', () => {
    const joined = AUTH_INSTRUCTIONS.playwright.join(' ');
    assert.ok(joined.includes('--headless'), `AUTH_INSTRUCTIONS.playwright does not contain "--headless": ${joined}`);
  });

  test('AUTH_INSTRUCTIONS.playwright contains "--allow-unrestricted-file-access"', () => {
    const joined = AUTH_INSTRUCTIONS.playwright.join(' ');
    assert.ok(joined.includes('--allow-unrestricted-file-access'), `AUTH_INSTRUCTIONS.playwright does not contain "--allow-unrestricted-file-access": ${joined}`);
  });

  test('AUTH_INSTRUCTIONS.playwright contains "npx @playwright/mcp"', () => {
    const joined = AUTH_INSTRUCTIONS.playwright.join(' ');
    assert.ok(joined.includes('npx @playwright/mcp'), `AUTH_INSTRUCTIONS.playwright does not contain "npx @playwright/mcp": ${joined}`);
  });
});

test('PLAY-05: probe("playwright") returns probe_deferred', () => {
  const result = probe('playwright');
  assert.strictEqual(
    result.status,
    'probe_deferred',
    `Expected probe_deferred, got ${result.status}`
  );
});

describe('PLAY-06: mcp-integration.md updated with Playwright documentation', () => {
  const mcpIntegrationPath = resolve(ROOT, 'references', 'mcp-integration.md');
  const mcpIntegrationContent = readFileSync(mcpIntegrationPath, 'utf-8');

  test('mcp-integration.md contains "--headless" flag', () => {
    assert.ok(
      mcpIntegrationContent.includes('--headless'),
      'references/mcp-integration.md does not contain "--headless"'
    );
  });

  test('mcp-integration.md contains "--allow-unrestricted-file-access" flag', () => {
    assert.ok(
      mcpIntegrationContent.includes('--allow-unrestricted-file-access'),
      'references/mcp-integration.md does not contain "--allow-unrestricted-file-access"'
    );
  });

  test('mcp-integration.md contains "browser_snapshot" (corrected probe tool)', () => {
    assert.ok(
      mcpIntegrationContent.includes('browser_snapshot'),
      'references/mcp-integration.md does not contain "browser_snapshot"'
    );
  });

  test('mcp-integration.md contains "#### Flags" subsection', () => {
    assert.ok(
      mcpIntegrationContent.includes('#### Flags'),
      'references/mcp-integration.md does not contain "#### Flags" subsection'
    );
  });

  test('mcp-integration.md scope line mentions "7 MCP servers"', () => {
    assert.ok(
      mcpIntegrationContent.includes('7 MCP servers'),
      'references/mcp-integration.md scope line does not mention "7 MCP servers"'
    );
  });
});

describe('PLAY-07: TOOL_MAP_VERIFY_REQUIRED markers in source', () => {
  test('every playwright:* TOOL_MAP line in mcp-bridge.cjs source contains TOOL_MAP_VERIFY_REQUIRED comment', () => {
    const sourceFile = resolve(ROOT, 'bin', 'lib', 'mcp-bridge.cjs');
    const source = readFileSync(sourceFile, 'utf-8');
    const lines = source.split('\n');

    // Find all lines that contain a playwright:* key assignment in TOOL_MAP
    const playwrightToolMapLines = lines.filter(line => {
      return line.includes("'playwright:") && line.includes("'mcp__playwright__");
    });

    assert.ok(
      playwrightToolMapLines.length > 0,
      'No playwright:* TOOL_MAP lines found in source file'
    );

    assert.strictEqual(
      playwrightToolMapLines.length,
      11,
      `Expected 11 playwright:* TOOL_MAP lines in source, found ${playwrightToolMapLines.length}`
    );

    for (const line of playwrightToolMapLines) {
      assert.ok(
        line.includes('TOOL_MAP_VERIFY_REQUIRED'),
        `TOOL_MAP line missing TOOL_MAP_VERIFY_REQUIRED comment:\n  ${line.trim()}`
      );
    }
  });
});
