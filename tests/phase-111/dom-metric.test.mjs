/**
 * dom-metric.test.mjs
 * Phase 111 — Visual Metric Scripts
 *
 * Nyquist structural tests for VIS-01, VIS-06, VIS-07.
 * Tests: bin/dom-metric.cjs follows _evalMetric contract, uses TOOL_MAP,
 * scores semantic elements, degrades gracefully without file arg.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

describe('VIS-01: DOM structure metric script', () => {
  test('bin/dom-metric.cjs exists', () => {
    assert.ok(
      existsSync(resolve(ROOT, 'bin', 'dom-metric.cjs')),
      'bin/dom-metric.cjs does not exist'
    );
  });

  test('contains process.exit(0)', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'dom-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes('process.exit(0)'),
      'bin/dom-metric.cjs does not contain process.exit(0)'
    );
  });

  test('uses TOOL_MAP via bridge.call for playwright:evaluate (not hardcoded mcp__playwright__* names)', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'dom-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes("bridge.call('playwright:evaluate'"),
      "bin/dom-metric.cjs does not contain bridge.call('playwright:evaluate')"
    );
    assert.ok(
      !source.includes('mcp__playwright__browser_evaluate'),
      'bin/dom-metric.cjs hardcodes mcp__playwright__browser_evaluate — must use TOOL_MAP'
    );
  });

  test('scores semantic elements (nav, main, article, section, header, footer)', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'dom-metric.cjs'), 'utf-8');
    // Must contain a querySelectorAll or similar referencing semantic HTML elements
    const hasSemanticScoring = /nav.*main|header.*footer|querySelectorAll\(['"](.*)(nav|main|article|header|footer)(.*)['"]\)/s.test(source)
      || /header,nav,main,footer/.test(source)
      || /nav.*article.*section.*header.*footer/.test(source);
    assert.ok(
      hasSemanticScoring,
      'bin/dom-metric.cjs does not contain semantic element scoring for nav, main, article, section, header, footer'
    );
  });
});

describe('VIS-06: _evalMetric contract compliance', () => {
  test('exits 0 with no arguments', () => {
    const result = spawnSync('node', ['bin/dom-metric.cjs'], {
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
    const result = spawnSync('node', ['bin/dom-metric.cjs'], {
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
    const source = readFileSync(resolve(ROOT, 'bin', 'dom-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes('setTimeout'),
      'bin/dom-metric.cjs does not contain internal timeout guard (setTimeout)'
    );
  });
});

describe('VIS-07: graceful degradation', () => {
  test('returns 0 when no file argument provided', () => {
    const result = spawnSync('node', ['bin/dom-metric.cjs'], {
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
    const result = spawnSync('node', ['bin/dom-metric.cjs'], {
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
