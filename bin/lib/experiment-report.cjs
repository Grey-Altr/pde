'use strict';
/**
 * experiment-report.cjs — Report generation, circuit breaker checks, cost estimation.
 *
 * Exports:
 *   generateReport(cwd, slug, raw)         — pde-tools cmd wrapper
 *   _generateReport(cwd, slug, options)    — unit-testable core
 *   estimateCost(iterationBudget)          — alias of _estimateCost
 *   _estimateCost(iterationBudget)         — pure function: token estimate
 *   checkCircuitBreakers(state)            — alias of _checkCircuitBreakers
 *   _checkCircuitBreakers(state)           — pure function: first firing breaker or null
 *   _cmdDiffSummary(cwd, slug, raw)        — pde-tools cmd wrapper for diff-summary
 *
 * Under 300 lines — scope creep prevention per PITFALLS research.
 */

const fs = require('fs');
const path = require('path');
const { output, error } = require('./core.cjs');
const { _extractDiff } = require('./experiment-runner.cjs');
const { parseExperimentFile } = require('./experiment-schema.cjs');

// ─── Circuit Breaker Check ─────────────────────────────────────────────────────

/**
 * _checkCircuitBreakers(state)
 *
 * Checks all circuit breakers in priority order and returns the first firing one.
 *
 * @param {object} state
 *   state.currentIteration           {number}
 *   state.iterationBudget             {number}
 *   state.elapsedMinutes              {number}
 *   state.timeBudget                  {number}
 *   state.consecutiveFailures         {number}
 *   state.consecutiveFailureLimit     {number}
 *   state.iterationsSinceImprovement  {number}
 *   state.noProgressLimit             {number}
 * @returns {{ fired: boolean, reason: string|null }}
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

// ─── Cost Estimate ─────────────────────────────────────────────────────────────

/**
 * _estimateCost(iterationBudget)
 *
 * Returns estimated total tokens for an experiment run.
 * Formula: iterations * ~2000 tokens/iteration (Haiku context window conservative estimate).
 *
 * @param {number} iterationBudget
 * @returns {number} estimated total tokens
 */
function _estimateCost(iterationBudget) {
  const TOKENS_PER_ITERATION = 2000;
  return iterationBudget * TOKENS_PER_ITERATION;
}

// ─── Report Generation ─────────────────────────────────────────────────────────

/**
 * _readJsonlRows(jsonlPath)
 *
 * Reads results.jsonl and returns parsed rows.
 * Returns [] on missing or empty file — never throws.
 */
