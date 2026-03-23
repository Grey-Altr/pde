/**
 * experiment-report.test.mjs
 *
 * Tests for _generateReport in experiment-report.cjs.
 * Tests: generateReport writes REPORT.md with correct sections,
 *        handles halt reasons, handles empty/absent results.jsonl.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const REPORT_MODULE = path.resolve(__dirname, '../../bin/lib/experiment-report.cjs');
const report = require(REPORT_MODULE);

// --- Helpers ------------------------------------------------------------------

function makeExpDir(tmpDir, slug) {
  const expDir = path.join(tmpDir, '.planning', 'experiments', slug);
  fs.mkdirSync(expDir, { recursive: true });
  return expDir;
}

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, stdio: 'pipe', encoding: 'utf-8' });
  return r;
}

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-report-'));
  git(dir, 'init');
  git(dir, 'config', 'user.email', 'test@test.com');
  git(dir, 'config', 'user.name', 'Test');
  try { git(dir, 'checkout', '-b', 'main'); } catch { /* may already be on main */ }
  // Create a baseline commit
  fs.writeFileSync(path.join(dir, 'target.md'), 'baseline content', 'utf-8');
  git(dir, 'add', 'target.md');
  git(dir, 'commit', '-m', 'initial: baseline');
  return dir;
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
}

function makeJsonlRow(iteration, status, metricValue, metricDelta, description, tokensUsed) {
  return JSON.stringify({
    id: `test-${String(iteration).padStart(4, '0')}`,
    iteration,
    ts: new Date().toISOString(),
    commit: 'abc1234',
    metric_value: metricValue,
    metric_delta: metricDelta,
    status,
    description: description || `iteration ${iteration} change`,
    tokens_used: tokensUsed || 1000,
  });
}

// --- Tests -------------------------------------------------------------------

test('Test 1: generateReport with 3 JSONL rows (2 KEEP, 1 DISCARD) produces correct REPORT.md', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-rep1-'));
  try {
    const slug = 'test-slug';
    const expDir = makeExpDir(dir, slug);

    // Write EXPERIMENT-BEST.json
    const bestState = { slug, baseline: 'abc0000', bestCommit: 'abc1234', bestMetric: 45.0, iteration: 2, direction: 'max' };
    fs.writeFileSync(path.join(expDir, 'EXPERIMENT-BEST.json'), JSON.stringify(bestState), 'utf-8');

    // Write results.jsonl with 3 rows: KEEP, DISCARD, KEEP
    const rows = [
      makeJsonlRow(1, 'KEEP', 43.0, 0, 'first change', 1000),
      makeJsonlRow(2, 'DISCARD', 40.0, -3, 'second change', 1200),
      makeJsonlRow(3, 'KEEP', 45.0, 2, 'third change', 1100),
    ];
    fs.writeFileSync(path.join(expDir, 'results.jsonl'), rows.join('\n') + '\n', 'utf-8');

    const result = report._generateReport(dir, slug, { haltReason: null, baselineMetric: 41.0 });

    assert.ok(result.path, 'result.path should be set');
    assert.equal(result.iterations, 3, 'iterations should be 3');
    assert.equal(result.improvements, 2, 'improvements should be 2 (KEEP count)');

    const content = fs.readFileSync(result.path, 'utf-8');
    assert.ok(content.includes('Iterations run | 3'), 'should contain iterations run');
    assert.ok(content.includes('Improvements kept | 2'), 'should contain improvements kept');
    assert.ok(content.includes('Best metric'), 'should contain best metric');
    assert.ok(content.includes('Files modified'), 'should contain files modified');
  } finally {
    cleanup(dir);
  }
});

