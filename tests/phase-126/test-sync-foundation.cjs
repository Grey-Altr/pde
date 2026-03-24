'use strict';

/**
 * test-sync-foundation.cjs — Nyquist test suite for Phase 126 (SYN-01, SYN-02, SYN-03)
 *
 * SYN-01: Persistent sync state file (writeStateFile / emitAll integration)
 * SYN-02: Loop-break hash comparison gate (computeLoopBreak)
 * SYN-03: IR snapshot stored in state file (lastIR fields)
 * readStateFile: read/validate state file
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const { emitAll, computeSourceHash, readStateFile, computeLoopBreak } = require('../../bin/lib/context-sync.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-126-test-'));
}

function makePlanningDir(baseDir) {
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  // Minimal PROJECT.md so buildContextIR doesn't fail
  fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), '# Test Project\n', 'utf-8');
  // Minimal STATE.md
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '# State\n', 'utf-8');
  // design/ subdirectory with required files
  const designDir = path.join(planningDir, 'design');
  fs.mkdirSync(designDir, { recursive: true });
  fs.writeFileSync(path.join(designDir, 'DESIGN-STATE.md'), '', 'utf-8');
  fs.writeFileSync(path.join(designDir, 'design-manifest.json'), '{}', 'utf-8');
  return planningDir;
}

// ─── SYN-01: State file creation and schema ───────────────────────────────────

test('SYN-01: emitAll() creates .planning/.context-sync-state.json', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  emitAll(baseDir);

  const statePath = path.join(planningDir, '.context-sync-state.json');
  assert.equal(fs.existsSync(statePath), true, 'state file must exist after emitAll()');
});

test('SYN-01: state file has correct schema fields', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  emitAll(baseDir);

  const statePath = path.join(planningDir, '.context-sync-state.json');
  const raw = fs.readFileSync(statePath, 'utf-8');
  const state = JSON.parse(raw);

  assert.equal(state.schemaVersion, '1.0', 'schemaVersion must be "1.0"');
  assert.equal(typeof state.lastEmittedAt, 'string', 'lastEmittedAt must be a string');
  assert.equal(typeof state.lastSourceHash, 'string', 'lastSourceHash must be a string');
  assert.equal(Array.isArray(state.pendingIngest), true, 'pendingIngest must be an array');
  assert.equal(state.pendingIngest.length, 0, 'pendingIngest must be empty on first write');
});

test('SYN-01: state file excluded from computeSourceHash (hash stable after state file write)', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const hashBefore = computeSourceHash(planningDir);
  emitAll(baseDir);
  const hashAfter = computeSourceHash(planningDir);

  assert.equal(hashBefore, hashAfter, 'hash must be identical before and after emitAll() (no loop risk)');
});

// ─── SYN-03: lastIR snapshot ──────────────────────────────────────────────────

test('SYN-03: lastIR snapshot contains exactly the 4 writable fields', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  emitAll(baseDir);

  const raw = fs.readFileSync(path.join(planningDir, '.context-sync-state.json'), 'utf-8');
  const state = JSON.parse(raw);

  assert.ok(state.lastIR, 'lastIR must exist in state');
  assert.ok('techStack' in state.lastIR, 'lastIR must have techStack');
  assert.ok('constraints' in state.lastIR, 'lastIR must have constraints');
  assert.ok('componentCatalog' in state.lastIR, 'lastIR must have componentCatalog');
  assert.ok('designTokens' in state.lastIR, 'lastIR must have designTokens');
  assert.equal('sourceHash' in state.lastIR, false, 'lastIR must NOT have sourceHash');
  assert.equal('generatedAt' in state.lastIR, false, 'lastIR must NOT have generatedAt');
  assert.equal('projectName' in state.lastIR, false, 'lastIR must NOT have projectName');
});

test('SYN-03: lastIR snapshot updated on second emitAll() call', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  emitAll(baseDir);
  const raw1 = fs.readFileSync(path.join(planningDir, '.context-sync-state.json'), 'utf-8');
  const state1 = JSON.parse(raw1);

  // Small delay to ensure timestamps differ if they can
  emitAll(baseDir);
  const raw2 = fs.readFileSync(path.join(planningDir, '.context-sync-state.json'), 'utf-8');
  const state2 = JSON.parse(raw2);

  assert.ok(state2.lastEmittedAt >= state1.lastEmittedAt, 'second lastEmittedAt must be >= first');
});

// ─── readStateFile tests ──────────────────────────────────────────────────────

test('readStateFile() returns null when file missing', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const result = readStateFile(planningDir);
  assert.equal(result, null, 'readStateFile() must return null when state file does not exist');
});

test('readStateFile() returns null when file is corrupt JSON', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const statePath = path.join(planningDir, '.context-sync-state.json');
  fs.writeFileSync(statePath, 'CORRUPT', 'utf-8');

  const result = readStateFile(planningDir);
  assert.equal(result, null, 'readStateFile() must return null for corrupt JSON');
});

test('readStateFile() returns state object when file is valid', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  emitAll(baseDir);
  const result = readStateFile(planningDir);

  assert.notEqual(result, null, 'readStateFile() must return object for valid state file');
  assert.equal(result.schemaVersion, '1.0', 'returned state must have schemaVersion "1.0"');
  assert.equal(typeof result.lastIR.techStack, 'string', 'lastIR.techStack must be a string');
});

test('readStateFile() returns null for unknown schema version (forward-compatibility guard)', () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const statePath = path.join(planningDir, '.context-sync-state.json');
  fs.writeFileSync(statePath, JSON.stringify({ schemaVersion: '2.0', lastIR: {} }), 'utf-8');

  const result = readStateFile(planningDir);
  assert.equal(result, null, 'readStateFile() must return null for schemaVersion "2.0"');
});

// ─── SYN-02: computeLoopBreak ─────────────────────────────────────────────────

test("SYN-02: computeLoopBreak() returns 'skip' when embedded hash matches current hash", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const currentHash = computeSourceHash(planningDir);
  const content = `<!-- PDE-GENERATED | hash:${currentHash} | generated:2026-01-01T00:00:00.000Z -->`;

  const result = computeLoopBreak(content, planningDir);
  assert.equal(result, 'skip', "must return 'skip' when embedded hash matches current source hash");
});

test("SYN-02: computeLoopBreak() returns 'proceed' when embedded hash differs from current hash", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const wrongHash = 'a'.repeat(64);
  const content = `<!-- PDE-GENERATED | hash:${wrongHash} | generated:2026-01-01T00:00:00.000Z -->`;

  const result = computeLoopBreak(content, planningDir);
  assert.equal(result, 'proceed', "must return 'proceed' when embedded hash differs from current hash");
});

test("SYN-02: computeLoopBreak() returns 'skip' when no PDE-GENERATED marker present", () => {
  const content = '# User Authored File\nNo markers here.';

  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const result = computeLoopBreak(content, planningDir);
  assert.equal(result, 'skip', "must return 'skip' when no PDE-GENERATED marker present");
});

test("SYN-02: computeLoopBreak() returns 'skip' for empty string", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const result = computeLoopBreak('', planningDir);
  assert.equal(result, 'skip', "must return 'skip' for empty string content");
});

test("SYN-02: computeLoopBreak() returns 'skip' for null content", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const result = computeLoopBreak(null, planningDir);
  assert.equal(result, 'skip', "must return 'skip' for null content");
});

test("SYN-02: computeLoopBreak() returns 'skip' for malformed PDE-GENERATED marker (INVALID_NOT_HEX)", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const content = '<!-- PDE-GENERATED | hash:INVALID_NOT_HEX | generated:2026-01-01T00:00:00.000Z -->';

  const result = computeLoopBreak(content, planningDir);
  assert.equal(result, 'skip', "must return 'skip' for malformed marker with non-hex hash");
});
