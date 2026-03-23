/**
 * experiment-dirs.test.mjs
 *
 * Tests for _ensureExperimentDirs including end-to-end slug structure validation
 * via experiment init (Phase 100's contribution to EXEC-06 slug directory structure).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { spawnSync } = require('child_process');

const SCHEMA_MODULE = path.resolve(__dirname, '../../bin/lib/experiment-schema.cjs');
const PDE_TOOLS = path.resolve(__dirname, '../../bin/pde-tools.cjs');
const schema = require(SCHEMA_MODULE);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-dirs-'));
}

function makeTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-exp-dirs-'));

  spawnSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir, stdio: 'ignore' });
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir, stdio: 'ignore' });

  fs.writeFileSync(path.join(dir, 'README.md'), '# test\n');
  spawnSync('git', ['add', '-A'], { cwd: dir, stdio: 'ignore' });
  spawnSync('git', ['commit', '-m', 'baseline'], { cwd: dir, stdio: 'ignore' });

  return dir;
}

function run(cwd, args) {
  return spawnSync(process.execPath, [PDE_TOOLS, ...args], {
    cwd,
    encoding: 'utf-8',
    timeout: 10000,
  });
}

// ─── _ensureExperimentDirs tests ───────────────────────────────────────────────

test('_ensureExperimentDirs creates .planning/experiments/ directory', () => {
  const dir = makeTempDir();
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });

  const result = schema._ensureExperimentDirs(dir);
  const expectedPath = path.join(dir, '.planning', 'experiments');
  assert.ok(fs.existsSync(expectedPath), '.planning/experiments/ should exist');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('_ensureExperimentDirs returns the created path', () => {
  const dir = makeTempDir();
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });

  const result = schema._ensureExperimentDirs(dir);
  const expectedPath = path.join(dir, '.planning', 'experiments');
  assert.equal(result, expectedPath, 'Should return the path of the created directory');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('_ensureExperimentDirs is idempotent — calling twice does not error', () => {
  const dir = makeTempDir();
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });

  schema._ensureExperimentDirs(dir);
  // Second call should not throw
  assert.doesNotThrow(() => {
    schema._ensureExperimentDirs(dir);
  }, 'Second call should not throw');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('_ensureExperimentDirs does NOT create per-slug subdirectories', () => {
  const dir = makeTempDir();
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });

  schema._ensureExperimentDirs(dir);
  const experimentsDir = path.join(dir, '.planning', 'experiments');
  const entries = fs.readdirSync(experimentsDir);
  assert.equal(entries.length, 0, 'experiments/ directory should be empty (no per-slug subdirs)');

  fs.rmSync(dir, { recursive: true, force: true });
});

// ─── End-to-end slug structure test (Phase 100 contribution) ─────────────────

test('experiment init creates slug dir with EXPERIMENT-BEST.json', () => {
  const dir = makeTempRepo();

  const result = run(dir, ['experiment', 'init', '--slug', 'test-slug', '--raw']);
  assert.equal(result.status, 0, `experiment init failed: ${result.stderr}`);

  const slugDir = path.join(dir, '.planning', 'experiments', 'test-slug');
  assert.ok(fs.existsSync(slugDir), `.planning/experiments/test-slug/ directory should exist`);

  const bestJson = path.join(slugDir, 'EXPERIMENT-BEST.json');
  assert.ok(fs.existsSync(bestJson), `.planning/experiments/test-slug/EXPERIMENT-BEST.json should exist`);

  fs.rmSync(dir, { recursive: true, force: true });
});
