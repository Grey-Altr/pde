/**
 * experiment-runner-jsonl.test.mjs
 *
 * Tests for _writeJsonlRow in bin/lib/experiment-runner.cjs.
 * Also validates JSONL_ROW_FIELDS length (9 fields including tokens_used).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const runner = require('../../bin/lib/experiment-runner.cjs');
const schema = require('../../bin/lib/experiment-schema.cjs');

const { _writeJsonlRow } = runner;
const { JSONL_ROW_FIELDS } = schema;

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-runner-jsonl-'));
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch { /* best-effort */ }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('JSONL_ROW_FIELDS schema contract', () => {

  it('JSONL_ROW_FIELDS contains exactly 9 fields including tokens_used', () => {
    assert.equal(JSONL_ROW_FIELDS.length, 9, 'Should have 9 fields');
    assert.ok(JSONL_ROW_FIELDS.includes('tokens_used'), 'Should include tokens_used');
    assert.ok(JSONL_ROW_FIELDS.includes('id'));
    assert.ok(JSONL_ROW_FIELDS.includes('iteration'));
    assert.ok(JSONL_ROW_FIELDS.includes('metric_value'));
    assert.ok(JSONL_ROW_FIELDS.includes('metric_delta'));
    assert.ok(JSONL_ROW_FIELDS.includes('status'));
    assert.ok(JSONL_ROW_FIELDS.includes('description'));
  });

});

describe('_writeJsonlRow — JSONL row writing', () => {

  it('writes row with all 9 JSONL_ROW_FIELDS including tokens_used', () => {
    const dir = makeTempDir();
    try {
      fs.mkdirSync(path.join(dir, '.planning', 'experiments', 'test-slug'), { recursive: true });

      const rowData = {
        iteration: 1,
        commit: 'abc1234',
        metric_value: 42.5,
        metric_delta: 5.0,
        status: 'KEEP',
        description: 'first iteration',
        tokens_used: 1500,
      };

      const row = _writeJsonlRow(dir, 'test-slug', rowData);

      // All 9 fields should be present
      for (const field of JSONL_ROW_FIELDS) {
        assert.ok(field in row, `Row should have field: ${field}`);
      }
      assert.equal(row.tokens_used, 1500);
      assert.equal(row.metric_value, 42.5);
      assert.equal(row.status, 'KEEP');
    } finally {
      cleanup(dir);
    }
  });

  it('auto-generates id as "{slug}-{padded iteration}" and ts as ISO timestamp', () => {
    const dir = makeTempDir();
    try {
      fs.mkdirSync(path.join(dir, '.planning', 'experiments', 'my-exp'), { recursive: true });

      const rowData = {
        iteration: 3,
        commit: 'def5678',
        metric_value: 10.0,
        metric_delta: 2.0,
        status: 'KEEP',
        description: 'test',
        tokens_used: 0,
      };

      const row = _writeJsonlRow(dir, 'my-exp', rowData);

      assert.equal(row.id, 'my-exp-0003', `id should be my-exp-0003, got: ${row.id}`);
      assert.ok(row.ts, 'should have ts field');
      assert.ok(!isNaN(new Date(row.ts).getTime()), 'ts should be a valid ISO timestamp');
    } finally {
      cleanup(dir);
    }
  });

  it('only includes fields from JSONL_ROW_FIELDS (no extra keys)', () => {
    const dir = makeTempDir();
    try {
      fs.mkdirSync(path.join(dir, '.planning', 'experiments', 'test-slug'), { recursive: true });

      const rowData = {
        iteration: 1,
        commit: 'abc1234',
        metric_value: 42.5,
        metric_delta: 0,
        status: 'DISCARD',
        description: 'test',
        tokens_used: 100,
        extra_field: 'should not appear',   // not in JSONL_ROW_FIELDS
        another_extra: 999,
      };

      const row = _writeJsonlRow(dir, 'test-slug', rowData);
      const rowKeys = Object.keys(row);

      for (const key of rowKeys) {
        assert.ok(JSONL_ROW_FIELDS.includes(key), `Unexpected key in row: ${key}`);
      }
      assert.ok(!('extra_field' in row), 'extra_field should not be in row');
    } finally {
      cleanup(dir);
    }
  });

  it('appends (not overwrites) to existing results.jsonl', () => {
    const dir = makeTempDir();
    try {
      const experimentDir = path.join(dir, '.planning', 'experiments', 'test-slug');
      fs.mkdirSync(experimentDir, { recursive: true });

      // Pre-create results.jsonl with existing content
      const existingRow = JSON.stringify({ id: 'pre-existing', iteration: 0 });
      const jsonlPath = path.join(experimentDir, 'results.jsonl');
      fs.writeFileSync(jsonlPath, existingRow + '\n', 'utf-8');

      const rowData = {
        iteration: 1,
        commit: 'abc1234',
        metric_value: 5.0,
        metric_delta: 0,
        status: 'KEEP',
        description: 'second row',
        tokens_used: 200,
      };

      _writeJsonlRow(dir, 'test-slug', rowData);

      const content = fs.readFileSync(jsonlPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      assert.equal(lines.length, 2, `Should have 2 lines, got: ${lines.length}`);

      // First line should be the pre-existing content
      const firstRow = JSON.parse(lines[0]);
      assert.equal(firstRow.id, 'pre-existing');

      // Second line should be the new row
      const secondRow = JSON.parse(lines[1]);
      assert.equal(secondRow.iteration, 1);
    } finally {
      cleanup(dir);
    }
  });

});
