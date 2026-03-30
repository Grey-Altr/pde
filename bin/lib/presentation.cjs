/**
 * presentation.cjs — IR Extractor functions for stakeholder presentations
 *
 * This module provides deterministic data extraction from .planning/ artifacts.
 * LLM layers NEVER read .planning/ files directly — all quantitative claims
 * must flow through these extractors to prevent hallucination.
 *
 * EXT-01 through EXT-04 are added by Plan 01 (wave 1, parallel).
 * EXT-05 through EXT-10 are added by Plan 02 (wave 1, parallel).
 * Plan 03 merges all exports into the final module.exports.
 *
 * Functions in this file: EXT-05 through EXT-10
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { safeReadFile, execGit, getArchivedPhaseDirs } = require('./core.cjs');
const { extractFrontmatter } = require('./frontmatter.cjs');

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Get all current phase directories from .planning/phases/
 * Returns array of absolute paths.
 */
function getCurrentPhaseDirs(cwd) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  if (!fs.existsSync(phasesDir)) return [];
  try {
    return fs.readdirSync(phasesDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => path.join(phasesDir, e.name));
  } catch {
    return [];
  }
}

/**
 * Get all phase directories: current + archived.
 * Returns array of absolute paths.
 */
function getAllPhaseDirs(cwd) {
  const current = getCurrentPhaseDirs(cwd);
  let archived = [];
  try {
    archived = getArchivedPhaseDirs(cwd).map(e => e.fullPath);
  } catch {
    // getArchivedPhaseDirs may not be available in all versions
    archived = [];
  }
  return [...current, ...archived];
}

/**
 * Find all files matching a glob-like suffix pattern within a directory.
 * E.g. findFilesInDir(dir, '-SUMMARY.md') returns all *-SUMMARY.md files.
 */
function findFilesInDir(dir, suffix) {
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith(suffix))
      .map(f => path.join(dir, f));
  } catch {
    return [];
  }
}

// ─── EXT-05: Git velocity ─────────────────────────────────────────────────────

/**
 * Extract git velocity metrics from the project's git history.
 *
 * @param {string} cwd - Project root directory
 * @returns {{ total_commits: number, commits_last_30_days: number, contributors: string[], estimated_loc_added: number }}
 *          or { unavailable: true, reason: string } on failure
 */
function extractGitVelocity(cwd) {
  // Get all commit dates (no-merges)
  const logResult = execGit(cwd, ['log', '--pretty=format:%as', '--no-merges']);
  if (logResult.exitCode !== 0) {
    return { unavailable: true, reason: 'git log failed' };
  }

  const dateLines = logResult.stdout ? logResult.stdout.split('\n').filter(Boolean) : [];
  const totalCommits = dateLines.length;

  // Count commits in last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const commitsLast30Days = dateLines.filter(dateStr => {
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && d >= thirtyDaysAgo;
  }).length;

  // Get contributors from shortlog
  const shortlogResult = execGit(cwd, ['shortlog', '-sn', '--no-merges', 'HEAD']);
  let contributors = [];
  if (shortlogResult.exitCode === 0 && shortlogResult.stdout) {
    contributors = shortlogResult.stdout
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const match = line.match(/^\s*\d+\s+(.+)$/);
        return match ? match[1].trim() : null;
      })
      .filter(Boolean);
  }

  // Estimate LOC added from stat log
  const statResult = execGit(cwd, ['log', '--pretty=format:', '--stat', '--no-merges']);
  let estimatedLocAdded = 0;
  if (statResult.exitCode === 0 && statResult.stdout) {
    const insertionMatches = statResult.stdout.matchAll(/(\d+) insertion/g);
    for (const m of insertionMatches) {
      estimatedLocAdded += parseInt(m[1], 10);
    }
  }

  return {
    total_commits: totalCommits,
    commits_last_30_days: commitsLast30Days,
    contributors,
    estimated_loc_added: estimatedLocAdded,
  };
}

// ─── EXT-06: Cost / timing ────────────────────────────────────────────────────

/**
 * Extract session count and duration data from SUMMARY.md frontmatter.
 * Reads from .planning/phases/ and archived milestone phases.
 * Does NOT read from /tmp or NDJSON event files.
 *
 * @param {string} cwd - Project root directory
 * @returns {{ session_count: number, total_duration_min: number, phases_with_timing: number, average_phase_duration_min: number }}
 *          or { unavailable: true, reason: string } when no sessions found
 */
