/**
 * validate-skill — Validate a skill file against PDE lint rules
 *
 * Checks frontmatter validity, required XML sections, skill code format and
 * uniqueness, and workflow path existence. Gracefully skips non-skill files
 * (workflow files that lack a skill_code section).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { extractFrontmatter } = require('./frontmatter.cjs');
const { safeReadFile, output, error } = require('./core.cjs');

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_TOOLS = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'Task', 'WebSearch', 'WebFetch'];

const REQUIRED_SECTIONS = [
  { tag: '<purpose>', rule: 'LINT-001', severity: 'error' },
  { tag: '<skill_code>', rule: 'LINT-002', severity: 'error' },
  { tag: '<skill_domain>', rule: 'LINT-003', severity: 'error' },
  { tag: '<context_routing>', rule: 'LINT-004', severity: 'error' },
  { tag: '<process>', rule: 'LINT-005', severity: 'error' },
];

// ─── Core validation logic ─────────────────────────────────────────────────────

/**
 * Validate a skill file and return structured errors + warnings.
 *
 * @param {string} cwd - Working directory (for resolving relative paths)
 * @param {string} skillPath - Path to skill file (relative or absolute)
 * @returns {{ valid: boolean, errors: string[], warnings: string[], path: string }}
 */
function validateSkill(cwd, skillPath) {
  const fullPath = path.isAbsolute(skillPath) ? skillPath : path.join(cwd, skillPath);
  const content = safeReadFile(fullPath);

  if (!content) {
    return { valid: false, errors: [`File not found: ${skillPath}`], warnings: [], path: skillPath };
  }

  // ── Non-skill file guard ─────────────────────────────────────────────────
  // If the file has no <skill_code> section AND is in a workflows/ directory,
  // skip skill-specific checks and return early.
  const hasSkillCodeSection = content.includes('<skill_code>');
  if (!hasSkillCodeSection && skillPath.includes('workflows/')) {
    return { valid: true, skipped: true, reason: 'not a skill file', path: skillPath };
  }

  const errors = [];
  const warnings = [];

  // ── Frontmatter checks ───────────────────────────────────────────────────
  const fm = extractFrontmatter(content);

  if (!fm.name) {
    errors.push('Missing required frontmatter field: name');
  }
  if (!fm.description) {
    errors.push('Missing required frontmatter field: description');
  }

  if (!fm['allowed-tools']) {
    errors.push('Missing required frontmatter field: allowed-tools (LINT-024)');
  } else if (!Array.isArray(fm['allowed-tools'])) {
    errors.push('Frontmatter field allowed-tools must be an array (LINT-024)');
  } else {
    for (const tool of fm['allowed-tools']) {
      if (!VALID_TOOLS.includes(tool)) {
        errors.push(`Unknown tool '${tool}' in allowed-tools — must be one of: ${VALID_TOOLS.join(', ')} (LINT-024)`);
      }
    }
  }

  // ── Required XML sections ────────────────────────────────────────────────
  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section.tag)) {
      errors.push(`Missing required section ${section.tag} (${section.rule})`);
    }
  }

  // ── Skill code format + uniqueness ──────────────────────────────────────
  const skillCodeMatch = content.match(/<skill_code>\s*([A-Z]{2,4})\s*<\/skill_code>/);
  if (hasSkillCodeSection && !skillCodeMatch) {
    errors.push('skill_code section exists but does not contain a valid 2-4 uppercase letter code (LINT-002)');
  } else if (skillCodeMatch) {
    const code = skillCodeMatch[1];

    // Check skill-registry.md for code uniqueness
    const registryPath = path.join(cwd, 'skill-registry.md');
    const registry = safeReadFile(registryPath);
    if (registry) {
      // Count occurrences of "| CODE |" pattern in registry
      const pattern = new RegExp('\\|\\s*' + code + '\\s*\\|', 'g');
      const matches = registry.match(pattern);
      const count = matches ? matches.length : 0;

      if (count === 0) {
        warnings.push(`Skill code '${code}' not found in skill-registry.md — register it to pass LINT-010`);
      } else if (count > 1) {
        errors.push(`Skill code '${code}' appears ${count} times in skill-registry.md — must be unique (LINT-011)`);
      }
    } else {
      warnings.push('skill-registry.md not found — cannot validate skill code uniqueness (LINT-010)');
    }
  }

  // ── Workflow path existence ──────────────────────────────────────────────
  // Look for @${CLAUDE_PLUGIN_ROOT}/workflows/FILENAME.md and @workflows/ patterns
  const workflowRefPattern = /@(?:\$\{CLAUDE_PLUGIN_ROOT\}\/)?workflows\/([^\s"'\n]+\.md)/g;
  let wfMatch;
  while ((wfMatch = workflowRefPattern.exec(content)) !== null) {
    const workflowFile = wfMatch[1];
    const workflowFullPath = path.join(cwd, 'workflows', workflowFile);
    if (!fs.existsSync(workflowFullPath)) {
      errors.push(`Referenced workflow file does not exist: workflows/${workflowFile}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    path: skillPath,
  };
}

// ─── CLI command ─────────────────────────────────────────────────────────────

/**
 * CLI entry point for `pde-tools validate-skill <path>`.
 *
 * @param {string} cwd - Working directory
 * @param {string} skillPath - Path to skill file
 * @param {boolean} raw - If true, output raw JSON
 */
function cmdValidateSkill(cwd, skillPath, raw) {
  if (!skillPath) {
    error('skill path required: validate-skill <path>');
  }

  const result = validateSkill(cwd, skillPath);

  if (!raw) {
    if (result.skipped) {
      process.stdout.write('SKIPPED: ' + result.path + ' — ' + result.reason + '\n');
    } else {
      const status = result.valid ? 'PASS' : 'FAIL';
      process.stdout.write('\n' + status + ': ' + result.path + '\n');
      if (result.errors.length > 0) {
        process.stdout.write('\nErrors:\n');
        for (const e of result.errors) {
          process.stdout.write('  [error] ' + e + '\n');
        }
      }
      if (result.warnings.length > 0) {
        process.stdout.write('\nWarnings:\n');
        for (const w of result.warnings) {
          process.stdout.write('  [warning] ' + w + '\n');
        }
      }
      process.stdout.write('\nSummary: ' + result.errors.length + ' error(s), ' + result.warnings.length + ' warning(s)\n');
    }
  }

  output(result, raw);
}

module.exports = { cmdValidateSkill };
