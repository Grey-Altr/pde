/**
 * experiment-runner-jsonl.test.mjs
 *
 * Tests for _writeJsonlRow in experiment-runner.cjs.
 * Also tests JSONL_ROW_FIELDS now has 9 fields including tokens_used.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const RUNNER_MODULE = path.resolve(__dirname, '../../bin/lib/experiment-runner.cjs');
const runner = require(RUNNER_MODULE);

const SCHEMA_MODULE = path.resolve(__dirname, '../../bin/lib/experiment-schema.cjs');
const schema = require(SCHEMA_MODULE);

// --- Helpers ------------------------------------------------------------------

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-runner-jsonl-'));
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
}

// --- Tests -------------------------------------------------------------------

test('JSONL_ROW_FIELDS has at least 9 fields including tokens_used (Phase 114 adds screenshot_hash, baseline_hash)', () => {
  // Phase 114 extended JSONL_ROW_FIELDS with screenshot_hash and baseline_hash (now 11 fields).
  assert.ok(schema.JSONL_ROW_FIELDS.length >= 9, 'Should have at least 9 fields');
  assert.ok(schema.JSONL_ROW_FIELDS.includes('tokens_used'), 'Should include tokens_used');
});

test('_writeJsonlRow: writes row with all 9 JSONL_ROW_FIELDS including tokens_used', () => {
  const dir = makeTmpDir();
  try {
    const slug = 'test-exp';
    const jsonlPath = path.join(dir, 'results.jsonl');
    const rowData = {
      iteration: 1,
      commit: 'abc1234',
      metric_value: 42.5,
      metric_delta: 2.5,
      status: 'KEEP',
      description: 'improved brief prompts',
      tokens_used: 1500,
    };

    const written = runner._writeJsonlRow(dir, slug, rowData, jsonlPath);

    assert.ok(fs.existsSync(jsonlPath), 'results.jsonl should be created');
    const content = fs.readFileSync(jsonlPath, 'utf-8').trim();
    const parsed = JSON.parse(content);

    // All 9 fields should be present
    for (const field of schema.JSONL_ROW_FIELDS) {
      assert.ok(field in parsed, `Row should contain field: ${field}`);
    }

    assert.equal(parsed.tokens_used, 1500, 'tokens_used should be 1500');
    assert.equal(parsed.metric_value, 42.5, 'metric_value should be 42.5');
    assert.equal(parsed.status, 'KEEP', 'status should be KEEP');
  } finally {
    cleanup(dir);
  }
});

test('_writeJsonlRow: auto-generates id as slug-padded-iteration and ts as ISO', () => {
  const dir = makeTmpDir();
  try {
    const slug = 'my-exp';
    const jsonlPath = path.join(dir, 'results.jsonl');
    const rowData = {
      iteration: 3,
      commit: 'def5678',
      metric_value: 10.0,
      metric_delta: 0.0,
      status: 'DISCARD',
      description: 'test',
      tokens_used: 500,
    };

    const written = runner._writeJsonlRow(dir, slug, rowData, jsonlPath);

    const content = fs.readFileSync(jsonlPath, 'utf-8').trim();
    const parsed = JSON.parse(content);

    assert.equal(parsed.id, 'my-exp-0003', 'id should be slug-padded-4-digits-iteration');
    assert.ok(parsed.ts, 'ts should be set');
    // ts should be a valid ISO string
    assert.ok(!isNaN(Date.parse(parsed.ts)), 'ts should be a valid ISO date string');
  } finally {
    cleanup(dir);
  }
});

test('_writeJsonlRow: only includes fields from JSONL_ROW_FIELDS (no extra keys)', () => {
  const dir = makeTmpDir();
  try {
    const slug = 'clean-exp';
    const jsonlPath = path.join(dir, 'results.jsonl');
    const rowData = {
      iteration: 1,
      commit: 'aaa0000',
      metric_value: 5.0,
      metric_delta: 0.0,
      status: 'KEEP',
      description: 'test',
      tokens_used: 100,
      EXTRA_FIELD: 'should not appear',
      another_extra: 42,
    };

    runner._writeJsonlRow(dir, slug, rowData, jsonlPath);

    const content = fs.readFileSync(jsonlPath, 'utf-8').trim();
    const parsed = JSON.parse(content);

    const parsedKeys = Object.keys(parsed);
    for (const key of parsedKeys) {
      assert.ok(schema.JSONL_ROW_FIELDS.includes(key), `Key "${key}" should be in JSONL_ROW_FIELDS`);
    }
    assert.ok(!('EXTRA_FIELD' in parsed), 'EXTRA_FIELD should not be in row');
    assert.ok(!('another_extra' in parsed), 'another_extra should not be in row');
  } finally {
    cleanup(dir);
  }
});

test('_writeJsonlRow: appends (not overwrites) to existing results.jsonl', () => {
  const dir = makeTmpDir();
  try {
    const slug = 'append-exp';
    const jsonlPath = path.join(dir, 'results.jsonl');

    const rowData1 = { iteration: 1, commit: 'aaa', metric_value: 1.0, metric_delta: 0.0, status: 'KEEP', description: 'first', tokens_used: 100 };
    const rowData2 = { iteration: 2, commit: 'bbb', metric_value: 2.0, metric_delta: 1.0, status: 'KEEP', description: 'second', tokens_used: 200 };

    runner._writeJsonlRow(dir, slug, rowData1, jsonlPath);
    runner._writeJsonlRow(dir, slug, rowData2, jsonlPath);

    const content = fs.readFileSync(jsonlPath, 'utf-8').trim();
    const lines = content.split('\n').filter(l => l.trim());
    assert.equal(lines.length, 2, 'Should have 2 lines after 2 writes');

    const first = JSON.parse(lines[0]);
    const second = JSON.parse(lines[1]);
    assert.equal(first.iteration, 1, 'First line should be iteration 1');
    assert.equal(second.iteration, 2, 'Second line should be iteration 2');
  } finally {
    cleanup(dir);
  }
});
