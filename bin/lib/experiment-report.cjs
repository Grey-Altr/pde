'use strict';
/**
 * experiment-report.cjs — REPORT.md generation, circuit breaker checks, cost estimation.
 *
 * Exports:
 *   generateReport(cwd, slug, raw)        cmd wrapper — writes REPORT.md, calls output()
 *   _generateReport(cwd, slug, options)   -> { path, iterations, improvements, bestMetric }
 *   estimateCost(iterationBudget)         -> number (total estimated tokens)
 *   _estimateCost(iterationBudget)        -> number
 *   checkCircuitBreakers(state)           -> { fired: boolean, reason: string|null }
 *   _checkCircuitBreakers(state)          -> { fired: boolean, reason: string|null }
 *   _cmdDiffSummary(cwd, slug, raw)       outputs diff string
 *
 * Under 300 lines — scope creep prevention per PITFALLS research.
 */

const fs = require('fs');
const path = require('path');
const { output, error } = require('./core.cjs');
const { _extractDiff } = require('./experiment-runner.cjs');
const { parseExperimentFile } = require('./experiment-schema.cjs');

// ─── Circuit Breaker Check ────────────────────────────────────────────────────

/**
 * _checkCircuitBreakers(state)
 *
 * Checks all 5 circuit breakers in priority order. Returns the first that fires.
 *
 * state shape:
 *   { currentIteration, iterationBudget, elapsedMinutes, timeBudget,
 *     consecutiveFailures, consecutiveFailureLimit,
 *     iterationsSinceImprovement, noProgressLimit }
 *
 * Returns: { fired: boolean, reason: string|null }
 */
function _checkCircuitBreakers(state) {
  if (state.currentIteration >= state.iterationBudget) {
    return { fired: true, reason: 'iteration_budget' };
  }
  if (state.elapsedMinutes >= state.timeBudget) {
    return { fired: true, reason: 'time_budget' };
  }
  if (state.consecutiveFailures >= state.consecutiveFailureLimit) {
    return { fired: true, reason: 'consecutive_failures' };
  }
  if (state.iterationsSinceImprovement >= state.noProgressLimit) {
    return { fired: true, reason: 'no_progress' };
  }
  return { fired: false, reason: null };
}

// ─── Cost Estimate ────────────────────────────────────────────────────────────

/**
 * _estimateCost(iterationBudget)
 *
 * Estimates total token cost for an experiment run.
 * Formula: iterations * ~2000 tokens/iteration (Haiku-first estimate).
 * Returns estimated total tokens as integer.
 */
function _estimateCost(iterationBudget) {
  const TOKENS_PER_ITERATION = 2000;
  return iterationBudget * TOKENS_PER_ITERATION;
}

// ─── Report Generation ────────────────────────────────────────────────────────

/**
 * _generateReport(cwd, slug, options)
 *
 * options: { haltReason: string|null, baselineMetric: number|null }
 *
 * Reads results.jsonl and EXPERIMENT-BEST.json, generates REPORT.md.
 * Handles empty/absent results.jsonl gracefully (0 iterations, no crash).
 *
 * Returns: { path: string, iterations: number, improvements: number, bestMetric: number|null }
 */