function extractCostTiming(cwd) {
  const allPhaseDirs = getAllPhaseDirs(cwd);

  let sessionCount = 0;
  let totalDurationMin = 0;
  let phasesWithTiming = 0;

  for (const dir of allPhaseDirs) {
    const summaryFiles = findFilesInDir(dir, '-SUMMARY.md');
    for (const summaryPath of summaryFiles) {
      const content = safeReadFile(summaryPath);
      if (!content) continue;
      sessionCount++;

      const fm = extractFrontmatter(content);
      const durationRaw = fm.duration;
      if (durationRaw) {
        const match = String(durationRaw).match(/^(\d+)/);
        if (match) {
          totalDurationMin += parseInt(match[1], 10);
          phasesWithTiming++;
        }
      }
    }
  }

  if (sessionCount === 0) {
    return { unavailable: true, reason: 'no session summary files found' };
  }

  const averagePhaseDurationMin = phasesWithTiming > 0
    ? Math.round(totalDurationMin / phasesWithTiming)
    : 0;

  return {
    session_count: sessionCount,
    total_duration_min: totalDurationMin,
    phases_with_timing: phasesWithTiming,
    average_phase_duration_min: averagePhaseDurationMin,
  };
}

// ─── EXT-07: Blockers ────────────────────────────────────────────────────────

/**
 * Extract blockers and risks from STATE.md Blockers/Concerns section.
 * Empty sections return empty arrays (NOT unavailable sentinel).
 *
 * @param {string} cwd - Project root directory
 * @returns {{ blockers: Array<{text: string, phase: string, type: string}>, risks: Array<...> }}
 */
function extractBlockers(cwd) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const content = safeReadFile(statePath);

  if (!content) {
    return { blockers: [], risks: [] };
  }

  const blockers = [];
  const risks = [];

  // Extract the Blockers/Concerns section
  const blockersMatch = content.match(/###\s+Blockers\/Concerns\s*\n([\s\S]*?)(?=\n###|\n##|$)/);
  if (blockersMatch) {
    const sectionText = blockersMatch[1];
    const lines = sectionText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Match lines like: - [Phase N]: text  or  - [Source]: text
      const itemMatch = trimmed.match(/^-\s+\[([^\]]+)\]:\s+(.+)$/);
      if (!itemMatch) continue;

      const sourceTag = itemMatch[1];
      const text = itemMatch[2];

      // Extract phase number from source tag if present
      const phaseMatch = sourceTag.match(/Phase\s+(\d+)/i);
      const phase = phaseMatch ? phaseMatch[1] : sourceTag;

      // Classify based on keywords in text
      const isRisk = /\brisk\b|\bconcern\b/i.test(text);
      const type = isRisk ? 'risk' : 'blocker';
      const item = { text, phase, type };

      if (isRisk) {
        risks.push(item);
      } else {
        blockers.push(item);
      }
    }
  }

  return { blockers, risks };
}

// ─── EXT-08: Verification ────────────────────────────────────────────────────

/**
 * Extract verification results from VERIFICATION.md files across all phases.
 *
 * @param {string} cwd - Project root directory
 * @returns {{ phases_verified: number, phases_achieved: number, phases_not_achieved: number, phases_missing_verification: number, results: Array }}
 */
function extractVerification(cwd) {
  const allPhaseDirs = getAllPhaseDirs(cwd);
  const totalPhaseDirs = allPhaseDirs.length;

  let phasesVerified = 0;
  let phasesAchieved = 0;
  let phasesNotAchieved = 0;
  const results = [];

  for (const dir of allPhaseDirs) {
    const verificationFiles = findFilesInDir(dir, '-VERIFICATION.md');
    if (verificationFiles.length === 0) continue;

    for (const verPath of verificationFiles) {
      const content = safeReadFile(verPath);
      if (!content) continue;

      phasesVerified++;

      // Count checkboxes
      const acPassMatches = content.match(/- \[x\]/gi) || [];
      const acFailMatches = content.match(/- \[ \]/g) || [];
      const acPass = acPassMatches.length;
      const acFail = acFailMatches.length;

      // Determine overall status
      let status = 'unknown';
      if (/\*\*Overall:\s*ACHIEVED\*\*/i.test(content) || /\*\*Goal.*ACHIEVED\*\*/i.test(content)) {
        status = 'achieved';
        phasesAchieved++;
      } else if (/\*\*Overall:\s*NOT ACHIEVED\*\*/i.test(content)) {
        status = 'not_achieved';
        phasesNotAchieved++;
      }

      const phaseName = path.basename(dir);
      results.push({ phase: phaseName, status, ac_pass: acPass, ac_fail: acFail });
    }
  }

  const phasesMissingVerification = totalPhaseDirs - phasesVerified;

  return {
    phases_verified: phasesVerified,
    phases_achieved: phasesAchieved,
    phases_not_achieved: phasesNotAchieved,
    phases_missing_verification: phasesMissingVerification,
    results,
  };
}

