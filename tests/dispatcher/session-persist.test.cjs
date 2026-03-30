'use strict';

/**
 * session-persist.test.cjs — Unit tests for session JSONL persistence and restore
 *
 * Phase 197: Cross-Host Session Resume
 * Satisfies: SYN-05, SYN-06
 *
 * Uses os.tmpdir() for all file system operations. Mocks os.homedir() where
 * needed for deterministic path assertions.
 */

const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
// vi, describe, it, expect, beforeEach, afterEach are globals (vitest globals: true)

const {
  sanitizeCwdForProjectDir,
  getSessionJsonlPath,
  persistSession,
  restoreSession,
} = require('../../packages/dispatcher/lib/session-persist.cjs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix + '-'));
}

function writeJsonl(filePath, content = 'test content\n') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

// ─── Tests: sanitizeCwdForProjectDir ─────────────────────────────────────────

describe('sanitizeCwdForProjectDir', () => {
  it('replaces slashes and non-alphanumeric chars with dashes', () => {
    expect(sanitizeCwdForProjectDir('/Users/alice/project')).toBe('-Users-alice-project');
  });

  it('replaces spaces with dashes', () => {
    expect(sanitizeCwdForProjectDir('/home/bob/my project')).toBe('-home-bob-my-project');
  });

  it('returns unchanged string for alphanumeric-only input', () => {
    expect(sanitizeCwdForProjectDir('UsersAliceProject')).toBe('UsersAliceProject');
  });

  it('returns sanitized path when length is exactly 200 chars (no truncation)', () => {
    // Build a cwd that sanitizes to exactly 200 chars
    const cwd = '/a'.repeat(100); // 200 chars sanitized: -a repeated 100 times
    const result = sanitizeCwdForProjectDir(cwd);
    expect(result.length).toBe(200);
    expect(result).toBe('-a'.repeat(100));
  });

  it('truncates at 200 chars and appends hash suffix for paths > 200 chars sanitized', () => {
    // 251 char cwd => sanitized also ~251 chars => must truncate + hash
    const longCwd = '/Users/alice/' + 'a'.repeat(250);
    const result = sanitizeCwdForProjectDir(longCwd);
    expect(result.length).toBeGreaterThan(200);
    expect(result.length).toBeLessThanOrEqual(210); // 200 + '-' + 8-char hash
    // Must start with the first 200 sanitized chars
    const sanitizedFull = longCwd.replace(/[^a-zA-Z0-9]/g, '-');
    expect(result.startsWith(sanitizedFull.slice(0, 200))).toBe(true);
    // Hash suffix is present
    expect(result).toMatch(/^.{200}-.+$/);
  });

  it('produces same output for same input (deterministic)', () => {
    const cwd = '/Users/alice/my project/deep/path';
    expect(sanitizeCwdForProjectDir(cwd)).toBe(sanitizeCwdForProjectDir(cwd));
  });

  it('handles long paths consistently — same hash for same input', () => {
    const longCwd = '/home/user/' + 'x'.repeat(250);
    const r1 = sanitizeCwdForProjectDir(longCwd);
    const r2 = sanitizeCwdForProjectDir(longCwd);
    expect(r1).toBe(r2);
  });
});

// ─── Tests: getSessionJsonlPath ───────────────────────────────────────────────

describe('getSessionJsonlPath', () => {
  it('returns correct path under homedir .claude/projects', () => {
    const result = getSessionJsonlPath('/Users/alice/project', 'abc-123');
    const expected = path.join(os.homedir(), '.claude', 'projects', '-Users-alice-project', 'abc-123.jsonl');
    expect(result).toBe(expected);
  });

  it('applies sanitizeCwdForProjectDir to the cwd argument', () => {
    const cwd = '/home/bob/my project';
    const uuid = 'def-456';
    const result = getSessionJsonlPath(cwd, uuid);
    const expectedDir = path.join(os.homedir(), '.claude', 'projects', '-home-bob-my-project');
    expect(result).toBe(path.join(expectedDir, 'def-456.jsonl'));
  });
});

// ─── Tests: persistSession ────────────────────────────────────────────────────

