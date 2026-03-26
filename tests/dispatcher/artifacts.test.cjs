'use strict';

/**
 * Tests for session-scoped artifact writing (ISO-06, ISO-07, ISO-08)
 * - writeCompleteJson: writes COMPLETE.json to phase directory
 * - writeCompletedReqs: writes COMPLETED-REQS.md to phase directory
 * - writeSessionMemory: writes session-scoped agent memory
 * - state write gating: PDE_SESSION_ID prevents STATE.md writes
 * - isSessionScoped: returns correct boolean
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  writeCompleteJson,
  writeCompletedReqs,
  writeSessionMemory,
  isSessionScoped,
  getSessionId,
} = require('../../bin/lib/session-artifacts.cjs');

const { writeStateMd } = require('../../bin/lib/state.cjs');

// Helper: create isolated temp directory per test
function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-artifacts-test-'));
}

afterEach(() => {
  delete process.env.PDE_SESSION_ID;
});

// ─── writeCompleteJson ────────────────────────────────────────────────────────

describe('writeCompleteJson', () => {
  test('writes COMPLETE.json with all required fields', () => {
    const tmpDir = makeTempDir();
    const phaseDir = path.join(tmpDir, 'phases', '143-session-isolation');

    const data = {
      session_id: 'sess-abc123',
      exit_code: 0,
      duration_ms: 42000,
      completed_at: '2026-03-26T12:00:00.000Z',
      phase: 143,
      plan: 3,
    };

    writeCompleteJson(tmpDir, phaseDir, data);

    const outPath = path.join(phaseDir, 'COMPLETE.json');
    expect(fs.existsSync(outPath)).toBe(true);

    const parsed = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    expect(parsed.session_id).toBe('sess-abc123');
    expect(parsed.exit_code).toBe(0);
    expect(parsed.duration_ms).toBe(42000);
    expect(parsed.completed_at).toBe('2026-03-26T12:00:00.000Z');
    expect(parsed.phase).toBe(143);
    expect(parsed.plan).toBe(3);
  });

  test('creates phaseDir if it does not exist', () => {
    const tmpDir = makeTempDir();
    const phaseDir = path.join(tmpDir, 'nonexistent', 'nested', 'dir');

    writeCompleteJson(tmpDir, phaseDir, {
      session_id: 'sess-xyz',
      exit_code: 0,
      duration_ms: 1000,
      completed_at: new Date().toISOString(),
      phase: 143,
      plan: 1,
    });

    expect(fs.existsSync(path.join(phaseDir, 'COMPLETE.json'))).toBe(true);
  });
});

// ─── writeCompletedReqs ───────────────────────────────────────────────────────

describe('writeCompletedReqs', () => {
  test('writes COMPLETED-REQS.md with YAML frontmatter containing requirement IDs', () => {
    const tmpDir = makeTempDir();
    const phaseDir = path.join(tmpDir, 'phases', '143-test');

    writeCompletedReqs(tmpDir, phaseDir, 'sess-abc', ['ISO-01', 'ISO-02'], 143, 3);

    const outPath = path.join(phaseDir, 'COMPLETED-REQS.md');
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, 'utf-8');
    expect(content).toContain('session_id:');
    expect(content).toContain('sess-abc');
    expect(content).toContain('requirements:');
    expect(content).toContain('ISO-01');
    expect(content).toContain('ISO-02');
    expect(content).toContain('phase: 143');
    expect(content).toContain('plan: 3');
  });

  test('appends new requirement IDs to existing COMPLETED-REQS.md', () => {
    const tmpDir = makeTempDir();
    const phaseDir = path.join(tmpDir, 'phases', '143-append-test');

    // First write
    writeCompletedReqs(tmpDir, phaseDir, 'sess-abc', ['ISO-01', 'ISO-02'], 143, 3);
    // Second write — should append ISO-03
    writeCompletedReqs(tmpDir, phaseDir, 'sess-abc', ['ISO-03'], 143, 4);

    const outPath = path.join(phaseDir, 'COMPLETED-REQS.md');
    const content = fs.readFileSync(outPath, 'utf-8');

    expect(content).toContain('ISO-01');
    expect(content).toContain('ISO-02');
    expect(content).toContain('ISO-03');
  });
});

// ─── writeSessionMemory ───────────────────────────────────────────────────────

describe('writeSessionMemory', () => {
  test('writes to .planning/agent-memory/{role}/memories-{sessionId}.md', () => {
    const tmpDir = makeTempDir();
    const sessionId = 'sess-mem-test';

    writeSessionMemory(tmpDir, 'executor', sessionId, '# Memory\n\nSome context here.\n');

    const expectedPath = path.join(tmpDir, '.planning', 'agent-memory', 'executor', `memories-${sessionId}.md`);
    expect(fs.existsSync(expectedPath)).toBe(true);
    expect(fs.readFileSync(expectedPath, 'utf-8')).toContain('Some context here.');
  });

  test('appends content on subsequent calls (not overwrite)', () => {
    const tmpDir = makeTempDir();
    const sessionId = 'sess-append';

    writeSessionMemory(tmpDir, 'executor', sessionId, 'First chunk.\n');
    writeSessionMemory(tmpDir, 'executor', sessionId, 'Second chunk.\n');

    const filePath = path.join(tmpDir, '.planning', 'agent-memory', 'executor', `memories-${sessionId}.md`);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('First chunk.');
    expect(content).toContain('Second chunk.');
  });
});

// ─── state write gating ───────────────────────────────────────────────────────

describe('STATE.md write gating', () => {
  test('writeStateMd is a no-op when PDE_SESSION_ID is set', () => {
    const tmpDir = makeTempDir();
    const planningDir = path.join(tmpDir, '.planning');
    fs.mkdirSync(planningDir, { recursive: true });
    const statePath = path.join(planningDir, 'STATE.md');
    const originalContent = '# Original STATE\n\nOriginal content.\n';
    fs.writeFileSync(statePath, originalContent, 'utf-8');

    process.env.PDE_SESSION_ID = 'test-session-gate';
    writeStateMd(statePath, '# Modified STATE\n\nModified content.\n');

    // File should be UNCHANGED
    const afterContent = fs.readFileSync(statePath, 'utf-8');
    expect(afterContent).toBe(originalContent);
  });

  test('writeStateMd writes normally when PDE_SESSION_ID is NOT set', () => {
    const tmpDir = makeTempDir();
    const planningDir = path.join(tmpDir, '.planning');
    fs.mkdirSync(planningDir, { recursive: true });
    const statePath = path.join(planningDir, 'STATE.md');
    fs.writeFileSync(statePath, '# Original STATE\n\nOriginal content.\n', 'utf-8');

    delete process.env.PDE_SESSION_ID;
    writeStateMd(statePath, '# Modified STATE\n\nModified content.\n');

    const afterContent = fs.readFileSync(statePath, 'utf-8');
    expect(afterContent).toContain('Modified content.');
  });
});

// ─── isSessionScoped / getSessionId ──────────────────────────────────────────

describe('isSessionScoped', () => {
  test('returns false when PDE_SESSION_ID is not set', () => {
    delete process.env.PDE_SESSION_ID;
    expect(isSessionScoped()).toBe(false);
  });

  test('returns true when PDE_SESSION_ID is set', () => {
    process.env.PDE_SESSION_ID = 'some-session';
    expect(isSessionScoped()).toBe(true);
  });
});

describe('getSessionId', () => {
  test('returns null when PDE_SESSION_ID is not set', () => {
    delete process.env.PDE_SESSION_ID;
    expect(getSessionId()).toBeNull();
  });

  test('returns session ID string when PDE_SESSION_ID is set', () => {
    process.env.PDE_SESSION_ID = 'my-session-id';
    expect(getSessionId()).toBe('my-session-id');
  });
});
