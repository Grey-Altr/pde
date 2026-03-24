'use strict';

/**
 * test-context-sync-hook.cjs — Unit tests for hooks/context-sync-hook.cjs
 *
 * Tests the handleHookPayload(hookData, opts) exported function.
 * Uses dependency injection via opts to avoid real filesystem writes
 * and to observe whether emitAll was called.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const { handleHookPayload } = require('../../hooks/context-sync-hook.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
  return dir;
}

function makePlanningDir(baseDir) {
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(path.join(planningDir, 'config.json'), JSON.stringify({
    monitoring: { session_id: 'test-session-123' }
  }), 'utf-8');
  return planningDir;
}

// Default opts factory — emitAll is a no-op, hash returns a stable value
function makeOpts({ emitCount = { count: 0 }, hash = 'abc123', markerDir = null } = {}) {
  const dir = markerDir || makeTmpDir();
  return {
    emitAllFn: () => { emitCount.count++; return {}; },
    computeHashFn: () => hash,
    markerDir: dir,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('exits silently when hookData has no tool_input.file_path', () => {
  const emitCount = { count: 0 };
  const opts = makeOpts({ emitCount });

  // No tool_input at all
  handleHookPayload({}, opts);
  assert.equal(emitCount.count, 0, 'emitAll should not be called when no file_path');

  // tool_input present but no file_path
  handleHookPayload({ tool_input: {} }, opts);
  assert.equal(emitCount.count, 0, 'emitAll should not be called when tool_input has no file_path');
});

test('exits silently when file_path does not contain .planning/', () => {
  const emitCount = { count: 0 };
  const opts = makeOpts({ emitCount });

  const hookData = {
    tool_input: { file_path: '/Users/user/code/project/src/app.ts' },
    cwd: '/Users/user/code/project',
  };
  handleHookPayload(hookData, opts);
  assert.equal(emitCount.count, 0, 'emitAll should not be called for non-.planning/ file');
});

test('calls emitAll when file_path contains .planning/ and hash has changed', () => {
  const baseDir = makeTmpDir();
  makePlanningDir(baseDir);
  const emitCount = { count: 0 };
  const markerDir = makeTmpDir();
  const opts = makeOpts({ emitCount, hash: 'newhash999', markerDir });

  const hookData = {
    tool_input: { file_path: path.join(baseDir, '.planning', 'STATE.md') },
    cwd: baseDir,
  };
  handleHookPayload(hookData, opts);
  assert.equal(emitCount.count, 1, 'emitAll should be called once when hash changed');
});

test('skips emitAll when file_path contains .planning/ but hash is unchanged (idempotent)', () => {
  const baseDir = makeTmpDir();
  makePlanningDir(baseDir);
  const emitCount = { count: 0 };
  const markerDir = makeTmpDir();
  const sessionId = 'test-session-123';
  const sameHash = 'stable-hash-aabbcc';

  // Pre-write the marker so hash appears unchanged
  const markerPath = path.join(markerDir, `pde-context-sync-${sessionId}.last-hash`);
  fs.writeFileSync(markerPath, sameHash, 'utf-8');

  const opts = {
    emitAllFn: () => { emitCount.count++; return {}; },
    computeHashFn: () => sameHash,
    markerDir,
  };

  const hookData = {
    tool_input: { file_path: path.join(baseDir, '.planning', 'STATE.md') },
    cwd: baseDir,
  };
  handleHookPayload(hookData, opts);
  assert.equal(emitCount.count, 0, 'emitAll should NOT be called when hash unchanged (idempotent)');
});

test('writes marker file with current hash after successful regeneration', () => {
  const baseDir = makeTmpDir();
  makePlanningDir(baseDir);
  const markerDir = makeTmpDir();
  const sessionId = 'test-session-123';
  const newHash = 'freshHash12345678';

  const opts = {
    emitAllFn: () => ({}),
    computeHashFn: () => newHash,
    markerDir,
  };

  const hookData = {
    tool_input: { file_path: path.join(baseDir, '.planning', 'STATE.md') },
    cwd: baseDir,
  };
  handleHookPayload(hookData, opts);

  const markerPath = path.join(markerDir, `pde-context-sync-${sessionId}.last-hash`);
  const written = fs.readFileSync(markerPath, 'utf-8').trim();
  assert.equal(written, newHash, 'marker file should contain the new hash after regeneration');
});

test('exits 0 even when emitAll throws an error (silent failure)', () => {
  const baseDir = makeTmpDir();
  makePlanningDir(baseDir);
  const markerDir = makeTmpDir();
  let errorWasThrown = false;

  const opts = {
    emitAllFn: () => { throw new Error('Simulated emitAll failure'); },
    computeHashFn: () => 'somehash',
    markerDir,
  };

  const hookData = {
    tool_input: { file_path: path.join(baseDir, '.planning', 'STATE.md') },
    cwd: baseDir,
  };

  // Should not throw — all errors must be swallowed
  try {
    handleHookPayload(hookData, opts);
  } catch (err) {
    errorWasThrown = true;
  }
  assert.equal(errorWasThrown, false, 'handleHookPayload must not propagate errors from emitAll');
});

test('path filtering accepts both unix and windows .planning/ separators', () => {
  const emitCount = { count: 0 };
  const markerDir = makeTmpDir();
  const baseDir = makeTmpDir();
  makePlanningDir(baseDir);

  // Unix-style path
  {
    const opts = {
      emitAllFn: () => { emitCount.count++; return {}; },
      computeHashFn: () => 'hash-unix',
      markerDir: makeTmpDir(),
    };
    const hookData = {
      tool_input: { file_path: '/home/user/project/.planning/STATE.md' },
      cwd: baseDir,
    };
    handleHookPayload(hookData, opts);
    assert.equal(emitCount.count, 1, 'unix path with /.planning/ should trigger emitAll');
  }

  // Windows-style path
  {
    emitCount.count = 0;
    const opts = {
      emitAllFn: () => { emitCount.count++; return {}; },
      computeHashFn: () => 'hash-win',
      markerDir: makeTmpDir(),
    };
    const hookData = {
      tool_input: { file_path: 'C:\\Users\\user\\project\\.planning\\STATE.md' },
      cwd: baseDir,
    };
    handleHookPayload(hookData, opts);
    assert.equal(emitCount.count, 1, 'windows path with \\.planning\\ should trigger emitAll');
  }
});
