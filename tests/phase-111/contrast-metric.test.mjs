/**
 * contrast-metric.test.mjs
 * Phase 111 — Visual Metric Scripts
 *
 * Nyquist structural tests for VIS-03, VIS-06, VIS-07.
 * Tests: bin/contrast-metric.cjs follows _evalMetric contract, contains WCAG
 * luminance formula, effective background traversal, and AA thresholds.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

describe('VIS-03: WCAG contrast metric script', () => {
  test('bin/contrast-metric.cjs exists', () => {
    assert.ok(
      existsSync(resolve(ROOT, 'bin', 'contrast-metric.cjs')),
      'bin/contrast-metric.cjs does not exist'
    );
  });

  test('contains process.exit(0)', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'contrast-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes('process.exit(0)'),
      'bin/contrast-metric.cjs does not contain process.exit(0)'
    );
  });

  test('uses TOOL_MAP via bridge.call for playwright:evaluate (not hardcoded mcp__playwright__* names)', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'contrast-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes("bridge.call('playwright:evaluate'"),
      "bin/contrast-metric.cjs does not contain bridge.call('playwright:evaluate')"
    );
    assert.ok(
      !source.includes('mcp__playwright__browser_evaluate'),
      'bin/contrast-metric.cjs hardcodes mcp__playwright__browser_evaluate — must use TOOL_MAP'
    );
  });

  test('contains WCAG luminance formula (sRGBtoLinear or luminance)', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'contrast-metric.cjs'), 'utf-8');
    const hasLuminance = /sRGBtoLinear/.test(source) || /luminance/.test(source);
    assert.ok(
      hasLuminance,
      'bin/contrast-metric.cjs does not contain WCAG luminance formula (sRGBtoLinear or luminance)'
    );
  });

  test('contains effective background traversal (getEffectiveBg, parentElement)', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'contrast-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes('getEffectiveBg'),
      'bin/contrast-metric.cjs does not contain getEffectiveBg function for transparent background traversal'
    );
    assert.ok(
      source.includes('parentElement'),
      'bin/contrast-metric.cjs does not use parentElement traversal in getEffectiveBg'
    );
  });

  test('uses WCAG AA thresholds: 4.5 (normal text) and 3.0 (large text)', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'contrast-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes('4.5'),
      'bin/contrast-metric.cjs does not contain AA threshold 4.5 for normal text'
    );
    assert.ok(
      source.includes('3.0'),
      'bin/contrast-metric.cjs does not contain AA threshold 3.0 for large text'
    );
  });
});

describe('VIS-06: _evalMetric contract compliance', () => {
  test('exits 0 with no arguments', () => {
    const result = spawnSync('node', ['bin/contrast-metric.cjs'], {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    assert.strictEqual(
      result.status,
      0,
      `Expected exit code 0, got ${result.status}. stderr: ${result.stderr}`
    );
  });

  test('last stdout line is parseable float', () => {
    const result = spawnSync('node', ['bin/contrast-metric.cjs'], {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    const lines = (result.stdout || '').trim().split('\n').filter(l => l.trim() !== '');
    const lastLine = lines[lines.length - 1] || '';
    const parsed = parseFloat(lastLine);
    assert.ok(
      Number.isFinite(parsed),
      `Last stdout line "${lastLine}" is not a parseable float`
    );
  });

  test('contains internal timeout guard (setTimeout)', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'contrast-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes('setTimeout'),
      'bin/contrast-metric.cjs does not contain internal timeout guard (setTimeout)'
    );
  });
});

describe('VIS-07: graceful degradation', () => {
  test('returns 0 when no file argument provided', () => {
    const result = spawnSync('node', ['bin/contrast-metric.cjs'], {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    const lines = (result.stdout || '').trim().split('\n').filter(l => l.trim() !== '');
    const lastLine = lines[lines.length - 1] || '';
    assert.strictEqual(
      parseFloat(lastLine),
      0,
      `Expected 0 when no file argument, got "${lastLine}"`
    );
  });

  test('exits 0 (not non-zero) when no file argument', () => {
    const result = spawnSync('node', ['bin/contrast-metric.cjs'], {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    assert.strictEqual(
      result.status,
      0,
      `Expected exit code 0 on graceful degrade, got ${result.status}`
    );
  });
});
