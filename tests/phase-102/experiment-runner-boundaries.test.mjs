/**
 * experiment-runner-boundaries.test.mjs
 *
 * Tests for _checkModifiedFiles in bin/lib/experiment-runner.cjs.
 * Each test creates a temp git repo to simulate real modified files.
 * The agent calls check-boundaries BEFORE committing (after Edit tool),
 * so tests use staged/unstaged changes, not committed changes.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const runner = require('../../bin/lib/experiment-runner.cjs');

const { _checkModifiedFiles } = runner;

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-runner-bounds-'));

  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });

  try {
    execSync('git checkout -b main', { cwd: dir, stdio: 'pipe' });
  } catch {
    // may already be on main
  }

  // Create a baseline commit
  fs.writeFileSync(path.join(dir, 'README.md'), 'baseline', 'utf-8');
  execSync('git add README.md', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "initial: baseline commit"', { cwd: dir, stdio: 'pipe' });

  return dir;
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch { /* best-effort */ }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('_checkModifiedFiles — boundary enforcement', () => {

  it('returns valid:true when modified files all in mutable_files list', () => {
    const dir = makeRepo();
    try {
      // Modify a file (unstaged) -- agent uses Edit tool which leaves changes unstaged
      fs.writeFileSync(path.join(dir, 'target.md'), 'changed content', 'utf-8');

      const result = _checkModifiedFiles(dir, ['target.md', 'other.md']);
      assert.equal(result.valid, true);
      assert.deepEqual(result.violations, []);
      assert.ok(Array.isArray(result.modified), 'should have modified array');
      assert.ok(result.modified.includes('target.md'), 'modified should include target.md');
    } finally {
      cleanup(dir);
    }
  });

  it('returns valid:false when modified file NOT in mutable_files list', () => {
    const dir = makeRepo();
    try {
      // Modify a file that is NOT in mutable_files
      fs.writeFileSync(path.join(dir, 'bad-file.txt'), 'changed', 'utf-8');

      const result = _checkModifiedFiles(dir, ['allowed.md']);
      assert.equal(result.valid, false);
      assert.ok(result.violations.some(v => v === 'bad-file.txt' || v.includes('bad-file.txt')));
    } finally {
      cleanup(dir);
    }
  });

  it('returns valid:false when no files modified (empty diff)', () => {
    const dir = makeRepo();
    try {
      // No changes since baseline -- both staged and unstaged diffs are empty
      const result = _checkModifiedFiles(dir, ['allowed.md']);
      assert.equal(result.valid, false);
      assert.ok(result.violations.length > 0, 'should have violations');
      assert.ok(result.violations.some(v => v.includes('no files modified')));
    } finally {
      cleanup(dir);
    }
  });

  it('returns valid:false on git diff failure', () => {
    // Use a non-git directory to cause git failure
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-runner-nogit-'));
    try {
      const result = _checkModifiedFiles(dir, ['some-file.md']);
      assert.equal(result.valid, false);
      assert.ok(result.violations.length > 0, 'should have violations');
    } finally {
      cleanup(dir);
    }
  });

});
