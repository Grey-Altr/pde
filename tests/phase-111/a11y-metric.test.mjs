/**
 * a11y-metric.test.mjs
 * Phase 111 — Visual Metric Scripts
 *
 * Nyquist structural tests for VIS-02, VIS-06, VIS-07.
 * Tests: bin/a11y-metric.cjs follows _evalMetric contract, uses AOM snapshot
 * (not browser_evaluate) for accessibility checking, degrades gracefully.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

describe('VIS-02: A11y violations metric script', () => {
  test('bin/a11y-metric.cjs exists', () => {
    assert.ok(
      existsSync(resolve(ROOT, 'bin', 'a11y-metric.cjs')),
      'bin/a11y-metric.cjs does not exist'
    );
  });

  test('contains process.exit(0)', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'a11y-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes('process.exit(0)'),
      'bin/a11y-metric.cjs does not contain process.exit(0)'
    );
  });

  test('uses playwright:snapshot for AOM tree (not browser_evaluate) per research Pattern 5', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'a11y-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes("bridge.call('playwright:snapshot'"),
      "bin/a11y-metric.cjs does not contain bridge.call('playwright:snapshot')"
    );
    assert.ok(
      !source.includes('mcp__playwright__browser_evaluate'),
      'bin/a11y-metric.cjs hardcodes mcp__playwright__browser_evaluate — must use TOOL_MAP'
    );
  });

  test('checks for landmarks: main, navigation, banner', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'a11y-metric.cjs'), 'utf-8');
    assert.ok(
      /main/.test(source),
      'bin/a11y-metric.cjs does not check for "main" landmark'
    );
    assert.ok(
      /navigation/.test(source),
      'bin/a11y-metric.cjs does not check for "navigation" landmark'
    );
    assert.ok(
      /banner/.test(source),
      'bin/a11y-metric.cjs does not check for "banner" landmark'
    );
  });

  test('checks for unlabeled controls (button, textbox)', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'a11y-metric.cjs'), 'utf-8');
    const hasUnlabeledCheck = /unlabeled/.test(source)
      || (/button/.test(source) && /textbox/.test(source))
      || /button.*""|textbox.*""/.test(source);
    assert.ok(
      hasUnlabeledCheck,
      'bin/a11y-metric.cjs does not check for unlabeled controls (button, textbox)'
    );
  });

  test('checks heading hierarchy (heading or h[1-6])', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'a11y-metric.cjs'), 'utf-8');
    const hasHeadingCheck = /heading/.test(source) || /h[1-6]/i.test(source);
    assert.ok(
      hasHeadingCheck,
      'bin/a11y-metric.cjs does not check heading hierarchy'
    );
  });
});

describe('VIS-06: _evalMetric contract compliance', () => {
  test('exits 0 with no arguments', () => {
    const result = spawnSync('node', ['bin/a11y-metric.cjs'], {
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
    const result = spawnSync('node', ['bin/a11y-metric.cjs'], {
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
    const source = readFileSync(resolve(ROOT, 'bin', 'a11y-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes('setTimeout'),
      'bin/a11y-metric.cjs does not contain internal timeout guard (setTimeout)'
    );
  });
});

describe('VIS-07: graceful degradation', () => {
  test('returns 0 when no file argument provided', () => {
    const result = spawnSync('node', ['bin/a11y-metric.cjs'], {
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
    const result = spawnSync('node', ['bin/a11y-metric.cjs'], {
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
