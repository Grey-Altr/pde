/**
 * sharding-ac.test.mjs
 * Tests: AC-first sharding support —
 *   extractPlanAcBlock(), extended buildTaskFileContent(), extended shardPlan()
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const require = createRequire(import.meta.url);
const { extractPlanAcBlock, shardPlan } = require('../../bin/lib/sharding.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlanWithAcBlock({ planAc = '', taskAcRefs = '', taskBoundaries = '', taskCount = 6 } = {}) {
  const planAcSection = planAc
    ? `<acceptance_criteria>\n${planAc}\n</acceptance_criteria>\n\n`
    : '';

  const tasks = Array.from({ length: taskCount }, (_, i) => {
    const taskNum = i + 1;
    const acRefsSection = taskAcRefs && taskNum === 1
      ? `  <ac_refs>${taskAcRefs}</ac_refs>\n`
      : '';
    const boundariesSection = taskBoundaries && taskNum === 1
      ? `  <boundaries>\n${taskBoundaries}\n  </boundaries>\n`
      : '';
    return `<task type="auto">
  <name>Task ${taskNum}: Test task ${taskNum}</name>
  <files>src/file-${taskNum}.js</files>
${acRefsSection}${boundariesSection}  <read_first>
    - some-file.md
  </read_first>
  <action>
    Do action ${taskNum}
  </action>
  <verify>
    <automated>node --test tests/task-${taskNum}.test.mjs</automated>
  </verify>
  <acceptance_criteria>
    - Per-task AC for task ${taskNum}
  </acceptance_criteria>
  <done>Task ${taskNum} complete</done>
</task>`;
  }).join('\n\n');

  return `---
phase: test-phase-48
plan: 01
type: auto
wave: 1
depends_on: []
files_modified:
  - src/file-1.js
autonomous: true
requirements: [PLAN-03]
must_haves:
  truths:
    - "something is true"
  artifacts:
    - path: "src/file-1.js"
      provides: "test artifact"
      contains: "function doThing"
---

<objective>
Test plan objective for Phase 48 AC-first sharding.
</objective>

${planAcSection}<tasks>

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

// ─── extractPlanAcBlock() tests ───────────────────────────────────────────────

test('extractPlanAcBlock: returns trimmed inner content when plan-level AC block exists before <tasks>', () => {
  const content = makePlanWithAcBlock({ planAc: '- AC-1: The system does X\n- AC-2: The system does Y' });
  const result = extractPlanAcBlock(content);
  assert.ok(result.includes('AC-1'), 'should include AC-1');
  assert.ok(result.includes('AC-2'), 'should include AC-2');
  assert.strictEqual(result, result.trim(), 'result should be trimmed');
});

test('extractPlanAcBlock: returns empty string when no plan-level AC block exists', () => {
  // Plan with no acceptance_criteria at all
  const content = `---
phase: test
plan: 01
---

<objective>No AC block here.</objective>

<tasks>
<task type="auto">
  <name>Task 1</name>
  <files>src/f.js</files>
  <read_first>-</read_first>
  <action>do thing</action>
  <verify><automated>node test</automated></verify>
  <acceptance_criteria>- task ac</acceptance_criteria>
  <done>done</done>
</task>
</tasks>
`;
  const result = extractPlanAcBlock(content);
  assert.strictEqual(result, '', 'should return empty string when no plan-level AC block');
});

test('extractPlanAcBlock: does NOT match per-task acceptance_criteria blocks inside <task>', () => {
  // Plan where acceptance_criteria only appears inside <task> blocks (no plan-level)
  const content = makePlanWithAcBlock({ planAc: '' }); // no plan-level AC
  const result = extractPlanAcBlock(content);
  assert.strictEqual(result, '', 'should return empty string — per-task ACs should not be matched');
});

test('extractPlanAcBlock: returns only plan-level block when both plan-level and per-task ACs exist', () => {
  const planAcContent = 'AC-PLAN-LEVEL-UNIQUE-MARKER: system behavior';
  const content = makePlanWithAcBlock({ planAc: planAcContent });

  const result = extractPlanAcBlock(content);
  assert.ok(result.includes('AC-PLAN-LEVEL-UNIQUE-MARKER'), 'should include plan-level AC content');
  // Should NOT include the per-task "Per-task AC for task 1" which comes inside <task>
  assert.ok(!result.includes('Per-task AC for task'), 'should not include per-task AC content');
});

// ─── buildTaskFileContent() extended tests ───────────────────────────────────

test('task file includes Plan AC Reference section when planAcBlock is non-empty', () => {
  const planAcContent = 'PLAN_AC_UNIQUE_MARKER: system does X';
  const tmpDir = join(tmpdir(), `sharding-ac-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '48-01-PLAN.md');
    writeFileSync(planPath, makePlanWithAcBlock({ planAc: planAcContent }));

    const result = shardPlan(planPath);
    assert.strictEqual(result.sharded, true);

    const taskContent = readFileSync(join(result.tasks_dir, 'task-001.md'), 'utf-8');
    assert.ok(
      taskContent.includes('## Plan Acceptance Criteria (Reference)'),
      'task file should contain Plan AC Reference section heading'
    );
    assert.ok(
      taskContent.includes('PLAN_AC_UNIQUE_MARKER'),
      'task file should contain the plan-level AC content'
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('task file does NOT include Plan AC Reference section when planAcBlock is empty', () => {
  const tmpDir = join(tmpdir(), `sharding-ac-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '48-01-PLAN.md');
    writeFileSync(planPath, makePlanWithAcBlock({ planAc: '' }));

    const result = shardPlan(planPath);
    assert.strictEqual(result.sharded, true);

    const taskContent = readFileSync(join(result.tasks_dir, 'task-001.md'), 'utf-8');
    assert.ok(
      !taskContent.includes('## Plan Acceptance Criteria (Reference)'),
      'task file should NOT contain Plan AC Reference section when no plan-level AC'
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('task file shows ac_refs value when task has ac_refs', () => {
  const tmpDir = join(tmpdir(), `sharding-ac-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '48-01-PLAN.md');
    writeFileSync(planPath, makePlanWithAcBlock({
      planAc: '- AC-1\n- AC-2',
      taskAcRefs: 'AC-1, AC-2',
    }));

    const result = shardPlan(planPath);
    assert.strictEqual(result.sharded, true);

    const task1Content = readFileSync(join(result.tasks_dir, 'task-001.md'), 'utf-8');
    assert.ok(
      task1Content.includes('**ACs this task satisfies:** AC-1, AC-2'),
      'task-001.md should show ac_refs value'
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('task file shows "(none - pre-Phase-48 plan)" when ac_refs is empty', () => {
  const tmpDir = join(tmpdir(), `sharding-ac-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '48-01-PLAN.md');
    writeFileSync(planPath, makePlanWithAcBlock({ planAc: '', taskAcRefs: '' }));

    const result = shardPlan(planPath);
    assert.strictEqual(result.sharded, true);

    const taskContent = readFileSync(join(result.tasks_dir, 'task-001.md'), 'utf-8');
    assert.ok(
      taskContent.includes('**ACs this task satisfies:** (none - pre-Phase-48 plan)'),
      'task file should show "(none - pre-Phase-48 plan)" when no ac_refs'
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('task file includes Task Boundaries section when boundaries is non-empty', () => {
  const boundariesContent = '    - DO NOT modify src/other-file.js\n    - DO NOT change the API contract';
  const tmpDir = join(tmpdir(), `sharding-ac-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '48-01-PLAN.md');
    writeFileSync(planPath, makePlanWithAcBlock({
      planAc: '- AC-1',
      taskBoundaries: boundariesContent,
    }));

    const result = shardPlan(planPath);
    assert.strictEqual(result.sharded, true);

    const task1Content = readFileSync(join(result.tasks_dir, 'task-001.md'), 'utf-8');
    assert.ok(
      task1Content.includes('## Task Boundaries (DO NOT CHANGE)'),
      'task-001.md should contain Task Boundaries section heading'
    );
    assert.ok(
      task1Content.includes('DO NOT modify src/other-file.js'),
      'task-001.md should contain boundaries content'
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('task file does NOT include Task Boundaries section when boundaries is empty', () => {
  const tmpDir = join(tmpdir(), `sharding-ac-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '48-01-PLAN.md');
    writeFileSync(planPath, makePlanWithAcBlock({ planAc: '', taskBoundaries: '' }));

    const result = shardPlan(planPath);
    assert.strictEqual(result.sharded, true);

    const taskContent = readFileSync(join(result.tasks_dir, 'task-001.md'), 'utf-8');
    assert.ok(
      !taskContent.includes('## Task Boundaries (DO NOT CHANGE)'),
      'task file should NOT contain Task Boundaries section when no boundaries'
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── shardPlan() integration tests ───────────────────────────────────────────

test('shardPlan: task files include planAcBlock, acRefs, boundaries for Phase-48 plan', () => {
  const tmpDir = join(tmpdir(), `sharding-ac-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '48-01-PLAN.md');
    writeFileSync(planPath, makePlanWithAcBlock({
      planAc: 'PLAN_AC_INTEGRATION_MARKER: full stack behavior',
      taskAcRefs: 'AC-1',
      taskBoundaries: '    - DO NOT change API contract',
    }));

    const result = shardPlan(planPath);
    assert.strictEqual(result.sharded, true);

    const task1Content = readFileSync(join(result.tasks_dir, 'task-001.md'), 'utf-8');

    // planAcBlock
    assert.ok(task1Content.includes('PLAN_AC_INTEGRATION_MARKER'), 'should have plan AC content');
    assert.ok(task1Content.includes('## Plan Acceptance Criteria (Reference)'), 'should have AC section heading');

    // acRefs
    assert.ok(task1Content.includes('**ACs this task satisfies:** AC-1'), 'should have ac_refs');

    // boundaries
    assert.ok(task1Content.includes('## Task Boundaries (DO NOT CHANGE)'), 'should have boundaries section heading');
    assert.ok(task1Content.includes('DO NOT change API contract'), 'should have boundaries content');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('shardPlan: pre-Phase-48 plans (no plan AC, no ac_refs, no boundaries) produce clean task files', () => {
  const tmpDir = join(tmpdir(), `sharding-ac-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '48-01-PLAN.md');
    writeFileSync(planPath, makePlanWithAcBlock({ planAc: '', taskAcRefs: '', taskBoundaries: '' }));

    const result = shardPlan(planPath);
    assert.strictEqual(result.sharded, true);

    const taskContent = readFileSync(join(result.tasks_dir, 'task-001.md'), 'utf-8');

    assert.ok(!taskContent.includes('## Plan Acceptance Criteria (Reference)'), 'no AC section for pre-48 plan');
    assert.ok(!taskContent.includes('## Task Boundaries (DO NOT CHANGE)'), 'no boundaries section for pre-48 plan');
    assert.ok(
      taskContent.includes('(none - pre-Phase-48 plan)'),
      'should show "(none - pre-Phase-48 plan)" for ACs'
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
