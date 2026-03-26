'use strict';

/**
 * session-artifacts.cjs — Session-scoped artifact writing functions
 *
 * When PDE_SESSION_ID is present, executor agents write to session-scoped
 * artifacts instead of mutating shared STATE.md or REQUIREMENTS.md.
 * This is the single-writer correctness protocol for v0.18 parallel execution.
 *
 * Provides:
 *   writeCompleteJson(cwd, phaseDir, data)          — writes COMPLETE.json
 *   writeCompletedReqs(cwd, phaseDir, sessionId, reqIds, phase, plan) — writes COMPLETED-REQS.md
 *   writeSessionMemory(cwd, role, sessionId, content) — writes session-scoped agent memory
 *   isSessionScoped()                               — returns true when PDE_SESSION_ID is set
 *   getSessionId()                                  — returns PDE_SESSION_ID or null
 */

const fs = require('fs');
const path = require('path');

/**
 * Write COMPLETE.json to phaseDir with structured completion metadata.
 * Creates phaseDir if it does not exist.
 *
 * @param {string} cwd - Project root (reserved for future use)
 * @param {string} phaseDir - Absolute path to phase directory
 * @param {object} data - Must contain: { session_id, exit_code, duration_ms, completed_at, phase, plan }
 */
function writeCompleteJson(cwd, phaseDir, data) {
  fs.mkdirSync(phaseDir, { recursive: true });
  const outPath = path.join(phaseDir, 'COMPLETE.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Write COMPLETED-REQS.md to phaseDir with YAML frontmatter listing satisfied requirements.
 * If file already exists, appends new requirement IDs to the existing frontmatter.
 *
 * @param {string} cwd - Project root
 * @param {string} phaseDir - Absolute path to phase directory
 * @param {string} sessionId - Session identifier
 * @param {string[]} reqIds - Requirement IDs satisfied (e.g. ['ISO-06', 'ISO-07'])
 * @param {number|null} phase - Phase number
 * @param {number|null} plan - Plan number
 */
function writeCompletedReqs(cwd, phaseDir, sessionId, reqIds, phase, plan) {
  fs.mkdirSync(phaseDir, { recursive: true });
  const outPath = path.join(phaseDir, 'COMPLETED-REQS.md');
  const completedAt = new Date().toISOString();

  if (fs.existsSync(outPath)) {
    const existing = fs.readFileSync(outPath, 'utf-8');
    const fmMatch = existing.match(/^---\n([\s\S]*?)\n---\n/);
    if (fmMatch) {
      const fmBody = fmMatch[1];
      const existingReqIds = [];
      const reqSectionMatch = fmBody.match(/requirements:\n([\s\S]*?)(?=\n\w|$)/);
      if (reqSectionMatch) {
        const reqLinePattern = /^\s+-\s+(.+)$/gm;
        let m;
        while ((m = reqLinePattern.exec(reqSectionMatch[1])) !== null) {
          existingReqIds.push(m[1].trim());
        }
      }
      const allReqIds = [...existingReqIds];
      for (const id of reqIds) {
        if (!allReqIds.includes(id)) {
          allReqIds.push(id);
        }
      }
      fs.writeFileSync(outPath, _buildCompletedReqsContent(sessionId, phase, plan, completedAt, allReqIds), 'utf-8');
    } else {
      fs.writeFileSync(outPath, _buildCompletedReqsContent(sessionId, phase, plan, completedAt, reqIds), 'utf-8');
    }
  } else {
    fs.writeFileSync(outPath, _buildCompletedReqsContent(sessionId, phase, plan, completedAt, reqIds), 'utf-8');
  }
}

function _buildCompletedReqsContent(sessionId, phase, plan, completedAt, reqIds) {
  const reqLines = reqIds.map(id => '  - ' + id).join('\n');
  const phaseStr = phase != null ? String(phase) : 'unknown';
  const planStr = plan != null ? String(plan) : 'unknown';
  const frontmatter = [
    '---',
    'session_id: ' + sessionId,
    'phase: ' + phaseStr,
    'plan: ' + planStr,
    'completed_at: "' + completedAt + '"',
    'requirements:',
    reqLines,
    '---',
  ].join('\n');
  return frontmatter + '\n# Completed Requirements\n\nRequirements satisfied by session ' + sessionId + ' executing Phase ' + phaseStr + ', Plan ' + planStr + '.\n';
}

/**
 * Write session-scoped agent memory to .planning/agent-memory/{role}/memories-{sessionId}.md.
 * Creates directory if needed. Appends if file already exists.
 *
 * @param {string} cwd - Project root
 * @param {string} role - Agent role (e.g. 'executor')
 * @param {string} sessionId - Session identifier
 * @param {string} content - Content to write/append
 */
function writeSessionMemory(cwd, role, sessionId, content) {
  const memDir = path.join(cwd, '.planning', 'agent-memory', role);
  fs.mkdirSync(memDir, { recursive: true });
  const filePath = path.join(memDir, 'memories-' + sessionId + '.md');
  fs.appendFileSync(filePath, content, 'utf-8');
}

/**
 * Returns true when PDE_SESSION_ID env var is present (session-scoped execution).
 *
 * @returns {boolean}
 */
function isSessionScoped() {
  return !!process.env.PDE_SESSION_ID;
}

/**
 * Returns the current session ID from PDE_SESSION_ID, or null if not set.
 *
 * @returns {string|null}
 */
function getSessionId() {
  return process.env.PDE_SESSION_ID || null;
}

module.exports = {
  writeCompleteJson,
  writeCompletedReqs,
  writeSessionMemory,
  isSessionScoped,
  getSessionId,
};
