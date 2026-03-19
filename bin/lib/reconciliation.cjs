'use strict';

/**
 * reconciliation.cjs — Task-to-commit matching algorithm for reconcile-phase.md
 *
 * Implements the three-tier matching algorithm described in
 * workflows/reconcile-phase.md step match_tasks_to_commits:
 *
 *   Tier 1 (Primary):   slug matching — 3+ consecutive shared words
 *   Tier 2 (Fallback):  file overlap — commit files intersect task files list
 *   Tier 3 (Weak):      phase-plan prefix — commit message contains ({phase}-{plan})
 *
 * A commit is classified as "unplanned" only when all three tiers fail.
 */

// ─── Slug helpers ─────────────────────────────────────────────────────────────

/**
 * Normalize a string to a slug: lowercase, replace non-alphanumeric with
 * hyphens, collapse duplicate hyphens, strip leading/trailing hyphens.
 * @param {string} str
 * @returns {string}
 */
function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalize a task name to a slug, stripping the leading "Task N: " prefix.
 * @param {string} taskName - e.g. "Task 1: Create reconcile-phase.md workflow"
 * @returns {string} e.g. "create-reconcile-phase-md-workflow"
 */
function normalizeTaskName(taskName) {
  const stripped = taskName.replace(/^task\s+\d+\s*:\s*/i, '');
  return toSlug(stripped);
}

/**
 * Normalize a commit message to a slug, taking the text after the closing
 * ): in a conventional commit message (e.g., "feat(49-01): add step" → "add-step").
 * Falls back to the full message if no conventional commit prefix is found.
 * @param {string} message
 * @returns {string}
 */
function normalizeCommitMessage(message) {
  const match = message.match(/\)\s*:\s+(.+)/);
  const text = match ? match[1] : message;
  return toSlug(text);
}

// ─── Tier 1: slug matching ────────────────────────────────────────────────────

/**
 * Return true if taskSlugWords and commitSlugWords share 3 or more consecutive
 * words at the same relative position.
 *
 * "Consecutive" means: find a sequence of N≥3 words that appear in the same
 * order and adjacency in BOTH word arrays.
 *
 * @param {string[]} taskWords
 * @param {string[]} commitWords
 * @returns {boolean}
 */
function hasThreeConsecutiveSharedWords(taskWords, commitWords) {
  if (taskWords.length < 3 || commitWords.length < 3) return false;

  // Build a set of all consecutive trigrams from commitWords for fast lookup.
  // Then check if any trigram from taskWords appears in that set.
  const commitTrigrams = new Set();
  for (let i = 0; i <= commitWords.length - 3; i++) {
    commitTrigrams.add(commitWords[i] + '\x00' + commitWords[i + 1] + '\x00' + commitWords[i + 2]);
  }

  for (let i = 0; i <= taskWords.length - 3; i++) {
    const trigram = taskWords[i] + '\x00' + taskWords[i + 1] + '\x00' + taskWords[i + 2];
    if (commitTrigrams.has(trigram)) return true;
  }
  return false;
}

/**
 * Tier 1: Slug matching.
 * Returns true if the commit message shares 3+ consecutive slug words with the
 * task name.
 *
 * @param {string} taskName - e.g. "Task 1: Create reconcile-phase.md workflow"
 * @param {string} commitMessage - e.g. "feat(49-01): create reconcile phase md workflow"
 * @returns {boolean}
 */
function slugMatch(taskName, commitMessage) {
  const taskSlug = normalizeTaskName(taskName);
  const commitSlug = normalizeCommitMessage(commitMessage);

  const taskWords = taskSlug.split('-').filter(Boolean);
  const commitWords = commitSlug.split('-').filter(Boolean);

  return hasThreeConsecutiveSharedWords(taskWords, commitWords);
}

// ─── Tier 2: file overlap ─────────────────────────────────────────────────────

/**
 * Tier 2: File overlap fallback.
 * Returns true if any file in commitFiles appears in taskFiles.
 *
 * @param {string[]} commitFiles - files changed in the commit
 * @param {string[]} taskFiles   - files declared in the task's <files> list
 * @returns {boolean}
 */
function fileOverlapMatch(commitFiles, taskFiles) {
  if (!commitFiles || !commitFiles.length) return false;
  if (!taskFiles || !taskFiles.length) return false;

  const taskFileSet = new Set(taskFiles.map(function(f) { return f.trim(); }));
  return commitFiles.some(function(f) { return taskFileSet.has(f.trim()); });
}

// ─── Tier 3: phase-plan prefix ────────────────────────────────────────────────

/**
 * Tier 3: Phase-plan prefix weak match.
 * Returns true if the commit message contains "({phaseNum}-{planId})" where
 * phaseNum matches and planId is any two-digit plan number.
 *
 * Pass phaseNum as a string (e.g. "49") and the commit message. The check
 * is anchored by parentheses to avoid cross-phase false matches (Pitfall 5).
 *
 * @param {string} commitMessage
 * @param {string} phaseNum - e.g. "49"
 * @returns {boolean}
 */
