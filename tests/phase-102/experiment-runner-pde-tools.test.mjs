/**
 * experiment-runner-pde-tools.test.mjs
 *
 * Dispatch tests for the three new experiment subcommands:
 * check-boundaries, eval-metric, and write-row in pde-tools.cjs.
 *
 * Uses spawnSync to run pde-tools.cjs and verifies dispatch behavior.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { spawnSync } = require('child_process');

const PDE_TOOLS = path.resolve(__dirname, '../../bin/pde-tools.cjs');
const TEMPLATES_DIR = path.resolve(__dirname, '../../templates');

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-tools-runner-'));

  spawnSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir, stdio: 'ignore' });
  try {
    spawnSync('git', ['checkout', '-b', 'main'], { cwd: dir, stdio: 'ignore' });
  } catch {}

  fs.writeFileSync(path.join(dir, 'README.md'), '# test\n');
  spawnSync('git', ['add', '-A'], { cwd: dir, stdio: 'ignore' });
  spawnSync('git', ['commit', '-m', 'baseline'], { cwd: dir, stdio: 'ignore' });

  return dir;
}

function makeExperimentSlug(dir, slug) {
  // Create the slug dir and experiment.md
  const slugDir = path.join(dir, '.planning', 'experiments', slug);
  fs.mkdirSync(slugDir, { recursive: true });

  // Write a valid experiment.md from template pattern
  const experimentMd = `---
slug: ${slug}
metric: test_score
direction: max
verify: echo 50.0
mutable_files:
  - README.md
immutable_files: []
iteration_budget: 10
time_budget_minutes: 5
---

## Search Space

Test experiment for pde-tools dispatch tests.
`;
  fs.writeFileSync(path.join(slugDir, 'experiment.md'), experimentMd, 'utf-8');

  // Write a minimal EXPERIMENT-BEST.json
  const bestJson = {
    slug,
    branch: `experiment/${slug}`,
    baseline: 'abc1234',
    bestMetric: null,
    bestCommit: null,
    iteration: 0,
  };
  fs.writeFileSync(
    path.join(slugDir, 'EXPERIMENT-BEST.json'),
    JSON.stringify(bestJson, null, 2),
    'utf-8'
  );

  return slugDir;
}

function run(cwd, args, timeout = 10000) {
  return spawnSync(process.execPath, [PDE_TOOLS, ...args], {
    cwd,
    encoding: 'utf-8',
    timeout,
  });
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('check-boundaries dispatches without error when no files modified', () => {
  const dir = makeTempRepo();
  try {
    makeExperimentSlug(dir, 'test-slug');

    const result = run(dir, ['experiment', 'check-boundaries', '--slug', 'test-slug', '--raw']);
    // check-boundaries should run and return JSON (valid:false with no changes, or error)
    // The key is it dispatches without an "Unknown experiment subcommand" error
    assert.ok(
      !result.stderr.includes('Unknown experiment subcommand'),
      `Should not get "Unknown experiment subcommand", stderr: ${result.stderr}`
    );
    assert.ok(
      result.stdout.length > 0 || result.status === 1,
      'Should produce some output or a known error exit'
    );
    // Verify it produces JSON output (not a command dispatch error)
    if (result.status === 0) {
      const parsed = JSON.parse(result.stdout);
      assert.ok('valid' in parsed, 'Output should have valid field');
    }
  } finally {
    cleanup(dir);
  }
});

test('eval-metric dispatches and runs verify command', () => {
  const dir = makeTempRepo();
  try {
    makeExperimentSlug(dir, 'eval-test');

    const result = run(dir, ['experiment', 'eval-metric', '--slug', 'eval-test', '--raw'], 15000);
    assert.ok(
      !result.stderr.includes('Unknown experiment subcommand'),
      `Should not get "Unknown experiment subcommand", stderr: ${result.stderr}`
    );
    assert.ok(
      result.stdout.length > 0,
      `eval-metric should produce output, stdout: ${result.stdout}, stderr: ${result.stderr}`
    );
    // Should output JSON with decision field
    if (result.status === 0) {
      const parsed = JSON.parse(result.stdout);
      assert.ok('decision' in parsed || 'status' in parsed, 'Output should have decision or status field');
    }
  } finally {
    cleanup(dir);
  }
});

test('write-row dispatches and writes a JSONL row with all required fields', () => {
  const dir = makeTempRepo();
  try {
    makeExperimentSlug(dir, 'write-test');

    const result = run(dir, [
      'experiment', 'write-row',
      '--slug', 'write-test',
      '--iteration', '1',
      '--metric_value', '42.5',
      '--metric_delta', '5.0',
      '--status', 'KEEP',
      '--description', 'test iteration',
      '--tokens_used', '1500',
      '--raw',
    ]);

    assert.ok(
      !result.stderr.includes('Unknown experiment subcommand'),
      `Should not get "Unknown experiment subcommand", stderr: ${result.stderr}`
    );
    assert.equal(result.status, 0, `write-row should succeed, stderr: ${result.stderr}`);

    // Check the JSONL file was created
    const jsonlPath = path.join(dir, '.planning', 'experiments', 'write-test', 'results.jsonl');
    assert.ok(fs.existsSync(jsonlPath), 'results.jsonl should be created');

    const jsonlContent = fs.readFileSync(jsonlPath, 'utf-8').trim();
    const row = JSON.parse(jsonlContent);
    assert.equal(row.iteration, 1);
    assert.equal(row.metric_value, 42.5);
    assert.equal(row.status, 'KEEP');
    assert.equal(row.tokens_used, 1500);
  } finally {
    cleanup(dir);
  }
});

test('experiment help text includes check-boundaries, eval-metric, write-row', () => {
  const dir = makeTempRepo();
  try {
    // Run with no slug to trigger the help/error text listing subcommands
    const result = run(dir, ['experiment']);
    // Should exit with error but include subcommand list
    const combined = result.stdout + result.stderr;
    assert.ok(
      combined.includes('check-boundaries'),
      `Help text should include "check-boundaries", got: ${combined}`
    );
    assert.ok(
      combined.includes('eval-metric'),
      `Help text should include "eval-metric", got: ${combined}`
    );
    assert.ok(
      combined.includes('write-row'),
      `Help text should include "write-row", got: ${combined}`
    );
  } finally {
    cleanup(dir);
  }
});
