/**
 * experiment-config.test.mjs
 *
 * Tests for _patchExperimentConfig in experiment-schema.cjs.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const SCHEMA_MODULE = path.resolve(__dirname, '../../bin/lib/experiment-schema.cjs');
const schema = require(SCHEMA_MODULE);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-config-'));
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
  return dir;
}

// ─── _patchExperimentConfig tests ─────────────────────────────────────────────

test('_patchExperimentConfig adds experiment_defaults block with correct default values', () => {
  const dir = makeTempDir();

  const result = schema._patchExperimentConfig(dir);
  assert.equal(result.patched, true, 'Should report patched: true');

  const configPath = path.join(dir, '.planning', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  assert.ok(config.experiment_defaults, 'config.json should have experiment_defaults');
  assert.equal(config.experiment_defaults.iteration_budget, 50);
  assert.equal(config.experiment_defaults.time_budget_minutes, 60);
  assert.equal(config.experiment_defaults.consecutive_failure_limit, 5);
  assert.equal(config.experiment_defaults.no_progress_limit, 10);
  assert.equal(config.experiment_defaults.cost_estimate_enabled, true);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('_patchExperimentConfig is idempotent — second call returns patched: false with reason already_exists', () => {
  const dir = makeTempDir();

  schema._patchExperimentConfig(dir);
  const result2 = schema._patchExperimentConfig(dir);

  assert.equal(result2.patched, false, 'Second call should return patched: false');
  assert.equal(result2.reason, 'already_exists', 'Should return reason: already_exists');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('_patchExperimentConfig does not overwrite existing experiment_defaults values', () => {
  const dir = makeTempDir();

  // Pre-populate config with existing experiment_defaults
  const existingConfig = {
    model_profile: 'balanced',
    experiment_defaults: {
      iteration_budget: 100,
      time_budget_minutes: 120,
    },
  };
  fs.writeFileSync(
    path.join(dir, '.planning', 'config.json'),
    JSON.stringify(existingConfig, null, 2),
    'utf-8'
  );

  const result = schema._patchExperimentConfig(dir);
  assert.equal(result.patched, false, 'Should not patch when experiment_defaults already exists');
  assert.equal(result.reason, 'already_exists');

  // Verify values were NOT overwritten
  const config = JSON.parse(fs.readFileSync(path.join(dir, '.planning', 'config.json'), 'utf-8'));
  assert.equal(config.experiment_defaults.iteration_budget, 100, 'Should preserve existing iteration_budget');
  assert.equal(config.experiment_defaults.time_budget_minutes, 120, 'Should preserve existing time_budget_minutes');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('_patchExperimentConfig creates config.json if it does not exist', () => {
  const dir = makeTempDir();

  // No config.json initially
  const configPath = path.join(dir, '.planning', 'config.json');
  assert.ok(!fs.existsSync(configPath), 'config.json should not exist initially');

  const result = schema._patchExperimentConfig(dir);
  assert.equal(result.patched, true);
  assert.ok(fs.existsSync(configPath), 'config.json should be created');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('_patchExperimentConfig preserves existing config values', () => {
  const dir = makeTempDir();

  // Pre-populate config without experiment_defaults
  const existingConfig = {
    model_profile: 'fast',
    commit_docs: false,
  };
  fs.writeFileSync(
    path.join(dir, '.planning', 'config.json'),
    JSON.stringify(existingConfig, null, 2),
    'utf-8'
  );

  schema._patchExperimentConfig(dir);

  const config = JSON.parse(fs.readFileSync(path.join(dir, '.planning', 'config.json'), 'utf-8'));
  assert.equal(config.model_profile, 'fast', 'Should preserve model_profile');
  assert.equal(config.commit_docs, false, 'Should preserve commit_docs');
  assert.ok(config.experiment_defaults, 'Should add experiment_defaults');

  fs.rmSync(dir, { recursive: true, force: true });
});
