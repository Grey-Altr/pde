/**
 * sharding.test.mjs
 * Tests: shardPlan() threshold, task count, TDD exemption, idempotency, custom threshold
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const { shardPlan } = require('../../bin/lib/sharding.cjs');

// --- Helpers ---

function makePlanContent(taskCount, { tdd = false, phase = 'test-phase', plan = '01' } = {}) {
  const tasks = Array.from({ length: taskCount }, (_, i) => {
    const tddAttr = tdd ? ' tdd="true"' : '';
    return `<task type="auto"${tddAttr}>
  <name>Task ${i + 1}: Test task ${i + 1}</name>
  <files>src/file-${i + 1}.js</files>
  <read_first>
    - some-file.md (context for task ${i + 1})
  </read_first>
  <action>
    Do action ${i + 1}
  </action>
  <verify>
    <automated>node --test tests/task-${i + 1}.test.mjs</automated>
  </verify>
  <acceptance_criteria>
    - file-${i + 1}.js exists
  </acceptance_criteria>
  <done>Task ${i + 1} complete</done>
</task>`;
  }).join('\n\n');

  return `---
phase: ${phase}
plan: ${plan}
type: auto
wave: 1
depends_on: []
files_modified:
  - src/file-1.js
autonomous: true
requirements: [PLAN-01]
must_haves:
  truths:
    - "something is true"
  artifacts:
    - path: "src/file-1.js"
      provides: "test artifact"
      contains: "function doThing"
---

<objective>
This is the plan objective. It describes the goal. It has context here.
</objective>

<tasks>

${tasks}

</tasks>

<verification>
node --test tests/*.test.mjs
</verification>

<success_criteria>
- All tasks complete
</success_criteria>
`;
}

// --- Tests ---

test('creates tasks directory for 6-task plan', () => {
  const tmpDir = join(tmpdir(), `sharding-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '47-01-PLAN.md');
    writeFileSync(planPath, makePlanContent(6));

    const result = shardPlan(planPath);

    assert.strictEqual(result.sharded, true, 'should be sharded');
    assert.strictEqual(result.task_count, 6, 'should report 6 tasks');
    assert.ok(existsSync(result.tasks_dir), 'tasks directory should exist');
    assert.ok(result.tasks_dir.endsWith('47-01-tasks'), 'tasks_dir should be named {plan-prefix}-tasks');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('writes correct number of task files (task-001.md through task-006.md)', () => {
  const tmpDir = join(tmpdir(), `sharding-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '47-01-PLAN.md');
    writeFileSync(planPath, makePlanContent(6));

    const result = shardPlan(planPath);

    assert.strictEqual(result.sharded, true);
    const files = readdirSync(result.tasks_dir).sort();
    assert.strictEqual(files.length, 6, 'should have 6 task files');
    assert.deepEqual(files, [
      'task-001.md',
      'task-002.md',
      'task-003.md',
      'task-004.md',
      'task-005.md',
      'task-006.md',
    ]);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('returns sharded: false for 3-task plan (below threshold)', () => {
  const tmpDir = join(tmpdir(), `sharding-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '47-01-PLAN.md');
    writeFileSync(planPath, makePlanContent(3));

    const result = shardPlan(planPath);

    assert.strictEqual(result.sharded, false, 'should not be sharded');
    assert.strictEqual(result.task_count, 3, 'should report 3 tasks');
    assert.strictEqual(result.reason, 'below threshold', 'reason should be "below threshold"');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('skips TDD plans regardless of task count', () => {
  const tmpDir = join(tmpdir(), `sharding-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '47-01-PLAN.md');
    writeFileSync(planPath, makePlanContent(6, { tdd: true }));

    const result = shardPlan(planPath);

    assert.strictEqual(result.sharded, false, 'TDD plans should not be sharded');
    assert.strictEqual(result.reason, 'tdd plan', 'reason should be "tdd plan"');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('respects custom threshold: shards 3-task plan when threshold=3', () => {
  const tmpDir = join(tmpdir(), `sharding-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '47-01-PLAN.md');
    writeFileSync(planPath, makePlanContent(3));

    const result = shardPlan(planPath, { threshold: 3 });

    assert.strictEqual(result.sharded, true, 'should be sharded with custom threshold=3');
    assert.strictEqual(result.task_count, 3);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('is idempotent: re-running overwrites task files without error', () => {
  const tmpDir = join(tmpdir(), `sharding-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '47-01-PLAN.md');
    writeFileSync(planPath, makePlanContent(5));

    const result1 = shardPlan(planPath);
    assert.strictEqual(result1.sharded, true);

    // Run again — should not throw
    const result2 = shardPlan(planPath);
    assert.strictEqual(result2.sharded, true);
    assert.strictEqual(result2.task_count, 5);

    const files = readdirSync(result2.tasks_dir).sort();
    assert.strictEqual(files.length, 5, 'should still have 5 task files after re-run');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
