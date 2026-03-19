/**
 * handoff.test.mjs
 * Tests: HANDOFF.md generation in bin/lib/tracking.cjs
 *
 * Covers TRCK-03:
 *   - generateHandoff() produces HANDOFF.md with required frontmatter and body sections
 *   - generateHandoff() includes Task Status Snapshot when taskStatusContent is provided
 *   - generateHandoff() omits Task Status Snapshot when taskStatusContent is not provided
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { generateHandoff } = require('../../bin/lib/tracking.cjs');

// ─── generateHandoff: frontmatter ────────────────────────────────────────────

test('generateHandoff: output contains frontmatter with phase:, plan:, task:, task_of:, status:, last_updated:', () => {
  const result = generateHandoff({
    phase: '51-workflow-tracking',
    plan: '01',
    task: 2,
    taskOf: 3,
    status: 'IN_PROGRESS',
    lastAction: 'Implemented initWorkflowStatus function',
    nextStep: 'Run tests and verify all pass',
    blockers: 'None',
    decisions: 'Used regex-based table parsing',
    taskStatusContent: null,
  });
  assert.ok(typeof result === 'string', 'result should be a string');
  assert.ok(result.includes('phase:'), 'should contain phase: in frontmatter');
  assert.ok(result.includes('plan:'), 'should contain plan: in frontmatter');
  assert.ok(result.includes('task:'), 'should contain task: in frontmatter');
  assert.ok(result.includes('task_of:'), 'should contain task_of: in frontmatter');
  assert.ok(result.includes('status:'), 'should contain status: in frontmatter');
  assert.ok(result.includes('last_updated:'), 'should contain last_updated: in frontmatter');
});

// ─── generateHandoff: body sections ──────────────────────────────────────────

test('generateHandoff: output contains all required body sections', () => {
  const result = generateHandoff({
    phase: '51-workflow-tracking',
    plan: '01',
    task: 1,
    taskOf: 2,
    status: 'DONE',
    lastAction: 'Wrote tracking library',
    nextStep: 'Register CLI dispatch',
    blockers: 'None',
    decisions: 'None',
    taskStatusContent: null,
  });
  assert.ok(result.includes('## Current Position'), 'should contain ## Current Position section');
  assert.ok(result.includes('## Last Action Taken'), 'should contain ## Last Action Taken section');
  assert.ok(result.includes('## Next Step to Resume'), 'should contain ## Next Step to Resume section');
  assert.ok(result.includes('## Active Blockers'), 'should contain ## Active Blockers section');
  assert.ok(result.includes('## Key Decisions This Session'), 'should contain ## Key Decisions This Session section');
});

// ─── generateHandoff: Task Status Snapshot (conditional) ─────────────────────

test('generateHandoff: with taskStatusContent includes ## Task Status Snapshot section', () => {
  const statusTable = '| 1 | Task 1 | DONE | abc123 | 2026-01-01 |\n| 2 | Task 2 | TODO | — | — |';
  const result = generateHandoff({
    phase: '51-workflow-tracking',
    plan: '01',
    task: 2,
    taskOf: 2,
    status: 'IN_PROGRESS',
    lastAction: 'Done with task 1',
    nextStep: 'Continue task 2',
    blockers: 'None',
    decisions: 'None',
    taskStatusContent: statusTable,
  });
  assert.ok(result.includes('## Task Status Snapshot'), 'should contain ## Task Status Snapshot section');
  assert.ok(result.includes(statusTable), 'should include the status table content');
});

test('generateHandoff: without taskStatusContent omits ## Task Status Snapshot section', () => {
  const result = generateHandoff({
    phase: '51-workflow-tracking',
    plan: '01',
    task: 1,
    taskOf: 2,
    status: 'IN_PROGRESS',
    lastAction: 'Started task 1',
    nextStep: 'Finish task 1',
    blockers: 'None',
    decisions: 'None',
    taskStatusContent: null,
  });
  assert.ok(!result.includes('## Task Status Snapshot'), 'should NOT contain ## Task Status Snapshot when no content provided');
});

test('generateHandoff: without taskStatusContent (undefined) omits ## Task Status Snapshot section', () => {
  const result = generateHandoff({
    phase: '51-workflow-tracking',
    plan: '01',
    task: 1,
    taskOf: 1,
    status: 'DONE',
    lastAction: 'Finished',
    nextStep: 'Nothing',
    blockers: 'None',
    decisions: 'None',
  });
  assert.ok(!result.includes('## Task Status Snapshot'), 'should NOT contain ## Task Status Snapshot when taskStatusContent is undefined');
});