test('Test 2: generateReport with haltReason="consecutive_failures" includes halt message', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-rep2-'));
  try {
    const slug = 'halt-slug';
    const expDir = makeExpDir(dir, slug);

    fs.writeFileSync(path.join(expDir, 'EXPERIMENT-BEST.json'), JSON.stringify({ slug, baseline: 'abc0000', bestMetric: 42.0, direction: 'max' }), 'utf-8');
    fs.writeFileSync(path.join(expDir, 'results.jsonl'), makeJsonlRow(1, 'DISCARD', 40.0, -2, 'bad change', 1000) + '\n', 'utf-8');

    const result = report._generateReport(dir, slug, { haltReason: 'consecutive_failures', baselineMetric: 42.0 });
    const content = fs.readFileSync(result.path, 'utf-8');

    assert.ok(content.includes('HALTED -- consecutive_failures'), 'should contain halt status');
    assert.ok(content.includes('Halted by: consecutive_failures'), 'should contain halted by message in Circuit Breaker section');
    assert.ok(content.includes('Circuit Breaker'), 'should contain Circuit Breaker section');
  } finally {
    cleanup(dir);
  }
});

test('Test 3: generateReport with haltReason=null includes "Completed full iteration budget"', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-rep3-'));
  try {
    const slug = 'complete-slug';
    const expDir = makeExpDir(dir, slug);

    fs.writeFileSync(path.join(expDir, 'EXPERIMENT-BEST.json'), JSON.stringify({ slug, baseline: 'abc0000', bestMetric: 50.0, direction: 'max' }), 'utf-8');
    fs.writeFileSync(path.join(expDir, 'results.jsonl'), makeJsonlRow(1, 'KEEP', 50.0, 5, 'good change', 1000) + '\n', 'utf-8');

    const result = report._generateReport(dir, slug, { haltReason: null, baselineMetric: 45.0 });
    const content = fs.readFileSync(result.path, 'utf-8');

    assert.ok(content.includes('COMPLETED'), 'should contain COMPLETED status');
    assert.ok(content.includes('Completed full iteration budget'), 'should contain completed message');
  } finally {
    cleanup(dir);
  }
});

test('Test 4: generateReport includes Iteration Log table with JSONL rows', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-rep4-'));
  try {
    const slug = 'log-slug';
    const expDir = makeExpDir(dir, slug);

    fs.writeFileSync(path.join(expDir, 'EXPERIMENT-BEST.json'), JSON.stringify({ slug, baseline: 'abc0000', bestMetric: 42.0, direction: 'max' }), 'utf-8');
    const rows = [
      makeJsonlRow(1, 'KEEP', 42.0, 2.0, 'first improvement', 1000),
      makeJsonlRow(2, 'DISCARD', 39.0, -3.0, 'second try', 1100),
    ];
    fs.writeFileSync(path.join(expDir, 'results.jsonl'), rows.join('\n') + '\n', 'utf-8');

    const result = report._generateReport(dir, slug, { haltReason: null, baselineMetric: 40.0 });
    const content = fs.readFileSync(result.path, 'utf-8');

    assert.ok(content.includes('Iteration Log'), 'should contain Iteration Log section');
    assert.ok(content.includes('KEEP'), 'should contain KEEP status');
    assert.ok(content.includes('DISCARD'), 'should contain DISCARD status');
    assert.ok(content.includes('first improvement'), 'should contain row description');
  } finally {
    cleanup(dir);
  }
});

test('Test 5: generateReport includes Diff Summary section', () => {
  const dir = makeRepo();
  try {
    const slug = 'diff-slug';
    const expDir = makeExpDir(dir, slug);

    // Get baseline SHA
    const baselineResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf-8' });
    const baseline = baselineResult.stdout.trim();

    // Modify a file and commit
    fs.writeFileSync(path.join(dir, 'target.md'), 'modified content', 'utf-8');
    git(dir, 'add', 'target.md');
    git(dir, 'commit', '-m', 'experiment: change');

    fs.writeFileSync(path.join(expDir, 'EXPERIMENT-BEST.json'), JSON.stringify({
      slug, baseline, bestCommit: 'latest', bestMetric: 50.0, direction: 'max'
    }), 'utf-8');
    fs.writeFileSync(path.join(expDir, 'results.jsonl'), makeJsonlRow(1, 'KEEP', 50.0, 5, 'content change', 1000) + '\n', 'utf-8');

    // Write experiment.md with mutable_files
    fs.writeFileSync(path.join(expDir, 'experiment.md'), [
      '---',
      'slug: diff-slug',
      'metric: score',
      'direction: max',
      'verify: echo 50',
      'mutable_files:',
      '  - target.md',
      '---',
      '',
      'Experiment body.',
    ].join('\n'), 'utf-8');

    const result = report._generateReport(dir, slug, { haltReason: null, baselineMetric: 45.0 });
    const content = fs.readFileSync(result.path, 'utf-8');

    assert.ok(content.includes('Diff Summary'), 'should contain Diff Summary section');
    // Diff should include the modified file or diff markers
    assert.ok(
      content.includes('target.md') || content.includes('modified content') || content.includes('diff') || content.includes('@@'),
      'should contain diff content'
    );
  } finally {
    cleanup(dir);
  }
});

