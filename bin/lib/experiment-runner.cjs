'use strict';
/**
 * experiment-runner.cjs — Iteration helpers for the experiment runner agent.
 *
 * Provides: boundary enforcement, metric evaluation, metric comparison,
 * JSONL row writing, and diff extraction.
 *
 * Called by: pde-tools.cjs experiment subcommands (check-boundaries, eval-metric, write-row)
 * Called by: Phase 103 orchestrator directly (for eval-metric result + comparison)
 *
 * Under 300 lines — scope creep prevention per PITFALLS research.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { execGit } = require('./core.cjs');
const { JSONL_ROW_FIELDS } = require('./experiment-schema.cjs');

// ─── Boundary enforcement ─────────────────────────────────────────────────────

/**
 * _checkModifiedFiles(cwd, mutableFiles)
 *
 * Checks whether all files modified (staged, unstaged, or untracked) are
 * within the declared mutable_files list. Uses git status --porcelain to
 * detect all changes including new untracked files.
 *
 * The agent calls this BEFORE committing, after using Edit tool on mutable files.
 *
 * Returns { valid: boolean, violations: string[], modified: string[] }
 *
 * - valid:false + violations:['no files modified'] if no files changed
 * - valid:false + violations:[...] if any modified file is not in mutableFiles
 * - valid:false + violations:['git diff failed: ...'] on git error
 * - valid:true + violations:[] if all modified files are in mutableFiles
 */
function _checkModifiedFiles(cwd, mutableFiles) {
  // git status --porcelain shows all changes: staged (XY where X != ' '),
  // unstaged (Y != ' '), and untracked (??)
  const statusResult = execGit(cwd, ['status', '--porcelain']);

  if (statusResult.exitCode !== 0) {
    return { valid: false, violations: [`git diff failed: ${statusResult.stderr}`], modified: [] };
  }

  const lines = statusResult.stdout
    ? statusResult.stdout.split('\n').map(s => s.trim()).filter(Boolean)
    : [];

  // Extract filenames from porcelain output: "XY filename" or "XY old -> new"
  const modified = lines.map(line => {
    // porcelain: first 2 chars are status, 3rd is space, rest is filename
    const namePart = line.length > 3 ? line.slice(3) : '';
    // Handle rename: "old -> new"
    const arrowIdx = namePart.indexOf(' -> ');
    return arrowIdx !== -1 ? namePart.slice(arrowIdx + 4).trim() : namePart.trim();
  }).filter(Boolean);

  if (modified.length === 0) {
    return { valid: false, violations: ['no files modified'], modified: [] };
  }

  const mutableSet = new Set(Array.isArray(mutableFiles) ? mutableFiles : []);
  const violations = modified.filter(f => !mutableSet.has(f));

  return {
    valid: violations.length === 0,
    violations,
    modified,
  };
}

// ─── Metric evaluation ────────────────────────────────────────────────────────

/**
 * _evalMetric(cwd, verifyCmd, timeoutMs)
 *
 * Runs verifyCmd via spawnSync with shell:true and parses the last line
 * of stdout as a float.
 *
 * Returns:
 *   { status: 'ok', metric_value: number }
 *   { status: 'CRASH', reason: 'timeout', metric_value: null }
 *   { status: 'CRASH', reason: 'nonzero_exit', metric_value: null }
 *   { status: 'CRASH', reason: 'unparseable_metric', metric_value: null }
 */
function _evalMetric(cwd, verifyCmd, timeoutMs) {
  // Use shell: true so verify commands can include shell syntax and quoted args.
  // verifyCmd is passed as a full string to the shell.
  const result = spawnSync(verifyCmd, [], {
    cwd,
    timeout: timeoutMs || 30000,
    encoding: 'utf-8',
    stdio: 'pipe',
    shell: true,
  });

  // Timeout: spawnSync sets signal to SIGTERM and/or error.code to ETIMEDOUT
  if (result.signal === 'SIGTERM' ||
      (result.error && result.error.code === 'ETIMEDOUT') ||
      (result.status === null && result.signal !== null)) {
    return { status: 'CRASH', reason: 'timeout', metric_value: null };
  }

  // Non-zero exit
  if (result.status !== 0) {
    return { status: 'CRASH', reason: 'nonzero_exit', metric_value: null };
  }

  // Parse last line of stdout
  const stdout = (result.stdout || '').trim();
  const lines = stdout ? stdout.split('\n').map(s => s.trim()).filter(Boolean) : [];
  const lastLine = lines[lines.length - 1] || '';
  const parsed = parseFloat(lastLine);

  if (!Number.isFinite(parsed)) {
    return { status: 'CRASH', reason: 'unparseable_metric', metric_value: null };
  }

  return { status: 'ok', metric_value: parsed };
}

// ─── Metric comparison ────────────────────────────────────────────────────────

/**
 * _compareMetric(newValue, bestMetric, direction)
 *
 * Decides whether to KEEP or DISCARD the new metric value.
 *
 * - If bestMetric is null (first iteration): always KEEP
 * - direction='max': KEEP if newValue > bestMetric
 * - direction='min': KEEP if newValue < bestMetric
 */
function _compareMetric(newValue, bestMetric, direction) {
  if (bestMetric === null || bestMetric === undefined) {
    return 'KEEP';
  }
  if (direction === 'min') {
    return newValue < bestMetric ? 'KEEP' : 'DISCARD';
  }
  // Default to 'max'
  return newValue > bestMetric ? 'KEEP' : 'DISCARD';
}

// ─── JSONL row writing ────────────────────────────────────────────────────────

/**
 * _writeJsonlRow(cwd, slug, rowData)
 *
 * Appends a JSONL row to .planning/experiments/{slug}/results.jsonl.
 * Row keys are restricted to JSONL_ROW_FIELDS (extra keys discarded).
 * Auto-sets: id = "{slug}-{padded 4-digit iteration}", ts = ISO timestamp.
 *
 * Returns the written row object.
 */
function _writeJsonlRow(cwd, slug, rowData) {
  const row = {};

  // Build row with only JSONL_ROW_FIELDS keys
  for (const field of JSONL_ROW_FIELDS) {
    if (field in rowData) {
      row[field] = rowData[field];
    } else {
      row[field] = null;
    }
  }

  // Auto-generate id and ts
  row.id = `${slug}-${String(rowData.iteration || 0).padStart(4, '0')}`;
  row.ts = new Date().toISOString();

  const jsonlPath = path.join(cwd, '.planning', 'experiments', slug, 'results.jsonl');
  fs.appendFileSync(jsonlPath, JSON.stringify(row) + '\n', 'utf-8');

  return row;
}

// ─── Diff extraction ──────────────────────────────────────────────────────────

/**
 * _extractDiff(cwd, baseline, files)
 *
 * Returns the git diff between baseline SHA and HEAD for the specified files.
 * Returns null on git failure.
 */
function _extractDiff(cwd, baseline, files) {
  const gitArgs = ['diff', baseline, 'HEAD', '--'];
  if (Array.isArray(files) && files.length > 0) {
    gitArgs.push(...files);
  }

  const result = execGit(cwd, gitArgs);
  if (result.exitCode !== 0) {
    return null;
  }

  return result.stdout || '';
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  _checkModifiedFiles,
  _evalMetric,
  _compareMetric,
  _writeJsonlRow,
  _extractDiff,
};
