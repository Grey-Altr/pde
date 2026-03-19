/**
 * task-file-content.test.mjs
 * Tests: task file schema validation — verbatim content, frontmatter fields
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const { shardPlan } = require('../../bin/lib/sharding.cjs');

// --- Setup helpers ---

function makePlanWithKnownContent() {
  return `---
phase: test-phase-47
plan: 03
type: auto
wave: 1
depends_on: []
files_modified:
  - src/task3-file.js
  - src/task1-file.js
autonomous: true
requirements: [PLAN-01]
must_haves:
  truths:
    - "TRUTH_FOR_TASK3"
  artifacts:
    - path: "src/task3-file.js"
      provides: "task 3 artifact"
      contains: "ARTIFACT_CONTAINS_TASK3"
    - path: "src/task1-file.js"
      provides: "task 1 artifact"
      contains: "ARTIFACT_CONTAINS_TASK1"
---

<objective>
THIS_IS_THE_PLAN_OBJECTIVE content. It explains the overall goal of the plan. Multiple sentences here for context.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: First task name</name>
  <files>src/task1-file.js</files>
  <read_first>
    - some-other-file.md (not the important one)
  </read_first>
  <action>
    DO_ACTION_FOR_TASK_1_ONLY
  </action>
  <verify>
    <automated>VERIFY_CMD_FOR_TASK1</automated>
  </verify>
  <acceptance_criteria>
    - AC_FOR_TASK1 criterion
  </acceptance_criteria>
  <done>DONE_CONDITION_FOR_TASK1</done>
</task>

<task type="auto">
  <name>Task 2: Second task name</name>
  <files>src/task2-file.js</files>
  <read_first>
    - another-file.md (not the important one)
  </read_first>
  <action>
    DO_ACTION_FOR_TASK_2_ONLY
  </action>
  <verify>
    <automated>VERIFY_CMD_FOR_TASK2</automated>
  </verify>
  <acceptance_criteria>
    - AC_FOR_TASK2 criterion
  </acceptance_criteria>
  <done>DONE_CONDITION_FOR_TASK2</done>
</task>

<task type="auto">
  <name>Task 3: Third task name THE_TASK_3_NAME</name>
  <files>src/task3-file.js</files>
  <read_first>
    READ_FIRST_CONTENT
  </read_first>
  <action>
    EXACT_ACTION_TEXT_FOR_TASK_3
  </action>
  <verify>
    <automated>VERIFY_CMD</automated>
  </verify>
  <acceptance_criteria>
    AC_CONTENT
  </acceptance_criteria>
  <done>DONE_CONDITION</done>
</task>

<task type="auto">
  <name>Task 4: Fourth task name</name>
  <files>src/task4-file.js</files>
  <read_first>
    - task4-read.md
  </read_first>
  <action>
    DO_ACTION_FOR_TASK_4_ONLY
  </action>
  <verify>
    <automated>VERIFY_CMD_FOR_TASK4</automated>
  </verify>
  <acceptance_criteria>
    - AC_FOR_TASK4 criterion
  </acceptance_criteria>
  <done>DONE_CONDITION_FOR_TASK4</done>
</task>

<task type="auto">
  <name>Task 5: Fifth task name</name>
  <files>src/task5-file.js</files>
  <read_first>
    - task5-read.md
  </read_first>
  <action>
    DO_ACTION_FOR_TASK_5_ONLY
  </action>
  <verify>
    <automated>VERIFY_CMD_FOR_TASK5</automated>
  </verify>
  <acceptance_criteria>
    - AC_FOR_TASK5 criterion
  </acceptance_criteria>
  <done>DONE_CONDITION_FOR_TASK5</done>
</task>

</tasks>
`;
}

// --- Tests ---

let sharedTasksDir;
let sharedPlanDir;

// Setup: create and shard once, reuse across tests
function setupOnce() {
  if (sharedTasksDir) return sharedTasksDir;

  const tmpDir = join(tmpdir(), `task-content-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  sharedPlanDir = tmpDir;

  const planPath = join(tmpDir, '47-03-PLAN.md');
  writeFileSync(planPath, makePlanWithKnownContent());

  const result = shardPlan(planPath);
  if (!result.sharded) {
    throw new Error(`Expected sharding to succeed but got: ${JSON.stringify(result)}`);
  }
  sharedTasksDir = result.tasks_dir;
  return sharedTasksDir;
}

test('task-003.md has correct frontmatter: phase, plan, task, task_of', () => {
  const tasksDir = setupOnce();
  const content = readFileSync(join(tasksDir, 'task-003.md'), 'utf-8');

  assert.ok(content.includes('phase: test-phase-47'), 'should contain phase');
  assert.ok(content.includes('plan: 03'), 'should contain plan number');
  // task: 3 and task_of: 5
  assert.ok(/task:\s*3/.test(content), 'should contain task: 3');
  assert.ok(/task_of:\s*5/.test(content), 'should contain task_of: 5');
});

test('task-003.md contains verbatim action text', () => {
  const tasksDir = setupOnce();
  const content = readFileSync(join(tasksDir, 'task-003.md'), 'utf-8');

  assert.ok(content.includes('EXACT_ACTION_TEXT_FOR_TASK_3'), 'should contain verbatim action text');
});

test('task-003.md contains verbatim read_first content', () => {
  const tasksDir = setupOnce();
  const content = readFileSync(join(tasksDir, 'task-003.md'), 'utf-8');

  assert.ok(content.includes('READ_FIRST_CONTENT'), 'should contain verbatim read_first content');
});

test('task-003.md contains verbatim acceptance_criteria', () => {
  const tasksDir = setupOnce();
  const content = readFileSync(join(tasksDir, 'task-003.md'), 'utf-8');

  assert.ok(content.includes('AC_CONTENT'), 'should contain verbatim acceptance_criteria');
});

test('task-003.md contains verbatim verify command', () => {
  const tasksDir = setupOnce();
  const content = readFileSync(join(tasksDir, 'task-003.md'), 'utf-8');

  assert.ok(content.includes('VERIFY_CMD'), 'should contain verbatim verify command');
});

test('task-003.md contains verbatim done condition', () => {
  const tasksDir = setupOnce();
  const content = readFileSync(join(tasksDir, 'task-003.md'), 'utf-8');

  assert.ok(content.includes('DONE_CONDITION'), 'should contain verbatim done condition');
});

test('task-003.md contains plan objective text', () => {
  const tasksDir = setupOnce();
  const content = readFileSync(join(tasksDir, 'task-003.md'), 'utf-8');

  assert.ok(content.includes('THIS_IS_THE_PLAN_OBJECTIVE'), 'should contain plan objective');
});

test('task-003.md contains task name from <name> tag', () => {
  const tasksDir = setupOnce();
  const content = readFileSync(join(tasksDir, 'task-003.md'), 'utf-8');

  assert.ok(content.includes('THE_TASK_3_NAME'), 'should contain task name marker');
});

test('task-001.md does NOT contain task-3 action content', () => {
  const tasksDir = setupOnce();
  const content = readFileSync(join(tasksDir, 'task-001.md'), 'utf-8');

  assert.ok(!content.includes('EXACT_ACTION_TEXT_FOR_TASK_3'), 'task-001.md should not contain task-3 action text');
});

// Cleanup after all tests
process.on('exit', () => {
  if (sharedPlanDir) {
    try { rmSync(sharedPlanDir, { recursive: true, force: true }); } catch {}
  }
});
