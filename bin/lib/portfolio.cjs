/**
 * portfolio.cjs — Multi-project IR extraction layer
 *
 * Reads N project directories, detects schema versions, extracts milestone
 * history, and composes a portfolioIR object for cross-project synthesis.
 *
 * Exports: detectSchemaVersion, extractMilestoneHistory, buildPortfolioIR, cmdPortfolioBuild
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { safeReadFile, output, error } = require('./core.cjs');
const { extractFrontmatter } = require('./frontmatter.cjs');

// ─── detectSchemaVersion ──────────────────────────────────────────────────────

/**
 * Detect the GSD schema version used in a project by reading STATE.md.
 *
 * @param {string} cwd - Absolute path to the project root
 * @returns {{ version: string, source?: string, reason?: string }}
 *   version: '1.0' | 'pre-1.0-modern' | 'pre-1.0-legacy' | 'unknown'
 */
function detectSchemaVersion(cwd) {
  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const content = safeReadFile(statePath);

  if (!content) {
    return { version: 'unknown', reason: 'STATE.md not found' };
  }

  // Check for gsd_state_version in frontmatter (v1.0+)
  const hasFrontmatter = content.match(/^---\n/);
  if (hasFrontmatter) {
    const fm = extractFrontmatter(content);
    if (fm.gsd_state_version) {
      return {
        version: String(fm.gsd_state_version),
        source: 'STATE.md gsd_state_version',
      };
    }

    // Has frontmatter but no gsd_state_version — check for progress block
    if (fm.progress !== undefined || content.includes('progress:')) {
      return { version: 'pre-1.0-modern', source: 'STATE.md progress block' };
    }
  }

  // No frontmatter at all — legacy format
  if (content.trim().length > 0) {
    return { version: 'pre-1.0-legacy', source: 'STATE.md legacy format' };
  }

  return { version: 'unknown', reason: 'STATE.md empty or unrecognized' };
}

// ─── extractMilestoneHistory ──────────────────────────────────────────────────

/**
 * Extract milestone history from MILESTONES.md.
 *
 * @param {string} cwd - Absolute path to the project root
 * @returns {{ available: true, count: number, milestones: Array } | { unavailable: true, reason: string }}
 */
function extractMilestoneHistory(cwd) {
  const milestonesPath = path.join(cwd, '.planning', 'MILESTONES.md');
  const content = safeReadFile(milestonesPath);

  if (!content) {
    return { unavailable: true, reason: 'MILESTONES.md not found' };
  }

  if (!content.trim()) {
    return { unavailable: true, reason: 'MILESTONES.md is empty' };
  }

  // Parse milestone headings: ## vX.Y Name (Shipped: YYYY-MM-DD)
  const milestoneRegex = /^##\s+(v[\d.]+)\s+(.+?)\s+\(Shipped:\s*([^)]+)\)/gm;
  const milestones = [];
  let match;

  while ((match = milestoneRegex.exec(content)) !== null) {
    milestones.push({
      version: match[1].trim(),
      name: match[2].trim(),
      shipped: match[3].trim(),
    });
  }

  if (milestones.length === 0) {
    return { unavailable: true, reason: 'No shipped milestones found in MILESTONES.md' };
  }

  return {
    available: true,
    count: milestones.length,
    milestones,
  };
}

// ─── buildPortfolioIR ─────────────────────────────────────────────────────────

/**
 * Build a portfolioIR object from an array of project directory paths.
 *
 * For each path:
 *   - Checks .planning/ directory exists
 *   - Calls buildPresentationIR (wrapped in try/catch)
 *   - Extracts milestone history and schema version
 *   - Returns per-project sentinel { unavailable: true, reason } on any failure
 *
 * @param {string[]} projectPaths - Array of absolute project root paths
 * @returns {object} portfolioIR
 */
function buildPortfolioIR(projectPaths) {
  const { buildPresentationIR } = require('./presentation.cjs');

  const projects = (projectPaths || []).map(function(projectPath) {
    const absPath = path.isAbsolute(projectPath)
      ? projectPath
      : path.resolve(projectPath);

    // Check .planning/ exists
    const planningDir = path.join(absPath, '.planning');
    let planningExists = false;
    try {
      planningExists = fs.statSync(planningDir).isDirectory();
    } catch (_) {
      planningExists = false;
    }

    if (!planningExists) {
      return {
        path: absPath,
        unavailable: true,
        reason: '.planning/ directory not found at ' + absPath,
      };
    }

    // Extract IR — wrap in try/catch so any error returns sentinel
    let ir;
    try {
      ir = buildPresentationIR(absPath);
    } catch (extractErr) {
      return {
        path: absPath,
        unavailable: true,
        reason: 'buildPresentationIR failed: ' + (extractErr && extractErr.message ? extractErr.message : String(extractErr)),
      };
    }

    // Extract supporting data (these never throw — they return sentinels internally)
    const milestoneHistory = extractMilestoneHistory(absPath);
    const schemaVersion = detectSchemaVersion(absPath);

    return {
      path: absPath,
      unavailable: false,
      ir,
      milestoneHistory,
      schemaVersion,
    };
  });

  const availableCount = projects.filter(function(p) { return !p.unavailable; }).length;

  return {
    schema_version: '1.0',
    extracted_at: new Date().toISOString(),
    project_count: projects.length,
    available_count: availableCount,
    projects,
  };
}

// ─── cmdPortfolioBuild ────────────────────────────────────────────────────────

/**
 * CLI handler for `pde-tools portfolio build`.
 *
 * @param {string} cwd - Working directory (used for relative path resolution)
 * @param {string[]} paths - Array of project paths (absolute or relative to cwd)
 * @param {boolean} raw - If true, pass raw flag to output()
 */
function cmdPortfolioBuild(cwd, paths, raw) {
  if (!paths || paths.length === 0) {
    error('At least one project path is required. Usage: pde-tools portfolio build <path1> [path2...]');
  }

  // Resolve relative paths against cwd
  const resolvedPaths = paths.map(function(p) {
    return path.isAbsolute(p) ? p : path.resolve(cwd, p);
  });

  const portfolioIR = buildPortfolioIR(resolvedPaths);
  output(portfolioIR, raw);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  detectSchemaVersion,
  extractMilestoneHistory,
  buildPortfolioIR,
  cmdPortfolioBuild,
};
