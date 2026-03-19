/**
 * executor-path-resolution.test.mjs
 * Tests: resolveTaskPath() — conditional task file vs PLAN.md fallback
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const { resolveTaskPath } = require('../../bin/lib/sharding.cjs');

// --- Setup ---

let tmpDir;

function setupPhaseDir() {
  if (tmpDir) return tmpDir;
  tmpDir = join(tmpdir(), `exec-path-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  // Create 47-01-tasks/ with task-001.md and task-002.md
  const tasksDir = join(tmpDir, '47-01-tasks');
  mkdirSync(tasksDir, { recursive: true });
  writeFileSync(join(tasksDir, 'task-001.md'), '# Task 1', 'utf-8');
  writeFileSync(join(tasksDir, 'task-002.md'), '# Task 2', 'utf-8');

  // Create 47-02-PLAN.md (no tasks directory for this plan)
  writeFileSync(join(tmpDir, '47-02-PLAN.md'), '# Plan 02', 'utf-8');

  // Create 47-01-PLAN.md too
  writeFileSync(join(tmpDir, '47-01-PLAN.md'), '# Plan 01', 'utf-8');

  return tmpDir;
}

// --- Tests ---

test('resolves to task file when tasks dir exists and file exists', () => {
  const phaseDir = setupPhaseDir();

  const resolved = resolveTaskPath(phaseDir, '47-01', 1, '47-01-PLAN.md');

  assert.strictEqual(resolved, join(phaseDir, '47-01-tasks', 'task-001.md'));
});

test('resolves to PLAN.md when no tasks dir exists', () => {
  const phaseDir = setupPhaseDir();

  const resolved = resolveTaskPath(phaseDir, '47-02', 1, '47-02-PLAN.md');

  assert.strictEqual(resolved, join(phaseDir, '47-02-PLAN.md'));
});

test('resolves to PLAN.md when tasks dir exists but specific task file missing (task 99)', () => {
  const phaseDir = setupPhaseDir();

  // Task 99 does not exist in 47-01-tasks/
  const resolved = resolveTaskPath(phaseDir, '47-01', 99, '47-01-PLAN.md');

  assert.strictEqual(resolved, join(phaseDir, '47-01-PLAN.md'));
});

// Cleanup
process.on('exit', () => {
  if (tmpDir) {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});