test('Test 6: generateReport includes total tokens_used sum and cost-per-improvement', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-rep6-'));
  try {
    const slug = 'token-slug';
    const expDir = makeExpDir(dir, slug);

    fs.writeFileSync(path.join(expDir, 'EXPERIMENT-BEST.json'), JSON.stringify({ slug, baseline: 'abc0000', bestMetric: 45.0, direction: 'max' }), 'utf-8');
    const rows = [
      makeJsonlRow(1, 'KEEP', 45.0, 2, 'good', 1000),
      makeJsonlRow(2, 'KEEP', 47.0, 2, 'better', 2000),
    ];
    fs.writeFileSync(path.join(expDir, 'results.jsonl'), rows.join('\n') + '\n', 'utf-8');

    const result = report._generateReport(dir, slug, { haltReason: null, baselineMetric: 43.0 });
    const content = fs.readFileSync(result.path, 'utf-8');

    // Total tokens: 1000 + 2000 = 3000
    assert.ok(content.includes('3000'), 'should contain total token sum');
    // Cost per improvement: 3000 / 2 = 1500
    assert.ok(content.includes('1500'), 'should contain cost-per-improvement');
  } finally {
    cleanup(dir);
  }
});

test('Test 15a: generateReport with empty results.jsonl (0 bytes) produces valid REPORT.md with 0 iterations', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-rep15a-'));
  try {
    const slug = 'empty-slug';
    const expDir = makeExpDir(dir, slug);

    fs.writeFileSync(path.join(expDir, 'EXPERIMENT-BEST.json'), JSON.stringify({ slug, baseline: 'abc0000', bestMetric: null, direction: 'max' }), 'utf-8');
    // Write empty results.jsonl (0 bytes)
    fs.writeFileSync(path.join(expDir, 'results.jsonl'), '', 'utf-8');

    let threw = false;
    let result;
    try {
      result = report._generateReport(dir, slug, { haltReason: null, baselineMetric: 40.0 });
    } catch {
      threw = true;
    }

    assert.ok(!threw, 'should not throw on empty results.jsonl');
    const content = fs.readFileSync(result.path, 'utf-8');
    assert.ok(content.includes('Iterations run | 0'), 'should contain 0 iterations');
    assert.ok(content.includes('Improvements kept | 0'), 'should contain 0 improvements');
  } finally {
    cleanup(dir);
  }
});

test('Test 15b: generateReport with absent results.jsonl produces valid REPORT.md with 0 iterations', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-rep15b-'));
  try {
    const slug = 'absent-slug';
    const expDir = makeExpDir(dir, slug);

    fs.writeFileSync(path.join(expDir, 'EXPERIMENT-BEST.json'), JSON.stringify({ slug, baseline: 'abc0000', bestMetric: null, direction: 'max' }), 'utf-8');
    // Do NOT write results.jsonl

    let threw = false;
    let result;
    try {
      result = report._generateReport(dir, slug, { haltReason: null, baselineMetric: 40.0 });
    } catch {
      threw = true;
    }

    assert.ok(!threw, 'should not throw on absent results.jsonl');
    const content = fs.readFileSync(result.path, 'utf-8');
    assert.ok(content.includes('Iterations run | 0'), 'should contain 0 iterations');
    assert.ok(content.includes('Improvements kept | 0'), 'should contain 0 improvements');
  } finally {
    cleanup(dir);
  }
});
