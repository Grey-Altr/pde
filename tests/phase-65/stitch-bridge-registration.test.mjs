/**
 * stitch-bridge-registration.test.mjs
 * Phase 65 — MCP Bridge + Quota Infrastructure
 *
 * Tests: MCP-01 (APPROVED_SERVERS stitch entry) and MCP-03 (AUTH_INSTRUCTIONS stitch array)
 * Nyquist coverage for Google Stitch bridge registration.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const require = createRequire(import.meta.url);

const bridge = require(`${ROOT}/bin/lib/mcp-bridge.cjs`);
const { APPROVED_SERVERS, AUTH_INSTRUCTIONS, assertApproved, probe } = bridge;

describe('MCP-01: APPROVED_SERVERS stitch entry', () => {
  test('APPROVED_SERVERS.stitch exists', () => {
    assert.ok('stitch' in APPROVED_SERVERS, 'stitch key missing from APPROVED_SERVERS');
  });

  test('APPROVED_SERVERS.stitch.displayName === "Google Stitch"', () => {
    assert.strictEqual(APPROVED_SERVERS.stitch.displayName, 'Google Stitch');
  });

  test('APPROVED_SERVERS.stitch.transport === "stdio"', () => {
    assert.strictEqual(APPROVED_SERVERS.stitch.transport, 'stdio');
  });

  test('APPROVED_SERVERS.stitch.url === null', () => {
    assert.strictEqual(APPROVED_SERVERS.stitch.url, null);
  });

  test('APPROVED_SERVERS.stitch.installCmd === null', () => {
    assert.strictEqual(APPROVED_SERVERS.stitch.installCmd, null);
  });

  test('APPROVED_SERVERS.stitch.probeTimeoutMs === 15000', () => {
    assert.strictEqual(APPROVED_SERVERS.stitch.probeTimeoutMs, 15000);
  });

  test('APPROVED_SERVERS.stitch.probeTool === "mcp__stitch__list_projects"', () => {
    assert.strictEqual(APPROVED_SERVERS.stitch.probeTool, 'mcp__stitch__list_projects');
  });

  test('APPROVED_SERVERS.stitch.probeArgs is empty object', () => {
    assert.deepStrictEqual(APPROVED_SERVERS.stitch.probeArgs, {});
  });
});

describe('MCP-03: AUTH_INSTRUCTIONS stitch', () => {
  test('AUTH_INSTRUCTIONS.stitch is an array with 7 elements', () => {
    assert.ok(Array.isArray(AUTH_INSTRUCTIONS.stitch), 'AUTH_INSTRUCTIONS.stitch is not an array');
    assert.strictEqual(AUTH_INSTRUCTIONS.stitch.length, 7, `Expected 7 elements, got ${AUTH_INSTRUCTIONS.stitch.length}`);
  });

  test('AUTH_INSTRUCTIONS.stitch[0] contains "stitch.withgoogle.com"', () => {
    assert.ok(
      AUTH_INSTRUCTIONS.stitch[0].includes('stitch.withgoogle.com'),
      `stitch[0] = "${AUTH_INSTRUCTIONS.stitch[0]}" — does not contain "stitch.withgoogle.com"`
    );
  });

  test('AUTH_INSTRUCTIONS.stitch[4] contains "source ~/.zshrc"', () => {
    assert.ok(
      AUTH_INSTRUCTIONS.stitch[4].includes('source ~/.zshrc'),
      `stitch[4] = "${AUTH_INSTRUCTIONS.stitch[4]}" — does not contain "source ~/.zshrc"`
    );
  });

  test('AUTH_INSTRUCTIONS.stitch[5] contains "claude mcp add stitch"', () => {
    assert.ok(
      AUTH_INSTRUCTIONS.stitch[5].includes('claude mcp add stitch'),
      `stitch[5] = "${AUTH_INSTRUCTIONS.stitch[5]}" — does not contain "claude mcp add stitch"`
    );
  });

  test('AUTH_INSTRUCTIONS.stitch[6] contains "/pde:connect stitch --confirm"', () => {
    assert.ok(
      AUTH_INSTRUCTIONS.stitch[6].includes('/pde:connect stitch --confirm'),
      `stitch[6] = "${AUTH_INSTRUCTIONS.stitch[6]}" — does not contain "/pde:connect stitch --confirm"`
    );
  });
});

test('assertApproved("stitch") does not throw', () => {
  assert.doesNotThrow(() => assertApproved('stitch'));
});

test('probe("stitch") returns object with status property', () => {
  const result = probe('stitch');
  assert.ok(result !== null && typeof result === 'object', 'probe("stitch") did not return an object');
  assert.ok('status' in result, 'probe("stitch") result missing "status" property');
});
