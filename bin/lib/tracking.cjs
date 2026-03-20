'use strict';

/**
 * tracking.cjs — Workflow status tracking and session handoff generation
 *
 * Implements per-task status tracking via workflow-status.md and
 * session handoff document generation via HANDOFF.md.
 *
 * Supports TRCK-01, TRCK-02, TRCK-03.
 */

const fs = require('fs');
const path = require('path');
const { output, error } = require('./core.cjs');

// ─── Table parsing helper ─────────────────────────────────────────────────────

/**
 * Parse all task rows from a workflow-status.md content string.
 *
 * Each row matches: | num | name | status | commit | updated |
 *
 * @param {string} content
 * @returns {Array<{num: number, name: string, status: string, commit: string, updated: string}>}
 */
function parseStatusTable(content) {
  const rowRegex = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(DONE|SKIPPED|IN_PROGRESS|TODO)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/gm;
  const tasks = [];
  let match;
  while ((match = rowRegex.exec(content)) !== null) {
    tasks.push({
      num: parseInt(match[1], 10),
      name: match[2].trim(),
      status: match[3].trim(),
      commit: match[4].trim(),
      updated: match[5].trim(),
    });
  }
  return tasks;
}

// ─── initWorkflowStatus ───────────────────────────────────────────────────────

/**
 * Create or re-initialize workflow-status.md in the given directory.
 *
 * Idempotent: existing DONE or SKIPPED rows are preserved on re-initialization.
 * New/unset tasks default to TODO.
 *
 * @param {string} tasksDir - directory where workflow-status.md will be written
 * @param {{ phase: string, plan: string, total: number, taskNames?: string[] }} opts
 * @returns {{ initialized: boolean, total: number, preserved: number }}
 */
function initWorkflowStatus(tasksDir, opts) {
  const { phase, plan, total, taskNames } = opts;
  const statusPath = path.join(tasksDir, 'workflow-status.md');
  const now = new Date().toISOString();

  // Read existing file and parse preserved rows
  const existingContent = fs.existsSync(statusPath)
    ? fs.readFileSync(statusPath, 'utf-8')
    : null;

  const existingTasks = existingContent ? parseStatusTable(existingContent) : [];

  // Build a map of task num -> existing row (only preserve DONE and SKIPPED)
  const preservedMap = new Map();
  for (const t of existingTasks) {
    if (t.status === 'DONE' || t.status === 'SKIPPED') {
      preservedMap.set(t.num, t);
    }
  }

  // Build table rows
  const rows = [];
  for (let i = 1; i <= total; i++) {
    if (preservedMap.has(i)) {
      const t = preservedMap.get(i);
      rows.push(`| ${t.num} | ${t.name} | ${t.status} | ${t.commit} | ${t.updated} |`);
    } else {
      const name = taskNames && taskNames[i - 1] ? taskNames[i - 1].replace(/\|/g, '-').slice(0, 40) : `Task ${i}`;
      rows.push(`| ${i} | ${name} | TODO | — | — |`);
    }
  }

  const tableHeader = [
    '| # | Task | Status | Commit | Updated |',
    '|---|------|--------|--------|---------|',
  ].join('\n');

  const content = `---
phase: ${phase}
plan: ${plan}
generated: "${now}"
last_updated: "${now}"
---

# Workflow Status: Phase ${phase}, Plan ${plan}

${tableHeader}
${rows.join('\n')}
`;

  fs.writeFileSync(statusPath, content, 'utf-8');

  return {
    initialized: true,
    total,
    preserved: preservedMap.size,
  };
}

// ─── setTaskStatus ────────────────────────────────────────────────────────────

/**
 * Update a single task row in workflow-status.md.
 *
 * @param {string} tasksDir - directory containing workflow-status.md
 * @param {number} taskNum - 1-based task number
 * @param {string} status - new status: TODO | IN_PROGRESS | DONE | SKIPPED
 * @param {string|null} commitHash - optional commit hash
 * @returns {{ updated: boolean, task?: number, status?: string, reason?: string }}
 */
function setTaskStatus(tasksDir, taskNum, status, commitHash) {
  const statusPath = path.join(tasksDir, 'workflow-status.md');

  if (!fs.existsSync(statusPath)) {
    return { updated: false, reason: 'not found' };
  }

  let content = fs.readFileSync(statusPath, 'utf-8');
  const now = new Date().toISOString();
  const hash = commitHash || '—';

  // Find and replace the specific task row
  const rowRegex = new RegExp(
    `^(\\|\\s*${taskNum}\\s*\\|\\s*)([^|]+)(\\|\\s*)(DONE|SKIPPED|IN_PROGRESS|TODO)(\\s*\\|[^\\n]*)$`,
    'm'
  );

  const rowMatch = content.match(rowRegex);
  if (!rowMatch) {
    return { updated: false, reason: 'task not found' };
  }

  // Extract task name from existing row
  const existingName = rowMatch[2].trim();

  // Build new row
  const newRow = `| ${taskNum} | ${existingName} | ${status} | ${hash} | ${now} |`;
  content = content.replace(rowRegex, newRow);

  // Update last_updated in frontmatter
  content = content.replace(
    /^(last_updated:\s*)"[^"]*"/m,
    `$1"${now}"`
  );

  fs.writeFileSync(statusPath, content, 'utf-8');

  return { updated: true, task: taskNum, status };
}

// ─── readWorkflowStatus ───────────────────────────────────────────────────────

/**
 * Read workflow-status.md and return structured task objects with totals.
 *
 * @param {string} tasksDir - directory containing workflow-status.md
 * @returns {{ tasks: Array, total: number, done: number, inProgress: number }}
 */
