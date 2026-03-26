'use strict';

// vitest globals: describe, it, expect, vi, beforeEach, afterEach are injected by vitest (globals: true in config)

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

// Helper: async generator that yields messages
async function* yieldMessages(messages) {
  for (const m of messages) yield m;
}

// Lazy require to allow tests to run before orchestrator exists
function getOrchestrator() {
  return require('../../packages/dispatcher/lib/orchestrator.cjs');
}

// ─── Test Fixtures ────────────────────────────────────────────────────────────

/**
 * Create a temp directory with a mock phase structure for checkFileOverlap tests.
 * Returns { root, phaseDir } for cleanup.
 *
 * @param {object[]} phases - Array of { number, planFiles: [{name, filesModified}] }
 */
function createMockPhaseTree(phases) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-orch-test-'));
  const planningPhasesDir = path.join(root, '.planning', 'phases');
  fs.mkdirSync(planningPhasesDir, { recursive: true });

  for (const phase of phases) {
    const phaseDir = path.join(planningPhasesDir, `${String(phase.number).padStart(3, '0')}-phase-${phase.number}`);
    fs.mkdirSync(phaseDir, { recursive: true });

    for (const planFile of (phase.planFiles || [])) {
      const filesBlock = planFile.filesModified && planFile.filesModified.length > 0
        ? `files_modified:\n${planFile.filesModified.map(f => `  - ${f}`).join('\n')}\n`
        : '';
      const content = `---\nphase: ${phase.number}-test\nplan: 01\n${filesBlock}---\n\n# Plan\n`;
      fs.writeFileSync(path.join(phaseDir, planFile.name), content, 'utf8');
    }
  }

  return root;
}

/**
 * Remove temp directory.
 */
function cleanupTempDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('orchestrator.cjs', () => {
  let tempDirs = [];

  afterEach(() => {
    for (const dir of tempDirs) cleanupTempDir(dir);
    tempDirs = [];
  });

  // ─── analyzeDag ─────────────────────────────────────────────────────────────

  it('Test 1 (SDK-02): analyzeDag calls _sdkQuery with ROADMAP.md path and returns parsed JSON', async () => {
    const { analyzeDag } = getOrchestrator();
    const mockResult = JSON.stringify({ parallelizable: [[143, 144]], unsafe: [] });
    const mockQuery = vi.fn().mockResolvedValue(mockResult);

    const root = '/fake/project/root';
    const result = await analyzeDag(root, mockQuery);

    expect(result.parallelizable).toEqual([[143, 144]]);
    expect(result.unsafe).toEqual([]);
    expect(mockQuery).toHaveBeenCalledOnce();

    // Verify the prompt contains the ROADMAP.md path
    const [promptArg, optionsArg] = mockQuery.mock.calls[0];
    expect(promptArg).toContain('ROADMAP.md');
    expect(optionsArg).toHaveProperty('allowedTools');
    expect(optionsArg.allowedTools).toContain('Read');
  });

  it('Test 2 (SDK-02): analyzeDag returns empty structure when SDK returns unparseable text', async () => {
    const { analyzeDag } = getOrchestrator();
    const mockQuery = vi.fn().mockResolvedValue('This is not valid JSON at all');

    const result = await analyzeDag('/fake/root', mockQuery);

    expect(result).toEqual({ parallelizable: [], unsafe: [] });
  });

  it('Test 3 (SDK-02): analyzeDag returns empty structure when SDK throws', async () => {
    const { analyzeDag } = getOrchestrator();
    const mockQuery = vi.fn().mockRejectedValue(new Error('SDK query failed: error_max_turns'));

    const result = await analyzeDag('/fake/root', mockQuery);

    expect(result).toEqual({ parallelizable: [], unsafe: [] });
  });

  // ─── checkFileOverlap ───────────────────────────────────────────────────────

  it('Test 4 (SDK-03): checkFileOverlap with two phases sharing a file returns overlapping entry', () => {
    const { checkFileOverlap } = getOrchestrator();

    const root = createMockPhaseTree([
      {
        number: 143,
        planFiles: [
          {
            name: '143-01-PLAN.md',
            filesModified: ['packages/dispatcher/lib/coordinator.cjs', 'tests/dispatcher/coordinator.test.cjs'],
          },
        ],
      },
      {
        number: 144,
        planFiles: [
          {
            name: '144-01-PLAN.md',
            filesModified: ['packages/dispatcher/lib/coordinator.cjs', 'bin/pde-tools.cjs'],
          },
        ],
      },
    ]);
    tempDirs.push(root);

    const result = checkFileOverlap(root, [143, 144]);

    expect(result.overlapping).toHaveLength(1);
    expect(result.overlapping[0].phases).toEqual([143, 144]);
    expect(result.overlapping[0].files).toContain('packages/dispatcher/lib/coordinator.cjs');
  });

  it('Test 5 (SDK-03): checkFileOverlap with no shared files returns empty overlapping array', () => {
    const { checkFileOverlap } = getOrchestrator();

    const root = createMockPhaseTree([
      {
        number: 143,
        planFiles: [{ name: '143-01-PLAN.md', filesModified: ['packages/dispatcher/lib/lock.cjs'] }],
      },
      {
        number: 144,
        planFiles: [{ name: '144-01-PLAN.md', filesModified: ['bin/pde-tools.cjs'] }],
      },
    ]);
    tempDirs.push(root);

    const result = checkFileOverlap(root, [143, 144]);

    expect(result.overlapping).toEqual([]);
  });

  it('Test 6 (SDK-03): checkFileOverlap handles phases with no PLAN.md gracefully', () => {
    const { checkFileOverlap } = getOrchestrator();

    // Phase 999 has no plan directory at all
    const root = createMockPhaseTree([
      {
        number: 143,
        planFiles: [{ name: '143-01-PLAN.md', filesModified: ['packages/dispatcher/lib/coordinator.cjs'] }],
      },
    ]);
    tempDirs.push(root);

    // Phase 999 doesn't exist — should not throw
    const result = checkFileOverlap(root, [143, 999]);

    expect(result.overlapping).toEqual([]);
  });

  // ─── summarizeFailure ───────────────────────────────────────────────────────

  it('Test 7 (SDK-04): summarizeFailure reads NDJSON from /tmp and passes last 50 lines to SDK', async () => {
    const { summarizeFailure } = getOrchestrator();

    const sessionId = `test-${crypto.randomUUID()}`;
    const ndjsonPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);

    // Write some mock NDJSON lines
    const lines = Array.from({ length: 60 }, (_, i) =>
      JSON.stringify({ type: 'assistant', seq: i, content: `line ${i}` })
    );
    fs.writeFileSync(ndjsonPath, lines.join('\n'), 'utf8');

    const mockQuery = vi.fn().mockResolvedValue('The session failed because of a missing file.');

    try {
      const result = await summarizeFailure(sessionId, mockQuery);

      expect(result).toBe('The session failed because of a missing file.');
      expect(mockQuery).toHaveBeenCalledOnce();

      // Verify prompt contains last lines (not all 60)
      const [promptArg] = mockQuery.mock.calls[0];
      expect(promptArg).toContain('line 59'); // last line
      expect(promptArg).not.toContain('line 0'); // first 10 lines excluded (only last 50)
    } finally {
      fs.unlinkSync(ndjsonPath);
    }
  });

  it('Test 8 (SDK-04): summarizeFailure returns "No session log available." when NDJSON file does not exist', async () => {
    const { summarizeFailure } = getOrchestrator();

    const sessionId = `nonexistent-${crypto.randomUUID()}`;
    const mockQuery = vi.fn();

    const result = await summarizeFailure(sessionId, mockQuery);

    expect(result).toBe('No session log available.');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  // ─── triageConflicts ────────────────────────────────────────────────────────

  it('Test 9 (SDK-05): triageConflicts passes file list and contents to SDK, returns strategy string', async () => {
    const { triageConflicts } = getOrchestrator();

    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-triage-test-'));
    tempDirs.push(root);

    const conflictContent = `line 1\n<<<<<<< HEAD\nour change\n=======\ntheir change\n>>>>>>> branch\nline 3\n`;
    const conflictFile = 'src/app.cjs';
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, conflictFile), conflictContent, 'utf8');

    const mockQuery = vi.fn().mockResolvedValue('For src/app.cjs: accept incoming change. The incoming version adds proper error handling.');

    const result = await triageConflicts([conflictFile], root, mockQuery);

    expect(result).toBe('For src/app.cjs: accept incoming change. The incoming version adds proper error handling.');
    expect(mockQuery).toHaveBeenCalledOnce();

    const [promptArg] = mockQuery.mock.calls[0];
    expect(promptArg).toContain(conflictFile);
    expect(promptArg).toContain('<<<<<<< HEAD');
  });

  it('Test 10 (SDK-05): triageConflicts handles unreadable files gracefully (includes "(could not read)" in prompt)', async () => {
    const { triageConflicts } = getOrchestrator();

    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-triage-test-'));
    tempDirs.push(root);

    // This file does not exist
    const missingFile = 'nonexistent/missing.cjs';
    const mockQuery = vi.fn().mockResolvedValue('Could not triage — file missing.');

    const result = await triageConflicts([missingFile], root, mockQuery);

    expect(mockQuery).toHaveBeenCalledOnce();

    const [promptArg] = mockQuery.mock.calls[0];
    expect(promptArg).toContain('(could not read)');
  });
});
