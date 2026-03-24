'use strict';

/**
 * test-editor-sync-command.cjs — Tests for /pde:editor-sync command structure
 * and context-sync integration.
 *
 * Covers: CTX-07 — on-demand editor context regeneration
 *
 * Tests:
 *   1. commands/editor-sync.md exists with 'pde:editor-sync' in frontmatter
 *   2. commands/editor-sync.md references workflows/editor-sync.md
 *   3. workflows/editor-sync.md exists with 'context-sync' reference
 *   4. workflows/editor-sync.md contains 'emitAll' or 'context-sync' call
 *   5. emitAll returns all 6 expected keys
 *   6. Idempotency: same sourceHash on consecutive calls with same input
 *
 * Run: node --test tests/phase-123/test-editor-sync-command.cjs
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Resolve project root (two levels up from tests/phase-123/)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CONTEXT_SYNC = path.join(PROJECT_ROOT, 'bin', 'lib', 'context-sync.cjs');

const { emitAll } = require(CONTEXT_SYNC);

// ─── Test fixture helpers ──────────────────────────────────────────────────

/** Create an isolated temp directory with minimal .planning/ fixtures */
function makePlanningFixture(prefix) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-editor-sync-' + (prefix || '')));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });

  // Minimal PROJECT.md
  fs.writeFileSync(
    path.join(planningDir, 'PROJECT.md'),
    [
      '# Test Project',
      '',
      'A minimal test project for editor-sync integration tests.',
      '',
      '## Tech Stack',
      'Node.js, CJS modules',
      '',
      '## Constraints',
      'Zero npm dependencies.',
      '',
    ].join('\n'),
    'utf-8'
  );

  // Minimal STATE.md
  fs.writeFileSync(
    path.join(planningDir, 'STATE.md'),
    [
      '---',
      'pde_state_version: 1.0',
      'status: active',
      '---',
      '',
      '# Project State',
      '',
    ].join('\n'),
    'utf-8'
  );

  return { tmpDir, planningDir };
}

/** Recursively remove temp directories in after() hooks */
function cleanDirs(dirs) {
  for (const d of dirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch {}
  }
}

// ─── 1. Structural: commands/editor-sync.md ───────────────────────────────

describe('commands/editor-sync.md structure', () => {
  const cmdPath = path.join(PROJECT_ROOT, 'commands', 'editor-sync.md');

  it('file exists', () => {
    assert.ok(fs.existsSync(cmdPath), 'commands/editor-sync.md must exist');
  });

  it("contains 'pde:editor-sync' in name frontmatter", () => {
    const content = fs.readFileSync(cmdPath, 'utf-8');
    assert.ok(
      content.includes('pde:editor-sync'),
      "commands/editor-sync.md must contain 'pde:editor-sync'"
    );
  });

  it('references workflows/editor-sync.md in process section', () => {
    const content = fs.readFileSync(cmdPath, 'utf-8');
    assert.ok(
      content.includes('workflows/editor-sync'),
      "commands/editor-sync.md must reference 'workflows/editor-sync'"
    );
  });
});

// ─── 2. Structural: workflows/editor-sync.md ─────────────────────────────

describe('workflows/editor-sync.md structure', () => {
  const wfPath = path.join(PROJECT_ROOT, 'workflows', 'editor-sync.md');

  it('file exists', () => {
    assert.ok(fs.existsSync(wfPath), 'workflows/editor-sync.md must exist');
  });

  it("contains 'context-sync' reference", () => {
    const content = fs.readFileSync(wfPath, 'utf-8');
    assert.ok(
      content.includes('context-sync'),
      "workflows/editor-sync.md must contain 'context-sync'"
    );
  });

  it("contains 'emitAll' or 'context-sync' call pattern", () => {
    const content = fs.readFileSync(wfPath, 'utf-8');
    const hasEmitAll = content.includes('emitAll');
    const hasContextSync = content.includes('context-sync');
    assert.ok(
      hasEmitAll || hasContextSync,
      "workflows/editor-sync.md must contain 'emitAll' or 'context-sync'"
    );
  });
});

// ─── 3. Integration: emitAll returns all 6 editor target keys ────────────

describe('emitAll integration', () => {
  const tmpDirs = [];

  after(() => cleanDirs(tmpDirs));

  it('returns all 6 expected editor target keys plus sourceHash and generatedAt', () => {
    const { tmpDir } = makePlanningFixture('emit-all-');
    tmpDirs.push(tmpDir);

    const result = emitAll(tmpDir);

    const expectedKeys = [
      'agentsMd',
      'cursorRules',
      'cursorrules',
      'geminiMd',
      'antigravitySkill',
      'designMd',
    ];

    for (const key of expectedKeys) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(result, key),
        `emitAll result must have key: ${key}`
      );
    }

    assert.ok(
      Object.prototype.hasOwnProperty.call(result, 'sourceHash'),
      'emitAll result must have sourceHash'
    );
    assert.ok(
      Object.prototype.hasOwnProperty.call(result, 'generatedAt'),
      'emitAll result must have generatedAt'
    );
  });

  it('each emitter result has a written or skipped boolean property', () => {
    const { tmpDir } = makePlanningFixture('emit-written-');
    tmpDirs.push(tmpDir);

    const result = emitAll(tmpDir);

    const emitterKeys = ['agentsMd', 'cursorRules', 'cursorrules', 'geminiMd', 'antigravitySkill', 'designMd'];

    for (const key of emitterKeys) {
      const emitterResult = result[key];
      const hasWritten = emitterResult.written === true;
      const hasSkipped = emitterResult.skipped === true;
      assert.ok(
        hasWritten || hasSkipped,
        `${key} result must have written=true or skipped=true, got: ${JSON.stringify(emitterResult)}`
      );
    }
  });
});

// ─── 4. Idempotency: same sourceHash on consecutive calls ────────────────

describe('emitAll idempotency', () => {
  const tmpDirs = [];

  after(() => cleanDirs(tmpDirs));

  it('produces identical sourceHash on two consecutive calls with same input', () => {
    const { tmpDir } = makePlanningFixture('idempotent-');
    tmpDirs.push(tmpDir);

    const result1 = emitAll(tmpDir);
    const result2 = emitAll(tmpDir);

    assert.equal(
      result1.sourceHash,
      result2.sourceHash,
      'sourceHash must be identical for same .planning/ input'
    );
  });
});