function readWorkflowStatus(tasksDir) {
  const statusPath = path.join(tasksDir, 'workflow-status.md');

  if (!fs.existsSync(statusPath)) {
    return { tasks: [], total: 0, done: 0, inProgress: 0 };
  }

  const content = fs.readFileSync(statusPath, 'utf-8');
  const tasks = parseStatusTable(content);

  const done = tasks.filter(t => t.status === 'DONE' || t.status === 'SKIPPED').length;
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;

  return {
    tasks,
    total: tasks.length,
    done,
    inProgress,
  };
}

// ─── generateHandoff ──────────────────────────────────────────────────────────

/**
 * Generate a HANDOFF.md document string for session continuity.
 *
 * @param {{
 *   phase: string,
 *   plan: string,
 *   task: number,
 *   taskOf: number,
 *   status: string,
 *   lastAction: string,
 *   nextStep: string,
 *   blockers: string,
 *   decisions: string,
 *   taskStatusContent?: string|null
 * }} opts
 * @returns {string} full HANDOFF.md markdown string
 */
function generateHandoff(opts) {
  const {
    phase,
    plan,
    task,
    taskOf,
    status,
    lastAction,
    nextStep,
    blockers,
    decisions,
    taskStatusContent,
  } = opts;

  const now = new Date().toISOString();

  const frontmatter = `---
phase: ${phase}
plan: ${plan}
task: ${task}
task_of: ${taskOf}
status: ${status}
last_updated: "${now}"
---`;

  const body = `
# Handoff: Phase ${phase}

## Current Position

Phase ${phase}, Plan ${plan} — Task ${task} of ${taskOf} (${status})

## Last Action Taken

${lastAction || '_No action recorded._'}

## Next Step to Resume

${nextStep || '_No next step recorded._'}

## Active Blockers

${blockers || 'None'}

## Key Decisions This Session

${decisions || 'None'}`;

  const snapshotSection = taskStatusContent
    ? `\n\n## Task Status Snapshot\n\n${taskStatusContent}`
    : '';

  return frontmatter + body + snapshotSection + '\n';
}

// ─── CLI wrappers ─────────────────────────────────────────────────────────────

/**
 * Parse --flag value pairs from an args array into a plain object.
 *
 * @param {string[]} args
 * @returns {Object}
 */
function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      flags[key] = value;
      if (value !== true) i++;
    }
  }
  return flags;
}

/**
 * CLI: tracking init
 *
 * Args: --tasks-dir <path> --plan <plan> --phase <phase> --total <n> [--names <pipe-separated-names>]
 */
function cmdTrackingInit(cwd, args, raw) {
  const flags = parseFlags(args);
  const tasksDir = flags['tasks-dir']
    ? path.resolve(cwd, flags['tasks-dir'])
    : path.resolve(cwd);
  const phase = flags['phase'] || '';
  const plan = flags['plan'] || '';
  const total = parseInt(flags['total'] || '0', 10);
  const taskNames = flags['names'] ? flags['names'].split('|') : undefined;

  if (!total) { error('tracking init: --total is required'); }

  const result = initWorkflowStatus(tasksDir, { phase, plan, total, taskNames });
  output(result, raw);
}

/**
 * CLI: tracking set-status
 *
 * Args: --tasks-dir <path> --task <n> --status <STATUS> [--commit <hash>]
 */
function cmdTrackingSetStatus(cwd, args, raw) {
  const flags = parseFlags(args);
  const tasksDir = flags['tasks-dir']
    ? path.resolve(cwd, flags['tasks-dir'])
    : path.resolve(cwd);
  const taskNum = parseInt(flags['task'] || '0', 10);
  const status = flags['status'] || '';
  const commitHash = flags['commit'] || null;

  if (!taskNum) { error('tracking set-status: --task is required'); }
  if (!status) { error('tracking set-status: --status is required'); }

  const result = setTaskStatus(tasksDir, taskNum, status, commitHash);
  output(result, raw);
}

/**
 * CLI: tracking read
 *
 * Args: --tasks-dir <path>
 */
function cmdTrackingRead(cwd, args, raw) {
  const flags = parseFlags(args);
  const tasksDir = flags['tasks-dir']
    ? path.resolve(cwd, flags['tasks-dir'])
    : path.resolve(cwd);

  const result = readWorkflowStatus(tasksDir);
  output(result, raw);
}

/**
 * CLI: tracking generate-handoff
 *
 * Args: --phase <phase> --plan <plan> --task <n> --task-of <n>
 *       --status <STATUS> --last-action <text> --next-step <text>
 *       [--blockers <text>] [--decisions <text>] [--status-content <text>]
 */
function cmdTrackingGenerateHandoff(cwd, args, raw) {
  const flags = parseFlags(args);

  const result = generateHandoff({
    phase: flags['phase'] || '',
    plan: flags['plan'] || '',
    task: parseInt(flags['task'] || '0', 10),
    taskOf: parseInt(flags['task-of'] || '0', 10),
    status: flags['status'] || 'IN_PROGRESS',
    lastAction: flags['last-action'] || '',
    nextStep: flags['next-step'] || '',
    blockers: flags['blockers'] || 'None',
    decisions: flags['decisions'] || 'None',
    taskStatusContent: flags['status-content'] || null,
  });

  output({ handoff: result }, raw);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  initWorkflowStatus,
  setTaskStatus,
  readWorkflowStatus,
  generateHandoff,
  cmdTrackingInit,
  cmdTrackingSetStatus,
  cmdTrackingRead,
  cmdTrackingGenerateHandoff,
};
