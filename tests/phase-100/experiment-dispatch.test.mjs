/**
 * experiment-dispatch.test.mjs
 *
 * Integration tests that spawn pde-tools.cjs as a child process
 * to verify end-to-end dispatch of experiment subcommands.
 *
 * Each test creates a temp git repo with at least one baseline commit.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDE_TOOLS = path.resolve(__dirname, '../../bin/pde-tools.cjs');
const require = createRequire(import.meta.url);
const { spawnSync } = require('child_process');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-exp-dispatch-'));

  // Minimal git config to avoid author errors
  spawnSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir, stdio: 'ignore' });

  // Baseline commit so HEAD exists
  fs.writeFileSync(path.join(dir, 'README.md'), '# test\n');
  spawnSync('git', ['add', '-A'], { cwd: dir, stdio: 'ignore' });
  spawnSync('git', ['commit', '-m', 'baseline'], { cwd: dir, stdio: 'ignore' });

  return dir;
}

/**
 * Run pde-tools.cjs with args in cwd.
 * Returns spawnSync result: { status, stdout, stderr }
 */
function run(cwd, args) {
  return spawnSync(process.execPath, [PDE_TOOLS, ...args], {
    cwd,
    encoding: 'utf-8',
    timeout: 10000,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('experiment init --slug test-slug produces JSON with initialized field', () => {
  const dir = makeTempRepo();
  const result = run(dir, ['experiment', 'init', '--slug', 'test-slug', '--raw']);
  assert.equal(result.status, 0, `Process failed: ${result.stderr}`);
  const json = JSON.parse(result.stdout.trim());
  assert.ok('initialized' in json, 'Should have initialized field');
  assert.equal(json.initialized, true, 'initialized should be true');
  assert.ok(json.branch, 'Should have branch field');
  assert.ok(json.baseline, 'Should have baseline field');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('experiment status --slug after init produces JSON with found field', () => {
  const dir = makeTempRepo();

  // First init an experiment
  const initResult = run(dir, ['experiment', 'init', '--slug', 'status-test', '--raw']);
  assert.equal(initResult.status, 0, `Init failed: ${initResult.stderr}`);

  // Now check status
  const result = run(dir, ['experiment', 'status', '--slug', 'status-test', '--raw']);
  assert.equal(result.status, 0, `Process failed: ${result.stderr}`);
  const json = JSON.parse(result.stdout.trim());
  assert.ok('found' in json, 'Should have found field');
  assert.equal(json.found, true, 'found should be true after init');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('experiment status for unknown slug produces JSON with found: false', () => {
  const dir = makeTempRepo();
  const result = run(dir, ['experiment', 'status', '--slug', 'nonexistent', '--raw']);
  assert.equal(result.status, 0, `Process failed: ${result.stderr}`);
  const json = JSON.parse(result.stdout.trim());
  assert.ok('found' in json, 'Should have found field');
  assert.equal(json.found, false, 'found should be false for nonexistent slug');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('experiment unknown-sub produces error listing available subcommands', () => {
  const dir = makeTempRepo();
  const result = run(dir, ['experiment', 'unknown-sub']);
  assert.notEqual(result.status, 0, 'Should exit non-zero for unknown subcommand');
  const stderr = result.stderr || '';
  assert.ok(
    stderr.includes('init') && stderr.includes('commit'),
    `Error should list available subcommands, got: ${stderr}`
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

test('experiment with no subcommand produces error listing available subcommands', () => {
  const dir = makeTempRepo();
  const result = run(dir, ['experiment']);
  assert.notEqual(result.status, 0, 'Should exit non-zero for missing subcommand');
  const stderr = result.stderr || '';
  assert.ok(
    stderr.includes('init') && stderr.includes('commit'),
    `Error should list available subcommands, got: ${stderr}`
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

test('experiment status without --slug flag produces error', () => {
  const dir = makeTempRepo();
  const result = run(dir, ['experiment', 'status']);
  assert.notEqual(result.status, 0, 'Should exit non-zero when --slug missing');
  fs.rmSync(dir, { recursive: true, force: true });
});
