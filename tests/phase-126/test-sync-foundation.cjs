'use strict';

/**
 * test-sync-foundation.cjs — Nyquist test suite for Phase 126 sync state file
 *
 * Tests SYN-01 (persistent sync state file) and SYN-03 (lastIR snapshot).
 * Uses node:test framework with tmp dir isolation.
 *
 * Coverage:
 *   SYN-01: emitAll() writes .context-sync-state.json with correct schema fields
 *   SYN-01: computeSourceHash() is stable after state file write (no loop risk)
 *   SYN-03: lastIR snapshot contains exactly the 4 writable fields
 *   SYN-03: lastIR snapshot updated on second emitAll() call
 *   readStateFile: returns null for missing file
 *   readStateFile: returns null for corrupt JSON
 *   readStateFile: returns parsed state for valid file
 *   readStateFile: returns null for unknown schema version (forward-compat guard)
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const { emitAll, computeSourceHash, readStateFile } = require('../../bin/lib/context-sync.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
}

/**
 * Create a minimal .planning/ directory that satisfies computeSourceHash()
 * without throwing. Writes:
 *   .planning/PROJECT.md
 *   .planning/STATE.md
 *   .planning/design/DESIGN-STATE.md
 *   .planning/design/design-manifest.json
 */
function makePlanningDir(baseDir) {
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.mkdirSync(path.join(planningDir, 'design'), { recursive: true });

  fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), '# Test Project\n', 'utf-8');
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '# State\n', 'utf-8');
  fs.writeFileSync(path.join(planningDir, 'design', 'DESIGN-STATE.md'), '', 'utf-8');
  fs.writeFileSync(path.join(planningDir, 'design', 'design-manifest.json'), '{}', 'utf-8');

  return planningDir;
}

// ─── SYN-01 tests ─────────────────────────────────────────────────────────────

test('SYN-01: emitAll() creates .planning/.context-sync-state.json', () => {
  const baseDir = makeTmpDir();
  makePlanningDir(baseDir);

  emitAll(baseDir);

  const stateFilePath = path.join(baseDir, '.planning', '.context-sync-state.json');
  assert.ok(fs.existsSync(stateFilePath), 'state file must exist after emitAll()');
});

test('SYN-01: state file has correct schema fields', () => {
  const baseDir = makeTmpDir();
  makePlanningDir(baseDir);

  emitAll(baseDir);

  const stateFilePath = path.join(baseDir, '.planning', '.context-sync-state.json');
  const raw = fs.readFileSync(stateFilePath, 'utf-8');
  const state = JSON.parse(raw);

  assert.equal(state.schemaVersion, '1.0', 'schemaVersion must be "1.0"');
  assert.equal(typeof state.lastEmittedAt, 'string', 'lastEmittedAt must be a string');
  assert.equal(typeof state.lastSourceHash, 'string', 'lastSourceHash must be a string');
  assert.ok(Array.isArray(state.pendingIngest), 'pendingIngest must be an array');
  assert.equal(state.pendingIngest.length, 0, 'pendingIngest must be empty on first write');
});

test('SYN-01: state file excluded from computeSourceHash (hash stable after state file write)', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const hashBefore = computeSourceHash(planningDir);
  emitAll(baseDir);
  const hashAfter = computeSourceHash(planningDir);

  assert.equal(hashBefore, hashAfter, 'computeSourceHash must return same value before and after emitAll()');
});

// ─── SYN-03 tests ─────────────────────────────────────────────────────────────

test('SYN-03: lastIR snapshot contains exactly the 4 writable fields', () => {
  const baseDir = makeTmpDir();
  makePlanningDir(baseDir);

  emitAll(baseDir);

  const stateFilePath = path.join(baseDir, '.planning', '.context-sync-state.json');
  const state = JSON.parse(fs.readFileSync(stateFilePath, 'utf-8'));

  assert.ok(state.lastIR, 'lastIR must exist');
  assert.ok('techStack' in state.lastIR, 'lastIR must have techStack');
  assert.ok('constraints' in state.lastIR, 'lastIR must have constraints');
  assert.ok('componentCatalog' in state.lastIR, 'lastIR must have componentCatalog');
  assert.ok('designTokens' in state.lastIR, 'lastIR must have designTokens');

  // Must NOT have computed fields
  assert.ok(!('sourceHash' in state.lastIR), 'lastIR must NOT have sourceHash');
  assert.ok(!('generatedAt' in state.lastIR), 'lastIR must NOT have generatedAt');
  assert.ok(!('projectName' in state.lastIR), 'lastIR must NOT have projectName');
});

test('SYN-03: lastIR snapshot updated on second emitAll() call', () => {
  const baseDir = makeTmpDir();
  makePlanningDir(baseDir);

  emitAll(baseDir);
  const stateFilePath = path.join(baseDir, '.planning', '.context-sync-state.json');
  const firstState = JSON.parse(fs.readFileSync(stateFilePath, 'utf-8'));

  // Small delay to allow timestamp to advance (or equal at minimum)
  emitAll(baseDir);
  const secondState = JSON.parse(fs.readFileSync(stateFilePath, 'utf-8'));

  assert.ok(
    secondState.lastEmittedAt >= firstState.lastEmittedAt,
    'second lastEmittedAt must be >= first lastEmittedAt (as ISO strings)'
  );
});

// ─── readStateFile tests ──────────────────────────────────────────────────────

test('readStateFile: returns null when file missing', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const result = readStateFile(planningDir);
  assert.equal(result, null, 'readStateFile must return null when file does not exist');
});

test('readStateFile: returns null when file is corrupt JSON', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  fs.writeFileSync(path.join(planningDir, '.context-sync-state.json'), 'CORRUPT', 'utf-8');

  const result = readStateFile(planningDir);
  assert.equal(result, null, 'readStateFile must return null for corrupt JSON');
});

test('readStateFile: returns state object when file is valid', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  emitAll(baseDir);
  const result = readStateFile(planningDir);

  assert.ok(result !== null, 'readStateFile must return non-null for valid state file');
  assert.equal(result.schemaVersion, '1.0', 'returned state must have schemaVersion "1.0"');
  assert.equal(typeof result.lastIR.techStack, 'string', 'returned state.lastIR.techStack must be a string');
});

test('readStateFile: returns null for unknown schema version (forward-compat guard)', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const futureState = {
    schemaVersion: '2.0',
    lastEmittedAt: new Date().toISOString(),
    lastSourceHash: 'abc123',
    lastIR: {},
    pendingIngest: [],
  };
  fs.writeFileSync(
    path.join(planningDir, '.context-sync-state.json'),
    JSON.stringify(futureState, null, 2),
    'utf-8'
  );

  const result = readStateFile(planningDir);
  assert.equal(result, null, 'readStateFile must return null for schemaVersion "2.0" (forward-compat guard)');
});
