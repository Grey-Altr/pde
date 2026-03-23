/**
 * Experiment State Machine Tests — Phase 100
 * Tests for bin/lib/experiment.cjs git state machine
 *
 * Each test creates a temp git repo via fs.mkdtempSync + git init with baseline commit.
 * Tests call underscore helpers (_init, _commit, _reset, _promote, _status, _cleanup,
 * _checkBoundaries) directly to avoid process.exit() from cmd* wrappers.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const experiment = require('../../bin/lib/experiment.cjs');

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-exp-test-'));

  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });

  // Ensure we are on main branch
  try {
    execSync('git checkout -b main', { cwd: dir, stdio: 'pipe' });
  } catch {
    // may already be on main
  }

  // Create a baseline commit on main
  fs.writeFileSync(path.join(dir, 'README.md'), 'baseline', 'utf-8');
  execSync('git add README.md', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "initial: baseline commit"', { cwd: dir, stdio: 'pipe' });

  // Create the .planning directory (needed for experiments dir)
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });

  // Create a minimal experiment-boundaries.md for boundary tests
  fs.mkdirSync(path.join(dir, 'references'), { recursive: true });
  const boundariesContent = [
    '---',
    'version: "1.0"',
    'protected_files:',
    '  - references/experiment-boundaries.md',
    '  - bin/lib/core.cjs',
    '  - protected-files.json',
    'protected_directories:',
    '  - tests/',
    '  - bin/',
    '  - .planning/',
    '  - references/',
    '---',
    '',
    '## Boundary reference for tests',
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'references', 'experiment-boundaries.md'), boundariesContent, 'utf-8');
  execSync('git add .', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "chore: add test fixtures"', { cwd: dir, stdio: 'pipe' });

  return dir;
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch { /* best-effort */ }
}

function getHeadSha(dir) {
  return execSync('git rev-parse HEAD', { cwd: dir, encoding: 'utf-8' }).trim();
}

function getCurrentBranch(dir) {
  return execSync('git rev-parse --abbrev-ref HEAD', { cwd: dir, encoding: 'utf-8' }).trim();
}

// ─── Destructure underscore helpers ───────────────────────────────────────────

