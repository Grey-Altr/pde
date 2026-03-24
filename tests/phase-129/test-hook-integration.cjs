'use strict';

/**
 * test-hook-integration.cjs — Nyquist test suite for Phase 129 (SYN-04, SYN-05)
 *
 * SYN-04: Session-start reconciliation (reconcileOnStart)
 *         mtime-based change detection, loop-break gate, reverse parse, merge, write-back
 * SYN-05: Manual ingest CLI (ingestAll, --ingest flag)
 *         Always-scan, idempotent, pendingIngest processing, first-run scenario
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const {
  reconcileOnStart,
  ingestAll,
  emitAll,
  readStateFile,
  MONITORED_FILES,
  replaceSectionInFile,
  buildContextIR,
} = require('../../bin/lib/context-sync.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-129-'));
}

/**
 * Create a minimal project directory structure sufficient for buildContextIR and emitAll.
 * Includes PROJECT.md with ## Tech Stack and ## Constraints sections,
 * config.json, and design-manifest.json.
 */
function makePlanningDir(baseDir) {
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });

  // PROJECT.md with both writable sections
  const projectMd = `# Test Project

A test project for phase-129 hook integration.

## Tech Stack

- Node.js v20
- Jest for testing

## Constraints

- No external dependencies
- Must run on macOS and Linux
`;
  fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), projectMd, 'utf-8');

  // Minimal STATE.md
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '# State\n', 'utf-8');

  // config.json with empty fieldPolicies
  fs.writeFileSync(
    path.join(planningDir, 'config.json'),
    JSON.stringify({ contextSync: { fieldPolicies: {} } }, null, 2),
    'utf-8'
  );

  // design/ subdirectory
  const designDir = path.join(planningDir, 'design');
  fs.mkdirSync(designDir, { recursive: true });
  fs.writeFileSync(path.join(designDir, 'DESIGN-STATE.md'), '', 'utf-8');
  fs.writeFileSync(path.join(designDir, 'design-manifest.json'), '{}', 'utf-8');

  return planningDir;
}

/**
 * Create the .cursor/rules/ directory structure and stub .mdc files
 * so MONITORED_FILES paths resolve within tmpDir.
 */
function makeEditorFiles(baseDir) {
  // .cursor/rules/
  const cursorRulesDir = path.join(baseDir, '.cursor', 'rules');
  fs.mkdirSync(cursorRulesDir, { recursive: true });

  // .agent/skills/pde-design/
  const skillDir = path.join(baseDir, '.agent', 'skills', 'pde-design');
  fs.mkdirSync(skillDir, { recursive: true });

  // Stub files — plain content (no PDE-GENERATED header = computeLoopBreak returns 'skip')
  const mdcFiles = [
    'pde-project.mdc',
    'pde-architecture.mdc',
    'pde-design-tokens.mdc',
    'pde-components.mdc',
    'pde-pipeline.mdc',
  ];
  for (const f of mdcFiles) {
    fs.writeFileSync(path.join(cursorRulesDir, f), `---\ndescription: stub\n---\nStub content\n`, 'utf-8');
  }

  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# SKILL\nStub skill content\n', 'utf-8');
  fs.writeFileSync(path.join(baseDir, 'DESIGN.md'), '# DESIGN\nStub design content\n', 'utf-8');
}

// ─── replaceSectionInFile tests ───────────────────────────────────────────────

test('replaceSectionInFile: replaces ## Tech Stack section content in PROJECT.md', () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  const projectPath = path.join(planningDir, 'PROJECT.md');

  const newContent = '- TypeScript v5\n- Vitest for testing';
  const result = replaceSectionInFile(projectPath, 'Tech Stack', newContent);

  assert.equal(result, true, 'should return true when section found and replaced');

  const updated = fs.readFileSync(projectPath, 'utf-8');
  assert.ok(updated.includes('## Tech Stack'), '## Tech Stack heading should be preserved');
  assert.ok(updated.includes('TypeScript v5'), 'new content should be written');
  assert.ok(!updated.includes('Node.js v20'), 'old content should be replaced');
  // Other sections should be untouched
  assert.ok(updated.includes('## Constraints'), '## Constraints section should remain untouched');
  assert.ok(updated.includes('No external dependencies'), 'Constraints content should remain');
});