describe('persistSession', () => {
  let homeDir;
  let sharedStoragePath;
  let originalHomedir;

  beforeEach(() => {
    homeDir = makeTempDir('pde-persist-home');
    sharedStoragePath = makeTempDir('pde-persist-storage');
    // Patch os.homedir to point to tmp home
    originalHomedir = os.homedir;
    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try { fs.rmSync(homeDir, { recursive: true, force: true }); } catch (_) {}
    try { fs.rmSync(sharedStoragePath, { recursive: true, force: true }); } catch (_) {}
  });

  it('returns { ok: false, reason: "file_not_found" } when source JSONL does not exist', async () => {
    const result = await persistSession('/fake/worktree', 'uuid-001', sharedStoragePath);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('file_not_found');
  });

  it('copies JSONL to sharedStoragePath/<sanitized-cwd>/<uuid>.jsonl on success', async () => {
    const cwd = '/Users/alice/project';
    const uuid = 'uuid-001';
    // Create source JSONL at home-relative path
    const sourcePath = path.join(homeDir, '.claude', 'projects', sanitizeCwdForProjectDir(cwd), uuid + '.jsonl');
    writeJsonl(sourcePath, '{"type":"result"}\n');

    const result = await persistSession(cwd, uuid, sharedStoragePath);

    expect(result.ok).toBe(true);

    // Verify destination file exists
    const sanitized = sanitizeCwdForProjectDir(cwd);
    const destPath = path.join(sharedStoragePath, sanitized, uuid + '.jsonl');
    expect(fs.existsSync(destPath)).toBe(true);
    expect(fs.readFileSync(destPath, 'utf8')).toBe('{"type":"result"}\n');
  });

  it('creates destination directory recursively', async () => {
    const cwd = '/Users/alice/deeply/nested/project';
    const uuid = 'uuid-002';
    const sourcePath = path.join(homeDir, '.claude', 'projects', sanitizeCwdForProjectDir(cwd), uuid + '.jsonl');
    writeJsonl(sourcePath, 'data\n');

    const result = await persistSession(cwd, uuid, sharedStoragePath);

    expect(result.ok).toBe(true);
    const sanitized = sanitizeCwdForProjectDir(cwd);
    const destDir = path.join(sharedStoragePath, sanitized);
    expect(fs.existsSync(destDir)).toBe(true);
  });

  it('returns { ok: false, reason: "too_large" } when file exceeds maxSizeMb', async () => {
    const cwd = '/Users/alice/project';
    const uuid = 'uuid-003';
    const sourcePath = path.join(homeDir, '.claude', 'projects', sanitizeCwdForProjectDir(cwd), uuid + '.jsonl');
    // Write a file > 0.000001 MB to trigger size limit
    writeJsonl(sourcePath, 'x'.repeat(100));

    // Set maxSizeMb to an extremely small value (0 MB) to trigger limit
    const result = await persistSession(cwd, uuid, sharedStoragePath, { maxSizeMb: 0.00001 });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('too_large');
  });

  it('uses default maxSizeMb of 10 when not provided', async () => {
    const cwd = '/Users/alice/project';
    const uuid = 'uuid-004';
    const sourcePath = path.join(homeDir, '.claude', 'projects', sanitizeCwdForProjectDir(cwd), uuid + '.jsonl');
    // Small file should be well under 10MB
    writeJsonl(sourcePath, '{"type":"result"}\n');

    const result = await persistSession(cwd, uuid, sharedStoragePath);
    expect(result.ok).toBe(true);
  });
});

// ─── Tests: restoreSession ────────────────────────────────────────────────────

describe('restoreSession', () => {
  let homeDir;
  let sharedStoragePath;

  beforeEach(() => {
    homeDir = makeTempDir('pde-restore-home');
    sharedStoragePath = makeTempDir('pde-restore-storage');
    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try { fs.rmSync(homeDir, { recursive: true, force: true }); } catch (_) {}
    try { fs.rmSync(sharedStoragePath, { recursive: true, force: true }); } catch (_) {}
  });

  it('returns { ok: false, reason: "not_in_storage" } when shared storage file missing', async () => {
    const result = await restoreSession('uuid-not-exist', sharedStoragePath, '/Users/alice/project');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not_in_storage');
  });

  it('copies JSONL from sharedStoragePath to host-local ~/.claude/projects/<sanitized-cwd>/<uuid>.jsonl', async () => {
    const resumingCwd = '/Users/bob/project';
    const uuid = 'uuid-005';
    const sanitized = sanitizeCwdForProjectDir(resumingCwd);

    // Create source in shared storage (under its own sanitized dir)
    const storageSrcDir = path.join(sharedStoragePath, sanitized);
    const storageSrcPath = path.join(storageSrcDir, uuid + '.jsonl');
    writeJsonl(storageSrcPath, '{"type":"system"}\n');

    const result = await restoreSession(uuid, sharedStoragePath, resumingCwd, { storageSubDir: sanitized });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(result.restoredTo).toBeDefined();

    // Verify target file exists in host-local location
    const expectedTarget = path.join(homeDir, '.claude', 'projects', sanitized, uuid + '.jsonl');
    expect(fs.existsSync(expectedTarget)).toBe(true);
    expect(fs.readFileSync(expectedTarget, 'utf8')).toBe('{"type":"system"}\n');
    expect(result.restoredTo).toBe(expectedTarget);
  });

  it('returns { ok: true, skipped: true } when target file already exists', async () => {
    const resumingCwd = '/Users/bob/project';
    const uuid = 'uuid-006';
    const sanitized = sanitizeCwdForProjectDir(resumingCwd);

    // Create source in shared storage
    const storageSrcPath = path.join(sharedStoragePath, sanitized, uuid + '.jsonl');
    writeJsonl(storageSrcPath, 'stored content\n');

    // Create target file already at destination (simulates already restored)
    const targetPath = path.join(homeDir, '.claude', 'projects', sanitized, uuid + '.jsonl');
    writeJsonl(targetPath, 'existing content\n');

    const result = await restoreSession(uuid, sharedStoragePath, resumingCwd, { storageSubDir: sanitized });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);

    // Existing content must not be overwritten
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('existing content\n');
  });

  it('creates target directory recursively if it does not exist', async () => {
    const resumingCwd = '/Users/charlie/deep/nested/workspace';
    const uuid = 'uuid-007';
    const sanitized = sanitizeCwdForProjectDir(resumingCwd);

    const storageSrcPath = path.join(sharedStoragePath, sanitized, uuid + '.jsonl');
    writeJsonl(storageSrcPath, 'data\n');

    const result = await restoreSession(uuid, sharedStoragePath, resumingCwd, { storageSubDir: sanitized });

    expect(result.ok).toBe(true);
    const targetDir = path.join(homeDir, '.claude', 'projects', sanitized);
    expect(fs.existsSync(targetDir)).toBe(true);
  });
});
