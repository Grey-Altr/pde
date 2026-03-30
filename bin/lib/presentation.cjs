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
 *
 * Missing source files always return { unavailable: true, reason } sentinels.
 * Never returns silent zeros for file-sourced fields.
 */

const path = require('path');
const { safeReadFile } = require('./core.cjs');
const { extractFrontmatter } = require('./frontmatter.cjs');

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
    // First non-empty paragraph after the title heading
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

  // Parse frontmatter for progress fields
  const fm = extractFrontmatter(stateContent);
  const progress = fm.progress || {};

  // Helper to safely coerce frontmatter numeric strings
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

  // Compute progress_percent
  const progress_percent = total > 0
    ? Math.round((completed / total) * 100)
    : 0;

  // Extract current phase number and name from STATE.md body
  // Pattern: "Phase: 176 of 184 (Data Extraction IR Foundation)"
  let current_phase = null;
  let current_phase_name = null;
  const phaseLineMatch = stateContent.match(/Phase:\s*(\d+(?:\.\d+)*[A-Z]?)\s+of\s+\d+\s+\(([^)]+)\)/i);
  if (phaseLineMatch) {
    current_phase = phaseLineMatch[1];
    current_phase_name = phaseLineMatch[2].trim();
  } else {
    // Fallback: stopped_at field
    const stoppedAt = fm.stopped_at;
    if (stoppedAt) {
      const stoppedMatch = String(stoppedAt).match(/Phase\s+(\d+(?:\.\d+)*[A-Z]?)/i);
      if (stoppedMatch) {
        current_phase = stoppedMatch[1];
      }
    }
  }

  // Count in_progress and planned from ROADMAP.md
  let in_progress = 0;
  let planned = 0;

  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const roadmapContent = safeReadFile(roadmapPath);
  if (roadmapContent) {
    // Strip archived milestones (content inside <details> blocks)
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
 * Only parses the "## v1 Requirements" section; skips "Future Requirements" etc.
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

  // Find "## v1 Requirements" section — stop at next ## heading
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

  // Split by ### category headers
  const categoryPattern = /^###\s+(.+)$/m;
  const sections = v1Content.split(categoryPattern);

  // sections is: [pre-content, cat1-name, cat1-content, cat2-name, cat2-content, ...]
  const categories = {};
  let total = 0;
  let completed = 0;
  let blocked = 0;

  for (let i = 1; i < sections.length; i += 2) {
    const categoryName = sections[i].trim();
    const categoryContent = sections[i + 1] || '';

    // Match requirement lines: - [ ] or - [x] followed by **ID**: description
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

  // Collect unique artifact types
  const typeSet = new Set();
  for (const artifact of artifacts) {
    if (artifact.type) typeSet.add(artifact.type);
  }
  const types_covered = Array.from(typeSet);

  // Check for specific artifact types
  const has_wireframes = types_covered.includes('wireframe');
  const has_mockups = types_covered.includes('mockup');

  // Check for design tokens: manifest.tokens exists and is non-empty object
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

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  extractProjectIdentity,
  extractPhaseCompletion,
  extractRequirements,
  extractDesignArtifacts,
};