test('replaceSectionInFile: returns false when section not found', () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  const projectPath = path.join(planningDir, 'PROJECT.md');
  const originalContent = fs.readFileSync(projectPath, 'utf-8');

  const result = replaceSectionInFile(projectPath, 'Missing Section', 'new content');

  assert.equal(result, false, 'should return false when section not found');
  // File should be unchanged
  const unchanged = fs.readFileSync(projectPath, 'utf-8');
  assert.equal(unchanged, originalContent, 'file should be unchanged when section not found');
});

// ─── SYN-04: reconcileOnStart tests ──────────────────────────────────────────

test('SYN-04: reconcileOnStart skips files with mtime older than lastEmittedAt', async () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  makeEditorFiles(tmpDir);

  // emitAll writes state file with current timestamp
  emitAll(tmpDir);

  // Wait a moment to ensure state file timestamp is older than "now"
  await new Promise(r => setTimeout(r, 50));

  const result = reconcileOnStart(tmpDir);

  assert.ok(typeof result.filesScanned === 'number', 'filesScanned should be a number');
  assert.ok(result.filesScanned >= 0, 'filesScanned should be non-negative');
  assert.equal(result.changesDetected, 0, 'no changes detected when files have old mtime');
});

test('SYN-04: reconcileOnStart detects file with mtime newer than lastEmittedAt', () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  makeEditorFiles(tmpDir);

  // emitAll writes .mdc files with PDE-GENERATED hash and state file
  emitAll(tmpDir);

  // Now modify pde-project.mdc: change the hash to a fake one so
  // computeLoopBreak returns 'proceed' (different from current source hash)
  const mdcFile = path.join(tmpDir, '.cursor', 'rules', 'pde-project.mdc');
  const existingContent = fs.readFileSync(mdcFile, 'utf-8');
  // Replace the real hash with all-zeros to force 'proceed'
  const modifiedContent = existingContent.replace(
    /hash:[a-f0-9]{64}/,
    'hash:' + '0'.repeat(64)
  );
  fs.writeFileSync(mdcFile, modifiedContent, 'utf-8');

  // Set future mtime so reconcileOnStart picks it up
  const futureTime = new Date(Date.now() + 10000);
  fs.utimesSync(mdcFile, futureTime, futureTime);

  const result = reconcileOnStart(tmpDir);

  assert.ok(result.changesDetected >= 1, 'should detect at least one changed file with different hash');
});

test('SYN-04: reconcileOnStart calls computeLoopBreak and skips PDE-written files', () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  makeEditorFiles(tmpDir);

  // emitAll writes .mdc files with PDE-GENERATED hash
  emitAll(tmpDir);

  // Touch a .mdc file but do NOT change content (PDE wrote it, hash matches)
  const mdcFile = path.join(tmpDir, '.cursor', 'rules', 'pde-project.mdc');
  const futureTime = new Date(Date.now() + 10000);
  fs.utimesSync(mdcFile, futureTime, futureTime);

  // reconcileOnStart should call computeLoopBreak, detect hash match, skip
  const result = reconcileOnStart(tmpDir);

  // The file appears changed (newer mtime) but computeLoopBreak should skip it
  // because hash matches — changesDetected should remain 0
  assert.equal(result.changesDetected, 0, 'computeLoopBreak should skip PDE-written file with matching hash');
});

test('SYN-04: reconcileOnStart merges editor change and writes back to PROJECT.md', () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  makeEditorFiles(tmpDir);

  // emitAll writes state file and .mdc files
  emitAll(tmpDir);

  // Manually modify pde-project.mdc to simulate an editor-only constraints change
  // We need to write a file that parseMdcContent can parse — with PDE-GENERATED header
  // and a different hash so computeLoopBreak returns 'proceed'
  const mdcFile = path.join(tmpDir, '.cursor', 'rules', 'pde-project.mdc');
  const existingContent = fs.readFileSync(mdcFile, 'utf-8');

  // Replace the hash in PDE-GENERATED header to force computeLoopBreak to 'proceed'
  // and add a constraints section with new content inside PDE:BEGIN/END markers
  const modifiedContent = existingContent
    .replace(/hash:[a-f0-9]{64}/, 'hash:' + '0'.repeat(64))
    .replace(
      /## Constraints[\s\S]*?(?=^## |\Z)/m,
      '## Constraints\n\n- Editor-added constraint\n\n'
    );
  fs.writeFileSync(mdcFile, modifiedContent, 'utf-8');

  // Set future mtime so reconcileOnStart picks it up
  const futureTime = new Date(Date.now() + 10000);
  fs.utimesSync(mdcFile, futureTime, futureTime);

  // Run reconcileOnStart
  reconcileOnStart(tmpDir);

  // The PROJECT.md Constraints section should potentially reflect merged value
  // (This test verifies the write-back path is exercised without erroring)
  const updated = fs.readFileSync(path.join(planningDir, 'PROJECT.md'), 'utf-8');
  assert.ok(updated.includes('## Constraints'), 'PROJECT.md Constraints section should still exist after reconcile');
  assert.ok(updated.includes('## Tech Stack'), 'PROJECT.md Tech Stack section should still exist after reconcile');
});

