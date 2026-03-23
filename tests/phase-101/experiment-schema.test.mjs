/**
 * experiment-schema.test.mjs
 *
 * Unit tests for parseExperimentFile and JSONL_ROW_FIELDS in experiment-schema.cjs.
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-schema-'));
}

function writeFile(dir, filename, content) {
  const p = path.join(dir, filename);
  fs.writeFileSync(p, content, 'utf-8');
  return p;
}

const VALID_EXPERIMENT_MD = `---
slug: test-exp
metric: awwwards_score
direction: max
verify: node bin/pde-tools.cjs experiment verify-metric
mutable_files:
  - workflows/brief.md
immutable_files: []
iteration_budget: 30
time_budget_minutes: 45
---

## Search Space

Improve the brief quality prompts.
`;

// ─── JSONL_ROW_FIELDS tests ────────────────────────────────────────────────────

test('JSONL_ROW_FIELDS is exported and frozen', () => {
  assert.ok(Array.isArray(schema.JSONL_ROW_FIELDS), 'JSONL_ROW_FIELDS should be an array');
  assert.ok(Object.isFrozen(schema.JSONL_ROW_FIELDS), 'JSONL_ROW_FIELDS should be frozen');
});

test('JSONL_ROW_FIELDS contains exactly the 9 required fields', () => {
  const expected = ['id', 'iteration', 'ts', 'commit', 'metric_value', 'metric_delta', 'status', 'description', 'tokens_used'];
  assert.deepEqual(schema.JSONL_ROW_FIELDS, expected, 'JSONL_ROW_FIELDS should contain exactly the 9 schema fields');
});

// ─── parseExperimentFile tests ─────────────────────────────────────────────────

test('parseExperimentFile with valid experiment.md returns valid: true with all fields', () => {
  const dir = makeTempDir();
  const filePath = writeFile(dir, 'experiment.md', VALID_EXPERIMENT_MD);

  const result = schema.parseExperimentFile(filePath);
  assert.equal(result.valid, true, 'Should be valid');
  assert.equal(result.metric, 'awwwards_score');
  assert.equal(result.direction, 'max');
  assert.ok(result.verify, 'Should have verify field');
  assert.ok(Array.isArray(result.mutable_files), 'mutable_files should be array');
  assert.ok(Array.isArray(result.immutable_files), 'immutable_files should be array');
  assert.ok(result.budget, 'Should have budget object');
  assert.equal(result.budget.iterations, 30);
  assert.equal(result.budget.minutes, 45);
  assert.equal(result.slug, 'test-exp');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('parseExperimentFile defaults: iteration_budget defaults to 50 when missing', () => {
  const dir = makeTempDir();
  const content = `---
metric: perf_score
direction: min
verify: node test.js
mutable_files:
  - workflows/flow.md
---

Body text.
`;
  const filePath = writeFile(dir, 'experiment.md', content);
  const result = schema.parseExperimentFile(filePath);
  assert.equal(result.valid, true);
  assert.equal(result.budget.iterations, 50, 'iteration_budget should default to 50');
  assert.equal(result.budget.minutes, 60, 'time_budget_minutes should default to 60');
  assert.deepEqual(result.immutable_files, [], 'immutable_files should default to []');

  fs.rmSync(dir, { recursive: true, force: true });
});

test('parseExperimentFile with missing required field returns valid: false with error list', () => {
  const dir = makeTempDir();
  const content = `---
direction: max
verify: node test.js
mutable_files:
  - workflows/brief.md
---
`;
  const filePath = writeFile(dir, 'experiment.md', content);
  const result = schema.parseExperimentFile(filePath);
  assert.equal(result.valid, false, 'Should be invalid');
  assert.ok(Array.isArray(result.errors), 'errors should be an array');
  assert.ok(result.errors.some(e => e.includes('metric')), `Should mention missing 'metric' field, got: ${JSON.stringify(result.errors)}`);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('parseExperimentFile with invalid direction returns clear error', () => {
  const dir = makeTempDir();
  const content = `---
metric: score
direction: up
verify: node test.js
mutable_files:
  - workflows/brief.md
---
`;
  const filePath = writeFile(dir, 'experiment.md', content);
  const result = schema.parseExperimentFile(filePath);
  assert.equal(result.valid, false, 'Should be invalid');
  assert.ok(Array.isArray(result.errors), 'errors should be an array');
  assert.ok(result.errors.some(e => e.includes('min') && e.includes('max')), `Error should mention min/max, got: ${JSON.stringify(result.errors)}`);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('parseExperimentFile with nonexistent file returns valid: false with error', () => {
  const result = schema.parseExperimentFile('/nonexistent/path/experiment.md');
  assert.equal(result.valid, false, 'Should be invalid for missing file');
  assert.ok(Array.isArray(result.errors), 'errors should be an array');
  assert.ok(result.errors.length > 0, 'Should have at least one error');
  assert.ok(result.errors[0].includes('Cannot read'), `Error should mention cannot read, got: ${result.errors[0]}`);
});

test('parseExperimentFile mutable_files is always an array', () => {
  const dir = makeTempDir();
  const content = `---
metric: score
direction: max
verify: node test.js
mutable_files:
  - workflows/brief.md
  - workflows/flows.md
---
`;
  const filePath = writeFile(dir, 'experiment.md', content);
  const result = schema.parseExperimentFile(filePath);
  assert.ok(Array.isArray(result.mutable_files), 'mutable_files should be array');
  assert.equal(result.mutable_files.length, 2);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('parseExperimentFile slug is null when not present in frontmatter', () => {
  const dir = makeTempDir();
  const content = `---
metric: score
direction: max
verify: node test.js
mutable_files:
  - workflows/brief.md
---
`;
  const filePath = writeFile(dir, 'experiment.md', content);
  const result = schema.parseExperimentFile(filePath);
  assert.equal(result.valid, true);
  assert.equal(result.slug, null, 'slug should be null when not in frontmatter');

  fs.rmSync(dir, { recursive: true, force: true });
});
