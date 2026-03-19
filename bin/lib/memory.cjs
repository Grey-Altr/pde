'use strict';

/**
 * memory.cjs — Agent memory CRUD and archival library
 *
 * Provides core memory operations for all agent spawn points.
 * Memories are stored in markdown files under .planning/agent-memory/{agentType}/.
 * Entries are ### heading-delimited and capped at MAX_ENTRIES with automatic archival.
 *
 * Supports AGNT-04, AGNT-05.
 */

const fs = require('fs');
const path = require('path');

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMORY_DIR = '.planning/agent-memory';
const MAX_ENTRIES = 50;
const ENTRY_HEADING_RE = /^### .+$/gm;

// ─── ensureMemoryDir ─────────────────────────────────────────────────────────

/**
 * Ensure the memory directory exists for the given agent type.
 *
 * Creates .planning/agent-memory/{agentType}/ relative to cwd.
 * Idempotent — safe to call when directory already exists.
 *
 * @param {string} cwd - project root (absolute path)
 * @param {string} agentType - agent type slug (e.g. 'executor', 'planner')
 * @returns {string} absolute path to the created/existing directory
 */
function ensureMemoryDir(cwd, agentType) {
  const dir = path.join(cwd, MEMORY_DIR, agentType);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── splitEntries ─────────────────────────────────────────────────────────────

/**
 * Split a memories.md content string into individual entry strings.
 *
 * Each entry begins with a "### " heading. Empty parts are filtered out.
 *
 * @param {string} content - raw file content
 * @returns {string[]} array of entry strings (each starts with "### ")
 */
function splitEntries(content) {
  return content.split(/(?=^### )/gm).filter(p => p.trim() && p.trimStart().startsWith('### '));
}

// ─── readMemories ─────────────────────────────────────────────────────────────

/**
 * Read memories.md for the given agent type and return structured result.
 *
 * @param {string} cwd - project root (absolute path)
 * @param {string} agentType - agent type slug
 * @returns {{ entries: string[], path: string, exists: boolean }}
 */
function readMemories(cwd, agentType) {
  const dir = ensureMemoryDir(cwd, agentType);
  const memPath = path.join(dir, 'memories.md');

  if (!fs.existsSync(memPath)) {
    return { entries: [], path: memPath, exists: false };
  }

  const content = fs.readFileSync(memPath, 'utf-8');
  const entries = splitEntries(content).filter(p => p.trimStart().startsWith('### '));

  return { entries, path: memPath, exists: true };
}

// ─── appendMemory ────────────────────────────────────────────────────────────

/**
 * Append a new memory entry to memories.md, enforcing the 50-entry cap.
 *
 * When entries.length >= MAX_ENTRIES, the oldest entries are archived:
 *   spliceCount = entries.length - MAX_ENTRIES + 1
 * Archived entries are written to archive-YYYYMMDD.md (appended if already exists).
 *
 * Header format for memories.md:
 *   # {agentType} Agent Memory
 *
 *   > Loaded at agent spawn. Append-only. Max 50 entries.
 *   > Oldest entries archived automatically.
 *
 * Archive file header: # {agentType} Memory Archive — {YYYYMMDD}
 *
 * @param {string} cwd - project root (absolute path)
 * @param {string} agentType - agent type slug
 * @param {string} entry - markdown entry string (should start with "### ")
 * @returns {{ appended: boolean, archived: number }}
 */
function appendMemory(cwd, agentType, entry) {
  const dir = ensureMemoryDir(cwd, agentType);
  const memPath = path.join(dir, 'memories.md');

  // Read existing entries (filter to only ### heading entries, skip preamble)
  let entries = [];
  if (fs.existsSync(memPath)) {
    const content = fs.readFileSync(memPath, 'utf-8');
    entries = splitEntries(content).filter(p => p.trimStart().startsWith('### '));
  }

  let archived = 0;

  // Enforce cap: if at or over limit, archive oldest entries
  if (entries.length >= MAX_ENTRIES) {
    const spliceCount = entries.length - MAX_ENTRIES + 1;
    const toArchive = entries.splice(0, spliceCount);
    archived = spliceCount;

    // Build date string YYYYMMDD
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    const archivePath = path.join(dir, `archive-${dateStr}.md`);
    const archiveHeader = `# ${agentType} Memory Archive \u2014 ${dateStr}\n\n`;

    if (fs.existsSync(archivePath)) {
      // Append to existing archive (same day)
      fs.appendFileSync(archivePath, toArchive.join(''), 'utf-8');
    } else {
      // Create new archive with header
      fs.writeFileSync(archivePath, archiveHeader + toArchive.join(''), 'utf-8');
    }
  }

  // Build header for memories.md
  const header = `# ${agentType} Agent Memory\n\n> Loaded at agent spawn. Append-only. Max 50 entries.\n> Oldest entries archived automatically.\n\n`;

  // Write updated memories.md: header + remaining entries + new entry
  const newContent = header + entries.join('') + entry;
  fs.writeFileSync(memPath, newContent, 'utf-8');

  return { appended: true, archived };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  ensureMemoryDir,
  readMemories,
  appendMemory,
  splitEntries,
  MEMORY_DIR,
  MAX_ENTRIES,
};