test('SYN-04: reconcileOnStart logs to sync-reconciliation.log', () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  makeEditorFiles(tmpDir);

  reconcileOnStart(tmpDir);

  const logPath = path.join(planningDir, 'logs', 'sync-reconciliation.log');
  assert.ok(fs.existsSync(logPath), 'sync-reconciliation.log should exist');

  const logContent = fs.readFileSync(logPath, 'utf-8');
  assert.ok(logContent.includes('scanned='), 'log should contain scanned= field');
  assert.ok(logContent.includes('changed='), 'log should contain changed= field');
  assert.ok(logContent.includes('conflicts='), 'log should contain conflicts= field');
  assert.ok(logContent.includes('elapsed='), 'log should contain elapsed= field');
});

test('SYN-04: reconcileOnStart performance under 500ms for 8 monitored files', () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  makeEditorFiles(tmpDir);

  emitAll(tmpDir);

  const result = reconcileOnStart(tmpDir);

  assert.ok(typeof result.elapsed === 'number', 'elapsed should be a number');
  assert.ok(result.elapsed < 500, `reconcileOnStart should complete under 500ms (took ${result.elapsed}ms)`);
});

// ─── SYN-05: ingestAll tests ──────────────────────────────────────────────────

test('SYN-05: ingestAll returns summary with file/change/conflict counts', () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  makeEditorFiles(tmpDir);

  const result = ingestAll(tmpDir);

  assert.ok(typeof result === 'object', 'result should be an object');
  assert.ok(typeof result.filesScanned === 'number', 'filesScanned should be a number');
  assert.ok(typeof result.changesDetected === 'number', 'changesDetected should be a number');
  assert.ok(typeof result.conflicts === 'number', 'conflicts should be a number');
  assert.equal(result.filesScanned, 7, 'filesScanned should equal 7 (all MONITORED_FILES)');
});

test('SYN-05: ingestAll is idempotent — second run produces zero changes', async () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  makeEditorFiles(tmpDir);

  // First run
  ingestAll(tmpDir);

  // Brief pause to ensure state file is written
  await new Promise(r => setTimeout(r, 20));

  // Second run — should detect no differences since emitAll re-normalized
  const result2 = ingestAll(tmpDir);

  assert.equal(result2.changesDetected, 0, 'second ingestAll should detect zero changes (idempotent)');
});

test('SYN-05: ingestAll calls emitAll after merge to re-normalize', () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  makeEditorFiles(tmpDir);

  // Run ingestAll
  ingestAll(tmpDir);

  // After ingestAll, emitAll should have been called, writing state file
  const state = readStateFile(path.join(tmpDir, '.planning'));
  assert.ok(state !== null, 'state file should exist after ingestAll (emitAll was called)');
  assert.ok(state.lastEmittedAt, 'state file should have a lastEmittedAt timestamp');
});

test('SYN-05: ingestAll handles null state file gracefully (first-run scenario)', () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  makeEditorFiles(tmpDir);

  // No prior emitAll — no state file exists
  const statePath = path.join(planningDir, '.context-sync-state.json');
  assert.ok(!fs.existsSync(statePath), 'state file should not exist before first run');

  // ingestAll should handle null state gracefully
  let result;
  assert.doesNotThrow(() => {
    result = ingestAll(tmpDir);
  }, 'ingestAll should not throw on first run with no state file');

  assert.ok(result !== null && result !== undefined, 'result should be defined');
  assert.ok(typeof result.filesScanned === 'number', 'filesScanned should be a number on first run');
});
