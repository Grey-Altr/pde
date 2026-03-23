/**
 * experiment-runner-boundaries.test.mjs
 *
 * Tests for _checkModifiedFiles in experiment-runner.cjs.
 * Uses a tmpDir with git init to simulate modified files.
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-runner-boundary-'));
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
  try {
    execSync('git checkout -b main', { cwd: dir, stdio: 'pipe' });
  } catch { /* may already be on main */ }
  // Create a baseline commit
  fs.writeFileSync(path.join(dir, 'README.md'), 'baseline', 'utf-8');
  execSync('git add README.md', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "initial: baseline"', { cwd: dir, stdio: 'pipe' });
  return dir;
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
}

// --- Tests -------------------------------------------------------------------

test('_checkModifiedFiles: all modified files in mutable_files list -> valid: true', () => {
  const dir = makeRepo();
  try {
    fs.mkdirSync(path.join(dir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'workflows', 'brief.md'), 'changed', 'utf-8');
    execSync('git add workflows/brief.md', { cwd: dir, stdio: 'pipe' });
    execSync('git commit -m "experiment(test): change brief"', { cwd: dir, stdio: 'pipe' });

    const result = runner._checkModifiedFiles(dir, ['workflows/brief.md']);
    assert.equal(result.valid, true, 'Should be valid when modified files are all in mutable list');
    assert.deepEqual(result.violations, [], 'Should have no violations');
    assert.ok(Array.isArray(result.modified), 'modified should be an array');
    assert.ok(result.modified.includes('workflows/brief.md'), 'modified should include the changed file');
  } finally {
    cleanup(dir);
  }
});

test('_checkModifiedFiles: modified file NOT in mutable_files -> valid: false with violation', () => {
  const dir = makeRepo();
  try {
    fs.mkdirSync(path.join(dir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'workflows', 'brief.md'), 'changed', 'utf-8');
    execSync('git add workflows/brief.md', { cwd: dir, stdio: 'pipe' });
    execSync('git commit -m "experiment(test): change brief"', { cwd: dir, stdio: 'pipe' });

    // mutable_files only allows 'workflows/flows.md', NOT brief.md
    const result = runner._checkModifiedFiles(dir, ['workflows/flows.md']);
    assert.equal(result.valid, false, 'Should be invalid when modified file not in mutable list');
    assert.ok(result.violations.some(v => v.includes('workflows/brief.md')), 'violations should include brief.md');
    assert.ok(Array.isArray(result.modified), 'modified should be an array');
  } finally {
    cleanup(dir);
  }
});

test('_checkModifiedFiles: no files modified (empty diff) -> valid: false', () => {
  const dir = makeRepo();
  try {
    // No changes since last commit
    const result = runner._checkModifiedFiles(dir, ['workflows/brief.md']);
    assert.equal(result.valid, false, 'Should be invalid when no files modified');
    assert.ok(result.violations.some(v => v.includes('no files modified')), 'violations should mention "no files modified"');
  } finally {
    cleanup(dir);
  }
});

test('_checkModifiedFiles: git diff failure -> valid: false with error reason', () => {
  // Non-existent dir will cause git failure
  const result = runner._checkModifiedFiles('/nonexistent/path/that/cannot/be/a/git/repo', ['any-file.txt']);
  assert.equal(result.valid, false, 'Should be invalid on git failure');
  assert.ok(result.violations.length > 0, 'Should have violations on git failure');
  assert.ok(
    result.violations.some(v => v.includes('git diff failed') || v.includes('failed')),
    'violations should mention git failure'
  );
});
