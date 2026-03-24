'use strict';
/**
 * experiment-schema.cjs — Experiment schema parsing, directory init, config patching.
 *
 * This is a NEW module (not extending experiment.cjs — it is at 289/300 line ceiling).
 * Defines the data contracts consumed by Phases 102-107.
 * Under 300 lines — scope creep prevention per PITFALLS research.
 */

const fs = require('fs');
const path = require('path');
const { output, error } = require('./core.cjs');
const { extractFrontmatter } = require('./frontmatter.cjs');

// ─── JSONL row schema contract ────────────────────────────────────────────────

/**
 * Machine-readable contract for results.jsonl row schema (EXEC-05).
 * Phase 102 consumers import this constant rather than hardcoding field names.
 */
const JSONL_ROW_FIELDS = Object.freeze([
  'id',
  'iteration',
  'ts',
  'commit',
  'metric_value',
  'metric_delta',
  'status',
  'description',
  'tokens_used',
  'screenshot_hash',
  'baseline_hash',
  // Multi-candidate extensions (Phase 115)
  'candidates_evaluated',
  'candidates_scores',
  'best_candidate_index',
]);

// ─── Schema parsing ───────────────────────────────────────────────────────────

const REQUIRED_FIELDS = ['metric', 'direction', 'verify', 'mutable_files'];
const VALID_DIRECTIONS = ['min', 'max'];

/**
 * parseExperimentFile(filePath)
 *
 * Parses an experiment.md file and validates its YAML frontmatter.
 * Returns { valid: true, ...fields } on success or { valid: false, errors: [...] } on failure.
 */
function parseExperimentFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    return { valid: false, errors: [`Cannot read experiment file: ${err.message}`] };
  }

  const fm = extractFrontmatter(content);
  const errors = [];

  // Check required fields
  const missing = REQUIRED_FIELDS.filter(f => fm[f] === undefined || fm[f] === null || fm[f] === '');
  if (missing.length > 0) {
    errors.push(`experiment.md is missing required fields: ${missing.join(', ')}`);
  }

  // Validate direction
  if (fm.direction !== undefined && fm.direction !== '' && !VALID_DIRECTIONS.includes(fm.direction)) {
    errors.push(`direction must be "min" or "max", got "${fm.direction}"`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Normalize mutable_files to always be an array
  let mutableFiles = fm.mutable_files;
  if (!Array.isArray(mutableFiles)) {
    mutableFiles = mutableFiles ? [mutableFiles] : [];
  }

  // Normalize immutable_files to always be an array, default to []
  let immutableFiles = fm.immutable_files;
  if (!Array.isArray(immutableFiles)) {
    immutableFiles = immutableFiles ? [immutableFiles] : [];
  }

  // Parse budget with defaults
  const iterationBudget = fm.iteration_budget !== undefined
    ? parseInt(fm.iteration_budget, 10)
    : 50;
  const timeBudgetMinutes = fm.time_budget_minutes !== undefined
    ? parseInt(fm.time_budget_minutes, 10)
    : 60;

  return {
    valid: true,
    metric: fm.metric,
    direction: fm.direction,
    verify: fm.verify,
    mutable_files: mutableFiles,
    immutable_files: immutableFiles,
    budget: {
      iterations: iterationBudget,
      minutes: timeBudgetMinutes,
    },
    slug: fm.slug || null,
    visual_regression: {
      enabled: fm.visual_regression_guard === 'true' || fm.visual_regression_guard === true,
      target: fm.visual_regression_target || null,
    },
    candidates: fm.candidates !== undefined ? parseInt(fm.candidates, 10) : 3,
  };
}

// ─── Directory initialization ─────────────────────────────────────────────────

/**
 * _ensureExperimentDirs(cwd)
 *
 * Creates .planning/experiments/ parent directory idempotently.
 * Does NOT create per-slug subdirs — those are created lazily by
 * `experiment init` in Phase 100 via writeBest.
 *
 * Returns the created path string.
 */
function _ensureExperimentDirs(cwd) {
  const experimentsDir = path.join(cwd, '.planning', 'experiments');
  fs.mkdirSync(experimentsDir, { recursive: true });
  return experimentsDir;
}

/**
 * cmdEnsureExperimentDirs(cwd, raw)
 *
 * Thin cmd wrapper: ensures experiment dirs then calls output().
 */
function cmdEnsureExperimentDirs(cwd, raw) {
  const dir = _ensureExperimentDirs(cwd);
  output({ ensured: true, path: dir }, raw);
}

// ─── Config patching ──────────────────────────────────────────────────────────

const EXPERIMENT_DEFAULTS = {
  iteration_budget: 50,
  time_budget_minutes: 60,
  consecutive_failure_limit: 5,
  no_progress_limit: 10,
  cost_estimate_enabled: true,
};

/**
 * _patchExperimentConfig(cwd)
 *
 * Adds experiment_defaults block to .planning/config.json without overwriting
 * existing values. Creates config.json (as {}) if missing.
 *
 * Returns { patched: true } or { patched: false, reason: 'already_exists' }.
 */
function _patchExperimentConfig(cwd) {
  const configPath = path.join(cwd, '.planning', 'config.json');

  let config = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {
    // Malformed JSON — start fresh
    config = {};
  }

  if (config.experiment_defaults !== undefined) {
    return { patched: false, reason: 'already_exists' };
  }

  config.experiment_defaults = { ...EXPERIMENT_DEFAULTS };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  return { patched: true };
}

/**
 * cmdPatchExperimentConfig(cwd, raw)
 *
 * Thin cmd wrapper: patches config then calls output().
 */
function cmdPatchExperimentConfig(cwd, raw) {
  const result = _patchExperimentConfig(cwd);
  output(result, raw);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  JSONL_ROW_FIELDS,
  parseExperimentFile,
  _ensureExperimentDirs,
  cmdEnsureExperimentDirs,
  _patchExperimentConfig,
  cmdPatchExperimentConfig,
};
