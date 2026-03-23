/**
 * experiment-runner-diff.test.mjs
 *
 * Tests for _extractDiff in experiment-runner.cjs.
 * Uses a tmpDir with git repo, makes a baseline commit, modifies a file,
 * commits, then calls _extractDiff.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const RUNNER_MODULE = path.resolve(__dirname, '../../bin/lib/experiment-runner.cjs');
const runner = require(RUNNER_MODULE);

// --- Helpers ------------------------------------------------------------------

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-runner-diff-'));
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
  try {
    execSync('git checkout -b main', { cwd: dir, stdio: 'pipe' });
  } catch { /* may already be on main */ }
  fs.writeFileSync(path.join(dir, 'README.md'), 'baseline content', 'utf-8');
  execSync('git add README.md', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "initial: baseline"', { cwd: dir, stdio: 'pipe' });
  return dir;
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
}

// --- Tests -------------------------------------------------------------------

test('_extractDiff: returns diff string between baseline and HEAD for specified files', () => {
  const dir = makeRepo();
  try {
    // Record baseline SHA
    const baseline = execSync('git rev-parse HEAD', { cwd: dir, encoding: 'utf-8' }).trim();

    // Modify a file and commit
    fs.writeFileSync(path.join(dir, 'README.md'), 'modified content', 'utf-8');
    execSync('git add README.md', { cwd: dir, stdio: 'pipe' });
    execSync('git commit -m "experiment(test): modify readme"', { cwd: dir, stdio: 'pipe' });

    const diff = runner._extractDiff(dir, baseline, ['README.md']);
    assert.ok(typeof diff === 'string', 'diff should be a string');
    assert.ok(diff.length > 0, 'diff should not be empty');
    assert.ok(diff.includes('README.md') || diff.includes('baseline content') || diff.includes('modified content'),
      'diff should contain some reference to the changed file content');
  } finally {
    cleanup(dir);
  }
});

test('_extractDiff: returns null on git failure', () => {
  // Non-existent dir
  const diff = runner._extractDiff('/nonexistent/path', 'abc1234', ['some-file.md']);
  assert.equal(diff, null, 'Should return null on git failure');
});
