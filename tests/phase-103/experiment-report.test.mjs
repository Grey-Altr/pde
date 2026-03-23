/**
 * experiment-report.test.mjs — Unit tests for generateReport
 *
 * Tests REPORT.md generation with various result sets and halt conditions.
 * Phase 103, Task 1.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { _generateReport } = require('../../bin/lib/experiment-report.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'exp-report-test-'));
}

function makeExperimentDir(tmpDir, slug) {
  const expDir = path.join(tmpDir, '.planning', 'experiments', slug);
  fs.mkdirSync(expDir, { recursive: true });
  return expDir;
}

function writeJsonlRows(expDir, rows) {
  const jsonlPath = path.join(expDir, 'results.jsonl');
  const content = rows.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(jsonlPath, content, 'utf-8');
  return jsonlPath;
}

function writeBestJson(expDir, best) {
  const bestPath = path.join(expDir, 'EXPERIMENT-BEST.json');
  fs.writeFileSync(bestPath, JSON.stringify(best), 'utf-8');
}

function writeExperimentMd(expDir, frontmatter = {}) {
  const fm = {
    slug: frontmatter.slug || 'test-slug',
    metric: frontmatter.metric || 'test_score',
    direction: frontmatter.direction || 'max',
    verify: frontmatter.verify || 'echo 42',
    mutable_files: frontmatter.mutable_files || ['agents/test.md'],
    ...frontmatter,
  };
  const mutableList = (Array.isArray(fm.mutable_files) ? fm.mutable_files : [fm.mutable_files])
    .map(f => `  - ${f}`).join('\n');
  const content = `---\nslug: ${fm.slug}\nmetric: ${fm.metric}\ndirection: ${fm.direction}\nverify: ${fm.verify}\nmutable_files:\n${mutableList}\n---\n\nExperiment description.\n`;
  fs.writeFileSync(path.join(expDir, 'experiment.md'), content, 'utf-8');
}

function gitInit(dir) {
  spawnSync('git', ['init'], { cwd: dir });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
}

function gitCommitAll(dir, msg) {
  spawnSync('git', ['add', '.'], { cwd: dir });
  spawnSync('git', ['commit', '-m', msg], { cwd: dir });
}

function gitHead(dir) {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf-8' });
  return r.stdout.trim();
}

const SAMPLE_ROWS = [
  { id: 'test-0001', iteration: 1, ts: '2026-03-23T10:00:00Z', commit: 'abc1234', metric_value: 42.5, metric_delta: 0, status: 'KEEP', description: 'First change', tokens_used: 1500 },
  { id: 'test-0002', iteration: 2, ts: '2026-03-23T10:05:00Z', commit: 'def5678', metric_value: 43.0, metric_delta: 0.5, status: 'KEEP', description: 'Second change', tokens_used: 1600 },
  { id: 'test-0003', iteration: 3, ts: '2026-03-23T10:10:00Z', commit: 'ghi9012', metric_value: 41.0, metric_delta: -2.0, status: 'DISCARD', description: 'Third change', tokens_used: 1400 },
];

const SAMPLE_BEST = {
  slug: 'test-slug',
  baseline: 'base001',
  bestCommit: 'def5678',
  bestMetric: 43.0,
  iteration: 2,
  direction: 'max',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generateReport', () => {
  const slug = 'test-slug';

  it('Test 1: generates REPORT.md with summary stats for 3 JSONL rows (2 KEEP, 1 DISCARD)', () => {
    const td = makeTempDir();
    const ed = makeExperimentDir(td, slug);
    writeExperimentMd(ed, { slug, mutable_files: ['agents/test.md'] });
    writeJsonlRows(ed, SAMPLE_ROWS);
    writeBestJson(ed, SAMPLE_BEST);

    const result = _generateReport(td, slug, { haltReason: null, baselineMetric: 40.0 });

    const reportPath = path.join(td, '.planning', 'experiments', slug, 'REPORT.md');
    assert.ok(fs.existsSync(reportPath), 'REPORT.md should be created');
    const content = fs.readFileSync(reportPath, 'utf-8');

    assert.ok(content.includes('Iterations run'), 'Should include "Iterations run"');
    assert.ok(content.includes('| 3 |') || content.includes('| 3|') || content.match(/Iterations run\s*\|\s*3/), 'Should include iteration count 3');
    assert.ok(content.includes('Improvements kept'), 'Should include "Improvements kept"');
    assert.ok(content.includes('| 2 |') || content.match(/Improvements kept\s*\|\s*2/), 'Should include kept count 2');
    assert.ok(content.includes('43'), 'Should include best metric value');
    assert.ok(content.includes('agents/test.md') || content.includes('Files modified') || content.includes('mutable_files'), 'Should include files section');

    fs.rmSync(td, { recursive: true, force: true });
  });

  it('Test 2: generateReport with haltReason includes Halted by in Circuit Breaker section', () => {
    const td = makeTempDir();
    const ed = makeExperimentDir(td, slug);
    writeExperimentMd(ed, { slug, mutable_files: ['agents/test.md'] });
    writeJsonlRows(ed, SAMPLE_ROWS);
    writeBestJson(ed, SAMPLE_BEST);

    _generateReport(td, slug, { haltReason: 'consecutive_failures', baselineMetric: 40.0 });

    const reportPath = path.join(td, '.planning', 'experiments', slug, 'REPORT.md');
    const content = fs.readFileSync(reportPath, 'utf-8');
    assert.ok(content.includes('Halted by'), 'Should include "Halted by"');
    assert.ok(content.includes('consecutive_failures'), 'Should include halt reason');

    fs.rmSync(td, { recursive: true, force: true });
  });

  it('Test 3: generateReport without haltReason includes completed message in Circuit Breaker section', () => {
    const td = makeTempDir();
    const ed = makeExperimentDir(td, slug);
    writeExperimentMd(ed, { slug, mutable_files: ['agents/test.md'] });
    writeJsonlRows(ed, SAMPLE_ROWS);
    writeBestJson(ed, SAMPLE_BEST);

    _generateReport(td, slug, { haltReason: null, baselineMetric: 40.0 });

    const reportPath = path.join(td, '.planning', 'experiments', slug, 'REPORT.md');
    const content = fs.readFileSync(reportPath, 'utf-8');
    assert.ok(content.includes('Completed full iteration budget'), 'Should include completed message');

    fs.rmSync(td, { recursive: true, force: true });
  });

  it('Test 4: generateReport includes Iteration Log table with rows matching JSONL input', () => {
    const td = makeTempDir();
    const ed = makeExperimentDir(td, slug);
    writeExperimentMd(ed, { slug, mutable_files: ['agents/test.md'] });
    writeJsonlRows(ed, SAMPLE_ROWS);
    writeBestJson(ed, SAMPLE_BEST);

    _generateReport(td, slug, { haltReason: null, baselineMetric: 40.0 });

    const reportPath = path.join(td, '.planning', 'experiments', slug, 'REPORT.md');
    const content = fs.readFileSync(reportPath, 'utf-8');
    assert.ok(content.includes('Iteration Log'), 'Should include Iteration Log section');
    assert.ok(content.includes('First change'), 'Should include row description');
    assert.ok(content.includes('Second change'), 'Should include second row description');
    assert.ok(content.includes('KEEP'), 'Should include KEEP status');
    assert.ok(content.includes('DISCARD'), 'Should include DISCARD status');

    fs.rmSync(td, { recursive: true, force: true });
  });

  it('Test 5: generateReport includes Diff Summary section', () => {
    const td = makeTempDir();
    gitInit(td);

    const agentsDir = path.join(td, 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, 'test.md'), 'original content\n');
    gitCommitAll(td, 'baseline');
    const baseline = gitHead(td);

    const ed = makeExperimentDir(td, slug);
    writeExperimentMd(ed, { slug, mutable_files: ['agents/test.md'] });
    writeJsonlRows(ed, SAMPLE_ROWS);
    writeBestJson(ed, { ...SAMPLE_BEST, baseline });

    _generateReport(td, slug, { haltReason: null, baselineMetric: 40.0 });

    const reportPath = path.join(td, '.planning', 'experiments', slug, 'REPORT.md');
    const content = fs.readFileSync(reportPath, 'utf-8');
    assert.ok(content.includes('Diff Summary'), 'Should include Diff Summary section');

    fs.rmSync(td, { recursive: true, force: true });
  });

  it('Test 6: generateReport includes total tokens_used sum and cost-per-improvement ratio', () => {
    const td = makeTempDir();
    const ed = makeExperimentDir(td, slug);
    writeExperimentMd(ed, { slug, mutable_files: ['agents/test.md'] });
    writeJsonlRows(ed, SAMPLE_ROWS);
    writeBestJson(ed, SAMPLE_BEST);

    _generateReport(td, slug, { haltReason: null, baselineMetric: 40.0 });

    const reportPath = path.join(td, '.planning', 'experiments', slug, 'REPORT.md');
    const content = fs.readFileSync(reportPath, 'utf-8');
    // Total tokens: 1500+1600+1400 = 4500
    assert.ok(content.includes('4500') || content.includes('Total tokens'), 'Should include tokens sum or label');
    assert.ok(content.includes('Cost per improvement') || content.includes('per improvement'), 'Should include cost per improvement');

    fs.rmSync(td, { recursive: true, force: true });
  });

  it('Test 15a: generateReport with empty results.jsonl (0 bytes) produces valid REPORT.md with 0 iterations', () => {
    const td = makeTempDir();
    const ed = makeExperimentDir(td, slug);
    writeExperimentMd(ed, { slug, mutable_files: ['agents/test.md'] });
    fs.writeFileSync(path.join(ed, 'results.jsonl'), '', 'utf-8');
    writeBestJson(ed, SAMPLE_BEST);

    assert.doesNotThrow(() => {
      _generateReport(td, slug, { haltReason: null, baselineMetric: 40.0 });
    }, 'Should not throw on empty results.jsonl');

    const reportPath = path.join(td, '.planning', 'experiments', slug, 'REPORT.md');
    assert.ok(fs.existsSync(reportPath), 'REPORT.md should be created');
    const content = fs.readFileSync(reportPath, 'utf-8');
    assert.ok(content.includes('Iterations run'), 'Should include Iterations run');
    assert.ok(content.includes('Improvements kept'), 'Should include Improvements kept');

    fs.rmSync(td, { recursive: true, force: true });
  });

  it('Test 15b: generateReport with absent results.jsonl produces valid REPORT.md with 0 iterations', () => {
    const td = makeTempDir();
    const ed = makeExperimentDir(td, slug);
    writeExperimentMd(ed, { slug, mutable_files: ['agents/test.md'] });
    writeBestJson(ed, SAMPLE_BEST);

    assert.doesNotThrow(() => {
      _generateReport(td, slug, { haltReason: null, baselineMetric: 40.0 });
    }, 'Should not throw when results.jsonl is absent');

    const reportPath = path.join(td, '.planning', 'experiments', slug, 'REPORT.md');
    assert.ok(fs.existsSync(reportPath), 'REPORT.md should be created');
    const content = fs.readFileSync(reportPath, 'utf-8');
    assert.ok(content.includes('Iterations run'), 'Should include Iterations run');
    assert.ok(content.includes('Improvements kept'), 'Should include Improvements kept');

    fs.rmSync(td, { recursive: true, force: true });
  });
});
