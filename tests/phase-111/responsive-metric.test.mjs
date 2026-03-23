/**
 * responsive-metric.test.mjs
 * Phase 111 — Visual Metric Scripts
 *
 * Nyquist structural tests for VIS-04, VIS-06, VIS-07.
 * Tests: bin/responsive-metric.cjs structure, _evalMetric contract compliance,
 * multi-breakpoint orchestration, and graceful degradation behavior.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

describe('VIS-04: Responsive compliance metric script', () => {
  test('bin/responsive-metric.cjs exists', () => {
    const filePath = resolve(ROOT, 'bin', 'responsive-metric.cjs');
    assert.ok(existsSync(filePath), 'bin/responsive-metric.cjs does not exist');
  });

  test('contains process.exit(0)', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'responsive-metric.cjs'), 'utf-8');
    assert.ok(source.includes('process.exit(0)'), 'bin/responsive-metric.cjs does not contain process.exit(0)');
  });

  test('uses TOOL_MAP via bridge.call for playwright:resize', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'responsive-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes("bridge.call('playwright:resize'"),
      'bin/responsive-metric.cjs does not contain bridge.call(\'playwright:resize\''
    );
  });

  test('uses TOOL_MAP via bridge.call for playwright:evaluate', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'responsive-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes("bridge.call('playwright:evaluate'"),
      'bin/responsive-metric.cjs does not contain bridge.call(\'playwright:evaluate\''
    );
  });

  test('captures mobile breakpoint at 375px', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'responsive-metric.cjs'), 'utf-8');
    assert.ok(source.includes('375'), 'bin/responsive-metric.cjs does not contain mobile breakpoint width 375');
  });

  test('captures tablet breakpoint at 768px', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'responsive-metric.cjs'), 'utf-8');
    assert.ok(source.includes('768'), 'bin/responsive-metric.cjs does not contain tablet breakpoint width 768');
  });

  test('captures desktop breakpoint at 1280px', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'responsive-metric.cjs'), 'utf-8');
    assert.ok(source.includes('1280'), 'bin/responsive-metric.cjs does not contain desktop breakpoint width 1280');
  });

  test('measures overflow detection', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'responsive-metric.cjs'), 'utf-8');
    assert.ok(
      /scrollWidth|overflow/.test(source),
      'bin/responsive-metric.cjs does not contain overflow detection (scrollWidth or overflow)'
    );
  });

  test('measures touch target compliance', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'responsive-metric.cjs'), 'utf-8');
    assert.ok(
      /getBoundingClientRect|44/.test(source),
      'bin/responsive-metric.cjs does not contain touch target check (getBoundingClientRect or 44)'
    );
  });
});

describe('VIS-06: _evalMetric contract compliance', () => {
  test('exits 0 with no arguments', () => {
    const result = spawnSync('node', ['bin/responsive-metric.cjs'], {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: ROOT,
    });
    assert.strictEqual(result.status, 0, `Expected exit code 0, got ${result.status}. stderr: ${result.stderr}`);
  });

  test('last stdout line is parseable float', () => {
    const result = spawnSync('node', ['bin/responsive-metric.cjs'], {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: ROOT,
    });
    const lines = (result.stdout || '').trim().split('\n');
    const lastLine = lines[lines.length - 1];
    const parsed = parseFloat(lastLine);
    assert.ok(!isNaN(parsed), `Last stdout line "${lastLine}" is not a parseable float`);
  });

  test('contains internal timeout guard', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'responsive-metric.cjs'), 'utf-8');
    assert.ok(source.includes('setTimeout'), 'bin/responsive-metric.cjs does not contain setTimeout (internal timeout guard)');
  });
});

describe('VIS-07: graceful degradation', () => {
  test('returns 0 when no file argument', () => {
    const result = spawnSync('node', ['bin/responsive-metric.cjs'], {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: ROOT,
    });
    const lines = (result.stdout || '').trim().split('\n');
    const lastLine = lines[lines.length - 1];
    const score = parseFloat(lastLine);
    assert.strictEqual(score, 0, `Expected score 0 when no file argument, got ${score}`);
  });
});
