/**
 * experiment-runner-diff.test.mjs
 *
 * Tests for _extractDiff in bin/lib/experiment-runner.cjs.
 * Uses a temp git repo to simulate real diffs.
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

const { _extractDiff } = runner;

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-runner-diff-'));
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
  try { execSync('git checkout -b main', { cwd: dir, stdio: 'pipe' }); } catch {}
  fs.writeFileSync(path.join(dir, 'target.md'), 'baseline content', 'utf-8');
  execSync('git add target.md', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "initial: baseline"', { cwd: dir, stdio: 'pipe' });
  return dir;
}

function getHeadSha(dir) {
  return execSync('git rev-parse HEAD', { cwd: dir, encoding: 'utf-8' }).trim();
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

describe('_extractDiff — git diff extraction', () => {

  it('returns diff string for known baseline and modified files', () => {
    const dir = makeRepo();
    try {
      const baseline = getHeadSha(dir);
      fs.writeFileSync(path.join(dir, 'target.md'), 'modified content', 'utf-8');
      execSync('git add target.md', { cwd: dir, stdio: 'pipe' });
      execSync('git commit -m "experiment: modify target"', { cwd: dir, stdio: 'pipe' });

      const diff = _extractDiff(dir, baseline, ['target.md']);
      assert.ok(diff !== null, 'diff should not be null');
      assert.ok(typeof diff === 'string', 'diff should be a string');
      assert.ok(diff.includes('target.md'), 'diff should mention target.md');
    } finally {
      cleanup(dir);
    }
  });

  it('returns null on git failure (bad baseline SHA)', () => {
    const dir = makeRepo();
    try {
      const diff = _extractDiff(dir, 'nonexistent-sha-abc123', ['target.md']);
      assert.equal(diff, null, 'should return null on git failure');
    } finally {
      cleanup(dir);
    }
  });

});