function _readJsonlRows(jsonlPath) {
  try {
    const content = fs.readFileSync(jsonlPath, 'utf-8');
    if (!content.trim()) return [];
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * _generateReport(cwd, slug, options)
 *
 * Generates REPORT.md for a completed or halted experiment.
 *
 * @param {string} cwd          — project root
 * @param {string} slug         — experiment slug
 * @param {object} options
 *   options.haltReason         {string|null} — circuit breaker reason or null if completed
 *   options.baselineMetric     {number}       — baseline metric value
 * @returns {{ path: string, iterations: number, improvements: number, bestMetric: number|null }}
 */
function _generateReport(cwd, slug, options = {}) {
  const { haltReason = null } = options;

  const expDir = path.join(cwd, '.planning', 'experiments', slug);

  // 1. Read results.jsonl — empty/absent → 0 iterations
  const jsonlPath = path.join(expDir, 'results.jsonl');
  const rows = _readJsonlRows(jsonlPath);

  // 2. Read EXPERIMENT-BEST.json
  let best = {};
  try {
    const bestJson = fs.readFileSync(path.join(expDir, 'EXPERIMENT-BEST.json'), 'utf-8');
    best = JSON.parse(bestJson);
  } catch { /* no best state — use defaults */ }

  // 3. Read experiment.md for mutable_files
  const expMdPath = path.join(expDir, 'experiment.md');
  let mutableFiles = [];
  let expConfig = {};
  const parsed = parseExperimentFile(expMdPath);
  if (parsed.valid) {
    mutableFiles = parsed.mutable_files || [];
    expConfig = parsed;
  }

  // 4. Compute aggregates
  const iterations = rows.length;
  const improvements = rows.filter(r => r.status === 'KEEP').length;
  const totalTokens = rows.reduce((sum, r) => sum + (r.tokens_used || 0), 0);
  const bestMetric = best.bestMetric !== undefined ? best.bestMetric : null;
  const baseline = best.baseline || null;
  const direction = best.direction || expConfig.direction || 'max';

  // 5. Get diff
  const diffOutput = baseline
    ? (_extractDiff(cwd, baseline, mutableFiles) || '')
    : '';

  // 6. Format REPORT.md
  const now = new Date().toISOString();
  const statusLine = haltReason
    ? `HALTED -- ${haltReason}`
    : 'COMPLETED';

  const costPerImprovement = improvements > 0
    ? Math.round(totalTokens / improvements)
    : 'N/A';

  const filesLine = mutableFiles.length > 0
    ? mutableFiles.join(', ')
    : '(none specified)';

  const circuitBreakerSection = haltReason
    ? `Halted by: ${haltReason} at iteration ${iterations}`
    : 'Completed full iteration budget';

  const diffSection = diffOutput
    ? `\`\`\`diff\n${diffOutput}\n\`\`\``
    : '*(no changes from baseline)*';

  // Build iteration log table rows
  const tableRows = rows.map(r => {
    const metric = r.metric_value !== null && r.metric_value !== undefined ? r.metric_value : '-';
    const delta = r.metric_delta !== null && r.metric_delta !== undefined ? r.metric_delta : '-';
    return `| ${r.iteration || '-'} | ${r.status || '-'} | ${metric} | ${delta} | ${r.description || '-'} |`;
  }).join('\n');

  const iterationLog = rows.length > 0
    ? `| # | Status | Metric | Delta | Description |\n|---|--------|--------|-------|-------------|\n${tableRows}`
    : '*(no iterations recorded)*';

  const report = `# Experiment Report: ${slug}

**Completed:** ${now}
**Status:** ${statusLine}

## Summary

| Metric | Value |
|--------|-------|
| Iterations run | ${iterations} |
| Improvements kept | ${improvements} |
| Best metric | ${bestMetric !== null ? bestMetric : 'N/A'} (${direction} from baseline ${baseline || 'unknown'}) |
| Total tokens used | ${totalTokens} |
| Cost per improvement | ${costPerImprovement} tokens |
| Files modified | ${filesLine} |

## Circuit Breaker

${circuitBreakerSection}

## Diff Summary

${diffSection}

## Iteration Log

${iterationLog}
`;

  // 7. Write REPORT.md
  const reportPath = path.join(expDir, 'REPORT.md');
  fs.mkdirSync(expDir, { recursive: true });
  fs.writeFileSync(reportPath, report, 'utf-8');

  // 8. Return metadata
  return { path: reportPath, iterations, improvements, bestMetric };
}

// ─── Command Wrappers ──────────────────────────────────────────────────────────

/**
 * cmdGenerateReport(cwd, slug, raw)
 *
 * pde-tools command wrapper for generate-report subcommand.
 * Reads options from environment or uses defaults.
 */
function cmdGenerateReport(cwd, slug, raw) {
  // Options flow via EXPERIMENT-BEST.json; haltReason and baselineMetric are
  // optional at cmd level — _generateReport handles missing gracefully.
  const result = _generateReport(cwd, slug, {});
  output(result, raw);
}

/**
 * _cmdDiffSummary(cwd, slug, raw)
 *
 * pde-tools command wrapper for diff-summary subcommand.
 * Reads EXPERIMENT-BEST.json for baseline, experiment.md for mutable_files,
 * then calls _extractDiff and outputs the diff string.
 */
function _cmdDiffSummary(cwd, slug, raw) {
  const expDir = path.join(cwd, '.planning', 'experiments', slug);

  // Read EXPERIMENT-BEST.json for baseline
  let baseline;
  try {
    const best = JSON.parse(fs.readFileSync(path.join(expDir, 'EXPERIMENT-BEST.json'), 'utf-8'));
    baseline = best.baseline;
  } catch {
    error('Cannot read EXPERIMENT-BEST.json for slug: ' + slug);
  }

  if (!baseline) {
    error('No baseline commit found in EXPERIMENT-BEST.json for slug: ' + slug);
  }

  // Read experiment.md for mutable_files
  const expMdPath = path.join(expDir, 'experiment.md');
  const parsed = parseExperimentFile(expMdPath);
  if (!parsed.valid) {
    error(parsed.errors.join('; '));
  }

  const diff = _extractDiff(cwd, baseline, parsed.mutable_files);
  output({ diff: diff || '' }, raw);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  generateReport: cmdGenerateReport,
  _generateReport,
  estimateCost: _estimateCost,
  _estimateCost,
  checkCircuitBreakers: _checkCircuitBreakers,
  _checkCircuitBreakers,
  _cmdDiffSummary,
};
