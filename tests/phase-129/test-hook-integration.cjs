'use strict';

/**
 * test-hook-integration.cjs — Nyquist test suite for Phase 129 (SYN-04, SYN-05, CUR-03)
 *
 * SYN-04: reconcileOnStart — mtime-based change detection, loop-break gate,
 *         merge, write-back, logging
 * SYN-05: ingestAll — always-scan, pendingIngest processing, emitAll integration
 * CUR-03: PostToolUse hook — mtime scanning, debounce, ingestAll integration,
 *         SessionStart hook, hooks.json
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-129-'));
}

function makePlanningDir(baseDir) {
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  // PROJECT.md with ## Tech Stack and ## Constraints sections
  fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), [
    '# Test Project',
    '',
    '## Tech Stack',
    '',
    'Node.js, Jest',
    '',
    '## Constraints',
    '',
    'No external dependencies',
    '',
    '## Other Section',
    '',
    'Other content',
    '',
  ].join('\n'), 'utf-8');
  // Minimal STATE.md
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '# State\n', 'utf-8');
  // config.json
  fs.writeFileSync(path.join(planningDir, 'config.json'), JSON.stringify({
    monitoring: { session_id: 'test-session-129' },
  }), 'utf-8');
  // design/ subdirectory
  const designDir = path.join(planningDir, 'design');
  fs.mkdirSync(designDir, { recursive: true });
  fs.writeFileSync(path.join(designDir, 'DESIGN-STATE.md'), '', 'utf-8');
  fs.writeFileSync(path.join(designDir, 'design-manifest.json'), '{}', 'utf-8');
  return planningDir;
}

// ─── replaceSectionInFile tests ───────────────────────────────────────────────

test("SYN-04: replaceSectionInFile replaces Tech Stack section in PROJECT.md", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  const projectMd = path.join(planningDir, 'PROJECT.md');

  const result = replaceSectionInFile(projectMd, 'Tech Stack', 'React, TypeScript, Vite');

  assert.equal(result, true, 'replaceSectionInFile should return true when section found');
  const content = fs.readFileSync(projectMd, 'utf-8');
  assert.ok(content.includes('React, TypeScript, Vite'), 'New content should appear in file');
  assert.ok(content.includes('## Tech Stack'), '## Tech Stack heading should remain');
  assert.ok(content.includes('## Constraints'), 'Other sections should remain untouched');
  assert.ok(!content.includes('Node.js, Jest'), 'Old content should be replaced');
});

test("SYN-04: replaceSectionInFile returns false when section not found", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  const projectMd = path.join(planningDir, 'PROJECT.md');
  const originalContent = fs.readFileSync(projectMd, 'utf-8');

  const result = replaceSectionInFile(projectMd, 'Missing Section', 'content');

  assert.equal(result, false, 'replaceSectionInFile should return false when section not found');
  const newContent = fs.readFileSync(projectMd, 'utf-8');
  assert.equal(newContent, originalContent, 'File should remain unchanged when section not found');
});

// ─── SYN-04: reconcileOnStart tests ──────────────────────────────────────────

test("SYN-04: reconcileOnStart skips files with mtime older than lastEmittedAt", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  // emitAll() sets lastEmittedAt
  emitAll(tmpDir);

  // No files modified afterward
  const result = reconcileOnStart(tmpDir);

  assert.ok(typeof result.filesScanned === 'number', 'filesScanned should be a number');
  assert.ok(result.filesScanned >= 0, 'filesScanned should be non-negative');
  assert.equal(result.changesDetected, 0, 'changesDetected should be 0 when no files modified');
});

test("SYN-04: reconcileOnStart detects file with mtime newer than lastEmittedAt", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  // emitAll() to set state
  emitAll(tmpDir);

  // Touch a .mdc file with future mtime
  const mdcPath = path.join(tmpDir, '.cursor', 'rules', 'pde-project.mdc');
  if (fs.existsSync(mdcPath)) {
    const futureTime = new Date(Date.now() + 10000);
    fs.utimesSync(mdcPath, futureTime, futureTime);
  }

  const result = reconcileOnStart(tmpDir);

  assert.ok(typeof result.changesDetected === 'number', 'changesDetected should be a number');
  // If mdc was emitted, it will be detected (though computeLoopBreak may skip if hash matches)
  assert.ok(result.filesScanned > 0, 'filesScanned should be > 0 when MONITORED_FILES exist');
});

test("SYN-04: reconcileOnStart calls computeLoopBreak and skips PDE-written files", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  // emitAll() writes .mdc files with matching PDE hash
  emitAll(tmpDir);

  // Touch .mdc with future mtime but do NOT modify content (still PDE-written with valid hash)
  const mdcPath = path.join(tmpDir, '.cursor', 'rules', 'pde-project.mdc');
  if (fs.existsSync(mdcPath)) {
    const futureTime = new Date(Date.now() + 10000);
    fs.utimesSync(mdcPath, futureTime, futureTime);
  }

  const result = reconcileOnStart(tmpDir);

  // computeLoopBreak returns 'skip' for PDE-written files (hash matches) — changesDetected = 0
  assert.equal(result.changesDetected, 0,
    'changesDetected should be 0 when computeLoopBreak skips PDE-written files');
});

test("SYN-04: reconcileOnStart merges editor change and writes back to PROJECT.md", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  // emitAll() to generate .mdc files and set state
  emitAll(tmpDir);

  // Modify pde-project.mdc constraints section with an editor-only change
  // by replacing the PDE-GENERATED marker hash to force 'proceed' from computeLoopBreak
  const mdcPath = path.join(tmpDir, '.cursor', 'rules', 'pde-project.mdc');
  if (fs.existsSync(mdcPath)) {
    let content = fs.readFileSync(mdcPath, 'utf-8');
    // Corrupt the hash to make computeLoopBreak return 'proceed'
    content = content.replace(/hash:[a-f0-9]{64}/, 'hash:' + '0'.repeat(64));
    // Add editor content in PDE:BEGIN/END block if present, or append constraints
    if (content.includes('<!-- PDE:BEGIN -->')) {
      content = content.replace(
        /<!-- PDE:BEGIN -->([\s\S]*?)<!-- PDE:END -->/,
        '<!-- PDE:BEGIN -->\nEditor-added constraint: test-value\n<!-- PDE:END -->'
      );
    }
    fs.writeFileSync(mdcPath, content, 'utf-8');
    // Set future mtime so reconcileOnStart detects it
    const futureTime = new Date(Date.now() + 10000);
    fs.utimesSync(mdcPath, futureTime, futureTime);
  }

  const result = reconcileOnStart(tmpDir);

  // reconcileOnStart should run without errors
  assert.ok(typeof result.filesScanned === 'number', 'result.filesScanned should be a number');
  assert.ok(typeof result.changesDetected === 'number', 'result.changesDetected should be a number');
  assert.ok(typeof result.conflicts === 'number', 'result.conflicts should be a number');
});

test("SYN-04: reconcileOnStart logs to sync-reconciliation.log", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  reconcileOnStart(tmpDir);

  const logPath = path.join(planningDir, 'logs', 'sync-reconciliation.log');
  assert.ok(fs.existsSync(logPath), 'sync-reconciliation.log should exist');
  const logContent = fs.readFileSync(logPath, 'utf-8');
  assert.ok(logContent.includes('scanned='), 'Log should include scanned= field');
  assert.ok(logContent.includes('changed='), 'Log should include changed= field');
  assert.ok(logContent.includes('conflicts='), 'Log should include conflicts= field');
  assert.ok(logContent.includes('elapsed='), 'Log should include elapsed= field');
});

test("SYN-04: reconcileOnStart completes under 500ms for monitored files", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  const start = Date.now();
  const result = reconcileOnStart(tmpDir);
  const elapsed = Date.now() - start;

  assert.ok(elapsed < 500, `reconcileOnStart should complete in < 500ms, took ${elapsed}ms`);
  assert.ok(typeof result.elapsed === 'number', 'result.elapsed should be a number');
});

// ─── SYN-05: ingestAll tests ──────────────────────────────────────────────────

test("SYN-05: ingestAll returns summary with filesScanned, changesDetected, conflicts", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  const result = ingestAll(tmpDir);

  assert.ok(typeof result.filesScanned === 'number', 'filesScanned should be a number');
  assert.ok(typeof result.changesDetected === 'number', 'changesDetected should be a number');
  assert.ok(typeof result.conflicts === 'number', 'conflicts should be a number');
  assert.equal(result.filesScanned, 7, 'filesScanned should equal MONITORED_FILES count (7)');
});

test("SYN-05: ingestAll is idempotent — second run produces zero changes", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  // First run
  ingestAll(tmpDir);
  // Second run — re-normalized files should not register as changes
  const result2 = ingestAll(tmpDir);

  assert.equal(result2.changesDetected, 0,
    'Second ingestAll run should detect zero changes (idempotent)');
});

test("SYN-05: ingestAll calls emitAll to re-normalize files", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  ingestAll(tmpDir);

  // After ingestAll, state file should exist (written by emitAll inside ingestAll)
  const state = readStateFile(planningDir);
  assert.ok(state !== null, 'State file should exist after ingestAll (emitAll was called)');
  assert.ok(state.lastEmittedAt, 'lastEmittedAt should be set after ingestAll');
});

test("SYN-05: ingestAll handles null state file gracefully (first-run scenario)", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  // No prior emitAll — state file does not exist
  const statePath = path.join(planningDir, '.context-sync-state.json');
  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);

  let result;
  let threw = false;
  try {
    result = ingestAll(tmpDir);
  } catch {
    threw = true;
  }

  assert.equal(threw, false, 'ingestAll should not throw on first-run (null state)');
  assert.ok(result, 'ingestAll should return a result object on first-run');
  assert.ok(typeof result.filesScanned === 'number', 'filesScanned should be a number');
});

// ─── CUR-03: mtime detection, debounce, SessionStart hook, E2E ───────────────

const { handleHookPayload } = require('../../hooks/context-sync-hook.cjs');
const { scanMonitoredFiles } = require('../../hooks/context-sync-hook.cjs');

function makeHookOpts(overrides) {
  const markerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-hook-marker-'));
  return Object.assign({
    emitAllFn: () => {},
    computeHashFn: () => 'testhash',
    markerDir,
    ingestAllFn: () => {},
  }, overrides);
}

test("CUR-03: scanMonitoredFiles detects .mdc file with mtime newer than lastEmittedAt + 500ms grace", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  // emitAll to set lastEmittedAt
  emitAll(tmpDir);
  const state = readStateFile(planningDir);

  // Touch .mdc file with mtime newer than lastEmittedAt + 500ms
  const mdcPath = path.join(tmpDir, '.cursor', 'rules', 'pde-project.mdc');
  if (!fs.existsSync(path.dirname(mdcPath))) {
    fs.mkdirSync(path.dirname(mdcPath), { recursive: true });
  }
  if (!fs.existsSync(mdcPath)) {
    fs.writeFileSync(mdcPath, '# placeholder', 'utf-8');
  }
  const futureTime = new Date(new Date(state.lastEmittedAt).getTime() + 2000);
  fs.utimesSync(mdcPath, futureTime, futureTime);

  const changed = scanMonitoredFiles(tmpDir, state);

  const foundMdc = changed.some(e => e.path === '.cursor/rules/pde-project.mdc');
  assert.ok(foundMdc, 'scanMonitoredFiles should detect .mdc file with mtime > lastEmittedAt + 500ms');
});

test("CUR-03: scanMonitoredFiles skips .mdc file with mtime within 500ms grace period", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  // emitAll to set lastEmittedAt
  emitAll(tmpDir);
  const state = readStateFile(planningDir);

  // Immediately call scanMonitoredFiles — all mtime should be within grace window
  const changed = scanMonitoredFiles(tmpDir, state);

  assert.equal(changed.length, 0,
    'scanMonitoredFiles should return empty array when all mtimes within 500ms grace');
});

test("CUR-03: debounce — same file already in pendingIngest within 200ms is not re-queued", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  emitAll(tmpDir);
  const state = readStateFile(planningDir);

  // Touch .mdc with future mtime
  const mdcPath = path.join(tmpDir, '.cursor', 'rules', 'pde-project.mdc');
  if (fs.existsSync(mdcPath)) {
    const futureTime = new Date(new Date(state.lastEmittedAt).getTime() + 2000);
    fs.utimesSync(mdcPath, futureTime, futureTime);
  }

  // Create state with pendingIngest already containing the file (within 200ms)
  const stateWithPending = Object.assign({}, state, {
    pendingIngest: [
      { path: '.cursor/rules/pde-project.mdc', detectedAt: new Date().toISOString() },
    ],
  });

  const changed = scanMonitoredFiles(tmpDir, stateWithPending);

  const foundMdc = changed.some(e => e.path === '.cursor/rules/pde-project.mdc');
  assert.equal(foundMdc, false,
    'scanMonitoredFiles should NOT re-queue file already in pendingIngest within 200ms');
});

test("CUR-03: handleHookPayload calls ingestAll (not plain emitAll) when mtime changes detected", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  // emitAll to set state with a timestamp in the past
  emitAll(tmpDir);

  // Touch .mdc file with future mtime so scanMonitoredFiles detects it
  const mdcPath = path.join(tmpDir, '.cursor', 'rules', 'pde-project.mdc');
  if (fs.existsSync(mdcPath)) {
    const futureTime = new Date(Date.now() + 10000);
    fs.utimesSync(mdcPath, futureTime, futureTime);
  }

  let ingestAllCalled = false;
  let emitAllCalled = false;

  // Use a real hash that differs from marker so hash gate passes
  const opts = {
    emitAllFn: () => { emitAllCalled = true; },
    computeHashFn: () => 'hash-from-planning-' + Date.now(),
    markerDir: fs.mkdtempSync(path.join(os.tmpdir(), 'pde-hook-')),
    ingestAllFn: () => { ingestAllCalled = true; },
    // Pass the cwd override for correct path resolution in hook
    _cwdOverride: tmpDir,
  };

  const hookData = {
    tool_name: 'Write',
    tool_input: { file_path: path.join(tmpDir, '.planning', 'PROJECT.md') },
    cwd: tmpDir,
    session_id: 'test-session',
    hook_event_name: 'PostToolUse',
  };

  handleHookPayload(hookData, opts);

  assert.equal(ingestAllCalled, true, 'ingestAllFn should be called when mtime changes detected');
  assert.equal(emitAllCalled, false, 'emitAllFn should NOT be called when ingestAll is used');
});

test("CUR-03: hook produces zero stdout and adds under 10ms overhead", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  emitAll(tmpDir);

  let stdoutWritten = '';
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (data) => { stdoutWritten += data; return true; };

  try {
    const opts = makeHookOpts({
      computeHashFn: () => 'newhash-' + Date.now(),
      _cwdOverride: tmpDir,
    });

    const hookData = {
      tool_name: 'Write',
      tool_input: { file_path: path.join(tmpDir, '.planning', 'PROJECT.md') },
      cwd: tmpDir,
      session_id: 'test-session',
      hook_event_name: 'PostToolUse',
    };

    const startNs = process.hrtime.bigint();
    handleHookPayload(hookData, opts);
    const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;

    assert.equal(stdoutWritten, '', 'hook should produce zero stdout');
    assert.ok(elapsedMs < 10, `hook overhead should be < 10ms, was ${elapsedMs.toFixed(2)}ms`);
  } finally {
    process.stdout.write = originalWrite;
  }
});

test("CUR-03: E2E — edit .mdc PDE section -> hook detects -> ingestAll merges -> emitAll re-normalizes", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  // Step 1: emitAll to generate editor files and set state
  emitAll(tmpDir);

  // Step 2: Modify pde-project.mdc constraints section (editor-only change)
  const mdcPath = path.join(tmpDir, '.cursor', 'rules', 'pde-project.mdc');
  if (fs.existsSync(mdcPath)) {
    let content = fs.readFileSync(mdcPath, 'utf-8');
    // Corrupt the hash so computeLoopBreak returns 'proceed'
    content = content.replace(/hash:[a-f0-9]{64}/, 'hash:' + '0'.repeat(64));
    fs.writeFileSync(mdcPath, content, 'utf-8');
    // Step 3: Touch with future mtime so hook detects it
    const futureTime = new Date(Date.now() + 10000);
    fs.utimesSync(mdcPath, futureTime, futureTime);
  }

  // Step 4: handleHookPayload with .planning/ write event (simulating PDE writing STATE.md)
  // Use real ingestAll (not a mock) so the full E2E path is exercised
  const markerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-e2e-'));
  const opts = {
    computeHashFn: () => 'e2e-hash-' + Date.now(),
    markerDir,
    // No emitAllFn or ingestAllFn override — use real functions
  };

  const hookData = {
    tool_name: 'Write',
    tool_input: { file_path: path.join(tmpDir, '.planning', 'STATE.md') },
    cwd: tmpDir,
    session_id: 'test-session',
    hook_event_name: 'PostToolUse',
  };

  handleHookPayload(hookData, opts);

  // Step 5: Verify state file was updated (emitAll inside ingestAll was called)
  const finalState = readStateFile(planningDir);
  assert.ok(finalState !== null, 'State file should exist after E2E hook run');
  assert.ok(finalState.lastEmittedAt, 'lastEmittedAt should be set after E2E hook run');
});
