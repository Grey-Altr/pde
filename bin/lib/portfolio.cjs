/**
 * portfolio.cjs — Cross-project portfolio extraction layer
 *
 * Extracts multi-project IR, schema version detection, and milestone history
 * for the cross-project portfolio synthesis pipeline.
 *
 * PORT-01: buildPortfolioIR accepts N project paths, returns portfolioIR
 * PORT-02: extractMilestoneHistory reads MILESTONES.md
 * PORT-04: detectSchemaVersion reads STATE.md frontmatter
 * PORT-05: All per-project errors return { unavailable: true, reason } — never throw
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── 1. detectSchemaVersion ───────────────────────────────────────────────────

/**
 * Detect the .planning/ schema version for a project path.
 * Reads STATE.md frontmatter — gsd_state_version field is authoritative.
 *
 * @param {string} cwd - Absolute project root path
 * @returns {{ version: string, source: string } | { version: 'unknown', reason: string }}
 */
function detectSchemaVersion(cwd) {
  const { safeReadFile } = require('./core.cjs');
  const { extractFrontmatter } = require('./frontmatter.cjs');

  const statePath = path.join(cwd, '.planning', 'STATE.md');
  const content = safeReadFile(statePath);

  if (!content) {
    return { version: 'unknown', reason: 'STATE.md not found at ' + statePath };
  }

  const fm = extractFrontmatter(content);

  // Check gsd_state_version field first (v1.0+ schema)
  if (fm.gsd_state_version) {
    return {
      version: String(fm.gsd_state_version),
      source: 'STATE.md gsd_state_version',
    };
  }

  // Check progress block (pre-1.0-modern schema)
  if (fm.progress && typeof fm.progress === 'object') {
    return {
      version: 'pre-1.0-modern',
      source: 'STATE.md progress block',
    };
  }

  // Has STATE.md but no recognized structure
  return {
    version: 'unknown',
    reason: 'STATE.md found but no recognized schema markers',
  };
}

// ─── 2. extractMilestoneHistory ───────────────────────────────────────────────

/**
 * Extract milestone history from MILESTONES.md.
 * Regex: ## vX.Y Name (Shipped: date)
 *
 * @param {string} cwd - Absolute project root path
 * @returns {{ available: true, count: number, milestones: Array } | { unavailable: true, reason: string }}
 */
function extractMilestoneHistory(cwd) {
  const { safeReadFile } = require('./core.cjs');

  const milestonesPath = path.join(cwd, '.planning', 'MILESTONES.md');
  const content = safeReadFile(milestonesPath);

  if (!content) {
    return { unavailable: true, reason: 'MILESTONES.md not found at ' + milestonesPath };
  }

  const milestones = [];
  // Match: ## v0.21 Desktop App Integration (Shipped: 2026-03-29)
  const re = /^##\s+(v[\d.]+)\s+(.+?)\s+\(Shipped:\s*([^)]+)\)/gm;
  let match;
  while ((match = re.exec(content)) !== null) {
    const version = match[1];
    const name = match[2];
    const shipped = match[3];

    // Try to extract phases_completed from following content
    let phases_completed = null;
    const afterHeading = content.slice(match.index + match[0].length, match.index + match[0].length + 200);
    const phasesMatch = afterHeading.match(/\*\*Phases completed:\*\*\s*(\d+)\s*phases/);
    if (phasesMatch) phases_completed = parseInt(phasesMatch[1], 10);

    milestones.push({
      version: version.trim(),
      name: name.trim(),
      shipped: shipped.trim(),
      phases_completed,
    });
  }

  if (milestones.length === 0) {
    return { unavailable: true, reason: 'No milestone entries found in MILESTONES.md' };
  }

  return {
    available: true,
    count: milestones.length,
    milestones,
  };
}

// ─── 3. buildPortfolioIR ──────────────────────────────────────────────────────

/**
 * Build a portfolioIR by aggregating per-project IRs.
 * Each project either returns its data or an unavailable sentinel (PORT-05).
 *
 * @param {string[]} projectPaths - Array of absolute project root paths
 * @returns {object} portfolioIR
 */
function buildPortfolioIR(projectPaths) {
  const projects = projectPaths.map(function(rawPath) {
    const projectPath = path.resolve(rawPath);
    try {
      // Check .planning/ directory exists
      const planningDir = path.join(projectPath, '.planning');
      if (!fs.existsSync(planningDir)) {
        return {
          path: projectPath,
          unavailable: true,
          reason: '.planning/ directory not found at ' + projectPath,
        };
      }

      // Extract single-project IR
      const { buildPresentationIR } = require('./presentation.cjs');
      let ir;
      try {
        ir = buildPresentationIR(projectPath);
      } catch (e) {
        return {
          path: projectPath,
          unavailable: true,
          reason: 'buildPresentationIR failed: ' + e.message,
        };
      }

      const milestoneHistory = extractMilestoneHistory(projectPath);
      const schemaVersion = detectSchemaVersion(projectPath);

      return {
        path: projectPath,
        unavailable: false,
        ir,
        milestoneHistory,
        schemaVersion,
      };
    } catch (e) {
      // PORT-05: never throw — catch any unexpected error
      return {
        path: projectPath,
        unavailable: true,
        reason: 'Unexpected error: ' + e.message,
      };
    }
  });

  const available_count = projects.filter(function(p) { return !p.unavailable; }).length;

  return {
    schema_version: '1.0',
    extracted_at: new Date().toISOString(),
    project_count: projectPaths.length,
    available_count,
    projects,
  };
}

// ─── 4. cmdPortfolioBuild ─────────────────────────────────────────────────────

/**
 * CLI handler for pde-tools portfolio build [paths...].
 * Validates paths, builds portfolioIR, outputs JSON to stdout.
 *
 * @param {string} cwd - Invoking project's working directory
 * @param {string[]} paths - Project paths from CLI args
 * @param {boolean} raw - Raw output flag
 */
function cmdPortfolioBuild(cwd, paths, raw) {
  const { output } = require('./core.cjs');

  if (!paths || paths.length === 0) {
    // Allow empty paths — returns empty portfolioIR
    const portfolioIR = buildPortfolioIR([]);
    output(portfolioIR, raw);
    return;
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
