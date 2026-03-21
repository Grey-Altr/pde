/**
 * fallback-behavior.test.mjs
 * Phase 66 — Wireframe + Mockup Stitch Integration
 *
 * Tests: EFF-04 (10-second timeout + single attempt), WFR-06 (fallback triggers)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const wireframeMd = readFileSync(resolve(ROOT, 'workflows', 'wireframe.md'), 'utf8');
const mockupMd = readFileSync(resolve(ROOT, 'workflows', 'mockup.md'), 'utf8');

describe('EFF-04: 10-second timeout with immediate fallback', () => {
  test('wireframe.md Step 3 Stitch probe references 10-second timeout', () => {
    // The probe call uses a 10-second timeout
    assert.ok(
      wireframeMd.includes('10-second timeout'),
      'wireframe.md missing 10-second timeout reference for Stitch probe'
    );
  });

  test('wireframe.md does NOT contain retry loop patterns for Stitch generate calls', () => {
    // The plan specifies single attempt + immediate fallback (no retry loops)
    // Check that the stitch:generate-screen call context doesn't contain retry loop patterns
    const generateIdx = wireframeMd.indexOf('stitch:generate-screen');
    assert.ok(generateIdx !== -1, 'wireframe.md missing stitch:generate-screen');

    // Verify no "retry" appears near (within 500 chars after) the generate call
    const nearGenerateContext = wireframeMd.slice(generateIdx, generateIdx + 500);
    assert.ok(
      !nearGenerateContext.includes('retry up to') && !nearGenerateContext.includes('attempt 2'),
      'wireframe.md Stitch generate section contains retry loop pattern (should be single attempt only)'
    );
  });

  test('mockup.md has same 10-second timeout pattern for Stitch probe', () => {
    assert.ok(
      mockupMd.includes('10-second timeout'),
      'mockup.md missing 10-second timeout reference for Stitch probe'
    );
  });
});

describe('WFR-06: three fallback triggers', () => {
  test('wireframe.md contains quota exhaustion fallback (references quota_exhausted)', () => {
    assert.ok(
      wireframeMd.includes('quota_exhausted'),
      'wireframe.md missing quota_exhausted fallback trigger'
    );
  });

  test('wireframe.md contains MCP unavailable fallback (references STITCH_MCP_AVAILABLE = false)', () => {
    assert.ok(
      wireframeMd.includes('STITCH_MCP_AVAILABLE = false'),
      'wireframe.md missing STITCH_MCP_AVAILABLE = false MCP unavailable fallback trigger'
    );
  });

  test('wireframe.md contains Stitch error fallback (STITCH_FAILED)', () => {
    assert.ok(
      wireframeMd.includes('STITCH_FAILED'),
      'wireframe.md missing STITCH_FAILED error fallback trigger'
    );
  });

  test('wireframe.md fallback produces Claude artifacts with WFR- prefix (not STH-)', () => {
    // Claude fallback generation writes to WFR-{slug}.html (Step 5b)
    assert.ok(
      wireframeMd.includes('WFR-{slug}.html'),
      'wireframe.md missing WFR-{slug}.html — fallback should produce Claude artifacts with WFR- prefix'
    );
  });

  test('mockup.md contains quota exhaustion fallback (references quota_exhausted)', () => {
    assert.ok(
      mockupMd.includes('quota_exhausted'),
      'mockup.md missing quota_exhausted fallback trigger'
    );
  });

  test('mockup.md contains MCP unavailable fallback (references STITCH_MCP_AVAILABLE = false)', () => {
    assert.ok(
      mockupMd.includes('STITCH_MCP_AVAILABLE = false'),
      'mockup.md missing STITCH_MCP_AVAILABLE = false MCP unavailable fallback trigger'
    );
  });

  test('mockup.md contains Stitch error fallback (STITCH_FAILED)', () => {
    assert.ok(
      mockupMd.includes('STITCH_FAILED'),
      'mockup.md missing STITCH_FAILED error fallback trigger'
    );
  });
});
