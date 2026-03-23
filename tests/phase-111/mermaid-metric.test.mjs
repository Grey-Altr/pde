/**
 * mermaid-metric.test.mjs
 * Phase 111 — Visual Metric Scripts
 *
 * Nyquist structural tests for VIS-05, VIS-06, VIS-07.
 * Tests: bin/mermaid-metric.cjs structure, _evalMetric contract compliance,
 * CDN-based Mermaid rendering, temp file lifecycle, and graceful degradation.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

describe('VIS-05: Mermaid readability metric script', () => {
  test('bin/mermaid-metric.cjs exists', () => {
    const filePath = resolve(ROOT, 'bin', 'mermaid-metric.cjs');
    assert.ok(existsSync(filePath), 'bin/mermaid-metric.cjs does not exist');
  });

  test('contains process.exit(0)', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'mermaid-metric.cjs'), 'utf-8');
    assert.ok(source.includes('process.exit(0)'), 'bin/mermaid-metric.cjs does not contain process.exit(0)');
  });

  test('uses TOOL_MAP via bridge.call for playwright:navigate', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'mermaid-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes("bridge.call('playwright:navigate'"),
      'bin/mermaid-metric.cjs does not contain bridge.call(\'playwright:navigate\''
    );
  });

  test('uses TOOL_MAP via bridge.call for playwright:evaluate', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'mermaid-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes("bridge.call('playwright:evaluate'"),
      'bin/mermaid-metric.cjs does not contain bridge.call(\'playwright:evaluate\''
    );
  });

  test('loads Mermaid v11 from CDN', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'mermaid-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes('cdn.jsdelivr.net/npm/mermaid@11'),
      'bin/mermaid-metric.cjs does not contain cdn.jsdelivr.net/npm/mermaid@11'
    );
  });

  test('checks render completion flag', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'mermaid-metric.cjs'), 'utf-8');
    assert.ok(
      source.includes('__MERMAID_RENDERED__'),
      'bin/mermaid-metric.cjs does not contain __MERMAID_RENDERED__ render completion flag'
    );
  });

  test('counts nodes via .node selector', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'mermaid-metric.cjs'), 'utf-8');
    assert.ok(
      /querySelectorAll.*\.node/.test(source),
      'bin/mermaid-metric.cjs does not contain querySelectorAll with .node selector'
    );
  });

  test('counts edges via correct v11 selectors', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'mermaid-metric.cjs'), 'utf-8');
    assert.ok(
      /edgePaths path|flowchart-link/.test(source),
      'bin/mermaid-metric.cjs does not contain correct Mermaid v11 edge selectors (.edgePaths path or .flowchart-link)'
    );
  });

  test('cleans up temp HTML file', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'mermaid-metric.cjs'), 'utf-8');
    assert.ok(
      /unlinkSync|rmSync/.test(source),
      'bin/mermaid-metric.cjs does not contain unlinkSync or rmSync for temp file cleanup'
    );
  });

  test('extracts Mermaid definition from fenced code block', () => {
    const source = readFileSync(resolve(ROOT, 'bin', 'mermaid-metric.cjs'), 'utf-8');
    assert.ok(
      /`mermaid|mermaid/.test(source),
      'bin/mermaid-metric.cjs does not contain Mermaid fence detection pattern'
    );
  });
});

describe('VIS-06: _evalMetric contract compliance', () => {
  test('exits 0 with no arguments', () => {
    const result = spawnSync('node', ['bin/mermaid-metric.cjs'], {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: ROOT,
    });
    assert.strictEqual(result.status, 0, `Expected exit code 0, got ${result.status}. stderr: ${result.stderr}`);
  });

  test('last stdout line is parseable float', () => {
    const result = spawnSync('node', ['bin/mermaid-metric.cjs'], {
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
    const source = readFileSync(resolve(ROOT, 'bin', 'mermaid-metric.cjs'), 'utf-8');
    assert.ok(source.includes('setTimeout'), 'bin/mermaid-metric.cjs does not contain setTimeout (internal timeout guard)');
  });
});

describe('VIS-07: graceful degradation', () => {
  test('returns 0 when no file argument', () => {
    const result = spawnSync('node', ['bin/mermaid-metric.cjs'], {
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