// ─── EXT-09: Research ────────────────────────────────────────────────────────

/**
 * Extract research coverage metrics.
 *
 * @param {string} cwd - Project root directory
 * @returns {{ project_research_files: number, topics: string[], phase_research_count: number }}
 */
function extractResearch(cwd) {
  // Count project-level research files
  const researchDir = path.join(cwd, '.planning', 'research');
  let projectResearchFiles = 0;
  let topics = [];

  if (fs.existsSync(researchDir)) {
    try {
      const entries = fs.readdirSync(researchDir).filter(f => {
        const stat = fs.statSync(path.join(researchDir, f));
        return stat.isFile();
      });
      projectResearchFiles = entries.length;
      // Extract topic names from filenames (strip extension)
      topics = entries.map(f => path.basename(f, path.extname(f)));
    } catch {
      projectResearchFiles = 0;
      topics = [];
    }
  }

  // Count phase directories that contain *-RESEARCH.md files
  const allPhaseDirs = getAllPhaseDirs(cwd);
  let phaseResearchCount = 0;
  for (const dir of allPhaseDirs) {
    const researchFiles = findFilesInDir(dir, '-RESEARCH.md');
    if (researchFiles.length > 0) {
      phaseResearchCount++;
    }
  }

  return {
    project_research_files: projectResearchFiles,
    topics,
    phase_research_count: phaseResearchCount,
  };
}

// ─── EXT-10: Decisions ───────────────────────────────────────────────────────

/**
 * Extract decision history from STATE.md Decisions section and
 * SUMMARY.md key-decisions frontmatter arrays.
 * Returns empty array (NOT unavailable sentinel) when no decisions found.
 *
 * @param {string} cwd - Project root directory
 * @returns {Array<{phase: string, summary: string, rationale: string}>}
 */
function extractDecisions(cwd) {
  const decisions = [];

  // Extract from STATE.md ### Decisions section
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const stateContent = safeReadFile(statePath);
  if (stateContent) {
    const decisionsMatch = stateContent.match(/###\s+Decisions\s*\n([\s\S]*?)(?=\n###|\n##|$)/);
    if (decisionsMatch) {
      const sectionText = decisionsMatch[1];
      const lines = sectionText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Match: - [Source]: text
        const itemMatch = trimmed.match(/^-\s+\[([^\]]+)\]:\s+(.+)$/);
        if (!itemMatch) continue;

        const sourceTag = itemMatch[1];
        const text = itemMatch[2];

        // Extract phase from source tag
        const phaseMatch = sourceTag.match(/Phase\s+(\d+)/i);
        const phase = phaseMatch ? phaseMatch[1] : sourceTag;

        decisions.push({
          phase,
          summary: text,
          rationale: sourceTag,
        });
      }
    }
  }

  // Extract from SUMMARY.md files' key-decisions frontmatter
  const allPhaseDirs = getAllPhaseDirs(cwd);
  for (const dir of allPhaseDirs) {
    const summaryFiles = findFilesInDir(dir, '-SUMMARY.md');
    for (const summaryPath of summaryFiles) {
      const content = safeReadFile(summaryPath);
      if (!content) continue;

      const fm = extractFrontmatter(content);
      const keyDecisions = fm['key-decisions'];
      if (!keyDecisions || !Array.isArray(keyDecisions)) continue;

      const phase = fm.phase || path.basename(dir);
      for (const decision of keyDecisions) {
        if (!decision || typeof decision !== 'string') continue;
        decisions.push({
          phase: String(phase),
          summary: decision,
          rationale: 'SUMMARY.md key-decisions',
        });
      }
    }
  }

  return decisions;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  extractGitVelocity,
  extractCostTiming,
  extractBlockers,
  extractVerification,
  extractResearch,
  extractDecisions,
};
