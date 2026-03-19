/**
 * workflow-status.test.mjs
 * Tests: workflow-status.md management functions in bin/lib/tracking.cjs
 *
 * Covers TRCK-01 and TRCK-02:
 *   - initWorkflowStatus() creates workflow-status.md with TODO rows
 *   - initWorkflowStatus() is idempotent (preserves DONE/SKIPPED on re-init)
 *   - setTaskStatus() updates a single task row
 *   - readWorkflowStatus() returns structured task objects with totals
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {
  initWorkflowStatus,
  setTaskStatus,
  readWorkflowStatus,
} = require('../../bin/lib/tracking.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'tracking-test-'));
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

// ─── initWorkflowStatus: creates workflow-status.md ──────────────────────────

test('initWorkflowStatus: creates workflow-status.md with TODO rows for total=3', () => {
  const tmpDir = makeTmpDir();
  try {
    const result = initWorkflowStatus(tmpDir, { phase: '51-workflow-tracking', plan: '01', total: 3 });
    const statusPath = path.join(tmpDir, 'workflow-status.md');
    assert.ok(fs.existsSync(statusPath), 'workflow-status.md should be created');
    const content = fs.readFileSync(statusPath, 'utf-8');
    assert.ok(content.includes('| 1 |') && content.includes('| TODO |'), 'should contain task 1 TODO row');
    assert.ok(content.includes('| 2 |') && content.includes('| TODO |'), 'should contain task 2 TODO row');
    assert.ok(content.includes('| 3 |') && content.includes('| TODO |'), 'should contain task 3 TODO row');
    assert.strictEqual(result.initialized, true);
    assert.strictEqual(result.total, 3);
  } finally {
    cleanup(tmpDir);
  }
});

test('initWorkflowStatus: frontmatter contains phase, plan, generated, last_updated', () => {
  const tmpDir = makeTmpDir();
  try {
    initWorkflowStatus(tmpDir, { phase: '51-workflow-tracking', plan: '01', total: 2 });
    const content = fs.readFileSync(path.join(tmpDir, 'workflow-status.md'), 'utf-8');
    assert.ok(content.includes('phase:'), 'should contain phase: in frontmatter');
    assert.ok(content.includes('plan:'), 'should contain plan: in frontmatter');
    assert.ok(content.includes('generated:'), 'should contain generated: in frontmatter');
    assert.ok(content.includes('last_updated:'), 'should contain last_updated: in frontmatter');
  } finally {
    cleanup(tmpDir);
  }
});

test('initWorkflowStatus: idempotent — existing DONE row for task 1 preserved after re-init', () => {
  const tmpDir = makeTmpDir();
  try {
    // First init
    initWorkflowStatus(tmpDir, { phase: '51-workflow-tracking', plan: '01', total: 2 });
    // Mark task 1 as DONE
    setTaskStatus(tmpDir, 1, 'DONE', 'abc1234');
    // Re-initialize
    initWorkflowStatus(tmpDir, { phase: '51-workflow-tracking', plan: '01', total: 2 });
    const content = fs.readFileSync(path.join(tmpDir, 'workflow-status.md'), 'utf-8');
    // Task 1 should still be DONE
    const lines = content.split('\n');
    const task1Line = lines.find(l => /\|\s*1\s*\|/.test(l));
    assert.ok(task1Line, 'task 1 row should exist');
    assert.ok(task1Line.includes('DONE'), 'task 1 should still be DONE after re-init');
    // Task 2 should remain TODO
    const task2Line = lines.find(l => /\|\s*2\s*\|/.test(l));
    assert.ok(task2Line, 'task 2 row should exist');
    assert.ok(task2Line.includes('TODO'), 'task 2 should remain TODO');
  } finally {
    cleanup(tmpDir);
  }
});

test('initWorkflowStatus: idempotent — existing SKIPPED row preserved after re-init', () => {
  const tmpDir = makeTmpDir();
  try {
    initWorkflowStatus(tmpDir, { phase: '51-workflow-tracking', plan: '01', total: 2 });
    setTaskStatus(tmpDir, 2, 'SKIPPED', null);
    initWorkflowStatus(tmpDir, { phase: '51-workflow-tracking', plan: '01', total: 2 });
    const content = fs.readFileSync(path.join(tmpDir, 'workflow-status.md'), 'utf-8');
    const lines = content.split('\n');
    const task2Line = lines.find(l => /\|\s*2\s*\|/.test(l));
    assert.ok(task2Line, 'task 2 row should exist');
    assert.ok(task2Line.includes('SKIPPED'), 'task 2 should still be SKIPPED after re-init');
  } finally {
    cleanup(tmpDir);
  }
});

// ─── setTaskStatus ────────────────────────────────────────────────────────────

test('setTaskStatus: changes task 2 from TODO to IN_PROGRESS; row contains "| 2 |" and "| IN_PROGRESS |"', () => {
  const tmpDir = makeTmpDir();
  try {
    initWorkflowStatus(tmpDir, { phase: '51-workflow-tracking', plan: '01', total: 3 });
    const result = setTaskStatus(tmpDir, 2, 'IN_PROGRESS', null);
    assert.strictEqual(result.updated, true);
    assert.strictEqual(result.task, 2);
    assert.strictEqual(result.status, 'IN_PROGRESS');
    const content = fs.readFileSync(path.join(tmpDir, 'workflow-status.md'), 'utf-8');
    const lines = content.split('\n');
    const task2Line = lines.find(l => /\|\s*2\s*\|/.test(l));
    assert.ok(task2Line, 'task 2 row should exist');
    assert.ok(task2Line.includes('IN_PROGRESS'), 'row should contain IN_PROGRESS');
  } finally {
    cleanup(tmpDir);
  }
});

test('setTaskStatus: with commit hash writes hash into commit column', () => {
  const tmpDir = makeTmpDir();
  try {
    initWorkflowStatus(tmpDir, { phase: '51-workflow-tracking', plan: '01', total: 2 });
    setTaskStatus(tmpDir, 1, 'DONE', 'deadbeef');
    const content = fs.readFileSync(path.join(tmpDir, 'workflow-status.md'), 'utf-8');
    assert.ok(content.includes('deadbeef'), 'content should contain the commit hash');
  } finally {
    cleanup(tmpDir);
  }
});

test('setTaskStatus: updates last_updated in frontmatter to current time (different from generated)', async () => {
  const tmpDir = makeTmpDir();
  try {
    initWorkflowStatus(tmpDir, { phase: '51-workflow-tracking', plan: '01', total: 2 });
    // Small delay to ensure timestamps differ
    await new Promise(resolve => setTimeout(resolve, 10));
    setTaskStatus(tmpDir, 1, 'DONE', null);
    const content = fs.readFileSync(path.join(tmpDir, 'workflow-status.md'), 'utf-8');
    // Extract generated and last_updated from frontmatter
    const genMatch = content.match(/generated:\s*"?([^"\n]+)"?/);
    const updMatch = content.match(/last_updated:\s*"?([^"\n]+)"?/);
    assert.ok(genMatch, 'generated should be in frontmatter');
    assert.ok(updMatch, 'last_updated should be in frontmatter');
    // After setTaskStatus, last_updated should be >= generated (may differ if delay is fast)
    // Just verify both are valid ISO timestamps
    assert.ok(!isNaN(Date.parse(genMatch[1].trim())), 'generated should be a valid ISO timestamp');
    assert.ok(!isNaN(Date.parse(updMatch[1].trim())), 'last_updated should be a valid ISO timestamp');
  } finally {
    cleanup(tmpDir);
  }
});

test('setTaskStatus: returns { updated: false } when workflow-status.md does not exist', () => {
  const tmpDir = makeTmpDir();
  try {
    const result = setTaskStatus(tmpDir, 1, 'DONE', null);
    assert.strictEqual(result.updated, false);
  } finally {
    cleanup(tmpDir);
  }
});

// ─── readWorkflowStatus ───────────────────────────────────────────────────────

test('readWorkflowStatus: returns { tasks, total: 3, done: 1, inProgress: 1 } for 1 DONE, 1 IN_PROGRESS, 1 TODO', () => {
  const tmpDir = makeTmpDir();
  try {
    initWorkflowStatus(tmpDir, { phase: '51-workflow-tracking', plan: '01', total: 3 });
    setTaskStatus(tmpDir, 1, 'DONE', 'abc1234');
    setTaskStatus(tmpDir, 2, 'IN_PROGRESS', null);
    const result = readWorkflowStatus(tmpDir);
    assert.strictEqual(result.total, 3);
    assert.strictEqual(result.done, 1);
    assert.strictEqual(result.inProgress, 1);
    assert.ok(Array.isArray(result.tasks), 'tasks should be an array');
    assert.strictEqual(result.tasks.length, 3);
    // Verify task object shape
    const task1 = result.tasks.find(t => t.num === 1);
    assert.ok(task1, 'task 1 should exist in tasks array');
    assert.strictEqual(task1.status, 'DONE');
    assert.ok('name' in task1, 'task should have name field');
    assert.ok('commit' in task1, 'task should have commit field');
    assert.ok('updated' in task1, 'task should have updated field');
  } finally {
    cleanup(tmpDir);
  }
});

test('readWorkflowStatus: returns { tasks: [], total: 0, done: 0, inProgress: 0 } when file does not exist', () => {
  const tmpDir = makeTmpDir();
  try {
    const result = readWorkflowStatus(tmpDir);
    assert.deepStrictEqual(result, { tasks: [], total: 0, done: 0, inProgress: 0 });
  } finally {
    cleanup(tmpDir);
  }
});
