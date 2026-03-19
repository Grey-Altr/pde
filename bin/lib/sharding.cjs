'use strict';

/**
 * sharding.cjs — PLAN.md task file sharding
 *
 * Reads a PLAN.md file, extracts task blocks, and writes self-contained
 * task-NNN.md files to a plan-scoped {plan-prefix}-tasks/ directory.
 *
 * Plans with fewer than `threshold` tasks (default: 5) are skipped.
 * Plans with any tdd="true" task are always skipped.
 */

const fs = require('fs');
const path = require('path');
const { extractFrontmatter } = require('./frontmatter.cjs');

// ─── Task extraction helpers ─────────────────────────────────────────────────

/**
 * Extract all <task>...</task> blocks from PLAN.md content.
 * @param {string} content
 * @returns {Array<{fullMatch: string, inner: string, index: number}>}
 */
function extractTaskBlocks(content) {
  const blocks = [];
  const taskPattern = /<task[^>]*>([\s\S]*?)<\/task>/gi;
  let match;
  while ((match = taskPattern.exec(content)) !== null) {
    blocks.push({
      fullMatch: match[0],
      inner: match[1],
      index: match.index,
    });
  }
  return blocks;
}

/**
 * Extract a named field from a task block inner content.
 * @param {string} taskInner
 * @param {string} tag
 * @returns {string}
 */
function extractField(taskInner, tag) {
  const pattern = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  const match = taskInner.match(pattern);
  return match ? match[1].trim() : '';
}

/**
 * Check whether content has any task with tdd="true".
 * @param {string} content
 * @returns {boolean}
 */