function _generateReport(cwd, slug, options) {
  const opts = options || {};
  const haltReason = opts.haltReason || null;
  const baselineMetric = opts.baselineMetric !== undefined ? opts.baselineMetric : null;

  const expDir = path.join(cwd, '.planning', 'experiments', slug);
  const jsonlPath = path.join(expDir, 'results.jsonl');
  const bestPath = path.join(expDir, 'EXPERIMENT-BEST.json');

  // Read results.jsonl — handle absent or empty gracefully
  let rows = [];
  try {
    const raw = fs.readFileSync(jsonlPath, 'utf-8');
    rows = raw.trim().split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch {
    // File absent — 0 iterations
  }

  // Read EXPERIMENT-BEST.json
  let bestState = {};
  try {
    bestState = JSON.parse(fs.readFileSync(bestPath, 'utf-8'));
  } catch {
    // No state yet
  }

  const direction = bestState.direction || 'max';
  const bestMetric = bestState.bestMetric !== undefined ? bestState.bestMetric : null;
  const baseline = bestState.baseline || null;
  const mutableFiles = [];

  // Try to read mutable_files from experiment.md
  const expMdPath = path.join(expDir, 'experiment.md');
  try {
    const parsed = parseExperimentFile(expMdPath);
    if (parsed.valid && Array.isArray(parsed.mutable_files)) {
      mutableFiles.push(...parsed.mutable_files);
    }
  } catch {
    // No experiment.md — skip
  }

  // Compute aggregates
  const iterations = rows.length;
  const improvements = rows.filter(r => r.status === 'KEEP').length;
  const totalTokens = rows.reduce((sum, r) => sum + (r.tokens_used || 0), 0);
  const costPerImprovement = improvements > 0
    ? Math.round(totalTokens / improvements)
    : 'N/A';

  // Status line
  const statusLine = haltReason
    ? `HALTED -- ${haltReason}`
    : 'COMPLETED';

  const timestamp = new Date().toISOString();

  // Best metric display
  const bestDisplay = bestMetric !== null
    ? `${bestMetric} (${direction} from baseline ${baselineMetric !== null ? baselineMetric : 'unknown'})`
    : 'none';

  // Files modified display
  const filesDisplay = mutableFiles.length > 0 ? mutableFiles.join(', ') : 'none recorded';

  // Circuit breaker section
  const circuitBreakerSection = haltReason
    ? `Halted by: ${haltReason} at iteration ${iterations}`
    : 'Completed full iteration budget';

  // Diff summary
  let diffContent = '';
  if (baseline) {
    const diff = _extractDiff(cwd, baseline, mutableFiles.length > 0 ? mutableFiles : undefined);
    if (diff) {
      diffContent = diff;
    } else {
      diffContent = '(no diff available)';
    }
  } else {
    diffContent = '(no baseline recorded)';
  }

  // Iteration log table
  const logRows = rows.map(r =>
    `| ${r.iteration || ''} | ${r.status || ''} | ${r.metric_value !== null ? r.metric_value : ''} | ${r.metric_delta !== null ? r.metric_delta : ''} | ${r.description || ''} |`
  ).join('\n');

  const iterationLog = rows.length > 0
    ? `| # | Status | Metric | Delta | Description |\n|---|--------|--------|-------|-------------|\n${logRows}`
    : '| # | Status | Metric | Delta | Description |\n|---|--------|--------|-------|-------------|\n(no iterations recorded)';

  // Assemble REPORT.md
  const report = [
    `# Experiment Report: ${slug}`,
    '',
    `**Completed:** ${timestamp}`,
    `**Status:** ${statusLine}`,
    '',
    '## Summary',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Iterations run | ${iterations} |`,
    `| Improvements kept | ${improvements} |`,
    `| Best metric | ${bestDisplay} |`,
    `| Total tokens used | ${totalTokens} |`,
    `| Cost per improvement | ${costPerImprovement} tokens |`,
    `| Files modified | ${filesDisplay} |`,
    '',
    '## Circuit Breaker',
    '',
    circuitBreakerSection,
    '',
    '## Diff Summary',
    '',
    '```diff',
    diffContent,
    '```',
    '',
    '## Iteration Log',
    '',
    iterationLog,
    '',
  ].join('\n');

  // Write REPORT.md
  fs.mkdirSync(expDir, { recursive: true });
  const reportPath = path.join(expDir, 'REPORT.md');
  fs.writeFileSync(reportPath, report, 'utf-8');

  return { path: reportPath, iterations, improvements, bestMetric };
}

// ─── Cmd Wrappers ─────────────────────────────────────────────────────────────

function generateReport(cwd, slug, raw) {
  const result = _generateReport(cwd, slug, {});
  output(result, raw);
}

function _cmdDiffSummary(cwd, slug, raw) {
  const expDir = path.join(cwd, '.planning', 'experiments', slug);
  const bestPath = path.join(expDir, 'EXPERIMENT-BEST.json');

  let bestState = {};
  try {
    bestState = JSON.parse(fs.readFileSync(bestPath, 'utf-8'));
  } catch {
    error(`Cannot read EXPERIMENT-BEST.json for slug ${slug}`);
    return;
  }

  const baseline = bestState.baseline;
  if (!baseline) {
    error('No baseline SHA recorded in EXPERIMENT-BEST.json');
    return;
  }

  // Get mutable_files from experiment.md
  const expMdPath = path.join(expDir, 'experiment.md');
  let mutableFiles = [];
  try {
    const parsed = parseExperimentFile(expMdPath);
    if (parsed.valid) {
      mutableFiles = parsed.mutable_files;
    }
  } catch {
    // No experiment.md
  }

  const diff = _extractDiff(cwd, baseline, mutableFiles.length > 0 ? mutableFiles : undefined);
  if (diff === null) {
    error('git diff failed');
    return;
  }

  if (raw) {
    process.stdout.write(diff + '\n');
  } else {
    output({ diff }, raw);
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  generateReport,
  _generateReport,
  estimateCost: _estimateCost,
  _estimateCost,
  checkCircuitBreakers: _checkCircuitBreakers,
  _checkCircuitBreakers,
  _cmdDiffSummary,
};
