'use strict';
/**
 * experiment-runner.cjs — Iteration helpers for experiment loop
 *
 * Exports:
 *   _checkModifiedFiles(cwd, mutableFiles)   -> { valid, violations, modified }
 *   _evalMetric(cwd, verifyCmd, timeoutMs)   -> { status, reason?, metric_value, stdout?, stderr? }
 *   _compareMetric(newValue, bestMetric, direction) -> 'KEEP' | 'DISCARD'
 *   _writeJsonlRow(cwd, slug, rowData, jsonlPath?)  -> row
 *   _extractDiff(cwd, baseline, files)       -> string | null
 *
 * These are the building blocks called by the agent (Plan 02) and orchestrator (Phase 103).
 * Under 300 lines — scope creep prevention per PITFALLS research.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { execGit } = require('./core.cjs');
const { JSONL_ROW_FIELDS } = require('./experiment-schema.cjs');

// ─── Boundary enforcement ─────────────────────────────────────────────────────

/**
 * _checkModifiedFiles(cwd, mutableFiles)
 *
 * Checks which files were modified since the last commit (git diff --name-only HEAD).
 * Returns { valid, violations, modified } where:
 *   - valid: true only if at least one file was modified and all are in mutableFiles
 *   - violations: list of files not in mutableFiles, or special strings for errors
 *   - modified: list of files detected by git diff
 */
function _checkModifiedFiles(cwd, mutableFiles) {
  const result = execGit(cwd, ['diff', '--name-only', 'HEAD']);
  if (result.exitCode !== 0) {
    return { valid: false, violations: [`git diff failed: ${result.stderr || 'unknown error'}`], modified: [] };
  }

  const modified = result.stdout.length > 0
    ? result.stdout.split('\n').map(f => f.trim()).filter(Boolean)
    : [];

  if (modified.length === 0) {
    return { valid: false, violations: ['no files modified'], modified: [] };
  }

  const mutableSet = new Set(mutableFiles);
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
 * Runs verifyCmd via spawnSync with the given timeout.
 * Parses the last line of stdout as a float.
 *
 * Returns:
 *   { status: 'ok', metric_value: number, stdout, stderr }
 *   { status: 'CRASH', reason: 'timeout'|'nonzero_exit'|'unparseable_metric', metric_value: null, stdout?, stderr? }
 */
function _evalMetric(cwd, verifyCmd, timeoutMs) {
  const parts = verifyCmd.trim().split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  const proc = spawnSync(cmd, args, {
    cwd,
    timeout: timeoutMs,
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  // Timeout: signal is set (typically SIGTERM or SIGKILL) or status is null
  if (proc.signal === 'SIGTERM' || proc.signal === 'SIGKILL' || (proc.status === null && proc.signal)) {
    return { status: 'CRASH', reason: 'timeout', metric_value: null, stdout: proc.stdout, stderr: proc.stderr };
  }

  // spawnSync timeout with no signal (node's internal timeout)
  if (proc.error && proc.error.code === 'ETIMEDOUT') {
    return { status: 'CRASH', reason: 'timeout', metric_value: null, stdout: proc.stdout, stderr: proc.stderr };
  }

  // Non-zero exit
  if (proc.status !== 0) {
    return { status: 'CRASH', reason: 'nonzero_exit', metric_value: null, stdout: proc.stdout, stderr: proc.stderr };
  }

  // Parse last line of stdout
  const stdout = proc.stdout || '';
  const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] || '';
  const parsed = parseFloat(lastLine);

  if (!Number.isFinite(parsed)) {
    return { status: 'CRASH', reason: 'unparseable_metric', metric_value: null, stdout: proc.stdout, stderr: proc.stderr };
  }

  return { status: 'ok', metric_value: parsed, stdout: proc.stdout, stderr: proc.stderr };
}

// ─── Metric comparison ────────────────────────────────────────────────────────

/**
 * _compareMetric(newValue, bestMetric, direction)
 *
 * Returns 'KEEP' or 'DISCARD':
 *   - If bestMetric is null (first iteration) -> always 'KEEP'
 *   - direction='max': newValue > bestMetric -> 'KEEP'
 *   - direction='min': newValue < bestMetric -> 'KEEP'
 *   - otherwise -> 'DISCARD'
 */
function _compareMetric(newValue, bestMetric, direction) {
  if (bestMetric === null || bestMetric === undefined) {
    return 'KEEP';
  }
  if (direction === 'max') {
    return newValue > bestMetric ? 'KEEP' : 'DISCARD';
  }
  if (direction === 'min') {
    return newValue < bestMetric ? 'KEEP' : 'DISCARD';
  }
  // Default: treat as max
  return newValue > bestMetric ? 'KEEP' : 'DISCARD';
}

// ─── JSONL row write ──────────────────────────────────────────────────────────

/**
 * _writeJsonlRow(cwd, slug, rowData, jsonlPath?)
 *
 * Builds a JSONL row containing only JSONL_ROW_FIELDS keys from rowData.
 * JSONL_ROW_FIELDS includes tokens_used as the 9th field (EXEC-05 contract).
 * Auto-sets id = `${slug}-${String(iteration).padStart(4, '0')}`
 * Auto-sets ts = new Date().toISOString()
 * Appends JSON line + newline to jsonlPath (or default path).
 * Returns the written row object.
 */
function _writeJsonlRow(cwd, slug, rowData, jsonlPath) {
  const filePath = jsonlPath || path.join(cwd, '.planning', 'experiments', slug, 'results.jsonl');

  // Build row with only JSONL_ROW_FIELDS
  const row = {};
  for (const field of JSONL_ROW_FIELDS) {
    row[field] = field in rowData ? rowData[field] : null;
  }

  // Auto-set id and ts
  row.id = `${slug}-${String(rowData.iteration || 0).padStart(4, '0')}`;
  row.ts = new Date().toISOString();

  // Ensure parent directory exists
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  // Append row
  fs.appendFileSync(filePath, JSON.stringify(row) + '\n', 'utf-8');

  return row;
}

// ─── Diff extraction ─────────────────────────────────────────────────────────

/**
 * _extractDiff(cwd, baseline, files)
 *
 * Returns git diff output between baseline commit and HEAD for the specified files.
 * Returns null on git failure.
 */
function _extractDiff(cwd, baseline, files) {
  const args = ['diff', baseline, 'HEAD', '--'];
  if (files && files.length > 0) {
    args.push(...files);
  }
  const result = execGit(cwd, args);
  if (result.exitCode !== 0) {
    return null;
  }
  return result.stdout;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  _checkModifiedFiles,
  _evalMetric,
  _compareMetric,
  _writeJsonlRow,
  _extractDiff,
};
