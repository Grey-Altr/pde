'use strict';
/**
 * experiment.cjs — Git state machine for experiment lifecycle
 *
 * Manages: branch isolation, prefixed commits, safe reset, best-result promotion.
 * All git operations go through execGit from core.cjs.
 * Under 300 lines — scope creep prevention per PITFALLS research.
 */

const fs = require('fs');
const path = require('path');
const { execGit, output, error } = require('./core.cjs');

// ─── Constants ────────────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9-]+$/;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function bestJsonPath(cwd, slug) {
  return path.join(cwd, '.planning', 'experiments', slug, 'EXPERIMENT-BEST.json');
}

function readBest(cwd, slug) {
  try {
    return JSON.parse(fs.readFileSync(bestJsonPath(cwd, slug), 'utf-8'));
  } catch {
    return null;
  }
}

function writeBest(cwd, slug, data) {
  const dir = path.join(cwd, '.planning', 'experiments', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(bestJsonPath(cwd, slug), JSON.stringify(data, null, 2), 'utf-8');
}

/** Parse YAML frontmatter (simple line-by-line, no YAML library). */
function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0].trim() !== '---') return {};
  const result = { protected_files: [], protected_directories: [] };
  let i = 1;
  let currentArray = null;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '---') break;

    // Array item
    const arrMatch = line.match(/^\s{2}-\s+(.+)$/);
    if (arrMatch && currentArray) {
      // Strip inline comment
      const val = arrMatch[1].replace(/#.*$/, '').trim();
      result[currentArray].push(val);
      i++;
      continue;
    }

    // Key: value or key: (start of array)
    const keyMatch = line.match(/^(\w[\w_]*):\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1];
      const val = keyMatch[2].trim();
      if (val === '' || val === null) {
        currentArray = key;
      } else {
        currentArray = null;
        result[key] = val.replace(/^["']|["']$/g, '');
      }
    } else {
      currentArray = null;
    }
    i++;
  }
  return result;
}

// ─── Underscore helpers (testable — no process.exit) ─────────────────────────

function _init(cwd, slug) {
  if (!SLUG_RE.test(slug)) {
    return { initialized: false, reason: 'invalid_slug' };
  }

  const branch = `experiment/${slug}`;
  const headResult = execGit(cwd, ['rev-parse', 'HEAD']);
  if (headResult.exitCode !== 0) {
    return { initialized: false, reason: 'git_error', detail: headResult.stderr };
  }
  const baseline = headResult.stdout;

  const branchResult = execGit(cwd, ['checkout', '-b', branch]);
  if (branchResult.exitCode !== 0) {
    return { initialized: false, reason: 'branch_error', detail: branchResult.stderr };
  }

  writeBest(cwd, slug, { slug, branch, baseline, bestMetric: null, bestCommit: null, iteration: 0 });
  return { initialized: true, branch, baseline };
}

function _commit(cwd, slug, metric, description) {
  const state = readBest(cwd, slug);
  if (!state) {
    return { committed: false, reason: 'no_state_file' };
  }

  execGit(cwd, ['add', '-A']);
  const msg = `experiment(${slug}): ${description}`;
  const commitResult = execGit(cwd, ['commit', '-m', msg]);
  if (commitResult.exitCode !== 0) {
    return { committed: false, reason: 'commit_failed', detail: commitResult.stderr };
  }

  const shaResult = execGit(cwd, ['rev-parse', '--short', 'HEAD']);
  const commit = shaResult.exitCode === 0 ? shaResult.stdout : null;

  state.iteration += 1;
  const direction = state.direction || 'max';
  const isBest = state.bestMetric === null ||
    (direction === 'max' ? metric > state.bestMetric : metric < state.bestMetric);

  if (isBest) {
    state.bestMetric = metric;
    state.bestCommit = commit;
  }

  writeBest(cwd, slug, state);
  return { committed: true, commit, iteration: state.iteration, metric, isBest };
}

function _reset(cwd, slug) {
  // Guard 1: check current branch
  const branchResult = execGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branchResult.exitCode !== 0) {
    return { reset: false, reason: 'git_error' };
  }
  if (branchResult.stdout !== `experiment/${slug}`) {
    return { reset: false, reason: 'wrong_branch' };
  }

  // Guard 2: check commit prefix
  const subjectResult = execGit(cwd, ['log', '--format=%s', '-1', 'HEAD']);
  if (subjectResult.exitCode !== 0) {
    return { reset: false, reason: 'git_error' };
  }
  if (!subjectResult.stdout.startsWith(`experiment(${slug}):`)) {
    return { reset: false, reason: 'prefix_mismatch' };
  }

  const resetResult = execGit(cwd, ['reset', '--hard', 'HEAD~1']);
  if (resetResult.exitCode !== 0) {
    return { reset: false, reason: 'reset_failed', detail: resetResult.stderr };
  }
  return { reset: true };
}

