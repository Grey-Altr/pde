'use strict';

/**
 * tmux-cycle-session.test.cjs — Unit tests for session cycling logic
 *
 * Phase 148: tmux integration
 * Satisfies: TMX-04, TMX-05
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// We require the module under test (vitest globals: describe, it, expect, beforeEach, afterEach are provided globally)
const { cycleSession } = require('../../bin/lib/tmux-cycle-session.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Write a dispatcher.pids JSON file with the given sessions map.
 *
 * @param {string} pidsFile - Absolute path to write
 * @param {Record<string, {status: string, [key: string]: unknown}>} sessions
 */
function writePids(pidsFile, sessions) {
  fs.writeFileSync(pidsFile, JSON.stringify({ sessions }, null, 2), 'utf8');
}

/**
 * Write the current filter value to the filter file.
 *
 * @param {string} filterFile - Absolute path to write
 * @param {string} value
 */
function writeFilter(filterFile, value) {
  fs.writeFileSync(filterFile, value, 'utf8');
}

/**
 * Read the filter file and return its trimmed string value.
 *
 * @param {string} filterFile
 * @returns {string}
 */
function readFilter(filterFile) {
  return fs.readFileSync(filterFile, 'utf8').trim();
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('cycleSession', () => {
  let tmpDir;
  let pidsFile;
  let filterFile;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    pidsFile = path.join(tmpDir, 'dispatcher.pids');
    filterFile = path.join(tmpDir, 'pde-tmux-filter.txt');
  });

  afterEach(() => {
    // Clean up temp files
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  });

  it('Test 1: filter "all" + 2 running sessions → advances to first session (sorted)', () => {
    writePids(pidsFile, {
      's2-session': { status: 'running' },
      's1-session': { status: 'running' },
    });
    writeFilter(filterFile, 'all');

    const result = cycleSession(pidsFile, filterFile);

    expect(result).toBe('s1-session');
    expect(readFilter(filterFile)).toBe('s1-session');
  });

  it('Test 2: filter is s1 + sessions [s1, s2] → advances to s2', () => {
    writePids(pidsFile, {
      's1-session': { status: 'running' },
      's2-session': { status: 'running' },
    });
    writeFilter(filterFile, 's1-session');

    const result = cycleSession(pidsFile, filterFile);

    expect(result).toBe('s2-session');
    expect(readFilter(filterFile)).toBe('s2-session');
  });

  it('Test 3: filter is s2 (last session) + sessions [s1, s2] → wraps to "all"', () => {
    writePids(pidsFile, {
      's1-session': { status: 'running' },
      's2-session': { status: 'running' },
    });
    writeFilter(filterFile, 's2-session');

    const result = cycleSession(pidsFile, filterFile);

    expect(result).toBe('all');
    expect(readFilter(filterFile)).toBe('all');
  });

  it('Test 4: filter "all" + no running sessions → stays "all"', () => {
    writePids(pidsFile, {
      's1-session': { status: 'failed' },
      's2-session': { status: 'complete' },
    });
    writeFilter(filterFile, 'all');

    const result = cycleSession(pidsFile, filterFile);

    expect(result).toBe('all');
    expect(readFilter(filterFile)).toBe('all');
  });

  it('Test 5: filter is a sessionId not in running sessions → resets to "all"', () => {
    writePids(pidsFile, {
      's1-session': { status: 'running' },
      's2-session': { status: 'running' },
    });
    writeFilter(filterFile, 'p999-gone-session');

    const result = cycleSession(pidsFile, filterFile);

    expect(result).toBe('all');
    expect(readFilter(filterFile)).toBe('all');
  });

  it('Test 6: only "running" sessions are included (failed/completed filtered out)', () => {
    writePids(pidsFile, {
      's1-running': { status: 'running' },
      's2-failed': { status: 'failed' },
      's3-complete': { status: 'complete' },
      's4-orphaned': { status: 'orphaned' },
    });
    writeFilter(filterFile, 'all');

    const result = cycleSession(pidsFile, filterFile);

    // Only s1-running is a candidate
    expect(result).toBe('s1-running');
    expect(readFilter(filterFile)).toBe('s1-running');
  });

  it('Test 7: filter file does not exist → defaults to "all" then cycles to first running session', () => {
    writePids(pidsFile, {
      's1-session': { status: 'running' },
      's2-session': { status: 'running' },
    });
    // Do NOT write filterFile — it should not exist

    const result = cycleSession(pidsFile, filterFile);

    expect(result).toBe('s1-session');
    expect(readFilter(filterFile)).toBe('s1-session');
  });
});
