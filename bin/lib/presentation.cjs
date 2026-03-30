'use strict';

/**
 * presentation.cjs — Deterministic IR extraction for stakeholder presentations
 *
 * Reads .planning/ artifacts into structured intermediate representations (IR)
 * that can be passed to LLM narration without exposing raw files.
 *
 * Functions:
 *   - extractProjectIdentity(cwd)   → EXT-01
 *   - extractPhaseCompletion(cwd)   → EXT-02
 *   - extractRequirements(cwd)      → EXT-03
 *   - extractDesignArtifacts(cwd)   → EXT-04
 *   - extractGitVelocity(cwd)      → EXT-05
 *   - extractCostTiming(cwd)       → EXT-06
 *   - extractBlockers(cwd)         → EXT-07
 *   - extractVerification(cwd)     → EXT-08
 *   - extractResearch(cwd)         → EXT-09
 *   - extractDecisions(cwd)        → EXT-10
 *
 * Missing source files always return { unavailable: true, reason } sentinels.
 * Never returns silent zeros for file-sourced fields.
 */

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

// ─── EXT-01: Project Identity ────────────────────────────────────────────────

/**
 * Extract project identity from PROJECT.md and design-manifest.json.
 *
 * @param {string} cwd - Project root directory
 * @returns {{ name, goal, core_value, product_type, summary } | { unavailable: true, reason: string }}
 */