function phasePlanPrefixMatch(commitMessage, phaseNum) {
  if (!phaseNum) return false;
  // Match "({phaseNum}-{anything})" — parenthesis-anchored per Pitfall 5
  const pattern = new RegExp('\\(' + phaseNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-');
  return pattern.test(commitMessage);
}

// ─── Main classifier ──────────────────────────────────────────────────────────

/**
 * Classify each commit against the list of planned tasks using the three-tier
 * algorithm. Also determines which tasks have no matching commit.
 *
 * @param {Array<{name: string, files: string[], ac_refs?: string, plan_id?: string}>} tasks
 *   Planned tasks. `files` is an array of declared file paths.
 *
 * @param {Array<{hash: string, message: string, files: string[]}>} commits
 *   Commits to classify. `files` is the list of files changed in that commit.
 *
 * @param {object} [options]
 * @param {string} [options.phaseNum] - phase number string, e.g. "49", used for tier-3 check
 *
 * @returns {{
 *   taskStatuses: Map<string, {status: string, matchedCommits: Array<{hash: string, message: string}>, matchMethod: string}>,
 *   commitStatuses: Map<string, {status: string, matchedTask?: string, matchMethod?: string}>
 * }}
 *
 * taskStatuses keyed by task.name:
 *   status: "matched" | "plan_prefix_only" | "unmatched"
 *   matchedCommits: [{hash, message}]
 *   matchMethod: "slug" | "file_overlap" | "plan_prefix" | ""
 *
 * commitStatuses keyed by commit.hash:
 *   status: "matched" | "plan_prefix_only" | "unplanned"
 *   matchedTask: task name if matched
 *   matchMethod: "slug" | "file_overlap" | "plan_prefix" | "unplanned"
 */
function classifyCommits(tasks, commits, options) {
  const opts = options || {};
  const phaseNum = opts.phaseNum || '';

  // Initialise task status map
  const taskStatuses = new Map();
  for (const task of tasks) {
    taskStatuses.set(task.name, {
      status: 'unmatched',
      matchedCommits: [],
      matchMethod: '',
    });
  }

  // Initialise commit status map
  const commitStatuses = new Map();
  for (const commit of commits) {
    commitStatuses.set(commit.hash, {
      status: 'unplanned',
      matchedTask: undefined,
      matchMethod: 'unplanned',
    });
  }

  // For each commit, attempt all three tiers against all tasks
  for (const commit of commits) {
    let matched = false;

    // Tier 1 & 2: try each task in order
    for (const task of tasks) {
      // Tier 1: slug
      if (slugMatch(task.name, commit.message)) {
        const ts = taskStatuses.get(task.name);
        ts.status = 'matched';
        ts.matchedCommits.push({ hash: commit.hash, message: commit.message });
        if (!ts.matchMethod) ts.matchMethod = 'slug';

        commitStatuses.set(commit.hash, {
          status: 'matched',
          matchedTask: task.name,
          matchMethod: 'slug',
        });
        matched = true;
        break;
      }

      // Tier 2: file overlap
      if (fileOverlapMatch(commit.files, task.files)) {
        const ts = taskStatuses.get(task.name);
        ts.status = 'matched';
        ts.matchedCommits.push({ hash: commit.hash, message: commit.message });
        if (!ts.matchMethod) ts.matchMethod = 'file_overlap';

        commitStatuses.set(commit.hash, {
          status: 'matched',
          matchedTask: task.name,
          matchMethod: 'file_overlap',
        });
        matched = true;
        break;
      }
    }

    if (matched) continue;

    // Tier 3: phase-plan prefix — not a specific task match, but not unplanned
    if (phasePlanPrefixMatch(commit.message, phaseNum)) {
      commitStatuses.set(commit.hash, {
        status: 'plan_prefix_only',
        matchedTask: undefined,
        matchMethod: 'plan_prefix',
      });
    }
    // else: remains "unplanned" (set during initialisation)
  }

  // Derive overall status for tasks that only received plan_prefix commits
  // (a task stays "unmatched" unless it got a slug or file_overlap hit)

  return { taskStatuses, commitStatuses };
}

// ─── Status derivation ────────────────────────────────────────────────────────

/**
 * Determine overall RECONCILIATION.md status from classification results.
 * Precedence: incomplete > deviations_found > unplanned_changes > clean
 *
 * @param {{
 *   taskStatuses: Map,
 *   commitStatuses: Map,
 *   hasDeviations?: boolean,
 * }} params
 * @returns {"incomplete" | "deviations_found" | "unplanned_changes" | "clean"}
 */
function deriveStatus(params) {
  const { taskStatuses, commitStatuses, hasDeviations } = params;

  const hasUnmatched = Array.from(taskStatuses.values()).some(function(ts) {
    return ts.status === 'unmatched';
  });
  if (hasUnmatched) return 'incomplete';

  if (hasDeviations) return 'deviations_found';

  const hasUnplanned = Array.from(commitStatuses.values()).some(function(cs) {
    return cs.status === 'unplanned';
  });
  if (hasUnplanned) return 'unplanned_changes';

  return 'clean';
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  slugMatch,
  fileOverlapMatch,
  phasePlanPrefixMatch,
  classifyCommits,
  deriveStatus,
  // Lower-level helpers exported for testing
  toSlug,
  normalizeTaskName,
  normalizeCommitMessage,
};