function _promote(cwd, slug) {
  const state = readBest(cwd, slug);
  if (!state || !state.bestCommit) {
    return { promoted: false, reason: 'no_best_commit' };
  }

  // Use -f to force checkout — EXPERIMENT-BEST.json may have unstaged changes
  // (it is metadata, not code; already read above before the branch switch)
  execGit(cwd, ['checkout', '-f', 'main']);
  const cpResult = execGit(cwd, ['cherry-pick', state.bestCommit]);
  if (cpResult.exitCode !== 0) {
    return { promoted: false, reason: 'cherry_pick_failed', detail: cpResult.stderr };
  }

  const shaResult = execGit(cwd, ['rev-parse', '--short', 'HEAD']);
  const commit = shaResult.exitCode === 0 ? shaResult.stdout : null;
  return { promoted: true, commit, slug };
}

function _status(cwd, slug) {
  const state = readBest(cwd, slug);
  if (!state) {
    return { found: false, slug };
  }
  return { found: true, ...state };
}

function _cleanup(cwd, slug) {
  // Use -f to force checkout — EXPERIMENT-BEST.json may have unstaged changes
  execGit(cwd, ['checkout', '-f', 'main']);
  const delResult = execGit(cwd, ['branch', '-D', `experiment/${slug}`]);
  if (delResult.exitCode !== 0) {
    return { cleaned: false, reason: 'delete_failed', detail: delResult.stderr };
  }
  return { cleaned: true, slug };
}

function _checkBoundaries(cwd, mutableFiles) {
  const boundaryPath = path.join(cwd, 'references', 'experiment-boundaries.md');
  let content = '';
  try {
    content = fs.readFileSync(boundaryPath, 'utf-8');
  } catch {
    // If file missing, cannot validate — reject to be safe
    return { valid: false, violations: ['references/experiment-boundaries.md not found'] };
  }

  const fm = parseFrontmatter(content);
  const protectedFiles = new Set(fm.protected_files || []);
  const protectedDirs = fm.protected_directories || [];

  const violations = [];
  for (const f of mutableFiles) {
    if (protectedFiles.has(f)) {
      violations.push(f);
      continue;
    }
    for (const dir of protectedDirs) {
      if (f.startsWith(dir)) {
        violations.push(f);
        break;
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

// ─── cmd* wrappers (thin output() callers) ────────────────────────────────────

function cmdExperimentInit(cwd, slug, raw) {
  if (!slug) error('slug required');
  const result = _init(cwd, slug);
  if (!result.initialized) error(result.reason || 'init failed');
  output(result, raw);
}

function cmdExperimentCommit(cwd, slug, metric, description, raw) {
  if (!slug) error('slug required');
  const result = _commit(cwd, slug, Number(metric), description || '');
  if (!result.committed) error(result.reason || 'commit failed');
  output(result, raw);
}

function cmdExperimentReset(cwd, slug, raw) {
  if (!slug) error('slug required');
  const result = _reset(cwd, slug);
  output(result, raw);
}

function cmdExperimentPromote(cwd, slug, raw) {
  if (!slug) error('slug required');
  const result = _promote(cwd, slug);
  if (!result.promoted) error(result.reason || 'promote failed');
  output(result, raw);
}

function cmdExperimentStatus(cwd, slug, raw) {
  if (!slug) error('slug required');
  const result = _status(cwd, slug);
  output(result, raw);
}

function cmdExperimentCleanup(cwd, slug, raw) {
  if (!slug) error('slug required');
  const result = _cleanup(cwd, slug);
  if (!result.cleaned) error(result.reason || 'cleanup failed');
  output(result, raw);
}

function checkBoundaries(cwd, mutableFiles) {
  return _checkBoundaries(cwd, mutableFiles);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  cmdExperimentInit,
  cmdExperimentCommit,
  cmdExperimentReset,
  cmdExperimentPromote,
  cmdExperimentStatus,
  cmdExperimentCleanup,
  checkBoundaries,
  _init,
  _commit,
  _reset,
  _promote,
  _status,
  _cleanup,
  _checkBoundaries,
};
