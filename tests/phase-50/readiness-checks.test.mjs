/**
 * readiness-checks.test.mjs
 * Tests: Structural and consistency checks in bin/lib/readiness.cjs
 *
 * Covers VRFY-03:
 *   - classifyResult() severity-first precedence
 *   - runStructuralChecks() Category A presence checks (A1-A9)
 *   - runStructuralChecks() Category B consistency checks (B1-B3)
 *   - Multi-plan aggregation
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  classifyResult,
  runStructuralChecks,
} = require('../../bin/lib/readiness.cjs');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_REQUIREMENTS = `# Requirements
## v0.6 Requirements
- [x] **VRFY-03**: /pde:check-readiness command produces PASS/CONCERNS/FAIL
- [ ] **VRFY-04**: Execute-phase blocks on readiness gate FAIL result
## Future Requirements
- **FUTURE-01**: Some future thing
`;

// A minimal valid PLAN.md
const VALID_PLAN = `---
phase: 50-readiness-gate
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bin/lib/readiness.cjs
autonomous: true
requirements: [VRFY-03]
must_haves:
  truths:
    - "runStructuralChecks() returns FAIL when PLAN.md is missing or has no tasks"
---

<objective>
Create the /pde:check-readiness command.
</objective>

<acceptance_criteria>
**AC-1**: Given a phase directory, when check-readiness runs, then READINESS.md is written.
**AC-2**: Given a PLAN.md missing tasks, when A6 check runs, then it returns passed:false.
</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create readiness.cjs</name>
  <files>bin/lib/readiness.cjs</files>
  <action>Create the readiness library.</action>
  <ac_refs>AC-1, AC-2</ac_refs>
  <acceptance_criteria>readiness.cjs exports all required functions</acceptance_criteria>
</task>

</tasks>
`;

// ─── classifyResult ───────────────────────────────────────────────────────────

test('classifyResult: returns "fail" when any check has severity=fail and passed=false', () => {
  const checks = [
    { id: 'A1', severity: 'fail', passed: false },
    { id: 'A3', severity: 'concerns', passed: false },
  ];
  assert.strictEqual(classifyResult(checks), 'fail');
});

test('classifyResult: returns "concerns" when no fail but concerns exist (passed=false)', () => {
  const checks = [
    { id: 'A3', severity: 'concerns', passed: false },
    { id: 'A8', severity: 'concerns', passed: false },
  ];
  assert.strictEqual(classifyResult(checks), 'concerns');
});

test('classifyResult: returns "pass" when all checks pass (even if severity=fail or concerns)', () => {
  const checks = [
    { id: 'A1', severity: 'fail', passed: true },
    { id: 'A3', severity: 'concerns', passed: true },
  ];
  assert.strictEqual(classifyResult(checks), 'pass');
});

test('classifyResult: returns "pass" for empty checks array', () => {
  assert.strictEqual(classifyResult([]), 'pass');
});

// ─── A1: planContent truthy ───────────────────────────────────────────────────

test('A1: returns passed:false with severity:fail when planContent is null', () => {
  const { checks } = runStructuralChecks(null, VALID_REQUIREMENTS, 'test.md');
  const a1 = checks.find(c => c.id === 'A1');
  assert.ok(a1, 'A1 check should exist');
  assert.strictEqual(a1.passed, false);
  assert.strictEqual(a1.severity, 'fail');
});

test('A1: returns passed:false with severity:fail when planContent is empty string', () => {
  const { checks } = runStructuralChecks('', VALID_REQUIREMENTS, 'test.md');
  const a1 = checks.find(c => c.id === 'A1');
  assert.strictEqual(a1.passed, false);
  assert.strictEqual(a1.severity, 'fail');
});

test('A1: returns passed:true for valid plan content', () => {
  const { checks } = runStructuralChecks(VALID_PLAN, VALID_REQUIREMENTS, 'test.md');
  const a1 = checks.find(c => c.id === 'A1');
  assert.strictEqual(a1.passed, true);
});

// ─── A3: frontmatter requirements not empty ───────────────────────────────────

test('A3: returns passed:false with severity:concerns when requirements is empty array', () => {
  const plan = VALID_PLAN.replace('requirements: [VRFY-03]', 'requirements: []');
  const { checks } = runStructuralChecks(plan, VALID_REQUIREMENTS, 'test.md');
  const a3 = checks.find(c => c.id === 'A3');
  assert.ok(a3, 'A3 check should exist');
  assert.strictEqual(a3.passed, false);
  assert.strictEqual(a3.severity, 'concerns');
});

test('A3: returns passed:true when requirements has entries', () => {
  const { checks } = runStructuralChecks(VALID_PLAN, VALID_REQUIREMENTS, 'test.md');
  const a3 = checks.find(c => c.id === 'A3');
  assert.strictEqual(a3.passed, true);
});

// ─── A4: <objective> block present ────────────────────────────────────────────

test('A4: returns passed:false with severity:fail when <objective> is missing', () => {
  const plan = VALID_PLAN.replace('<objective>', '<!-- objective -->').replace('</objective>', '<!-- /objective -->');
  const { checks } = runStructuralChecks(plan, VALID_REQUIREMENTS, 'test.md');
  const a4 = checks.find(c => c.id === 'A4');
  assert.ok(a4, 'A4 check should exist');
  assert.strictEqual(a4.passed, false);
  assert.strictEqual(a4.severity, 'fail');
});

test('A4: returns passed:true when <objective> is present', () => {
  const { checks } = runStructuralChecks(VALID_PLAN, VALID_REQUIREMENTS, 'test.md');
  const a4 = checks.find(c => c.id === 'A4');
  assert.strictEqual(a4.passed, true);
});

// ─── A5: plan-level <acceptance_criteria> block before <tasks> ────────────────

test('A5: returns passed:false with severity:concerns when no plan-level AC block', () => {
  const planNoAc = `---
phase: 50-readiness-gate
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bin/lib/readiness.cjs
autonomous: true
requirements: [VRFY-03]
must_haves:
  truths:
    - "some truth"
---

<objective>
Create the readiness command.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Create readiness.cjs</name>
  <files>bin/lib/readiness.cjs</files>
  <action>Create the readiness library.</action>
  <ac_refs>AC-1</ac_refs>
  <acceptance_criteria>readiness.cjs exports all required functions</acceptance_criteria>
</task>

</tasks>
`;
  const { checks } = runStructuralChecks(planNoAc, VALID_REQUIREMENTS, 'test.md');
  const a5 = checks.find(c => c.id === 'A5');
  assert.ok(a5, 'A5 check should exist');
  assert.strictEqual(a5.passed, false);
  assert.strictEqual(a5.severity, 'concerns');
});

test('A5: returns passed:true when plan-level <acceptance_criteria> block exists before <tasks>', () => {
  const { checks } = runStructuralChecks(VALID_PLAN, VALID_REQUIREMENTS, 'test.md');
  const a5 = checks.find(c => c.id === 'A5');
  assert.strictEqual(a5.passed, true);
});

// ─── A6: <tasks> block with at least one <task> ───────────────────────────────

test('A6: returns passed:false with severity:fail when no <task> elements found', () => {
  // Remove the task block entirely — no <task> inside means A6 fails
  const planNoTasks = `---
phase: 50-readiness-gate
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bin/lib/readiness.cjs
autonomous: true
requirements: [VRFY-03]
must_haves:
  truths:
    - "some truth"
---

<objective>
Create the readiness command.
</objective>

<acceptance_criteria>
**AC-1**: Given a phase directory, when check runs, then READINESS.md is written.
</acceptance_criteria>

<tasks>
(no tasks here)
</tasks>
`;
  const { checks } = runStructuralChecks(planNoTasks, VALID_REQUIREMENTS, 'test.md');
  const a6 = checks.find(c => c.id === 'A6');
  assert.ok(a6, 'A6 check should exist');
  assert.strictEqual(a6.passed, false);
  assert.strictEqual(a6.severity, 'fail');
});

test('A6: returns passed:false with severity:fail when <tasks> is empty (no <task> inside)', () => {
  const planEmptyTasks = `---
phase: 50-readiness-gate
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bin/lib/readiness.cjs
autonomous: true
requirements: [VRFY-03]
must_haves:
  truths:
    - "some truth"
---

<objective>
Create the readiness command.
</objective>

<acceptance_criteria>
**AC-1**: Given a phase directory, when check runs, then READINESS.md is written.
</acceptance_criteria>

<tasks>
</tasks>
`;
  const { checks } = runStructuralChecks(planEmptyTasks, VALID_REQUIREMENTS, 'test.md');
  const a6 = checks.find(c => c.id === 'A6');
  assert.strictEqual(a6.passed, false);
  assert.strictEqual(a6.severity, 'fail');
});

test('A6: returns passed:true for valid plan with tasks', () => {
  const { checks } = runStructuralChecks(VALID_PLAN, VALID_REQUIREMENTS, 'test.md');
  const a6 = checks.find(c => c.id === 'A6');
  assert.strictEqual(a6.passed, true);
});

// ─── A7: each task has <name>, <action>, <acceptance_criteria> ────────────────

test('A7: returns passed:false with severity:fail when task is missing <name>', () => {
  const plan = VALID_PLAN.replace('<name>Task 1: Create readiness.cjs</name>', '');
  const { checks } = runStructuralChecks(plan, VALID_REQUIREMENTS, 'test.md');
  const a7 = checks.find(c => c.id === 'A7');
  assert.ok(a7, 'A7 check should exist');
  assert.strictEqual(a7.passed, false);
  assert.strictEqual(a7.severity, 'fail');
});

test('A7: returns passed:false with severity:fail when task is missing <action>', () => {
  const plan = VALID_PLAN.replace('<action>Create the readiness library.</action>', '');
  const { checks } = runStructuralChecks(plan, VALID_REQUIREMENTS, 'test.md');
  const a7 = checks.find(c => c.id === 'A7');
  assert.strictEqual(a7.passed, false);
  assert.strictEqual(a7.severity, 'fail');
});

test('A7: returns passed:true for valid plan with complete tasks', () => {
  const { checks } = runStructuralChecks(VALID_PLAN, VALID_REQUIREMENTS, 'test.md');
  const a7 = checks.find(c => c.id === 'A7');
  assert.strictEqual(a7.passed, true);
});

// ─── A8: each task has <ac_refs> ──────────────────────────────────────────────

test('A8: returns passed:false with severity:concerns when task missing <ac_refs>', () => {
  const plan = VALID_PLAN.replace('<ac_refs>AC-1, AC-2</ac_refs>', '');
  const { checks } = runStructuralChecks(plan, VALID_REQUIREMENTS, 'test.md');
  const a8 = checks.find(c => c.id === 'A8');
  assert.ok(a8, 'A8 check should exist');
  assert.strictEqual(a8.passed, false);
  assert.strictEqual(a8.severity, 'concerns');
});

test('A8: returns passed:true when all tasks have <ac_refs>', () => {
  const { checks } = runStructuralChecks(VALID_PLAN, VALID_REQUIREMENTS, 'test.md');
  const a8 = checks.find(c => c.id === 'A8');
  assert.strictEqual(a8.passed, true);
});

// ─── A9: must_haves.truths not empty ─────────────────────────────────────────

test('A9: returns passed:false with severity:concerns when must_haves.truths is empty', () => {
  const plan = VALID_PLAN.replace(
    '  truths:\n    - "runStructuralChecks() returns FAIL when PLAN.md is missing or has no tasks"',
    '  truths: []'
  );
  const { checks } = runStructuralChecks(plan, VALID_REQUIREMENTS, 'test.md');
  const a9 = checks.find(c => c.id === 'A9');
  assert.ok(a9, 'A9 check should exist');
  assert.strictEqual(a9.passed, false);
  assert.strictEqual(a9.severity, 'concerns');
});

test('A9: returns passed:true when must_haves.truths has entries', () => {
  const { checks } = runStructuralChecks(VALID_PLAN, VALID_REQUIREMENTS, 'test.md');
  const a9 = checks.find(c => c.id === 'A9');
  assert.strictEqual(a9.passed, true);
});

// ─── B1: requirement IDs mapped to REQUIREMENTS.md ───────────────────────────

test('B1: returns passed:false with severity:fail when requirement ID not found in REQUIREMENTS.md', () => {
  const plan = VALID_PLAN.replace('requirements: [VRFY-03]', 'requirements: [FAKE-99]');
  const { checks } = runStructuralChecks(plan, VALID_REQUIREMENTS, 'test.md');
  const b1 = checks.find(c => c.id === 'B1');
  assert.ok(b1, 'B1 check should exist');
  assert.strictEqual(b1.passed, false);
  assert.strictEqual(b1.severity, 'fail');
  assert.ok(b1.details && b1.details.includes('FAKE-99'), 'details should mention FAKE-99');
});

test('B1: returns passed:false when requirement ID only in Future Requirements section', () => {
  const plan = VALID_PLAN.replace('requirements: [VRFY-03]', 'requirements: [FUTURE-01]');
  const { checks } = runStructuralChecks(plan, VALID_REQUIREMENTS, 'test.md');
  const b1 = checks.find(c => c.id === 'B1');
  assert.strictEqual(b1.passed, false, 'FUTURE-01 is only in Future Requirements — should fail');
});

test('B1: returns passed:true when requirement ID found in active section', () => {
  const { checks } = runStructuralChecks(VALID_PLAN, VALID_REQUIREMENTS, 'test.md');
  const b1 = checks.find(c => c.id === 'B1');
  assert.strictEqual(b1.passed, true);
});

test('B1: skipped (passed:true) when requirementsContent is null', () => {
  const { checks } = runStructuralChecks(VALID_PLAN, null, 'test.md');
  const b1 = checks.find(c => c.id === 'B1');
  // B1 should either be absent or passed when no requirements content provided
  if (b1) {
    assert.strictEqual(b1.passed, true, 'B1 should pass when no requirements content to check against');
  }
});

// ─── B2: plan-level AC-N referenced by at least one task ─────────────────────

test('B2: returns passed:false with severity:concerns when plan AC is not referenced by any task', () => {
  // AC-2 is in the plan-level block but task only references AC-1, AC-2
  // Replace task ac_refs to only reference AC-1, leaving AC-2 orphaned
  const plan = VALID_PLAN.replace('<ac_refs>AC-1, AC-2</ac_refs>', '<ac_refs>AC-1</ac_refs>');
  const { checks } = runStructuralChecks(plan, VALID_REQUIREMENTS, 'test.md');
  const b2 = checks.find(c => c.id === 'B2');
  assert.ok(b2, 'B2 check should exist');
  assert.strictEqual(b2.passed, false);
  assert.strictEqual(b2.severity, 'concerns');
  assert.ok(b2.details && b2.details.includes('AC-2'), 'details should mention orphaned AC-2');
});

test('B2: returns passed:true when all plan AC-N are referenced by tasks', () => {
  const { checks } = runStructuralChecks(VALID_PLAN, VALID_REQUIREMENTS, 'test.md');
  const b2 = checks.find(c => c.id === 'B2');
  assert.strictEqual(b2.passed, true);
});

// ─── B3: task ac_refs references AC-N in plan-level block ────────────────────

test('B3: returns passed:false with severity:concerns when task references AC-99 not in plan block', () => {
  const plan = VALID_PLAN.replace('<ac_refs>AC-1, AC-2</ac_refs>', '<ac_refs>AC-1, AC-99</ac_refs>');
  const { checks } = runStructuralChecks(plan, VALID_REQUIREMENTS, 'test.md');
  const b3 = checks.find(c => c.id === 'B3');
  assert.ok(b3, 'B3 check should exist');
  assert.strictEqual(b3.passed, false);
  assert.strictEqual(b3.severity, 'concerns');
  assert.ok(b3.details && b3.details.includes('AC-99'), 'details should mention ghost AC-99');
});

test('B3: returns passed:true when all task ac_refs exist in plan AC block', () => {
  const { checks } = runStructuralChecks(VALID_PLAN, VALID_REQUIREMENTS, 'test.md');
  const b3 = checks.find(c => c.id === 'B3');
  assert.strictEqual(b3.passed, true);
});

// ─── Return structure ─────────────────────────────────────────────────────────

test('runStructuralChecks returns { checks } object with array of CheckResult objects', () => {
  const result = runStructuralChecks(VALID_PLAN, VALID_REQUIREMENTS, 'test.md');
  assert.ok(result && Array.isArray(result.checks), 'result.checks should be an array');
  // Each check should have id, description, passed, severity
  for (const check of result.checks) {
    assert.ok('id' in check, `check ${check.id} should have id`);
    assert.ok('passed' in check, `check ${check.id} should have passed`);
    assert.ok('severity' in check, `check ${check.id} should have severity`);
    assert.ok(typeof check.description === 'string', `check ${check.id} should have description string`);
  }
});

test('runStructuralChecks: valid complete PLAN.md returns all checks passed', () => {
  const { checks } = runStructuralChecks(VALID_PLAN, VALID_REQUIREMENTS, 'test.md');
  const failed = checks.filter(c => !c.passed);
  assert.strictEqual(failed.length, 0, `All checks should pass. Failed: ${failed.map(c => c.id).join(', ')}`);
});

// ─── classifyResult: severity-first precedence ───────────────────────────────

test('classifyResult: fail takes precedence over concerns', () => {
  const checks = [
    { id: 'A6', severity: 'fail', passed: false },
    { id: 'A3', severity: 'concerns', passed: false },
    { id: 'A1', severity: 'fail', passed: true },
  ];
  assert.strictEqual(classifyResult(checks), 'fail');
});

test('classifyResult: passed=true items do not affect result even with fail severity', () => {
  const checks = [
    { id: 'A1', severity: 'fail', passed: true },
    { id: 'A3', severity: 'concerns', passed: true },
  ];
  assert.strictEqual(classifyResult(checks), 'pass');
});
