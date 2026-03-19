/**
 * halt-risk-tagging.test.mjs
 * Tests: Risk attribute extraction and task file risk header generation in sharding.cjs
 *   AC-1: task file includes "**Risk level:** HIGH — {reason}" when risk="high" + risk_reason present
 *   AC-2: task file omits risk header when no risk attribute
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const require = createRequire(import.meta.url);
const { shardPlan } = require('../../bin/lib/sharding.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a PLAN.md string with optional risk attribute on task 1.
 * @param {object} opts
 * @param {string} [opts.risk]         - risk attribute value (e.g. "high"), or '' for none
 * @param {string} [opts.riskReason]   - content for <risk_reason> element, or '' for none
 * @param {string} [opts.taskOpenTag]  - override the full <task ...> opening tag for task 1
 * @param {number} [opts.taskCount=6]  - total number of tasks (must be >= threshold=5)
 */
function makePlanWithRisk({ risk = '', riskReason = '', taskOpenTag = null, taskCount = 6 } = {}) {
  // Build task 1 opening tag
  let task1Open;
  if (taskOpenTag !== null) {
    task1Open = taskOpenTag;
  } else if (risk) {
    task1Open = `<task type="auto" risk="${risk}">`;
  } else {
    task1Open = `<task type="auto">`;
  }

  const riskReasonSection = riskReason
    ? `  <risk_reason>${riskReason}</risk_reason>\n`
    : '';

  const acRefSection = `  <ac_refs>AC-1, AC-2</ac_refs>\n`;
  const boundariesSection = `  <boundaries>\n    # do not change adjacent files\n  </boundaries>\n`;

  const task1 = `${task1Open}
  <name>Task 1: Test high-risk task</name>
  <files>src/migrations/001-init.sql</files>
${riskReasonSection}${acRefSection}${boundariesSection}  <read_first>
    - some-file.md
  </read_first>
  <action>
    Do the migration action
  </action>
  <verify>
    <automated>node --test tests/task-1.test.mjs</automated>
  </verify>
  <acceptance_criteria>
    - Per-task AC for task 1
  </acceptance_criteria>
  <done>Task 1 complete</done>
</task>`;

  const remainingTasks = Array.from({ length: taskCount - 1 }, (_, i) => {
    const taskNum = i + 2;
    return `<task type="auto">
  <name>Task ${taskNum}: Test task ${taskNum}</name>
  <files>src/file-${taskNum}.js</files>
  <ac_refs>AC-1</ac_refs>
  <read_first>
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
phase: test-phase-49
plan: 01
type: auto
wave: 1
depends_on: []
files_modified:
  - src/migrations/001-init.sql
autonomous: true
requirements: [VRFY-05]
must_haves:
  truths:
    - "risk:high tasks trigger HALT confirmation before and after execution"
  artifacts:
    - path: "src/migrations/001-init.sql"
      provides: "database schema migration"
      contains: "CREATE TABLE"
---

<objective>
Test plan for Phase 49 risk attribute extraction.
</objective>

<acceptance_criteria>
**AC-1:** Given a task with the high risk attribute, when shardPlan runs, then the task file header section signals danger.
**AC-2:** Given a task without any risk attribute, when shardPlan runs, then the task file header section has no danger signal.
</acceptance_criteria>

<tasks>

${task1}

${remainingTasks}

</tasks>

<verification>
node --test tests/phase-49/halt-risk-tagging.test.mjs
</verification>

<success_criteria>
- All tasks complete
</success_criteria>
`;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('task file includes Risk level HIGH header when risk=high and risk_reason present', () => {
  const tmpDir = join(tmpdir(), `halt-risk-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '49-01-PLAN.md');
    writeFileSync(planPath, makePlanWithRisk({ risk: 'high', riskReason: 'DB migration' }));

    const result = shardPlan(planPath);
    assert.strictEqual(result.sharded, true, 'plan should be sharded');

    const task1Content = readFileSync(join(result.tasks_dir, 'task-001.md'), 'utf-8');
    assert.ok(
      task1Content.includes('**Risk level:** HIGH \u2014 DB migration'),
      'task-001.md should contain Risk level header with reason'
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('task file omits Risk level header when no risk attribute', () => {
  const tmpDir = join(tmpdir(), `halt-risk-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '49-01-PLAN.md');
    writeFileSync(planPath, makePlanWithRisk({ risk: '', riskReason: '' }));

    const result = shardPlan(planPath);
    assert.strictEqual(result.sharded, true, 'plan should be sharded');

    const task1Content = readFileSync(join(result.tasks_dir, 'task-001.md'), 'utf-8');
    assert.ok(
      !task1Content.includes('Risk level'),
      'task-001.md should NOT contain Risk level header when no risk attribute'
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('task file uses default reason when risk=high but no risk_reason', () => {
  const tmpDir = join(tmpdir(), `halt-risk-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '49-01-PLAN.md');
    writeFileSync(planPath, makePlanWithRisk({ risk: 'high', riskReason: '' }));

    const result = shardPlan(planPath);
    assert.strictEqual(result.sharded, true, 'plan should be sharded');

    const task1Content = readFileSync(join(result.tasks_dir, 'task-001.md'), 'utf-8');
    assert.ok(
      task1Content.includes('**Risk level:** HIGH \u2014 tagged risk:high in plan'),
      'task-001.md should use default reason when risk_reason absent'
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('risk attribute extraction handles attribute order variations', () => {
  const tmpDir = join(tmpdir(), `halt-risk-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '49-01-PLAN.md');
    // risk attr comes BEFORE type attr
    writeFileSync(
      planPath,
      makePlanWithRisk({ taskOpenTag: '<task risk="high" type="auto">' })
    );

    const result = shardPlan(planPath);
    assert.strictEqual(result.sharded, true, 'plan should be sharded');

    const task1Content = readFileSync(join(result.tasks_dir, 'task-001.md'), 'utf-8');
    assert.ok(
      task1Content.includes('**Risk level:** HIGH'),
      'task-001.md should contain Risk level header even when risk attr comes before type'
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('regression: ac_refs and boundaries still work with risk attribute present', () => {
  const tmpDir = join(tmpdir(), `halt-risk-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    const planPath = join(tmpDir, '49-01-PLAN.md');
    writeFileSync(planPath, makePlanWithRisk({ risk: 'high', riskReason: 'Schema change' }));

    const result = shardPlan(planPath);
    assert.strictEqual(result.sharded, true, 'plan should be sharded');

    const task1Content = readFileSync(join(result.tasks_dir, 'task-001.md'), 'utf-8');

    // Risk level present
    assert.ok(
      task1Content.includes('**Risk level:** HIGH'),
      'task-001.md should contain Risk level header'
    );

    // ac_refs still work
    assert.ok(
      task1Content.includes('**ACs this task satisfies:** AC-1, AC-2'),
      'task-001.md should still contain ac_refs line'
    );

    // boundaries still work
    assert.ok(
      task1Content.includes('## Task Boundaries (DO NOT CHANGE)'),
      'task-001.md should still contain boundaries section'
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
