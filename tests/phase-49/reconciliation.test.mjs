/**
 * reconciliation.test.mjs
 * Tests: Task-to-commit matching algorithm in bin/lib/reconciliation.cjs
 *
 * Covers VRFY-02 (AC-3):
 *   - Tier 1: slug match returns correct task for a standard commit message
 *   - Tier 2: file overlap match returns correct task when slug fails
 *   - Both Tier 1 and Tier 2 fail + Tier 3 phase-plan prefix → plan_prefix_only (not unplanned)
 *   - All three tiers fail → commit classified as "unplanned"
 *   - No commits → all tasks have "unmatched" status → status "incomplete"
 *   - deriveStatus() returns correct values for each scenario
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  slugMatch,
  fileOverlapMatch,
  phasePlanPrefixMatch,
  classifyCommits,
  deriveStatus,
  toSlug,
  normalizeTaskName,
  normalizeCommitMessage,
} = require('../../bin/lib/reconciliation.cjs');

// ─── toSlug / normalizeTaskName / normalizeCommitMessage ─────────────────────

test('toSlug: lowercases and replaces non-alphanumeric with hyphens', () => {
  assert.strictEqual(toSlug('Hello World!'), 'hello-world');
  assert.strictEqual(toSlug('foo.bar-baz'), 'foo-bar-baz');
  assert.strictEqual(toSlug('--leading trailing--'), 'leading-trailing');
  assert.strictEqual(toSlug('multiple   spaces'), 'multiple-spaces');
});

test('normalizeTaskName strips "Task N: " prefix before slugifying', () => {
  assert.strictEqual(
    normalizeTaskName('Task 1: Create reconcile-phase.md workflow'),
    'create-reconcile-phase-md-workflow'
  );
  assert.strictEqual(
    normalizeTaskName('Task 42: Add reconcile_phase step to execute-phase.md'),
    'add-reconcile-phase-step-to-execute-phase-md'
  );
  // No prefix — just slugify the whole thing
  assert.strictEqual(
    normalizeTaskName('Some plain task name'),
    'some-plain-task-name'
  );
});

test('normalizeCommitMessage extracts text after "): " in conventional commits', () => {
  assert.strictEqual(
    normalizeCommitMessage('feat(49-01): create reconcile-phase.md workflow'),
    'create-reconcile-phase-md-workflow'
  );
  assert.strictEqual(
    normalizeCommitMessage('fix(49-01): correct boundary check in task 2'),
    'correct-boundary-check-in-task-2'
  );
  // No conventional prefix — slugify the full message
  assert.strictEqual(
    normalizeCommitMessage('plain commit message'),
    'plain-commit-message'
  );
});

// ─── Tier 1: slugMatch ────────────────────────────────────────────────────────

test('slugMatch: returns true when commit shares 3+ consecutive words with task name', () => {
  const matched = slugMatch(
    'Task 1: Create reconcile-phase.md workflow',
    'feat(49-01): create reconcile phase md workflow'
  );
  assert.strictEqual(matched, true, 'should match — 3+ consecutive slug words overlap');
});

test('slugMatch: returns true for realistic PDE commit matching task name', () => {
  const matched = slugMatch(
    'Task 2: Add reconcile_phase step to execute-phase.md and update verifier spawn',
    'feat(49-01): add reconcile phase step to execute-phase.md'
  );
  assert.strictEqual(matched, true, 'should match — "add reconcile phase step" shares 4 consecutive words');
});

test('slugMatch: returns false when commit shares fewer than 3 consecutive words', () => {
  const matched = slugMatch(
    'Task 1: Create reconcile-phase.md workflow',
    'feat(49-01): initial commit'
  );
  assert.strictEqual(matched, false, 'should not match — no 3 consecutive shared words');
});

test('slugMatch: returns false when commit and task are completely unrelated', () => {
  const matched = slugMatch(
    'Task 1: Add risk attribute tagging to planner',
    'feat(49-02): fix typo in readme'
  );
  assert.strictEqual(matched, false, 'should not match — no shared slug words');
});

test('slugMatch: returns false when only 2 consecutive words match', () => {
  // task slug: "update-roadmap-file" → words: [update, roadmap, file]
  // commit slug: "update-roadmap-only" → words: [update, roadmap, only]
  // "update roadmap" appears in both but that's only 2 consecutive words
  const matched = slugMatch(
    'Task 3: Update roadmap file with new entries',
    'feat(49-01): update roadmap only'
  );
  // "update roadmap" is 2 words — should not match
  // But "update roadmap" + "file" vs "update roadmap" + "only" → no trigram match
  assert.strictEqual(matched, false, 'should not match — only 2 consecutive shared words');
});

test('slugMatch: handles task name without "Task N:" prefix', () => {
  const matched = slugMatch(
    'Create reconcile phase workflow',
    'feat(49-01): create reconcile phase workflow'
  );
  assert.strictEqual(matched, true, 'should match task without Task N prefix');
});

// ─── Tier 2: fileOverlapMatch ─────────────────────────────────────────────────

test('fileOverlapMatch: returns true when a commit file appears in task files list', () => {
  const matched = fileOverlapMatch(
    ['workflows/reconcile-phase.md', 'tests/phase-49/reconciliation.test.mjs'],
    ['workflows/reconcile-phase.md']
  );
  assert.strictEqual(matched, true, 'should match — file overlap found');
});

test('fileOverlapMatch: returns true when only one file overlaps', () => {
  const matched = fileOverlapMatch(
    ['src/unrelated.js', 'workflows/execute-phase.md'],
    ['workflows/execute-phase.md', 'workflows/plan-phase.md']
  );
  assert.strictEqual(matched, true, 'should match on single overlapping file');
});

test('fileOverlapMatch: returns false when no commit files appear in task files', () => {
  const matched = fileOverlapMatch(
    ['src/something-else.js', 'README.md'],
    ['workflows/reconcile-phase.md', 'bin/lib/reconciliation.cjs']
  );
  assert.strictEqual(matched, false, 'should not match — no file overlap');
});

test('fileOverlapMatch: returns false when commitFiles is empty', () => {
  const matched = fileOverlapMatch(
    [],
    ['workflows/reconcile-phase.md']
  );
  assert.strictEqual(matched, false, 'should not match — empty commit files');
});

test('fileOverlapMatch: returns false when taskFiles is empty', () => {
  const matched = fileOverlapMatch(
    ['workflows/reconcile-phase.md'],
    []
  );
  assert.strictEqual(matched, false, 'should not match — empty task files');
});

test('fileOverlapMatch: trims whitespace from file paths before comparing', () => {
  const matched = fileOverlapMatch(
    ['  workflows/reconcile-phase.md  '],
    ['workflows/reconcile-phase.md']
  );
  assert.strictEqual(matched, true, 'should match after trimming whitespace');
});

// ─── Tier 3: phasePlanPrefixMatch ─────────────────────────────────────────────

test('phasePlanPrefixMatch: returns true when commit message contains ({phaseNum}-', () => {
  const matched = phasePlanPrefixMatch('feat(49-01): some description', '49');
  assert.strictEqual(matched, true, 'should match phase-plan prefix');
});

test('phasePlanPrefixMatch: returns false for a different phase number', () => {
  // Phase 4 should NOT match phase 49 (parenthesis-anchored per Pitfall 5)
  const matched = phasePlanPrefixMatch('feat(4-01): some description', '49');
  assert.strictEqual(matched, false, 'should not match — different phase number');
});

test('phasePlanPrefixMatch: returns false when message has no phase prefix at all', () => {
  const matched = phasePlanPrefixMatch('chore: update README', '49');
  assert.strictEqual(matched, false, 'should not match — no phase prefix');
});

test('phasePlanPrefixMatch: parenthesis anchor prevents phase 49 matching phase 490', () => {
  // "(490-01)" should NOT match when phaseNum is "49"
  // Because our pattern is "\(49-" which would match "(490-01)" since "490" starts with "49"
  // This is the Pitfall 5 scenario — verify the pattern correctly anchors
  const matchedCorrect = phasePlanPrefixMatch('feat(49-01): real phase 49', '49');
  const matchedCross = phasePlanPrefixMatch('feat(490-01): different phase', '49');
  assert.strictEqual(matchedCorrect, true, 'phase 49 should match phase 49 commit');
  // Note: "(49-" pattern also matches "(490-..." since 490 starts with 49
  // The correct Pitfall 5 protection comes from using the full convention "(phase-plan)".
  // The phasePlanPrefixMatch is a *weak* match — commits with "feat(490-01):" are
  // from a different phase and should not match. Document the actual behavior.
  assert.strictEqual(matchedCross, false, 'feat(490-01) should NOT match phase 49 — 49- is not a prefix of 490-');
});

// ─── classifyCommits: full three-tier pipeline ────────────────────────────────

// Fixtures
const TASKS = [
  {
    name: 'Task 1: Create reconcile-phase.md workflow',
    files: ['workflows/reconcile-phase.md'],
    ac_refs: 'AC-1, AC-3, AC-4',
    plan_id: '49-01',
  },
  {
    name: 'Task 2: Add reconcile_phase step to execute-phase.md',
    files: ['workflows/execute-phase.md'],
    ac_refs: 'AC-1, AC-2',
    plan_id: '49-01',
  },
];

test('classifyCommits: slug match assigns commit to correct task (Tier 1)', () => {
  const commits = [
    {
      hash: 'abc1234',
      message: 'feat(49-01): create reconcile phase md workflow',
      files: ['workflows/reconcile-phase.md'],
    },
  ];

  const { taskStatuses, commitStatuses } = classifyCommits(TASKS, commits, { phaseNum: '49' });

  // Task 1 should be matched via slug
  const task1 = taskStatuses.get('Task 1: Create reconcile-phase.md workflow');
  assert.strictEqual(task1.status, 'matched', 'Task 1 should be matched');
  assert.strictEqual(task1.matchMethod, 'slug', 'match method should be slug');
  assert.strictEqual(task1.matchedCommits.length, 1, 'Task 1 should have 1 matched commit');
  assert.strictEqual(task1.matchedCommits[0].hash, 'abc1234');

  // Commit should be assigned to Task 1
  const cs = commitStatuses.get('abc1234');
  assert.strictEqual(cs.status, 'matched', 'commit should be matched');
  assert.strictEqual(cs.matchedTask, 'Task 1: Create reconcile-phase.md workflow');
  assert.strictEqual(cs.matchMethod, 'slug');
});

test('classifyCommits: file overlap assigns commit to task when slug fails (Tier 2)', () => {
  const commits = [
    {
      hash: 'def5678',
      // This message doesn't share 3 consecutive words with task 2 name
      message: 'fix(49-01): correct boundary check',
      files: ['workflows/execute-phase.md'],   // overlaps with Task 2 files
    },
  ];

  const { taskStatuses, commitStatuses } = classifyCommits(TASKS, commits, { phaseNum: '49' });

  // Task 2 should be matched via file_overlap
  const task2 = taskStatuses.get('Task 2: Add reconcile_phase step to execute-phase.md');
  assert.strictEqual(task2.status, 'matched', 'Task 2 should be matched via file overlap');
  assert.strictEqual(task2.matchMethod, 'file_overlap', 'match method should be file_overlap');
  assert.strictEqual(task2.matchedCommits[0].hash, 'def5678');

  const cs = commitStatuses.get('def5678');
  assert.strictEqual(cs.status, 'matched');
  assert.strictEqual(cs.matchMethod, 'file_overlap');
});

test('classifyCommits: phase-plan prefix alone classifies commit as plan_prefix_only (Tier 3)', () => {
  const commits = [
    {
      hash: 'ghi9012',
      // Has correct phase prefix but slug doesn't match any task and no file overlap
      message: 'chore(49-01): update .gitignore',
      files: ['.gitignore'],
    },
  ];

  const { commitStatuses } = classifyCommits(TASKS, commits, { phaseNum: '49' });

  const cs = commitStatuses.get('ghi9012');
  assert.strictEqual(cs.status, 'plan_prefix_only', 'commit should be plan_prefix_only');
  assert.strictEqual(cs.matchMethod, 'plan_prefix');
  assert.strictEqual(cs.matchedTask, undefined, 'plan_prefix_only should have no specific task');
});

test('classifyCommits: all three tiers fail → commit is "unplanned"', () => {
  const commits = [
    {
      hash: 'jkl3456',
      // Different phase prefix AND no file overlap AND slug doesn't match
      message: 'feat(48-99): completely unrelated change',
      files: ['some-other-file.js'],
    },
  ];

  const { commitStatuses } = classifyCommits(TASKS, commits, { phaseNum: '49' });

  const cs = commitStatuses.get('jkl3456');
  assert.strictEqual(cs.status, 'unplanned', 'commit should be classified as unplanned');
  assert.strictEqual(cs.matchMethod, 'unplanned');
});

test('classifyCommits: task with no matching commits is "unmatched"', () => {
  // Commit matches only Task 1 — Task 2 has no matching commit
  const commits = [
    {
      hash: 'abc1234',
      message: 'feat(49-01): create reconcile phase md workflow',
      files: ['workflows/reconcile-phase.md'],
    },
  ];

  const { taskStatuses } = classifyCommits(TASKS, commits, { phaseNum: '49' });

  const task2 = taskStatuses.get('Task 2: Add reconcile_phase step to execute-phase.md');
  assert.strictEqual(task2.status, 'unmatched', 'Task 2 should be unmatched — no commits found for it');
  assert.strictEqual(task2.matchedCommits.length, 0);
});

test('classifyCommits: no commits → all tasks are "unmatched"', () => {
  const { taskStatuses, commitStatuses } = classifyCommits(TASKS, [], { phaseNum: '49' });

  for (const [, ts] of taskStatuses) {
    assert.strictEqual(ts.status, 'unmatched', 'all tasks should be unmatched when no commits');
    assert.strictEqual(ts.matchedCommits.length, 0);
  }
  assert.strictEqual(commitStatuses.size, 0, 'no commit entries when commits array is empty');
});

test('classifyCommits: multiple commits can match the same task', () => {
  const commits = [
    {
      hash: 'commit-a',
      message: 'feat(49-01): create reconcile phase md workflow',
      files: ['workflows/reconcile-phase.md'],
    },
    {
      hash: 'commit-b',
      message: 'fix(49-01): update reconcile phase md workflow',
      files: ['workflows/reconcile-phase.md'],
    },
  ];

  const { taskStatuses } = classifyCommits(TASKS, commits, { phaseNum: '49' });

  const task1 = taskStatuses.get('Task 1: Create reconcile-phase.md workflow');
  assert.strictEqual(task1.status, 'matched');
  assert.strictEqual(task1.matchedCommits.length, 2, 'Task 1 should have 2 matched commits');
});

test('classifyCommits: slug match takes priority over file overlap (first tier wins)', () => {
  // Task 1 and Task 2 both have a file overlap with this commit, but
  // slug matches Task 1 — so commit should be assigned to Task 1 via slug
  const commits = [
    {
      hash: 'priority-test',
      message: 'feat(49-01): create reconcile phase md workflow',
      files: ['workflows/reconcile-phase.md', 'workflows/execute-phase.md'],
    },
  ];

  const { commitStatuses } = classifyCommits(TASKS, commits, { phaseNum: '49' });

  const cs = commitStatuses.get('priority-test');
  assert.strictEqual(cs.matchedTask, 'Task 1: Create reconcile-phase.md workflow',
    'slug-matched task should win over file-overlap match');
  assert.strictEqual(cs.matchMethod, 'slug');
});

// ─── deriveStatus ─────────────────────────────────────────────────────────────

test('deriveStatus: returns "incomplete" when any task is unmatched (highest precedence)', () => {
  const taskStatuses = new Map([
    ['Task 1', { status: 'unmatched', matchedCommits: [], matchMethod: '' }],
    ['Task 2', { status: 'matched', matchedCommits: [{ hash: 'x' }], matchMethod: 'slug' }],
  ]);
  const commitStatuses = new Map([
    ['x', { status: 'unplanned' }],
  ]);

  const status = deriveStatus({ taskStatuses, commitStatuses, hasDeviations: true });
  assert.strictEqual(status, 'incomplete', 'incomplete takes precedence over deviations_found');
});

test('deriveStatus: returns "deviations_found" when all tasks matched but deviations exist', () => {
  const taskStatuses = new Map([
    ['Task 1', { status: 'matched', matchedCommits: [{ hash: 'a' }], matchMethod: 'slug' }],
  ]);
  const commitStatuses = new Map([
    ['a', { status: 'matched' }],
  ]);

  const status = deriveStatus({ taskStatuses, commitStatuses, hasDeviations: true });
  assert.strictEqual(status, 'deviations_found');
});

test('deriveStatus: returns "unplanned_changes" when tasks matched, no deviations, but unplanned commits exist', () => {
  const taskStatuses = new Map([
    ['Task 1', { status: 'matched', matchedCommits: [{ hash: 'a' }], matchMethod: 'slug' }],
  ]);
  const commitStatuses = new Map([
    ['a', { status: 'matched' }],
    ['b', { status: 'unplanned' }],
  ]);

  const status = deriveStatus({ taskStatuses, commitStatuses, hasDeviations: false });
  assert.strictEqual(status, 'unplanned_changes');
});

test('deriveStatus: returns "clean" when all tasks matched, no deviations, no unplanned commits', () => {
  const taskStatuses = new Map([
    ['Task 1', { status: 'matched', matchedCommits: [{ hash: 'a' }], matchMethod: 'slug' }],
    ['Task 2', { status: 'matched', matchedCommits: [{ hash: 'b' }], matchMethod: 'file_overlap' }],
  ]);
  const commitStatuses = new Map([
    ['a', { status: 'matched' }],
    ['b', { status: 'matched' }],
  ]);

  const status = deriveStatus({ taskStatuses, commitStatuses, hasDeviations: false });
  assert.strictEqual(status, 'clean');
});

test('deriveStatus: "plan_prefix_only" commits do not trigger "unplanned_changes"', () => {
  const taskStatuses = new Map([
    ['Task 1', { status: 'matched', matchedCommits: [{ hash: 'a' }], matchMethod: 'slug' }],
  ]);
  const commitStatuses = new Map([
    ['a', { status: 'matched' }],
    ['c', { status: 'plan_prefix_only' }],
  ]);

  const status = deriveStatus({ taskStatuses, commitStatuses, hasDeviations: false });
  assert.strictEqual(status, 'clean', 'plan_prefix_only commits are not "unplanned" — should be clean');
});

// ─── End-to-end scenario ──────────────────────────────────────────────────────

test('end-to-end: Phase 49 execution — all tasks complete, one unrelated commit → unplanned_changes', () => {
  const tasks = [
    {
      name: 'Task 1: Create reconcile-phase.md workflow',
      files: ['workflows/reconcile-phase.md'],
      ac_refs: 'AC-1, AC-3, AC-4',
    },
    {
      name: 'Task 2: Add reconcile_phase step to execute-phase.md',
      files: ['workflows/execute-phase.md'],
      ac_refs: 'AC-1, AC-2',
    },
  ];

  const commits = [
    {
      hash: 'ebf6fdd',
      message: 'feat(49-01): create reconcile-phase.md workflow',
      files: ['workflows/reconcile-phase.md'],
    },
    {
      hash: '9714121',
      message: 'feat(49-01): add reconcile phase step to execute-phase.md',
      files: ['workflows/execute-phase.md'],
    },
    {
      hash: 'deadbee',
      message: 'wip: temporary debug file added',
      files: ['debug.log'],
    },
  ];

  const { taskStatuses, commitStatuses } = classifyCommits(tasks, commits, { phaseNum: '49' });
  const status = deriveStatus({ taskStatuses, commitStatuses, hasDeviations: false });

  assert.strictEqual(
    taskStatuses.get('Task 1: Create reconcile-phase.md workflow').status, 'matched'
  );
  assert.strictEqual(
    taskStatuses.get('Task 2: Add reconcile_phase step to execute-phase.md').status, 'matched'
  );
  assert.strictEqual(commitStatuses.get('deadbee').status, 'unplanned');
  assert.strictEqual(status, 'unplanned_changes');
});

test('end-to-end: zero commits → all tasks unmatched → status incomplete', () => {
  const tasks = [
    {
      name: 'Task 1: Create reconcile-phase.md workflow',
      files: ['workflows/reconcile-phase.md'],
    },
  ];

  const { taskStatuses, commitStatuses } = classifyCommits(tasks, [], { phaseNum: '49' });
  const status = deriveStatus({ taskStatuses, commitStatuses, hasDeviations: false });

  assert.strictEqual(
    taskStatuses.get('Task 1: Create reconcile-phase.md workflow').status,
    'unmatched'
  );
  assert.strictEqual(status, 'incomplete');
});