function extractProjectIdentity(cwd) {
  const projectPath = path.join(cwd, '.planning', 'PROJECT.md');
  const content = safeReadFile(projectPath);

  if (!content) {
    return { unavailable: true, reason: 'PROJECT.md not found' };
  }

  // Extract name from first # heading
  const nameMatch = content.match(/^#\s+(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : null;

  // Extract core_value: look for ## Core Value section or **Core value:** pattern
  let core_value = null;
  const coreValueSectionMatch = content.match(/##\s+Core Value\s*\n\n([\s\S]+?)(?:\n##|\n#|$)/i);
  if (coreValueSectionMatch) {
    core_value = coreValueSectionMatch[1].trim().split('\n')[0].trim();
  } else {
    const coreValueInlineMatch = content.match(/\*\*Core[_ ]?[Vv]alue[:\s*]+\*\*\s*(.+)/);
    if (coreValueInlineMatch) {
      core_value = coreValueInlineMatch[1].trim();
    }
  }

  // Extract goal: look for ## Goal section first, then first paragraph after heading
  let goal = null;
  const goalSectionMatch = content.match(/##\s+Goal\s*\n\n([\s\S]+?)(?:\n##|\n#|$)/i);
  if (goalSectionMatch) {
    goal = goalSectionMatch[1].trim().split('\n')[0].trim();
  } else {
    const lines = content.split('\n');
    let foundHeading = false;
    for (const line of lines) {
      if (!foundHeading && line.startsWith('# ')) {
        foundHeading = true;
        continue;
      }
      if (foundHeading && line.trim() && !line.startsWith('#')) {
        goal = line.trim();
        break;
      }
    }
  }

  // Extract product_type from design-manifest.json
  let product_type = 'unknown';
  const manifestPath = path.join(cwd, '.planning', 'design', 'design-manifest.json');
  const manifestRaw = safeReadFile(manifestPath);
  if (manifestRaw) {
    try {
      const manifest = JSON.parse(manifestRaw);
      if (manifest.productType) {
        product_type = manifest.productType;
      }
    } catch {
      // manifest malformed — keep 'unknown'
    }
  }

  // Extract summary from first 2 substantive paragraphs of body (after heading)
  const bodyMatch = content.match(/^#\s+.+\n([\s\S]+)/m);
  let summary = null;
  if (bodyMatch) {
    const body = bodyMatch[1];
    const paragraphs = body
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p && !p.startsWith('#') && !p.startsWith('**') && p.length > 20);
    if (paragraphs.length > 0) {
      summary = paragraphs.slice(0, 2).join(' ').replace(/\s+/g, ' ').trim();
    }
  }

  return { name, goal, core_value, product_type, summary };
}

// ─── EXT-02: Phase Completion ─────────────────────────────────────────────────

/**
 * Extract phase completion status from STATE.md and ROADMAP.md.
 *
 * @param {string} cwd - Project root directory
 * @returns {{ total, completed, in_progress, planned, current_phase, current_phase_name, progress_percent, milestone, milestone_name, plans_total, plans_completed } | { unavailable: true, reason: string }}
 */
function extractPhaseCompletion(cwd) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const stateContent = safeReadFile(statePath);

  if (!stateContent) {
    return { unavailable: true, reason: 'STATE.md not found' };
  }

  const fm = extractFrontmatter(stateContent);
  const progress = fm.progress || {};

  function toInt(val) {
    if (typeof val === 'number') return val;
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? n : 0;
  }

  const total = toInt(progress.total_phases);
  const completed = toInt(progress.completed_phases);
  const plans_total = toInt(progress.total_plans);
  const plans_completed = toInt(progress.completed_plans);

  const milestone = fm.milestone || null;
  const milestone_name = fm.milestone_name || null;

  const progress_percent = total > 0
    ? Math.round((completed / total) * 100)
    : 0;

  let current_phase = null;
  let current_phase_name = null;
  const phaseLineMatch = stateContent.match(/Phase:\s*(\d+(?:\.\d+)*[A-Z]?)\s+of\s+\d+\s+\(([^)]+)\)/i);
  if (phaseLineMatch) {
    current_phase = phaseLineMatch[1];
    current_phase_name = phaseLineMatch[2].trim();
  } else {
    const stoppedAt = fm.stopped_at;
    if (stoppedAt) {
      const stoppedMatch = String(stoppedAt).match(/Phase\s+(\d+(?:\.\d+)*[A-Z]?)/i);
      if (stoppedMatch) {
        current_phase = stoppedMatch[1];
      }
    }
  }

  let in_progress = 0;
  let planned = 0;

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const roadmapContent = safeReadFile(roadmapPath);
  if (roadmapContent) {
    const stripped = roadmapContent.replace(/<details>[\s\S]*?<\/details>/gi, '');
    const uncheckedMatches = stripped.match(/- \[ \]/g);
    planned = uncheckedMatches ? uncheckedMatches.length : 0;
    in_progress = 0;
  }

  return {
    total,
    completed,
    in_progress,
    planned,
    current_phase,
    current_phase_name,
    progress_percent,
    milestone,
    milestone_name,
    plans_total,
    plans_completed,
  };
}

// ─── EXT-03: Requirements ─────────────────────────────────────────────────────

/**
 * Extract requirement coverage from REQUIREMENTS.md.
 *
 * @param {string} cwd - Project root directory
 * @returns {{ total, completed, blocked, pending, categories } | { unavailable: true, reason: string }}
 */
function extractRequirements(cwd) {
  const reqPath = path.join(cwd, '.planning', 'REQUIREMENTS.md');
  const content = safeReadFile(reqPath);

  if (!content) {
    return { unavailable: true, reason: 'REQUIREMENTS.md not found' };
  }

  const v1SectionMatch = content.match(/^##\s+v1 Requirements\s*\n([\s\S]+?)(?=^##\s+|\Z)/m);
  if (!v1SectionMatch) {
    return {
      total: 0,
      completed: 0,
      blocked: 0,
      pending: 0,
      categories: {},
    };
  }

  const v1Content = v1SectionMatch[1];
  const categoryPattern = /^###\s+(.+)$/m;
  const sections = v1Content.split(categoryPattern);

  const categories = {};
  let total = 0;
  let completed = 0;
  let blocked = 0;

  for (let i = 1; i < sections.length; i += 2) {
    const categoryName = sections[i].trim();
    const categoryContent = sections[i + 1] || '';

    const reqPattern = /^[ \t]*-\s+\[([x ])\]\s+\*\*([A-Z]+-\d+)\*\*[:\s]+(.+)$/gim;
    let match;
    let catTotal = 0;
    let catCompleted = 0;
    let catBlocked = 0;

    while ((match = reqPattern.exec(categoryContent)) !== null) {
      const checkState = match[1];
      const description = match[3] || '';
      catTotal++;

      if (checkState.toLowerCase() === 'x') {
        catCompleted++;
      } else if (/blocked/i.test(description)) {
        catBlocked++;
      }
    }

    if (catTotal > 0) {
      categories[categoryName] = {
        total: catTotal,
        completed: catCompleted,
        blocked: catBlocked,
      };
      total += catTotal;
      completed += catCompleted;
      blocked += catBlocked;
    }
  }

  const pending = total - completed - blocked;

  return { total, completed, blocked, pending, categories };
}

// ─── EXT-04: Design Artifacts ─────────────────────────────────────────────────

/**
 * Extract design artifact inventory from design-manifest.json.
 *
 * @param {string} cwd - Project root directory
 * @returns {{ available, artifact_count, types_covered, has_tokens, has_wireframes, has_mockups } | { unavailable: true, reason: string }}
 */
function extractDesignArtifacts(cwd) {
  const manifestPath = path.join(cwd, '.planning', 'design', 'design-manifest.json');
  const raw = safeReadFile(manifestPath);

  if (!raw) {
    return { unavailable: true, reason: 'design-manifest.json not found' };
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    return { unavailable: true, reason: 'design-manifest.json could not be parsed (invalid JSON)' };
  }

  const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
  const artifact_count = artifacts.length;

  const typeSet = new Set();
  for (const artifact of artifacts) {
    if (artifact.type) typeSet.add(artifact.type);
  }
  const types_covered = Array.from(typeSet);

  const has_wireframes = types_covered.includes('wireframe');
  const has_mockups = types_covered.includes('mockup');

  const tokensValue = manifest.tokens;
  const has_tokens = tokensValue != null
    && typeof tokensValue === 'object'
    && !Array.isArray(tokensValue)
    && Object.keys(tokensValue).length > 0;

  return {
    available: true,
    artifact_count,
    types_covered,
    has_tokens,
    has_wireframes,
    has_mockups,
  };
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
  const logResult = execGit(cwd, ['log', '--pretty=format:%as', '--no-merges']);
  if (logResult.exitCode !== 0) {
    return { unavailable: true, reason: 'git log failed' };
  }

  const dateLines = logResult.stdout ? logResult.stdout.split('\n').filter(Boolean) : [];
  const totalCommits = dateLines.length;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const commitsLast30Days = dateLines.filter(dateStr => {
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && d >= thirtyDaysAgo;
  }).length;

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
 *
 * @param {string} cwd - Project root directory
 * @returns {{ blockers: Array<{text: string, phase: string, type: string}>, risks: Array }}
 */
function extractBlockers(cwd) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const content = safeReadFile(statePath);

  if (!content) {
    return { blockers: [], risks: [] };
  }

  const blockers = [];
  const risks = [];

  const blockersMatch = content.match(/###\s+Blockers\/Concerns\s*\n([\s\S]*?)(?=\n###|\n##|$)/);
  if (blockersMatch) {
    const sectionText = blockersMatch[1];
    const lines = sectionText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      const itemMatch = trimmed.match(/^-\s+\[([^\]]+)\]:\s+(.+)$/);
      if (!itemMatch) continue;

      const sourceTag = itemMatch[1];
      const text = itemMatch[2];

      const phaseMatch = sourceTag.match(/Phase\s+(\d+)/i);
      const phase = phaseMatch ? phaseMatch[1] : sourceTag;

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

      const acPassMatches = content.match(/- \[x\]/gi) || [];
      const acFailMatches = content.match(/- \[ \]/g) || [];
      const acPass = acPassMatches.length;
      const acFail = acFailMatches.length;

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
      topics = entries.map(f => path.basename(f, path.extname(f)));
    } catch {
      projectResearchFiles = 0;
      topics = [];
    }
  }

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
 * Extract decision history from STATE.md and SUMMARY.md key-decisions.
 *
 * @param {string} cwd - Project root directory
 * @returns {Array<{phase: string, summary: string, rationale: string}>}
 */
function extractDecisions(cwd) {
  const decisions = [];

  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const stateContent = safeReadFile(statePath);
  if (stateContent) {
    const decisionsMatch = stateContent.match(/###\s+Decisions\s*\n([\s\S]*?)(?=\n###|\n##|$)/);
    if (decisionsMatch) {
      const sectionText = decisionsMatch[1];
      const lines = sectionText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        const itemMatch = trimmed.match(/^-\s+\[([^\]]+)\]:\s+(.+)$/);
        if (!itemMatch) continue;

        const sourceTag = itemMatch[1];
        const text = itemMatch[2];

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

// ─── Cross-reference validation ───────────────────────────────────────────────

/**
 * Validate cross-references in the composed IR for consistency.
 * Returns an array of warning strings (empty = clean). NON-BLOCKING.
 *
 * @param {object} ir - The composed presentation IR object
 * @returns {string[]} Array of warning strings
 */
function crossRefValidate(ir) {
  const warnings = [];

  const phases = ir.phases;
  const requirements = ir.requirements;
  const verification = ir.verification;

  // Only validate when data is available (no unavailable sentinel)
  if (phases && !phases.unavailable) {
    const total = phases.total;
    const completed = phases.completed;

    if (typeof completed === 'number' && typeof total === 'number') {
      if (completed > total) {
        warnings.push('completed phases exceeds total');
      }
    }

    if (verification && !verification.unavailable) {
      const phasesVerified = verification.phases_verified;
      if (typeof phasesVerified === 'number' && typeof total === 'number') {
        if (phasesVerified > total) {
          warnings.push('verified phases exceeds total phases');
        }
      }
    }
  }

  if (requirements && !requirements.unavailable) {
    const reqTotal = requirements.total;
    const reqCompleted = requirements.completed;

    if (typeof reqCompleted === 'number' && typeof reqTotal === 'number') {
      if (reqCompleted > reqTotal) {
        warnings.push('completed requirements exceeds total');
      }
    }
  }

  return warnings;
}

// ─── IR composer ──────────────────────────────────────────────────────────────

/**
 * Build a complete Presentation IR by composing all 10 extractors.
 * Adds metadata: schema_version, extracted_at, source_hash.
 * Ensures .planning/presentations/ output directory exists.
 * Runs cross-reference validation (non-blocking warnings).
 *
 * @param {string} cwd - Project root directory
 * @returns {object} Complete presentation IR
 */
function buildPresentationIR(cwd) {
  const crypto = require('crypto');

  const blockerData = extractBlockers(cwd);

  const ir = {
    schema_version: '1.0',
    extracted_at: new Date().toISOString(),
    source_hash: '',
    project: extractProjectIdentity(cwd),
    phases: extractPhaseCompletion(cwd),
    requirements: extractRequirements(cwd),
    design_artifacts: extractDesignArtifacts(cwd),
    git_velocity: extractGitVelocity(cwd),
    cost_timing: extractCostTiming(cwd),
    blockers: blockerData.blockers,
    risks: blockerData.risks,
    verification: extractVerification(cwd),
    research: extractResearch(cwd),
    decisions: extractDecisions(cwd),
    output_dir: '.planning/presentations',
    output_dir_created: false,
    cross_ref_warnings: [],
  };

  // Compute source_hash: SHA-256 of key .planning files
  const hashFiles = ['STATE.md', 'ROADMAP.md', 'REQUIREMENTS.md', 'PROJECT.md'];
  const hashContent = hashFiles
    .map(f => safeReadFile(path.join(cwd, '.planning', f)) || '')
    .join('');
  ir.source_hash = crypto.createHash('sha256').update(hashContent, 'utf-8').digest('hex');

  // Run cross-reference validation
  ir.cross_ref_warnings = crossRefValidate(ir);

  // Ensure output directory exists
  const presentationsDir = path.join(cwd, '.planning', 'presentations');
  fs.mkdirSync(presentationsDir, { recursive: true });
  ir.output_dir_created = true;

  return ir;
}

// ─── CLI handler ──────────────────────────────────────────────────────────────

/**
 * CLI handler for `pde-tools presentation artifact-read`.
 * Builds full IR and writes JSON to stdout via output().
 *
 * @param {string} cwd - Project root directory
 * @param {boolean} raw - If true, pass raw flag to output()
 */
function cmdPresentationArtifactRead(cwd, raw) {
  const { output } = require('./core.cjs');
  const ir = buildPresentationIR(cwd);
  output(ir, raw);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  extractProjectIdentity,
  extractPhaseCompletion,
  extractRequirements,
  extractDesignArtifacts,
  extractGitVelocity,
  extractCostTiming,
  extractBlockers,
  extractVerification,
  extractResearch,
  extractDecisions,
  crossRefValidate,
  buildPresentationIR,
  cmdPresentationArtifactRead,
};