const {
  _init,
  _commit,
  _reset,
  _promote,
  _status,
  _cleanup,
  _checkBoundaries,
  cmdExperimentInit,
  cmdExperimentCommit,
  cmdExperimentReset,
  cmdExperimentPromote,
  cmdExperimentStatus,
  cmdExperimentCleanup,
  checkBoundaries,
} = experiment;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('experiment.cjs — git state machine', () => {

  describe('_init — experiment initialization', () => {
    it('creates experiment/slug branch and writes EXPERIMENT-BEST.json with baseline SHA', () => {
      const dir = makeRepo();
      try {
        const baselineSha = getHeadSha(dir);
        const result = _init(dir, 'test-slug');

        assert.equal(result.initialized, true);
        assert.equal(result.branch, 'experiment/test-slug');
        assert.equal(result.baseline, baselineSha);

        // Should be on experiment branch
        assert.equal(getCurrentBranch(dir), 'experiment/test-slug');

        // EXPERIMENT-BEST.json should exist with correct schema
        const bestPath = path.join(dir, '.planning', 'experiments', 'test-slug', 'EXPERIMENT-BEST.json');
        assert.ok(fs.existsSync(bestPath), 'EXPERIMENT-BEST.json should exist');
        const best = JSON.parse(fs.readFileSync(bestPath, 'utf-8'));
        assert.equal(best.slug, 'test-slug');
        assert.equal(best.branch, 'experiment/test-slug');
        assert.equal(best.baseline, baselineSha);
        assert.equal(best.bestMetric, null);
        assert.equal(best.bestCommit, null);
        assert.equal(best.iteration, 0);
      } finally {
        cleanup(dir);
      }
    });

    it('rejects slugs with chars outside [a-z0-9-]', () => {
      const dir = makeRepo();
      try {
        const result = _init(dir, 'INVALID_SLUG');
        assert.equal(result.initialized, false);
        assert.ok(result.reason, 'should have a reason');
      } finally {
        cleanup(dir);
      }
    });

    it('rejects slug with uppercase characters', () => {
      const dir = makeRepo();
      try {
        const result = _init(dir, 'My-Slug');
        assert.equal(result.initialized, false);
      } finally {
        cleanup(dir);
      }
    });

    it('rejects slug with underscore', () => {
      const dir = makeRepo();
      try {
        const result = _init(dir, 'my_slug');
        assert.equal(result.initialized, false);
      } finally {
        cleanup(dir);
      }
    });

    it('accepts valid slug with numbers', () => {
      const dir = makeRepo();
      try {
        const result = _init(dir, 'slug-42');
        assert.equal(result.initialized, true);
      } finally {
        cleanup(dir);
      }
    });
  });

  describe('_commit — experiment commit', () => {
    it('creates commit with experiment(slug): prefix', () => {
      const dir = makeRepo();
      try {
        _init(dir, 'my-exp');
        // Make a change
        fs.writeFileSync(path.join(dir, 'change.md'), 'change 1', 'utf-8');
        const result = _commit(dir, 'my-exp', 0.75, 'first improvement');

        assert.equal(result.committed, true);
        assert.ok(result.commit, 'should have commit hash');
        assert.equal(result.iteration, 1);
        assert.equal(result.metric, 0.75);

        // Verify commit message has prefix
        const msg = execSync('git log --format=%s -1 HEAD', { cwd: dir, encoding: 'utf-8' }).trim();
        assert.ok(msg.startsWith('experiment(my-exp):'), 'commit message should start with experiment(my-exp):');
      } finally {
        cleanup(dir);
      }
    });

    it('updates EXPERIMENT-BEST.json when metric improves', () => {
      const dir = makeRepo();
      try {
        _init(dir, 'my-exp');
        fs.writeFileSync(path.join(dir, 'change.md'), 'change 1', 'utf-8');
        const result = _commit(dir, 'my-exp', 0.85, 'improvement');

        assert.equal(result.isBest, true);
        const bestPath = path.join(dir, '.planning', 'experiments', 'my-exp', 'EXPERIMENT-BEST.json');
        const best = JSON.parse(fs.readFileSync(bestPath, 'utf-8'));
        assert.equal(best.bestMetric, 0.85);
        assert.equal(best.bestCommit, result.commit);
        assert.equal(best.iteration, 1);
      } finally {
        cleanup(dir);
      }
    });

    it('does NOT update EXPERIMENT-BEST.json bestCommit when metric regresses', () => {
      const dir = makeRepo();
      try {
        _init(dir, 'my-exp');

        // First commit — best
        fs.writeFileSync(path.join(dir, 'change.md'), 'change 1', 'utf-8');
        const first = _commit(dir, 'my-exp', 0.90, 'first');
        assert.equal(first.isBest, true);
        const firstCommit = first.commit;

        // Second commit — regression (lower is worse for max direction)
        fs.writeFileSync(path.join(dir, 'change.md'), 'change 2', 'utf-8');
        const second = _commit(dir, 'my-exp', 0.70, 'regression');
        assert.equal(second.isBest, false);

        // bestCommit should still be the first commit
        const bestPath = path.join(dir, '.planning', 'experiments', 'my-exp', 'EXPERIMENT-BEST.json');
        const best = JSON.parse(fs.readFileSync(bestPath, 'utf-8'));
        assert.equal(best.bestMetric, 0.90);
        assert.equal(best.bestCommit, firstCommit);
        assert.equal(best.iteration, 2);
      } finally {
        cleanup(dir);
      }
    });

    it('treats first commit as best when bestMetric is null', () => {
      const dir = makeRepo();
      try {
        _init(dir, 'my-exp');
        fs.writeFileSync(path.join(dir, 'change.md'), 'change 1', 'utf-8');
        const result = _commit(dir, 'my-exp', 0.5, 'first ever');
        assert.equal(result.isBest, true);
      } finally {
        cleanup(dir);
      }
    });
  });

  describe('_reset — experiment reset', () => {
    it('performs git reset --hard HEAD~1 on experiment-prefixed commit', () => {
      const dir = makeRepo();
      try {
        _init(dir, 'my-exp');
        fs.writeFileSync(path.join(dir, 'change.md'), 'change 1', 'utf-8');
        _commit(dir, 'my-exp', 0.75, 'test commit');

        const shaBeforeReset = getHeadSha(dir);

        const result = _reset(dir, 'my-exp');
        assert.equal(result.reset, true);

        // HEAD should have moved back
        const shaAfterReset = getHeadSha(dir);
        assert.notEqual(shaAfterReset, shaBeforeReset, 'HEAD should have moved after reset');
      } finally {
        cleanup(dir);
      }
    });

    it('rejects reset on non-experiment commit (planning:) without any git mutation', () => {
      const dir = makeRepo();
      try {
        _init(dir, 'my-exp');
        // Make a planning commit (not experiment-prefixed)
        fs.writeFileSync(path.join(dir, 'notes.md'), 'planning notes', 'utf-8');
        execSync('git add .', { cwd: dir, stdio: 'pipe' });
        execSync('git commit -m "planning: some planning commit"', { cwd: dir, stdio: 'pipe' });

        const shaBeforeReset = getHeadSha(dir);
        const result = _reset(dir, 'my-exp');

        assert.equal(result.reset, false);
        assert.equal(result.reason, 'prefix_mismatch');

        // HEAD should NOT have moved
        assert.equal(getHeadSha(dir), shaBeforeReset, 'HEAD should not move on prefix mismatch');
      } finally {
        cleanup(dir);
      }
    });

    it('verifies current branch is experiment/slug before allowing reset', () => {
      const dir = makeRepo();
      try {
        // Do NOT init — stay on main
        // Make a commit that looks like an experiment commit
        fs.writeFileSync(path.join(dir, 'change.md'), 'fake experiment', 'utf-8');
        execSync('git add .', { cwd: dir, stdio: 'pipe' });
        execSync('git commit -m "experiment(my-exp): fake"', { cwd: dir, stdio: 'pipe' });

        // We are on main, not experiment/my-exp
        const shaBeforeReset = getHeadSha(dir);
        const result = _reset(dir, 'my-exp');

        assert.equal(result.reset, false);
        assert.equal(result.reason, 'wrong_branch');
        assert.equal(getHeadSha(dir), shaBeforeReset, 'HEAD should not move on wrong branch');
      } finally {
        cleanup(dir);
      }
    });
  });

  describe('_promote — cherry-pick best commit to main', () => {
    it('cherry-picks bestCommit onto main', () => {
      const dir = makeRepo();
      try {
        _init(dir, 'my-exp');
        fs.writeFileSync(path.join(dir, 'change.md'), 'improvement', 'utf-8');
        _commit(dir, 'my-exp', 0.95, 'best result');

        const result = _promote(dir, 'my-exp');
        assert.equal(result.promoted, true);
        assert.equal(result.slug, 'my-exp');
        assert.ok(result.commit, 'should have promoted commit hash');

        // Should now be on main
        assert.equal(getCurrentBranch(dir), 'main');

        // The file should exist on main now (cherry-pick applied)
        assert.ok(fs.existsSync(path.join(dir, 'change.md')), 'cherry-picked file should exist on main');
      } finally {
        cleanup(dir);
      }
    });

    it('outputs error when no bestCommit exists', () => {
      const dir = makeRepo();
      try {
        _init(dir, 'my-exp');
        // No commits made — bestCommit is null
        const result = _promote(dir, 'my-exp');
        assert.equal(result.promoted, false);
        assert.ok(result.reason, 'should have a reason');
      } finally {
        cleanup(dir);
      }
    });
  });

  describe('_status — read EXPERIMENT-BEST.json', () => {
    it('returns found: true plus all state fields when state file exists', () => {
      const dir = makeRepo();
      try {
        _init(dir, 'my-exp');
        const result = _status(dir, 'my-exp');

        assert.equal(result.found, true);
        assert.equal(result.slug, 'my-exp');
        assert.equal(result.branch, 'experiment/my-exp');
        assert.ok('baseline' in result, 'should have baseline field');
        assert.ok('bestMetric' in result, 'should have bestMetric field');
        assert.ok('bestCommit' in result, 'should have bestCommit field');
        assert.ok('iteration' in result, 'should have iteration field');
      } finally {
        cleanup(dir);
      }
    });

    it('returns found: false with slug when no state file exists', () => {
      const dir = makeRepo();
      try {
        const result = _status(dir, 'nonexistent-slug');

        assert.equal(result.found, false);
        assert.equal(result.slug, 'nonexistent-slug');
      } finally {
        cleanup(dir);
      }
    });
  });

  describe('_cleanup — delete experiment branch', () => {
    it('switches to main and deletes experiment/slug branch', () => {
      const dir = makeRepo();
      try {
        _init(dir, 'my-exp');
        // Make a commit so the branch has something distinct from main
        fs.writeFileSync(path.join(dir, 'change.md'), 'exp', 'utf-8');
        _commit(dir, 'my-exp', 0.5, 'test');

        const result = _cleanup(dir, 'my-exp');
        assert.equal(result.cleaned, true);
        assert.equal(result.slug, 'my-exp');

        // Should be on main now
        assert.equal(getCurrentBranch(dir), 'main');

        // experiment/my-exp branch should not exist
        const branches = execSync('git branch', { cwd: dir, encoding: 'utf-8' });
        assert.ok(!branches.includes('experiment/my-exp'), 'experiment branch should be deleted');
      } finally {
        cleanup(dir);
      }
    });
  });

  describe('_checkBoundaries — boundary validation', () => {
    it('rejects files in protected_files list', () => {
      const dir = makeRepo();
      try {
        const result = _checkBoundaries(dir, ['bin/lib/core.cjs', 'workflows/brief.md']);
        assert.equal(result.valid, false);
        assert.ok(result.violations.length > 0, 'should have violations');
        assert.ok(result.violations.some(v => v.includes('bin/lib/core.cjs')));
      } finally {
        cleanup(dir);
      }
    });

    it('rejects files in protected_directories', () => {
      const dir = makeRepo();
      try {
        const result = _checkBoundaries(dir, ['tests/nyquist/some.test.mjs']);
        assert.equal(result.valid, false);
        assert.ok(result.violations.length > 0);
        assert.ok(result.violations.some(v => v.includes('tests/nyquist/some.test.mjs')));
      } finally {
        cleanup(dir);
      }
    });

    it('accepts files outside protected zones', () => {
      const dir = makeRepo();
      try {
        const result = _checkBoundaries(dir, ['workflows/brief.md', 'workflows/system.md']);
        assert.equal(result.valid, true);
        assert.equal(result.violations.length, 0);
      } finally {
        cleanup(dir);
      }
    });

    it('rejects files in .planning/ protected directory', () => {
      const dir = makeRepo();
      try {
        const result = _checkBoundaries(dir, ['.planning/STATE.md']);
        assert.equal(result.valid, false);
        assert.ok(result.violations.some(v => v.includes('.planning/STATE.md')));
      } finally {
        cleanup(dir);
      }
    });
  });

  describe('module exports', () => {
    it('exports all required cmd* functions', () => {
      assert.equal(typeof cmdExperimentInit, 'function');
      assert.equal(typeof cmdExperimentCommit, 'function');
      assert.equal(typeof cmdExperimentReset, 'function');
      assert.equal(typeof cmdExperimentPromote, 'function');
      assert.equal(typeof cmdExperimentStatus, 'function');
      assert.equal(typeof cmdExperimentCleanup, 'function');
      assert.equal(typeof checkBoundaries, 'function');
    });

    it('exports all underscore helper functions', () => {
      assert.equal(typeof _init, 'function');
      assert.equal(typeof _commit, 'function');
      assert.equal(typeof _reset, 'function');
      assert.equal(typeof _promote, 'function');
      assert.equal(typeof _status, 'function');
      assert.equal(typeof _cleanup, 'function');
      assert.equal(typeof _checkBoundaries, 'function');
    });
  });
});
