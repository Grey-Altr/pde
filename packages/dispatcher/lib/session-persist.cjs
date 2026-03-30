'use strict';

/**
 * session-persist.cjs — Session JSONL persistence and restore for cross-host resume
 *
 * Phase 197: Cross-Host Session Resume
 * Satisfies: SYN-05, SYN-06
 *
 * Provides functions to persist a Claude session's JSONL file to shared storage
 * and to restore it on a different host before resuming with the SDK's `resume` option.
 *
 * Module pattern: CommonJS, zero external dependencies, mirrors sync.cjs style.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

// Maximum sanitized cwd length before hash truncation (matches SDK vJ() formula)
const MAX_SANITIZED_LEN = 200;

/**
 * Sanitize a cwd path into the directory name used by Claude Code's projects store.
 *
 * Matches the SDK's vJ() formula:
 *   1. Replace all non-alphanumeric characters with '-'
 *   2. If length > 200: truncate to 200 chars + '-' + 8-char SHA256-base64url suffix
 *
 * Note: The SDK internally uses Math.abs(ZK(cwd)).toString(36) for the hash (base-36),
 * but since the sdk.mjs source is not available in this environment, we use a SHA256
 * base64url slice as a stable, deterministic alternative. This means cross-host paths
 * for >200-char cwds will only match if both hosts use this same implementation.
 * For <200-char paths (the common case) there is no divergence.
 *
 * @param {string} cwd - Absolute path to sanitize
 * @returns {string} Sanitized directory name
 */
function sanitizeCwdForProjectDir(cwd) {
  const s = cwd.replace(/[^a-zA-Z0-9]/g, '-');
  if (s.length <= MAX_SANITIZED_LEN) return s;
  const hash = crypto.createHash('sha256').update(cwd).digest('base64url').slice(0, 8);
  return s.slice(0, MAX_SANITIZED_LEN) + '-' + hash;
}

/**
 * Compute the host-local path to a Claude session JSONL file.
 *
 * @param {string} cwd - The worktree/cwd path that was used when the session ran
 * @param {string} sessionUuid - The Claude session UUID (from SDKResultSuccess.session_id)
 * @returns {string} Absolute path to the JSONL file
 */
function getSessionJsonlPath(cwd, sessionUuid) {
  return path.join(
    os.homedir(),
    '.claude',
    'projects',
    sanitizeCwdForProjectDir(cwd),
    sessionUuid + '.jsonl'
  );
}

/**
 * Persist a session JSONL file to shared storage.
 *
 * Locates the source JSONL using getSessionJsonlPath(worktreePath, claudeSessionId),
 * checks existence and size constraints, then copies to:
 *   sharedStoragePath/<sanitized-cwd>/<uuid>.jsonl
 *
 * @param {string} worktreePath - cwd used when the session ran (worktree path)
 * @param {string} claudeSessionId - Claude session UUID
 * @param {string} sharedStoragePath - Absolute path to shared storage root directory
 * @param {object} [opts] - Options
 * @param {number} [opts.maxSizeMb=10] - Maximum JSONL file size in MB before skip
 * @returns {Promise<{ ok: boolean, reason?: string, savedTo?: string }>}
 */
async function persistSession(worktreePath, claudeSessionId, sharedStoragePath, opts) {
  const maxSizeMb = (opts && opts.maxSizeMb != null) ? opts.maxSizeMb : 10;
  const sourcePath = getSessionJsonlPath(worktreePath, claudeSessionId);

  // Check source file exists
  if (!fs.existsSync(sourcePath)) {
    return { ok: false, reason: 'file_not_found' };
  }

  // Check size constraint
  const stat = fs.statSync(sourcePath);
  const sizeMb = stat.size / (1024 * 1024);
  if (sizeMb > maxSizeMb) {
    return { ok: false, reason: 'too_large' };
  }

  // Compute destination path and create directory
  const sanitized = sanitizeCwdForProjectDir(worktreePath);
  const destDir = path.join(sharedStoragePath, sanitized);
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, claudeSessionId + '.jsonl');

  fs.copyFileSync(sourcePath, destPath);

  return { ok: true, savedTo: destPath };
}

/**
 * Restore a session JSONL from shared storage to the host-local Claude projects directory.
 *
 * Looks for the JSONL at:
 *   sharedStoragePath/<storageSubDir>/<uuid>.jsonl  (if storageSubDir provided)
 *   sharedStoragePath/<sanitized-resumingCwd>/<uuid>.jsonl  (default)
 *
 * Places the file at:
 *   ~/.claude/projects/<sanitized-resumingCwd>/<uuid>.jsonl
 *
 * If the target file already exists, returns { ok: true, skipped: true } without
 * overwriting (idempotent — safe to call on every resume attempt).
 *
 * @param {string} claudeSessionId - Claude session UUID to restore
 * @param {string} sharedStoragePath - Absolute path to shared storage root directory
 * @param {string} resumingCwd - cwd path on the resuming host (used to compute target dir)
 * @param {object} [opts] - Options
 * @param {string} [opts.storageSubDir] - Subdirectory in sharedStoragePath where file lives
 *   (defaults to sanitizeCwdForProjectDir(resumingCwd))
 * @returns {Promise<{ ok: boolean, skipped?: boolean, restoredTo?: string, reason?: string }>}
 */
async function restoreSession(claudeSessionId, sharedStoragePath, resumingCwd, opts) {
  const sanitized = sanitizeCwdForProjectDir(resumingCwd);
  const subDir = (opts && opts.storageSubDir) ? opts.storageSubDir : sanitized;

  // Compute source path in shared storage
  const sourcePath = path.join(sharedStoragePath, subDir, claudeSessionId + '.jsonl');
  if (!fs.existsSync(sourcePath)) {
    return { ok: false, reason: 'not_in_storage' };
  }

  // Compute host-local target path
  const targetPath = getSessionJsonlPath(resumingCwd, claudeSessionId);

  // Skip if target already exists (idempotent)
  if (fs.existsSync(targetPath)) {
    return { ok: true, skipped: true };
  }

  // Create target directory and copy file
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);

  return { ok: true, restoredTo: targetPath };
}

module.exports = {
  sanitizeCwdForProjectDir,
  getSessionJsonlPath,
  persistSession,
  restoreSession,
};
