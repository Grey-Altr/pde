'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { sdkQuery } = require('./sdk-bridge.cjs');

// ─── analyzeDag ───────────────────────────────────────────────────────────────

/**
 * Analyze ROADMAP.md to identify which phases are safe to run in parallel.
 * Uses Agent SDK with Read tool — one-time analysis at dispatch time.
 *
 * @param {string} projectRoot
 * @param {function} [_sdkQuery] - Injectable for tests (defaults to real sdkQuery)
 * @returns {Promise<{ parallelizable: number[][], unsafe: Array<{phases: number[], reason: string}> }>}
 */
async function analyzeDag(projectRoot, _sdkQuery) {
  const q = _sdkQuery || sdkQuery;
  const roadmapPath = path.join(projectRoot, '.planning', 'ROADMAP.md');

  try {
    const result = await q(
      `Read ${roadmapPath} and analyze the dependency graph of the phases listed.
Return a JSON object with two fields:
- "parallelizable": array of arrays, each inner array is a set of phase numbers that can run concurrently
- "unsafe": array of objects with "phases" (array of phase numbers) and "reason" (string) explaining why they cannot run in parallel

Phases can run in parallel when they have no dependency relationship between them (neither direct nor transitive).
A phase with "Depends on: Phase X" cannot run concurrently with Phase X or any of its prerequisites.
Return only the JSON, no other text.`,
      {
        allowedTools: ['Read'],
        permissionMode: 'dontAsk',
        maxTurns: 5,
        cwd: projectRoot,
      }
    );

    return JSON.parse(result);
  } catch (_) {
    return { parallelizable: [], unsafe: [] };
  }
}

// ─── checkFileOverlap ─────────────────────────────────────────────────────────

/**
 * Check file overlap between phase PLAN.md files.
 * Parses files_modified from YAML frontmatter — no SDK needed (pure static analysis).
 *
 * @param {string} projectRoot
 * @param {number[]} phases - Phase numbers to check
 * @returns {{ overlapping: Array<{phases: number[], files: string[]}> }}
 */
function checkFileOverlap(projectRoot, phases) {
  const phaseFiles = new Map();

  for (const phase of phases) {
    const planDir = _findPlanDir(projectRoot, phase);
    if (!planDir) continue;
    const files = _extractFilesModified(planDir, phase);
    phaseFiles.set(phase, files);
  }

  const overlapping = [];
  const phaseNums = [...phaseFiles.keys()];
  for (let i = 0; i < phaseNums.length; i++) {
    for (let j = i + 1; j < phaseNums.length; j++) {
      const a = phaseNums[i];
      const b = phaseNums[j];
      const filesA = phaseFiles.get(a) || [];
      const filesB = phaseFiles.get(b) || [];
      const shared = filesA.filter(f => filesB.includes(f));
      if (shared.length > 0) {
        overlapping.push({ phases: [a, b], files: shared });
      }
    }
  }

  return { overlapping };
}

/**
 * Find the plan directory for a given phase number.
 * Scans .planning/phases/ for a directory whose name starts with the zero-padded phase number.
 *
 * @param {string} projectRoot
 * @param {number} phase
 * @returns {string|null} absolute path to phase directory, or null if not found
 */
function _findPlanDir(projectRoot, phase) {
  const phasesDir = path.join(projectRoot, '.planning', 'phases');
  const prefix = String(phase).padStart(3, '0') + '-';

  let entries;
  try {
    entries = fs.readdirSync(phasesDir);
  } catch (_) {
    return null;
  }

  const match = entries.find(e => e.startsWith(prefix));
  if (!match) return null;
  return path.join(phasesDir, match);
}

/**
 * Extract files_modified list from all PLAN.md files in a phase directory.
 *
 * @param {string} planDir - absolute path to phase directory
 * @param {number} phase - phase number (for filtering plan files)
 * @returns {string[]} list of file paths from files_modified
 */
function _extractFilesModified(planDir, phase) {
  const files = [];
  const prefix = String(phase).padStart(3, '0') + '-';

  let planFiles;
  try {
    planFiles = fs.readdirSync(planDir)
      .filter(f => f.startsWith(prefix) && f.endsWith('-PLAN.md'));
  } catch (_) {
    return files;
  }

  for (const pf of planFiles) {
    let content;
    try {
      content = fs.readFileSync(path.join(planDir, pf), 'utf8');
    } catch (_) {
      continue;
    }

    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;
    const frontmatter = fmMatch[1];

    const filesBlock = frontmatter.match(/files_modified:\s*\n((?:\s+-\s+.+\n?)*)/);
    if (!filesBlock) continue;

    const lines = filesBlock[1].split('\n').filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^\s+-\s+(.+)$/);
      if (m) files.push(m[1].trim());
    }
  }

  return files;
}

// ─── summarizeFailure ─────────────────────────────────────────────────────────

/**
 * Generate a human-readable failure summary from a session's NDJSON log tail.
 * Reads /tmp/pde-session-{sessionId}.ndjson, passes last 50 lines to SDK.
 *
 * @param {string} sessionId
 * @param {function} [_sdkQuery] - Injectable for tests
 * @returns {Promise<string>} summary string
 */
async function summarizeFailure(sessionId, _sdkQuery) {
  const q = _sdkQuery || sdkQuery;
  const ndjsonPath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);

  let tail;
  try {
    const content = fs.readFileSync(ndjsonPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return 'No session log available.';
    tail = lines.slice(-50).join('\n');
  } catch (_) {
    return 'No session log available.';
  }

  try {
    return await q(
      `These are the last events from a failed Claude Code session (NDJSON format):
\`\`\`
${tail}
\`\`\`

Write a 2-3 sentence human-readable summary of what failed and why.
Focus on the error message, the last action taken, and the likely root cause.
Be specific — name the file, tool, or command that failed if visible.`,
      {
        allowedTools: [],
        permissionMode: 'dontAsk',
        maxTurns: 1,
      }
    );
  } catch (_) {
    return 'Failed to generate summary.';
  }
}

// ─── triageConflicts ──────────────────────────────────────────────────────────

/**
 * Assist with merge conflict resolution by passing file contents to SDK.
 *
 * @param {string[]} conflictFiles - relative file paths with conflict markers
 * @param {string} projectRoot
 * @param {function} [_sdkQuery] - Injectable for tests
 * @returns {Promise<string>} resolution strategy string
 */
async function triageConflicts(conflictFiles, projectRoot, _sdkQuery) {
  const q = _sdkQuery || sdkQuery;

  const fileContexts = conflictFiles.map(f => {
    try {
      const content = fs.readFileSync(path.join(projectRoot, f), 'utf8');
      return `### ${f}\n${content.slice(0, 3000)}`;
    } catch (_) {
      return `### ${f}\n(could not read)`;
    }
  }).join('\n\n');

  try {
    return await q(
      `These files have unresolved merge conflicts after an automated merge:
${conflictFiles.map(f => `- ${f}`).join('\n')}

File contents (with conflict markers):
${fileContexts}

Suggest a specific resolution strategy for each file. For each:
1. Identify which version (incoming vs current) is likely correct
2. Explain the reasoning
3. Give the exact manual steps to resolve

Keep it concise — this will be shown to the developer in the event log.`,
      {
        allowedTools: [],
        permissionMode: 'dontAsk',
        maxTurns: 1,
      }
    );
  } catch (_) {
    return 'Failed to generate conflict triage.';
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { analyzeDag, checkFileOverlap, summarizeFailure, triageConflicts };
