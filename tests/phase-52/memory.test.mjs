/**
 * memory.test.mjs
 * Tests: agent memory CRUD and archival in bin/lib/memory.cjs
 *
 * Covers AGNT-04 and AGNT-05:
 *   - ensureMemoryDir() creates nested directory structure
 *   - readMemories() returns structured results with entries/path/exists
 *   - splitEntries() parses ### heading-delimited entries
 *   - appendMemory() creates memories.md with header when missing
 *   - appendMemory() appends to existing file
 *   - appendMemory() enforces 50-entry cap with archival
 *   - Archive file created with date-based name and header
 *   - Archive appends to existing same-day archive
 *   - MAX_ENTRIES equals 50
 *   - MEMORY_DIR equals '.planning/agent-memory'
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {
  ensureMemoryDir,
  readMemories,
  appendMemory,
  splitEntries,
  MEMORY_DIR,
  MAX_ENTRIES,
} = require('../../bin/lib/memory.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'memory-test-'));
}

function buildEntry(i) {
  return `### Memory Entry ${i}\n\nContent for entry ${i}.\n\n`;
}

function buildMemoriesFileWithN(agentType, n) {
  const header = `# ${agentType} Agent Memory\n\n> Loaded at agent spawn. Append-only. Max 50 entries.\n> Oldest entries archived automatically.\n\n`;
  const entries = Array.from({ length: n }, (_, i) => buildEntry(i + 1)).join('');
  return header + entries;
}

// ─── Constants ────────────────────────────────────────────────────────────────

describe('Constants', () => {
  it('MAX_ENTRIES equals 50', () => {
    assert.strictEqual(MAX_ENTRIES, 50);
  });

  it('MEMORY_DIR equals \'.planning/agent-memory\'', () => {
    assert.strictEqual(MEMORY_DIR, '.planning/agent-memory');
  });
});

// ─── ensureMemoryDir ──────────────────────────────────────────────────────────

describe('ensureMemoryDir', () => {
  let tmpDir;
  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('creates nested .planning/agent-memory/{agentType}/ directory', () => {
    tmpDir = makeTmpDir();
    const result = ensureMemoryDir(tmpDir, 'executor');
    const expected = path.join(tmpDir, '.planning', 'agent-memory', 'executor');
    assert.ok(fs.existsSync(expected), 'directory should exist');
    assert.strictEqual(result, expected);
  });

  it('is idempotent — does not throw when directory already exists', () => {
    tmpDir = makeTmpDir();
    ensureMemoryDir(tmpDir, 'planner');
    assert.doesNotThrow(() => ensureMemoryDir(tmpDir, 'planner'));
  });
});

// ─── splitEntries ─────────────────────────────────────────────────────────────

describe('splitEntries', () => {
  it('splits on ### headings and returns array of entry strings', () => {
    const content = '### Entry 1\n\nContent 1.\n\n### Entry 2\n\nContent 2.\n\n### Entry 3\n\nContent 3.\n\n';
    const entries = splitEntries(content);
    assert.strictEqual(entries.length, 3);
    assert.ok(entries[0].startsWith('### Entry 1'), 'first entry should start with ### Entry 1');
    assert.ok(entries[1].startsWith('### Entry 2'), 'second entry should start with ### Entry 2');
    assert.ok(entries[2].startsWith('### Entry 3'), 'third entry should start with ### Entry 3');
  });

  it('filters out empty parts from the split result', () => {
    const content = '\n\n### Entry 1\n\nContent.\n\n';
    const entries = splitEntries(content);
    assert.strictEqual(entries.length, 1);
  });

  it('returns empty array for empty string', () => {
    assert.deepStrictEqual(splitEntries(''), []);
  });

  it('returns empty array for content with no ### headings', () => {
    const content = '# Header\n\nSome preamble text.\n\n';
    const entries = splitEntries(content);
    assert.strictEqual(entries.length, 0);
  });
});

// ─── readMemories ─────────────────────────────────────────────────────────────

describe('readMemories', () => {
  let tmpDir;
  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('returns { entries: [], exists: false } when memories.md does not exist', () => {
    tmpDir = makeTmpDir();
    ensureMemoryDir(tmpDir, 'executor');
    const result = readMemories(tmpDir, 'executor');
    assert.deepStrictEqual(result.entries, []);
    assert.strictEqual(result.exists, false);
    assert.ok(typeof result.path === 'string', 'path should be a string');
  });

  it('returns parsed entries when memories.md has 3 sample entries', () => {
    tmpDir = makeTmpDir();
    ensureMemoryDir(tmpDir, 'planner');
    const memDir = path.join(tmpDir, '.planning', 'agent-memory', 'planner');
    const content = buildMemoriesFileWithN('planner', 3);
    fs.writeFileSync(path.join(memDir, 'memories.md'), content, 'utf-8');

    const result = readMemories(tmpDir, 'planner');
    assert.strictEqual(result.exists, true);
    assert.strictEqual(result.entries.length, 3);
  });

  it('returns correct path to memories.md', () => {
    tmpDir = makeTmpDir();
    ensureMemoryDir(tmpDir, 'executor');
    const result = readMemories(tmpDir, 'executor');
    assert.ok(result.path.endsWith('memories.md'), 'path should end with memories.md');
  });
});

// ─── appendMemory ─────────────────────────────────────────────────────────────

describe('appendMemory', () => {
  let tmpDir;
  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('creates memories.md with header when file does not exist', () => {
    tmpDir = makeTmpDir();
    const entry = '### First Memory\n\nSome content.\n\n';
    appendMemory(tmpDir, 'executor', entry);

    const memPath = path.join(tmpDir, '.planning', 'agent-memory', 'executor', 'memories.md');
    assert.ok(fs.existsSync(memPath), 'memories.md should be created');
    const content = fs.readFileSync(memPath, 'utf-8');
    assert.ok(content.includes('# executor Agent Memory'), 'should have agent-type header');
    assert.ok(content.includes('### First Memory'), 'should contain the entry');
  });

  it('appends entry to existing file', () => {
    tmpDir = makeTmpDir();
    appendMemory(tmpDir, 'executor', '### Entry 1\n\nFirst.\n\n');
    appendMemory(tmpDir, 'executor', '### Entry 2\n\nSecond.\n\n');

    const memPath = path.join(tmpDir, '.planning', 'agent-memory', 'executor', 'memories.md');
    const content = fs.readFileSync(memPath, 'utf-8');
    assert.ok(content.includes('### Entry 1'), 'should contain entry 1');
    assert.ok(content.includes('### Entry 2'), 'should contain entry 2');
  });

  it('returns { appended: true, archived: 0 } when under cap', () => {
    tmpDir = makeTmpDir();
    const result = appendMemory(tmpDir, 'executor', '### Memory\n\nContent.\n\n');
    assert.strictEqual(result.appended, true);
    assert.strictEqual(result.archived, 0);
  });

  it('archives oldest entry when at exactly 50-entry cap', () => {
    tmpDir = makeTmpDir();
    // Create memories.md with exactly 50 entries
    ensureMemoryDir(tmpDir, 'executor');
    const memDir = path.join(tmpDir, '.planning', 'agent-memory', 'executor');
    fs.writeFileSync(path.join(memDir, 'memories.md'), buildMemoriesFileWithN('executor', 50), 'utf-8');

    const result = appendMemory(tmpDir, 'executor', '### New Entry\n\nNew content.\n\n');

    // Should archive 1 entry (50 - 50 + 1 = 1) and keep total at 50
    assert.strictEqual(result.appended, true);
    assert.strictEqual(result.archived, 1);

    const memContent = fs.readFileSync(path.join(memDir, 'memories.md'), 'utf-8');
    const entries = splitEntries(memContent.replace(/^#[^\n]+\n[\s\S]*?(?=###)/, ''));
    assert.strictEqual(entries.length, 50, 'total entries should remain at 50');
    assert.ok(memContent.includes('### New Entry'), 'new entry should be present');
    assert.ok(!memContent.includes('### Memory Entry 1\n'), 'oldest entry 1 should be archived');
  });

  it('archives correct count when over cap (52 entries + append 1 = archive 3)', () => {
    tmpDir = makeTmpDir();
    ensureMemoryDir(tmpDir, 'executor');
    const memDir = path.join(tmpDir, '.planning', 'agent-memory', 'executor');
    fs.writeFileSync(path.join(memDir, 'memories.md'), buildMemoriesFileWithN('executor', 52), 'utf-8');

    const result = appendMemory(tmpDir, 'executor', '### New Entry\n\nNew content.\n\n');

    // entries.length (52) >= MAX_ENTRIES (50): splice count = 52 - 50 + 1 = 3
    assert.strictEqual(result.archived, 3);
  });

  it('archive file is created with date-based name (archive-YYYYMMDD.md)', () => {
    tmpDir = makeTmpDir();
    ensureMemoryDir(tmpDir, 'executor');
    const memDir = path.join(tmpDir, '.planning', 'agent-memory', 'executor');
    fs.writeFileSync(path.join(memDir, 'memories.md'), buildMemoriesFileWithN('executor', 50), 'utf-8');

    appendMemory(tmpDir, 'executor', '### New\n\nContent.\n\n');

    const files = fs.readdirSync(memDir);
    const archiveFile = files.find(f => /^archive-\d{8}\.md$/.test(f));
    assert.ok(archiveFile, 'archive file with date-based name should exist');
  });

  it('archive file contains correct header and archived entries', () => {
    tmpDir = makeTmpDir();
    ensureMemoryDir(tmpDir, 'executor');
    const memDir = path.join(tmpDir, '.planning', 'agent-memory', 'executor');
    fs.writeFileSync(path.join(memDir, 'memories.md'), buildMemoriesFileWithN('executor', 50), 'utf-8');

    appendMemory(tmpDir, 'executor', '### New\n\nContent.\n\n');

    const files = fs.readdirSync(memDir);
    const archiveFile = files.find(f => /^archive-\d{8}\.md$/.test(f));
    const archiveContent = fs.readFileSync(path.join(memDir, archiveFile), 'utf-8');

    // Archive header: # {agentType} Memory Archive — {YYYYMMDD}
    assert.ok(archiveContent.includes('# executor Memory Archive'), 'archive should have correct header');
    // Archived entry should be oldest (entry 1)
    assert.ok(archiveContent.includes('### Memory Entry 1'), 'archive should contain oldest entry');
  });

  it('archive appends to existing archive file on same day', () => {
    tmpDir = makeTmpDir();
    ensureMemoryDir(tmpDir, 'executor');
    const memDir = path.join(tmpDir, '.planning', 'agent-memory', 'executor');

    // First archive: 50 entries + append 1 = archives 1
    fs.writeFileSync(path.join(memDir, 'memories.md'), buildMemoriesFileWithN('executor', 50), 'utf-8');
    appendMemory(tmpDir, 'executor', '### New Entry A\n\nContent A.\n\n');

    // Second archive: at 50 again, append 1 more = archives 1 more
    const memContent = fs.readFileSync(path.join(memDir, 'memories.md'), 'utf-8');
    const currentEntries = splitEntries(memContent.replace(/^[\s\S]*?(?=###)/, ''));
    // Pad back to 50 by writing new file
    fs.writeFileSync(path.join(memDir, 'memories.md'), buildMemoriesFileWithN('executor', 50), 'utf-8');
    appendMemory(tmpDir, 'executor', '### New Entry B\n\nContent B.\n\n');

    const files = fs.readdirSync(memDir);
    const archiveFiles = files.filter(f => /^archive-\d{8}\.md$/.test(f));
    assert.strictEqual(archiveFiles.length, 1, 'only one archive file should exist for the same day');

    const archiveContent = fs.readFileSync(path.join(memDir, archiveFiles[0]), 'utf-8');
    // Should contain entries from both archival operations
    const archiveEntries = splitEntries(archiveContent.replace(/^[\s\S]*?(?=###)/, ''));
    assert.ok(archiveEntries.length >= 2, 'archive should have entries from both archival operations');
  });
});