function hasTddTasks(content) {
  return /<task[^>]*tdd\s*=\s*["']true["'][^>]*>/i.test(content);
}

/**
 * Extract objective text from <objective>...</objective>.
 * @param {string} content
 * @returns {string}
 */
function extractObjective(content) {
  const match = content.match(/<objective>([\s\S]*?)<\/objective>/i);
  return match ? match[1].trim() : '';
}

/**
 * Derive plan prefix from a plan filename (e.g., '47-01-PLAN.md' -> '47-01').
 * @param {string} planFile - basename of plan file
 * @returns {string}
 */
function derivePlanPrefix(planFile) {
  const base = path.basename(planFile);
  const match = base.match(/^(.+?)-PLAN\.md$/i);
  return match ? match[1] : base.replace(/\.md$/i, '');
}

/**
 * Build the content for a single task file.
 * @param {object} params
 * @returns {string}
 */
function buildTaskFileContent(params) {
  const { taskNum, totalTasks, fm, objectiveText, taskName, taskFiles, readFirst, action, acceptanceCriteria, verify, done, mustHavesText } = params;
  const phase = fm.phase || '';
  const plan = fm.plan || '';

  // Derive a one-line version of the objective (first sentence)
  const objectiveOneLine = objectiveText.split(/\.\s+/)[0].replace(/\n/g, ' ').trim();

  return '---\n' +
    'phase: ' + phase + '\n' +
    'plan: ' + plan + '\n' +
    'task: ' + taskNum + '\n' +
    'task_of: ' + totalTasks + '\n' +
    '---\n\n' +
    '# Task ' + taskNum + ': ' + taskName + '\n\n' +
    '**Phase:** ' + phase + '\n' +
    '**Plan:** ' + plan + ' \u2014 ' + objectiveOneLine + '\n' +
    '**Task:** ' + taskNum + ' of ' + totalTasks + '\n' +
    '**Files this task modifies:** ' + taskFiles + '\n\n' +
    '## Plan Objective (Context)\n\n' +
    objectiveText + '\n\n' +
    '## Read First\n\n' +
    'Before making any changes, read these files:\n' +
    readFirst + '\n\n' +
    '## Task Action\n\n' +
    action + '\n\n' +
    '## Acceptance Criteria\n\n' +
    acceptanceCriteria + '\n\n' +
    '## Verification\n\n' +
    verify + '\n\n' +
    '## Done Condition\n\n' +
    done + '\n\n' +
    '## Plan Must-Haves (Relevant to This Task)\n\n' +
    mustHavesText + '\n';
}

/**
 * Filter must_haves to only include artifacts/truths relevant to the task files.
 * @param {object} fm - parsed frontmatter
 * @param {string} taskFilesStr - comma-separated file list from <files> tag
 * @returns {string}
 */
function buildMustHavesText(fm, taskFilesStr) {
  const taskFileList = taskFilesStr.split(',').map(function(f) { return f.trim(); }).filter(Boolean);

  const lines = [];

  const mustHaves = fm.must_haves;
  if (!mustHaves || typeof mustHaves !== 'object') {
    return '(none specified in plan frontmatter)';
  }

  // Truths — include all
  if (Array.isArray(mustHaves.truths) && mustHaves.truths.length > 0) {
    lines.push('**Truths:**');
    for (const truth of mustHaves.truths) {
      lines.push('- "' + truth + '"');
    }
    lines.push('');
  }

  // Artifacts — filter to those whose path overlaps with task files
  if (Array.isArray(mustHaves.artifacts) && mustHaves.artifacts.length > 0) {
    const relevantArtifacts = mustHaves.artifacts.filter(function(artifact) {
      if (!artifact || !artifact.path) return false;
      return taskFileList.some(function(tf) {
        return tf.includes(artifact.path) || artifact.path.includes(tf);
      });
    });

    if (relevantArtifacts.length > 0) {
      lines.push('**Artifacts:**');
      for (const artifact of relevantArtifacts) {
        lines.push('- path: ' + artifact.path);
        if (artifact.provides) lines.push('  provides: ' + artifact.provides);
        if (artifact.contains) lines.push('  contains: ' + artifact.contains);
      }
      lines.push('');
    }
  }

  return lines.length > 0 ? lines.join('\n').trimEnd() : '(none relevant to this task)';
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Shard a PLAN.md into per-task files in a {plan-prefix}-tasks/ directory.
 *
 * @param {string} planPath - absolute path to PLAN.md file
 * @param {object} [options]
 * @param {number} [options.threshold=5] - minimum task count to trigger sharding
 * @returns {{sharded: boolean, task_count: number, reason?: string, tasks_dir?: string, files?: string[]}}
 */
function shardPlan(planPath, options) {
  const opts = options || {};
  const threshold = opts.threshold || 5;

  const content = fs.readFileSync(planPath, 'utf-8');

  // TDD exemption — check before counting tasks
  if (hasTddTasks(content)) {
    const xmlTasks = content.match(/<task[\s>]/gi) || [];
    return { sharded: false, task_count: xmlTasks.length, reason: 'tdd plan' };
  }

  // Count tasks using same regex as phase.cjs:251
  const xmlTasks = content.match(/<task[\s>]/gi) || [];
  const taskCount = xmlTasks.length;

  if (taskCount < threshold) {
    return { sharded: false, task_count: taskCount, reason: 'below threshold' };
  }

  // Extract frontmatter
  const fm = extractFrontmatter(content);

  // Extract objective
  const objectiveText = extractObjective(content);

  // Extract all task blocks
  const taskBlocks = extractTaskBlocks(content);

  // Determine tasks directory path
  const planPrefix = derivePlanPrefix(planPath);
  const tasksDir = path.join(path.dirname(planPath), planPrefix + '-tasks');
  fs.mkdirSync(tasksDir, { recursive: true });

  const fileNames = [];

  for (let i = 0; i < taskBlocks.length; i++) {
    const taskNum = i + 1;
    const taskInner = taskBlocks[i].inner;

    const taskName = extractField(taskInner, 'name');
    const taskFiles = extractField(taskInner, 'files');
    const readFirst = extractField(taskInner, 'read_first');
    const action = extractField(taskInner, 'action');
    const acceptanceCriteria = extractField(taskInner, 'acceptance_criteria');
    const verify = extractField(taskInner, 'verify');
    const done = extractField(taskInner, 'done');

    const mustHavesText = buildMustHavesText(fm, taskFiles);

    const fileContent = buildTaskFileContent({
      taskNum: taskNum,
      totalTasks: taskBlocks.length,
      fm: fm,
      objectiveText: objectiveText,
      taskName: taskName,
      taskFiles: taskFiles,
      readFirst: readFirst,
      action: action,
      acceptanceCriteria: acceptanceCriteria,
      verify: verify,
      done: done,
      mustHavesText: mustHavesText,
    });

    const fileName = 'task-' + String(taskNum).padStart(3, '0') + '.md';
    fs.writeFileSync(path.join(tasksDir, fileName), fileContent, 'utf-8');
    fileNames.push(fileName);
  }

  return {
    sharded: true,
    task_count: taskBlocks.length,
    tasks_dir: tasksDir,
    files: fileNames,
  };
}

/**
 * Resolve the path to the task file or fall back to PLAN.md.
 *
 * @param {string} phaseDir - absolute path to phase directory
 * @param {string} planPrefix - plan prefix (e.g., '47-01')
 * @param {number} taskNum - task number (1-based)
 * @param {string} planFile - PLAN.md filename (e.g., '47-01-PLAN.md')
 * @returns {string} resolved absolute path
 */
function resolveTaskPath(phaseDir, planPrefix, taskNum, planFile) {
  const tasksDir = path.join(phaseDir, planPrefix + '-tasks');
  const taskPad = String(taskNum).padStart(3, '0');
  const taskFile = path.join(tasksDir, 'task-' + taskPad + '.md');
  if (fs.existsSync(tasksDir) && fs.existsSync(taskFile)) {
    return taskFile;
  }
  return path.join(phaseDir, planFile);
}

module.exports = {
  shardPlan: shardPlan,
  resolveTaskPath: resolveTaskPath,
  extractTaskBlocks: extractTaskBlocks,
  extractField: extractField,
  hasTddTasks: hasTddTasks,
  extractObjective: extractObjective,
  derivePlanPrefix: derivePlanPrefix,
};
