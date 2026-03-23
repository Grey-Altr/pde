/**
 * experiment-infrastructure.test.mjs — Phase 107 Nyquist Coverage
 *
 * Structural regression tests for v0.13 experiment infrastructure.
 *
 * Covers:
 *   INTG-01: nyquist-metric.cjs exits 0 and emits parseable float
 *   INTG-02: Nyquist-fail commits (boundary violations) are discarded — verified structurally
 *   INTG-03: Experiment commits do not appear in main branch git log
 *   INTG-04: Boundary enforcement, reset safety, circuit breaker precision, metric timeout
 *
 * Run: node --test tests/phase-107/experiment-infrastructure.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const experiment = require('../../bin/lib/experiment.cjs');
const runner = require('../../bin/lib/experiment-runner.cjs');
const { _checkCircuitBreakers } = require('../../bin/lib/experiment-report.cjs');

const {
  _init,
  _commit,
  _reset,
  _checkBoundaries,
  _cleanup,
} = experiment;

const {
  _checkModifiedFiles,
  _evalMetric,
  _compareMetric,
} = runner;

// ─── ROOT path (decoded — handles spaces in project directory name) ───────────

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

// ─── Shared repo helper ───────────────────────────────────────────────────────

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-nyq-107-'));

  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });

  try {
    execSync('git checkout -b main', { cwd: dir, stdio: 'pipe' });
  } catch { /* may already be on main */ }

  // Create baseline commit
  fs.writeFileSync(path.join(dir, 'README.md'), 'baseline\n', 'utf-8');
  execSync('git add README.md', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "initial: baseline commit"', { cwd: dir, stdio: 'pipe' });

  // Create experiment-boundaries.md with protected zones
  fs.mkdirSync(path.join(dir, 'references'), { recursive: true });
  const boundaries = [
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
  fs.writeFileSync(path.join(dir, 'references', 'experiment-boundaries.md'), boundaries, 'utf-8');

  // Create minimal workflows directory for mutable files
  fs.mkdirSync(path.join(dir, 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'workflows', 'brief.md'), '<!-- OPTIMIZABLE -->\nbrief workflow\n', 'utf-8');

  execSync('git add .', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "chore: add test fixtures"', { cwd: dir, stdio: 'pipe' });

  return dir;
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
}

function getHeadSha(dir) {
  return execSync('git rev-parse HEAD', { cwd: dir, encoding: 'utf-8' }).trim();
}

function getCurrentBranch(dir) {
  return execSync('git rev-parse --abbrev-ref HEAD', { cwd: dir, encoding: 'utf-8' }).trim();
}

function getMainLog(dir) {
  return execSync('git log main --format=%s', { cwd: dir, encoding: 'utf-8' });
}

// ─── INTG-01: nyquist-metric.cjs exits 0 and outputs parseable float ──────────

describe('INTG-01: nyquist-metric.cjs contract', () => {
  it('nyquist-metric.cjs exits with code 0 regardless of test failures', () => {
    const result = spawnSync(
      'node', ['bin/nyquist-metric.cjs'],
      { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe', timeout: 120_000 }
    );
    assert.equal(result.status, 0, 'nyquist-metric.cjs must always exit 0');
  });

  it('nyquist-metric.cjs last line of stdout is a parseable integer', () => {
    const result = spawnSync(
      'node', ['bin/nyquist-metric.cjs'],
      { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe', timeout: 120_000 }
    );
    const lines = (result.stdout || '').split('\n').map(l => l.trim()).filter(Boolean);
    const lastLine = lines[lines.length - 1] || '';
    const parsed = parseFloat(lastLine);
    assert.ok(Number.isFinite(parsed), `Last line must be a parseable float, got: "${lastLine}"`);
  });

  it('nyquist-metric.cjs output is a non-negative integer pass count', () => {
    const result = spawnSync(
      'node', ['bin/nyquist-metric.cjs'],
      { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe', timeout: 120_000 }
    );
    const lines = (result.stdout || '').split('\n').map(l => l.trim()).filter(Boolean);
    const lastLine = lines[lines.length - 1] || '';
    const count = parseInt(lastLine, 10);
    assert.ok(count >= 0, `Pass count must be >= 0, got: ${count}`);
  });
});

// ─── INTG-02: Boundary-violation commits are discarded ────────────────────────
//
// Structural test: boundary check fires BEFORE commit is allowed.
// If _checkBoundaries returns invalid, the experiment runner discards
// the iteration without committing — verified here by simulating the
// pre-commit boundary check.

describe('INTG-02: boundary-violation commits are discarded (structural)', () => {
  it('_checkBoundaries returns invalid for protected file — commit would be discarded', () => {
    const dir = makeRepo();
    try {
      // A mutation targeting a protected file would fail boundary check
      const result = _checkBoundaries(dir, ['bin/lib/core.cjs', 'workflows/brief.md']);
      assert.equal(result.valid, false, 'Boundary check must fail for protected files');
      assert.ok(result.violations.length > 0, 'Must report violations');
      assert.ok(
        result.violations.includes('bin/lib/core.cjs'),
        'Must report the protected file in violations'
      );
    } finally { cleanup(dir); }
  });

  it('_checkBoundaries returns invalid for file in protected_directories (tests/)', () => {
    const dir = makeRepo();
    try {
      const result = _checkBoundaries(dir, ['tests/phase-107/experiment-infrastructure.test.mjs']);
      assert.equal(result.valid, false, 'Boundary check must reject files in protected_directories');
      assert.ok(result.violations.length > 0, 'Must have violations');
    } finally { cleanup(dir); }
  });

  it('_checkBoundaries returns invalid for .planning/ directory (state cannot be mutated)', () => {
    const dir = makeRepo();
    try {
      const result = _checkBoundaries(dir, ['.planning/STATE.md']);
      assert.equal(result.valid, false, 'Boundary check must reject .planning/ files');
    } finally { cleanup(dir); }
  });

  it('_checkBoundaries returns valid for optimizable workflow file', () => {
    const dir = makeRepo();
    try {
      const result = _checkBoundaries(dir, ['workflows/brief.md']);
      assert.equal(result.valid, true, 'Workflow files are optimizable — must pass boundary check');
      assert.equal(result.violations.length, 0, 'No violations for optimizable files');
    } finally { cleanup(dir); }
  });

  it('_checkBoundaries rejects when experiment-boundaries.md is missing', () => {
    const dir = makeRepo();
    try {
      // Remove the boundaries file
      fs.unlinkSync(path.join(dir, 'references', 'experiment-boundaries.md'));
      const result = _checkBoundaries(dir, ['workflows/brief.md']);
      assert.equal(result.valid, false, 'Missing boundaries file must cause invalid result (fail safe)');
    } finally { cleanup(dir); }
  });
});

// ─── INTG-03: Experiment commits do not appear in main branch git log ─────────

describe('INTG-03: experiment commits isolated from main branch git log', () => {
  it('experiment commits appear only on experiment branch, not on main', () => {
    const dir = makeRepo();
    try {
      _init(dir, 'iso-test');
      // Write change in workflows (optimizable zone)
      fs.writeFileSync(path.join(dir, 'workflows', 'brief.md'), '<!-- OPTIMIZABLE -->\nimproved content\n', 'utf-8');
      _commit(dir, 'iso-test', 0.9, 'first improvement');

      // Check that main branch log does NOT contain experiment commit
      const mainLog = getMainLog(dir);
      assert.ok(
        !mainLog.includes('experiment(iso-test):'),
        'experiment commits must NOT appear in main branch git log'
      );
    } finally { cleanup(dir); }
  });

  it('main branch retains only baseline commits after experiment init', () => {
    const dir = makeRepo();
    try {
      _init(dir, 'iso-test-2');
      // Write multiple experiment commits
      for (let i = 1; i <= 3; i++) {
        fs.writeFileSync(
          path.join(dir, 'workflows', 'brief.md'),
          `<!-- OPTIMIZABLE -->\ncontent v${i}\n`,
          'utf-8'
        );
        _commit(dir, 'iso-test-2', i * 0.1, `iteration ${i}`);
      }

      const mainLog = getMainLog(dir);
      const expCommits = mainLog.split('\n').filter(l => l.includes('experiment('));
      assert.equal(expCommits.length, 0, `Main branch must have 0 experiment commits, found: ${expCommits.join(', ')}`);
    } finally { cleanup(dir); }
  });

  it('experiment branch contains exactly N experiment commits after N iterations', () => {
    const dir = makeRepo();
    try {
      _init(dir, 'count-test');
      const N = 3;
      for (let i = 1; i <= N; i++) {
        fs.writeFileSync(
          path.join(dir, 'workflows', 'brief.md'),
          `<!-- OPTIMIZABLE -->\ncontent iteration ${i}\n`,
          'utf-8'
        );
        _commit(dir, 'count-test', i * 0.1, `iter ${i}`);
      }

      // On experiment branch — count experiment commits
      const branchLog = execSync('git log --format=%s HEAD', { cwd: dir, encoding: 'utf-8' });
      const expCommits = branchLog.split('\n').filter(l => l.startsWith('experiment(count-test):'));
      assert.equal(expCommits.length, N, `Experiment branch must have exactly ${N} experiment commits`);
    } finally { cleanup(dir); }
  });

  it('after cleanup, experiment branch is removed and main is unchanged', () => {
    const dir = makeRepo();
    try {
      const mainShaBefore = getHeadSha(dir);
      assert.equal(getCurrentBranch(dir), 'main');

      _init(dir, 'cleanup-test');
      fs.writeFileSync(path.join(dir, 'workflows', 'brief.md'), '<!-- OPTIMIZABLE -->\ntest\n', 'utf-8');
      _commit(dir, 'cleanup-test', 0.5, 'test commit');

      const cleanResult = _cleanup(dir, 'cleanup-test');
      assert.equal(cleanResult.cleaned, true, 'Cleanup must succeed');
      assert.equal(getCurrentBranch(dir), 'main', 'Must be on main after cleanup');

      // Main SHA unchanged
      assert.equal(getHeadSha(dir), mainShaBefore, 'Main SHA must be unchanged after cleanup');
    } finally { cleanup(dir); }
  });
});

// ─── INTG-04: Circuit breaker precision ───────────────────────────────────────

describe('INTG-04: circuit breaker precision — consecutive-failure breaker', () => {
  it('consecutive-failure breaker fires at exactly K=5 consecutive failures', () => {
    const K = 5;

    // K-1 failures: should NOT fire
    const stateNotFiring = {
      currentIteration: 10,
      iterationBudget: 50,
      elapsedMinutes: 5,
      timeBudget: 60,
      consecutiveFailures: K - 1,
      consecutiveFailureLimit: K,
      iterationsSinceImprovement: 3,
      noProgressLimit: 10,
    };
    const notFired = _checkCircuitBreakers(stateNotFiring);
    assert.equal(
      notFired.fired, false,
      `Consecutive failure breaker must NOT fire at K-1=${K - 1} failures`
    );

    // Exactly K failures: MUST fire
    const stateFiring = { ...stateNotFiring, consecutiveFailures: K };
    const fired = _checkCircuitBreakers(stateFiring);
    assert.equal(fired.fired, true, `Consecutive failure breaker must fire at exactly K=${K} failures`);
    assert.equal(fired.reason, 'consecutive_failures', 'Reason must be consecutive_failures');
  });

  it('consecutive-failure breaker fires at K=3 when limit is 3', () => {
    const K = 3;
    const state = {
      currentIteration: 5,
      iterationBudget: 50,
      elapsedMinutes: 2,
      timeBudget: 60,
      consecutiveFailures: K,
      consecutiveFailureLimit: K,
      iterationsSinceImprovement: 2,
      noProgressLimit: 10,
    };
    const result = _checkCircuitBreakers(state);
    assert.equal(result.fired, true, `Breaker must fire at K=${K}`);
    assert.equal(result.reason, 'consecutive_failures');
  });
});

describe('INTG-04: circuit breaker precision — no-progress breaker', () => {
  it('no-progress breaker fires at exactly M=10 iterations without improvement', () => {
    const M = 10;

    // M-1: should NOT fire
    const stateNotFiring = {
      currentIteration: 15,
      iterationBudget: 50,
      elapsedMinutes: 5,
      timeBudget: 60,
      consecutiveFailures: 0,
      consecutiveFailureLimit: 5,
      iterationsSinceImprovement: M - 1,
      noProgressLimit: M,
    };
    const notFired = _checkCircuitBreakers(stateNotFiring);
    assert.equal(
      notFired.fired, false,
      `No-progress breaker must NOT fire at M-1=${M - 1} iterations without improvement`
    );

    // Exactly M: MUST fire
    const stateFiring = { ...stateNotFiring, iterationsSinceImprovement: M };
    const fired = _checkCircuitBreakers(stateFiring);
    assert.equal(fired.fired, true, `No-progress breaker must fire at exactly M=${M}`);
    assert.equal(fired.reason, 'no_progress', 'Reason must be no_progress');
  });

  it('no-progress breaker fires at M=5 when limit is 5', () => {
    const M = 5;
    const state = {
      currentIteration: 20,
      iterationBudget: 50,
      elapsedMinutes: 10,
      timeBudget: 60,
      consecutiveFailures: 0,
      consecutiveFailureLimit: 5,
      iterationsSinceImprovement: M,
      noProgressLimit: M,
    };
    const result = _checkCircuitBreakers(state);
    assert.equal(result.fired, true, `No-progress breaker must fire at M=${M}`);
    assert.equal(result.reason, 'no_progress');
  });
});

describe('INTG-04: circuit breaker precision — iteration budget breaker', () => {
  it('iteration budget breaker fires when currentIteration reaches iterationBudget', () => {
    const state = {
      currentIteration: 50,
      iterationBudget: 50,
      elapsedMinutes: 30,
      timeBudget: 60,
      consecutiveFailures: 0,
      consecutiveFailureLimit: 5,
      iterationsSinceImprovement: 0,
      noProgressLimit: 10,
    };
    const result = _checkCircuitBreakers(state);
    assert.equal(result.fired, true, 'Iteration budget breaker must fire at budget');
    assert.equal(result.reason, 'iteration_budget');
  });

  it('iteration budget breaker does NOT fire one iteration before budget', () => {
    const state = {
      currentIteration: 49,
      iterationBudget: 50,
      elapsedMinutes: 30,
      timeBudget: 60,
      consecutiveFailures: 0,
      consecutiveFailureLimit: 5,
      iterationsSinceImprovement: 0,
      noProgressLimit: 10,
    };
    const result = _checkCircuitBreakers(state);
    assert.equal(result.fired, false, 'Must not fire one before budget');
  });
});

describe('INTG-04: circuit breaker precision — time budget breaker', () => {
  it('time budget breaker fires when elapsedMinutes reaches timeBudget', () => {
    const state = {
      currentIteration: 10,
      iterationBudget: 50,
      elapsedMinutes: 60,
      timeBudget: 60,
      consecutiveFailures: 0,
      consecutiveFailureLimit: 5,
      iterationsSinceImprovement: 0,
      noProgressLimit: 10,
    };
    const result = _checkCircuitBreakers(state);
    assert.equal(result.fired, true, 'Time budget breaker must fire at budget');
    assert.equal(result.reason, 'time_budget');
  });
});

describe('INTG-04: circuit breaker precision — priority ordering', () => {
  it('iteration_budget fires before time_budget when both are exceeded', () => {
    const state = {
      currentIteration: 50,
      iterationBudget: 50,
      elapsedMinutes: 120,
      timeBudget: 60,
      consecutiveFailures: 0,
      consecutiveFailureLimit: 5,
      iterationsSinceImprovement: 0,
      noProgressLimit: 10,
    };
    const result = _checkCircuitBreakers(state);
    assert.equal(result.fired, true);
    assert.equal(result.reason, 'iteration_budget', 'iteration_budget fires before time_budget');
  });

  it('no breaker fires when all values are below limits', () => {
    const state = {
      currentIteration: 5,
      iterationBudget: 50,
      elapsedMinutes: 5,
      timeBudget: 60,
      consecutiveFailures: 2,
      consecutiveFailureLimit: 5,
      iterationsSinceImprovement: 3,
      noProgressLimit: 10,
    };
    const result = _checkCircuitBreakers(state);
    assert.equal(result.fired, false, 'No breaker should fire when all below limits');
    assert.equal(result.reason, null);
  });
});

// ─── INTG-04: Reset safety — rejects non-experiment commits ───────────────────

describe('INTG-04: reset safety — only experiment commits are reset-eligible', () => {
  it('_reset rejects a planning: commit without any git mutation', () => {
    const dir = makeRepo();
    try {
      _init(dir, 'reset-guard');
      // Make a planning commit (non-experiment prefix)
      fs.writeFileSync(path.join(dir, 'notes.md'), 'notes\n', 'utf-8');
      execSync('git add .', { cwd: dir, stdio: 'pipe' });
      execSync('git commit -m "planning: important planning note"', { cwd: dir, stdio: 'pipe' });

      const shaBefore = getHeadSha(dir);
      const result = _reset(dir, 'reset-guard');

      assert.equal(result.reset, false, 'Reset must be rejected for non-experiment commit');
      assert.equal(result.reason, 'prefix_mismatch', 'Reason must be prefix_mismatch');
      assert.equal(getHeadSha(dir), shaBefore, 'HEAD must not move when reset is rejected');
    } finally { cleanup(dir); }
  });

  it('_reset rejects when on main branch (not experiment branch)', () => {
    const dir = makeRepo();
    try {
      // Stay on main, make a commit with experiment prefix (safety test)
      fs.writeFileSync(path.join(dir, 'fake.md'), 'fake\n', 'utf-8');
      execSync('git add .', { cwd: dir, stdio: 'pipe' });
      execSync('git commit -m "experiment(main-test): fake experiment on main"', { cwd: dir, stdio: 'pipe' });

      const shaBefore = getHeadSha(dir);
      const result = _reset(dir, 'main-test');

      assert.equal(result.reset, false, 'Reset must be rejected when on wrong branch');
      assert.equal(result.reason, 'wrong_branch', 'Reason must be wrong_branch');
      assert.equal(getHeadSha(dir), shaBefore, 'HEAD must not move on wrong branch');
    } finally { cleanup(dir); }
  });

  it('_reset succeeds and reverts HEAD for valid experiment commit', () => {
    const dir = makeRepo();
    try {
      _init(dir, 'reset-ok');
      fs.writeFileSync(path.join(dir, 'workflows', 'brief.md'), '<!-- OPTIMIZABLE -->\nmodified\n', 'utf-8');
      _commit(dir, 'reset-ok', 0.7, 'test commit to reset');

      const shaAfterCommit = getHeadSha(dir);
      const result = _reset(dir, 'reset-ok');

      assert.equal(result.reset, true, 'Reset must succeed for valid experiment commit');
      assert.notEqual(getHeadSha(dir), shaAfterCommit, 'HEAD must move back after reset');
    } finally { cleanup(dir); }
  });
});

// ─── INTG-04: Metric timeout produces CRASH status ────────────────────────────

describe('INTG-04: metric evaluation timeout produces CRASH status', () => {
  it('_evalMetric returns CRASH with reason=timeout when command exceeds timeout', () => {
    // Use helper script that sleeps 5s, with 50ms timeout
    const result = _evalMetric(
      process.cwd(),
      'node tests/phase-107/helpers/metric-slow.js',
      50
    );
    assert.equal(result.status, 'CRASH', 'Must return CRASH status on timeout');
    assert.equal(result.reason, 'timeout', 'Reason must be timeout');
    assert.equal(result.metric_value, null, 'metric_value must be null on CRASH');
  });

  it('_evalMetric returns CRASH with reason=nonzero_exit on non-zero exit code', () => {
    const result = _evalMetric(
      process.cwd(),
      'node tests/phase-107/helpers/metric-crash.js',
      5000
    );
    assert.equal(result.status, 'CRASH', 'Must return CRASH on non-zero exit');
    assert.equal(result.reason, 'nonzero_exit');
    assert.equal(result.metric_value, null);
  });

  it('_evalMetric returns CRASH with reason=unparseable_metric when stdout is not a number', () => {
    const result = _evalMetric(
      process.cwd(),
      'node tests/phase-107/helpers/metric-unparseable.js',
      5000
    );
    assert.equal(result.status, 'CRASH', 'Must return CRASH on unparseable metric');
    assert.equal(result.reason, 'unparseable_metric');
    assert.equal(result.metric_value, null);
  });

  it('_evalMetric returns ok with parsed metric_value for valid command', () => {
    const result = _evalMetric(
      process.cwd(),
      'node tests/phase-107/helpers/metric-ok.js',
      5000
    );
    assert.equal(result.status, 'ok', 'Must return ok status for successful command');
    assert.equal(result.metric_value, 42.5, 'Must parse correct float value');
  });
});

// ─── INTG-04: _compareMetric — KEEP/DISCARD logic ─────────────────────────────

describe('INTG-04: _compareMetric — KEEP/DISCARD decision logic', () => {
  it('first iteration (bestMetric=null) always returns KEEP', () => {
    assert.equal(_compareMetric(0.5, null, 'max'), 'KEEP', 'First iteration must always KEEP');
    assert.equal(_compareMetric(0.1, null, 'min'), 'KEEP', 'First iteration must always KEEP (min direction)');
    assert.equal(_compareMetric(0, null, 'max'), 'KEEP', 'First iteration zero metric must KEEP');
  });

  it('direction=max: improvement returns KEEP, regression returns DISCARD', () => {
    assert.equal(_compareMetric(0.9, 0.8, 'max'), 'KEEP', 'Better max value must KEEP');
    assert.equal(_compareMetric(0.7, 0.8, 'max'), 'DISCARD', 'Worse max value must DISCARD');
    assert.equal(_compareMetric(0.8, 0.8, 'max'), 'DISCARD', 'Equal max value must DISCARD');
  });

  it('direction=min: lower value returns KEEP, higher value returns DISCARD', () => {
    assert.equal(_compareMetric(0.3, 0.5, 'min'), 'KEEP', 'Lower min value must KEEP');
    assert.equal(_compareMetric(0.7, 0.5, 'min'), 'DISCARD', 'Higher min value must DISCARD');
    assert.equal(_compareMetric(0.5, 0.5, 'min'), 'DISCARD', 'Equal min value must DISCARD');
  });
});

// ─── INTG-04: _checkModifiedFiles — boundary enforcement ─────────────────────

describe('INTG-04: _checkModifiedFiles — pre-commit boundary guard', () => {
  it('returns valid: false when no files are modified', () => {
    const dir = makeRepo();
    try {
      _init(dir, 'no-modify-test');
      // Stage nothing — no modifications
      const result = _checkModifiedFiles(dir, ['workflows/brief.md']);
      assert.equal(result.valid, false, 'Must be invalid when no files modified');
      assert.ok(result.violations.some(v => v.includes('no files')), 'Must report no files violation');
    } finally { cleanup(dir); }
  });

  it('returns valid: false with violation list when out-of-bounds file is modified', () => {
    const dir = makeRepo();
    try {
      _init(dir, 'oob-test');
      // Modify a non-mutable file
      fs.writeFileSync(path.join(dir, 'README.md'), 'modified outside bounds\n', 'utf-8');
      execSync('git add README.md', { cwd: dir, stdio: 'pipe' });

      const result = _checkModifiedFiles(dir, ['workflows/brief.md']);
      assert.equal(result.valid, false, 'Must be invalid when out-of-bounds file is staged');
      assert.ok(result.violations.includes('README.md'), 'Must list README.md as violation');
    } finally { cleanup(dir); }
  });

  it('returns valid: true when only mutable files are modified', () => {
    const dir = makeRepo();
    try {
      _init(dir, 'valid-modify-test');
      // Modify only the mutable file
      fs.writeFileSync(path.join(dir, 'workflows', 'brief.md'), '<!-- OPTIMIZABLE -->\nupdated\n', 'utf-8');
      execSync('git add workflows/brief.md', { cwd: dir, stdio: 'pipe' });

      const result = _checkModifiedFiles(dir, ['workflows/brief.md']);
      assert.equal(result.valid, true, 'Must be valid when only mutable files are modified');
      assert.deepEqual(result.violations, [], 'Violations must be empty');
      assert.ok(result.modified.includes('workflows/brief.md'), 'Must list modified file');
    } finally { cleanup(dir); }
  });
});

// ─── INTG-04: experiment-boundaries.md structural integrity ───────────────────

describe('INTG-04: experiment-boundaries.md structural integrity (production file)', () => {
  it('references/experiment-boundaries.md exists in the project', () => {
    const boundaryPath = path.join(ROOT, 'references', 'experiment-boundaries.md');
    assert.ok(fs.existsSync(boundaryPath), 'references/experiment-boundaries.md must exist');
  });

  it('experiment-boundaries.md contains protected_files section', () => {
    const content = fs.readFileSync(path.join(ROOT, 'references', 'experiment-boundaries.md'), 'utf-8');
    assert.ok(content.includes('protected_files'), 'Must contain protected_files section');
  });

  it('experiment-boundaries.md contains protected_directories section', () => {
    const content = fs.readFileSync(path.join(ROOT, 'references', 'experiment-boundaries.md'), 'utf-8');
    assert.ok(content.includes('protected_directories'), 'Must contain protected_directories section');
  });

  it('experiment-boundaries.md lists tests/ in protected_directories (Nyquist test files are immutable)', () => {
    const content = fs.readFileSync(path.join(ROOT, 'references', 'experiment-boundaries.md'), 'utf-8');
    assert.ok(
      content.includes('tests/'),
      'tests/ directory must be in protected_directories — Nyquist tests are immutable'
    );
  });

  it('experiment-boundaries.md contains LOCKED section marker', () => {
    const content = fs.readFileSync(path.join(ROOT, 'references', 'experiment-boundaries.md'), 'utf-8');
    assert.ok(content.includes('LOCKED') || content.includes('locked_zones'), 'Must define LOCKED zones');
  });

  it('experiment-boundaries.md contains OPTIMIZABLE section marker', () => {
    const content = fs.readFileSync(path.join(ROOT, 'references', 'experiment-boundaries.md'), 'utf-8');
    assert.ok(
      content.includes('OPTIMIZABLE') || content.includes('optimizable_zones'),
      'Must define OPTIMIZABLE zones'
    );
  });
});

// ─── INTG-04: workflow LOCKED/OPTIMIZABLE marker coverage ────────────────────

describe('INTG-04: workflow files have LOCKED and OPTIMIZABLE markers', () => {
  const EXPERIMENT_ELIGIBLE = [
    'brief.md', 'flows.md', 'system.md', 'wireframe.md',
    'critique.md', 'iterate.md', 'handoff.md',
  ];

  for (const filename of EXPERIMENT_ELIGIBLE) {
    it(`workflows/${filename} contains at least one LOCKED comment`, () => {
      const content = fs.readFileSync(path.join(ROOT, 'workflows', filename), 'utf-8');
      assert.ok(
        content.includes('<!-- LOCKED'),
        `workflows/${filename} must contain at least one <!-- LOCKED... --> marker`
      );
    });

    it(`workflows/${filename} contains at least one OPTIMIZABLE comment`, () => {
      const content = fs.readFileSync(path.join(ROOT, 'workflows', filename), 'utf-8');
      assert.ok(
        content.includes('<!-- OPTIMIZABLE'),
        `workflows/${filename} must contain at least one <!-- OPTIMIZABLE... --> marker`
      );
    });
  }
});

// ─── INTG-03: existing workflow files unchanged when no experiment is active ──

describe('INTG-03: key workflow structural invariants preserved (zero regression)', () => {
  it('workflows/brief.md still contains businessMode detection', () => {
    const content = fs.readFileSync(path.join(ROOT, 'workflows', 'brief.md'), 'utf-8');
    assert.ok(content.includes('businessMode'), 'brief.md must still contain businessMode detection');
  });

  it('workflows/wireframe.md still contains 21-field designCoverage write', () => {
    const content = fs.readFileSync(path.join(ROOT, 'workflows', 'wireframe.md'), 'utf-8');
    const FIELDS = ['hasWireframes', 'hasDesignSystem', 'hasLaunchKit', 'hasDeployStaging'];
    for (const field of FIELDS) {
      assert.ok(content.includes(field), `wireframe.md must still contain ${field}`);
    }
  });

  it('workflows/handoff.md still contains LKT artifact marker', () => {
    const content = fs.readFileSync(path.join(ROOT, 'workflows', 'handoff.md'), 'utf-8');
    assert.ok(content.includes('LKT'), 'handoff.md must still contain LKT marker');
  });

  it('workflows/deploy.md still contains all 4 approval gates', () => {
    const content = fs.readFileSync(path.join(ROOT, 'workflows', 'deploy.md'), 'utf-8');
    for (let i = 1; i <= 4; i++) {
      assert.ok(content.includes(`Gate ${i}/4`), `deploy.md must still contain Gate ${i}/4`);
    }
  });

  it('bin/lib/experiment.cjs is under 300 lines (scope ceiling)', () => {
    const content = fs.readFileSync(path.join(ROOT, 'bin', 'lib', 'experiment.cjs'), 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(lineCount <= 300, `experiment.cjs must be under 300 lines, got ${lineCount}`);
  });

  it('bin/lib/experiment-runner.cjs is under 300 lines (scope ceiling)', () => {
    const content = fs.readFileSync(path.join(ROOT, 'bin', 'lib', 'experiment-runner.cjs'), 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(lineCount <= 300, `experiment-runner.cjs must be under 300 lines, got ${lineCount}`);
  });

  it('bin/lib/experiment-report.cjs is under 300 lines (scope ceiling)', () => {
    const content = fs.readFileSync(path.join(ROOT, 'bin', 'lib', 'experiment-report.cjs'), 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(lineCount <= 300, `experiment-report.cjs must be under 300 lines, got ${lineCount}`);
  });

  it('bin/lib/experiment-schema.cjs is under 300 lines (scope ceiling)', () => {
    const content = fs.readFileSync(path.join(ROOT, 'bin', 'lib', 'experiment-schema.cjs'), 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(lineCount <= 300, `experiment-schema.cjs must be under 300 lines, got ${lineCount}`);
  });
});
