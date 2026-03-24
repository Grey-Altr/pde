'use strict';

/**
 * context-sync.cjs — IR builder + multi-editor context file emitters
 *
 * Reads .planning/ artifacts into an intermediate representation (IR),
 * then emits editor-specific context files:
 *   - AGENTS.md (cross-tool, Linux Foundation standard)
 *   - .cursor/rules/*.mdc (Cursor modern rules with YAML frontmatter)
 *   - .cursorrules (Cursor legacy, backwards compat)
 *   - GEMINI.md hierarchy (Gemini CLI, @file.md imports)
 *
 * All generated files include SHA-256 source hash and generation timestamp
 * in a PDE-GENERATED HTML comment for freshness detection.
 *
 * Zero npm dependencies — uses only Node.js built-ins + ./core.cjs.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { safeReadFile, output, error } = require('./core.cjs');

// ─── Source files that contribute to the composite hash ─────────────────────

const SOURCE_FILES = [
  'PROJECT.md',
  'STATE.md',
  'design/DESIGN-STATE.md',
  'design/design-manifest.json',
];

// ─── Hash infrastructure ────────────────────────────────────────────────────

/**
 * Compute SHA-256 composite hash over all source .planning/ files.
 * @param {string} planningDir - Absolute path to .planning/
 * @returns {string} 64-char hex SHA-256 hash
 */
function computeSourceHash(planningDir) {
  const hash = crypto.createHash('sha256');
  for (const relPath of SOURCE_FILES) {
    const content = safeReadFile(path.join(planningDir, relPath));
    if (content) hash.update(content);
  }
  // Also hash any handoff specs (sorted by name for determinism)
  const handoffDir = path.join(planningDir, 'design', 'handoff');
  try {
    const files = fs.readdirSync(handoffDir).sort();
    for (const f of files) {
      if (f.endsWith('.md')) {
        const content = safeReadFile(path.join(handoffDir, f));
        if (content) hash.update(content);
      }
    }
  } catch {
    // handoff dir may not exist yet
  }
  return hash.digest('hex');
}

/**
 * Generate PDE-GENERATED header comment with hash and timestamp.
 * @param {string} sourceHash - 64-char hex SHA-256
 * @param {string} generatedAt - ISO 8601 timestamp
 * @returns {string} HTML comment line
 */
function makeHeader(sourceHash, generatedAt) {
  return `<!-- PDE-GENERATED | hash:${sourceHash} | generated:${generatedAt} -->`;
}

// ─── Markdown extraction helpers ────────────────────────────────────────────

/**
 * Extract section content between ## heading and next ## heading (or EOF).
 * @param {string|null} content - Markdown content
 * @param {string} sectionName - Heading text (case-insensitive)
 * @returns {string} Section body (trimmed) or empty string
 */
function extractSection(content, sectionName) {
  if (!content) return '';
  const pattern = new RegExp(
    `^##\\s+${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
    'im'
  );
  const match = content.match(pattern);
  if (!match) return '';
  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const nextHeading = rest.match(/^##\s+/m);
  const body = nextHeading ? rest.slice(0, nextHeading.index) : rest;
  return body.trim();
}

/**
 * Extract project name from the first # heading in markdown.
 * @param {string|null} content - Markdown content
 * @returns {string} Project name or 'Untitled Project'
 */
function extractProjectName(content) {
  if (!content) return 'Untitled Project';
  const match = content.match(/^# (.+)/m);
  return match ? match[1].trim() : 'Untitled Project';
}

/**
 * Extract first 2 paragraphs after the first # heading.
 * @param {string|null} content - Markdown content
 * @returns {string} Summary text or placeholder
 */
function extractProjectSummary(content) {
  if (!content) return 'No project summary available.';
  const headingMatch = content.match(/^# .+$/m);
  if (!headingMatch) return 'No project summary available.';
  const afterHeading = content.slice(headingMatch.index + headingMatch[0].length).trim();
  // Take content until next heading
  const nextHeading = afterHeading.match(/^##?\s+/m);
  const block = nextHeading ? afterHeading.slice(0, nextHeading.index).trim() : afterHeading;
  // Split into paragraphs and take first 2
  const paragraphs = block.split(/\n\n+/).filter(p => p.trim());
  return paragraphs.slice(0, 2).join('\n\n') || 'No project summary available.';
}

/**
 * Extract product type from design manifest or PROJECT.md.
 * @param {object|null} manifest - Parsed design-manifest.json
 * @param {string|null} projectContent - PROJECT.md content
 * @returns {string} Product type or 'unknown'
 */
function extractProductType(manifest, projectContent) {
  if (manifest && manifest.productType) return manifest.productType;
  if (projectContent) {
    const match = projectContent.match(/product[_\s]?type[:\s]+(\w+)/i);
    if (match) return match[1];
  }
  return 'unknown';
}

/**
 * Extract design token summary from manifest.
 * @param {object|null} manifest - Parsed design-manifest.json
 * @returns {string} Token summary text
 */
function extractTokenSummary(manifest) {
  if (!manifest) return 'No design artifacts generated yet.';
  const parts = [];
  if (manifest.tokens) {
    const tokenKeys = Object.keys(manifest.tokens);
    if (tokenKeys.length > 0) {
      parts.push(`Token categories: ${tokenKeys.join(', ')}`);
    }
  }
  if (manifest.designCoverage) {
    const coverage = Object.entries(manifest.designCoverage)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (coverage.length > 0) {
      parts.push(`Design coverage: ${coverage.join(', ')}`);
    }
  }
  if (manifest.artifacts) {
    const artifactCodes = Object.keys(manifest.artifacts);
    if (artifactCodes.length > 0) {
      parts.push(`Artifacts: ${artifactCodes.length} registered`);
    }
  }
  return parts.length > 0 ? parts.join('\n') : 'No design artifacts generated yet.';
}

/**
 * Extract component names and brief descriptions from handoff specs.
 * @param {string} planningDir - Absolute path to .planning/
 * @returns {string} Component catalog text
 */
function extractComponentCatalog(planningDir) {
  const handoffDir = path.join(planningDir, 'design', 'handoff');
  try {
    const files = fs.readdirSync(handoffDir).sort().filter(f => f.endsWith('.md'));
    if (files.length === 0) return 'No component handoff specs available yet.';
    const components = [];
    for (const f of files) {
      const content = safeReadFile(path.join(handoffDir, f));
      if (!content) continue;
      const nameMatch = content.match(/^# (.+)/m);
      const name = nameMatch ? nameMatch[1].trim() : f.replace('.md', '');
      // Extract first paragraph as brief
      const afterHeading = nameMatch
        ? content.slice(nameMatch.index + nameMatch[0].length).trim()
        : content.trim();
      const firstPara = afterHeading.split(/\n\n+/)[0] || '';
      const brief = firstPara.slice(0, 120).replace(/\n/g, ' ').trim();
      components.push(`- **${name}**: ${brief || 'See handoff spec'}`);
    }
    return components.length > 0 ? components.join('\n') : 'No component handoff specs available yet.';
  } catch {
    return 'No component handoff specs available yet.';
  }
}

/**
 * Extract pipeline status from DESIGN-STATE.md.
 * @param {string|null} designState - DESIGN-STATE.md content
 * @returns {string} Pipeline status text
 */
function extractPipelineStatus(designState) {
  if (!designState) return 'Design pipeline not yet initialized.';
  const parts = [];
  // Extract current stage
  const stageMatch = designState.match(/current[_\s]?stage[:\s]+(.+)/i);
  if (stageMatch) parts.push(`Current stage: ${stageMatch[1].trim()}`);
  // Extract completion
  const completionMatch = designState.match(/completion[:\s]+(\d+%?)/i);
  if (completionMatch) parts.push(`Completion: ${completionMatch[1]}`);
  // Extract status
  const statusMatch = designState.match(/status[:\s]+(.+)/i);
  if (statusMatch) parts.push(`Status: ${statusMatch[1].trim()}`);
  return parts.length > 0 ? parts.join('\n') : 'Design pipeline not yet initialized.';
}

// ─── IR Builder ─────────────────────────────────────────────────────────────

/**
 * Build the intermediate representation from .planning/ artifacts.
 * @param {string} planningDir - Absolute path to .planning/
 * @returns {object} Context IR object
 */
function buildContextIR(planningDir) {
  const projectContent = safeReadFile(path.join(planningDir, 'PROJECT.md'));
  const stateContent = safeReadFile(path.join(planningDir, 'STATE.md'));
  const designState = safeReadFile(path.join(planningDir, 'design', 'DESIGN-STATE.md'));
  const manifestRaw = safeReadFile(path.join(planningDir, 'design', 'design-manifest.json'));

  let manifest = null;
  if (manifestRaw) {
    try {
      manifest = JSON.parse(manifestRaw);
    } catch {
      manifest = null;
    }
  }

  const sourceHash = computeSourceHash(planningDir);
  const generatedAt = new Date().toISOString();

  return {
    projectName: extractProjectName(projectContent),
    productType: extractProductType(manifest, projectContent),
    techStack: extractSection(projectContent, 'Tech Stack') || extractSection(projectContent, 'Technology') || 'No tech stack information available.',
    projectSummary: extractProjectSummary(projectContent),
    designTokens: extractTokenSummary(manifest),
    componentCatalog: extractComponentCatalog(planningDir),
    pipelineStatus: extractPipelineStatus(designState),
    constraints: extractSection(projectContent, 'Constraints') || extractSection(projectContent, 'Conventions') || 'No constraints documented.',
    sourceHash,
    generatedAt,
  };
}

// ─── AGENTS.md Emitter ──────────────────────────────────────────────────────

/**
 * Emit AGENTS.md at project root. Skips if user-authored (no PDE-GENERATED marker).
 * @param {object} ir - Context IR
 * @param {string} projectRoot - Project root directory
 * @returns {object} Result: { written, path } or { skipped, reason }
 */
function emitAgentsMd(ir, projectRoot) {
  const agentsPath = path.join(projectRoot, 'AGENTS.md');
  const existing = safeReadFile(agentsPath);
  if (existing && !existing.includes('PDE-GENERATED')) {
    return { skipped: true, reason: 'User-authored AGENTS.md detected' };
  }

  const header = makeHeader(ir.sourceHash, ir.generatedAt);
  const content = [
    header,
    `# ${ir.projectName}`,
    '',
    '## Project Overview',
    ir.projectSummary,
    '',
    '## Tech Stack',
    ir.techStack,
    '',
    '## Design System',
    ir.designTokens,
    '',
    '## Component Catalog',
    ir.componentCatalog,
    '',
    '## Conventions',
    ir.constraints,
    '',
  ].join('\n');

  fs.writeFileSync(agentsPath, content, 'utf-8');
  return { written: true, path: 'AGENTS.md' };
}

// ─── Cursor .mdc Emitter ────────────────────────────────────────────────────

/**
 * Write a single .mdc rule file with YAML frontmatter.
 * @param {string} rulesDir - .cursor/rules/ directory path
 * @param {string} filename - e.g. 'pde-project.mdc'
 * @param {object} opts - { description, globs, alwaysApply, body, header }
 */
function writeMdcRule(rulesDir, filename, { description, globs, alwaysApply, body, header }) {
  const parts = ['---'];
  parts.push(`description: ${description}`);
  if (globs) {
    parts.push(`globs: ${globs}`);
  }
  parts.push(`alwaysApply: ${alwaysApply}`);
  parts.push('---');
  parts.push('');
  parts.push(header);
  parts.push('');
  parts.push(body);

  const content = parts.join('\n');
  fs.writeFileSync(path.join(rulesDir, filename), content, 'utf-8');
}

/**
 * Emit 5 .cursor/rules/*.mdc files.
 * @param {object} ir - Context IR
 * @param {string} projectRoot - Project root directory
 * @returns {object} Result with list of written files
 */
function emitCursorRules(ir, projectRoot) {
  const rulesDir = path.join(projectRoot, '.cursor', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  const header = makeHeader(ir.sourceHash, ir.generatedAt);

  const rules = [
    {
      filename: 'pde-project.mdc',
      description: 'PDE project context',
      globs: null,
      alwaysApply: true,
      body: [
        `# ${ir.projectName}`,
        '',
        `**Product type:** ${ir.productType}`,
        '',
        ir.projectSummary,
        '',
        '## Conventions',
        ir.constraints,
      ].join('\n'),
    },
    {
      filename: 'pde-design-tokens.mdc',
      description: 'PDE design token reference',
      globs: '*.css,*.scss,*.tsx,*.jsx',
      alwaysApply: false,
      body: [
        '## Design Tokens',
        '',
        ir.designTokens,
      ].join('\n'),
    },
    {
      filename: 'pde-components.mdc',
      description: 'PDE component catalog',
      globs: 'src/components/**',
      alwaysApply: false,
      body: [
        '## Component Catalog',
        '',
        ir.componentCatalog,
      ].join('\n'),
    },
    {
      filename: 'pde-architecture.mdc',
      description: 'PDE architecture patterns',
      globs: 'src/**',
      alwaysApply: false,
      body: [
        '## Tech Stack',
        '',
        ir.techStack,
        '',
        '## Architecture Conventions',
        '',
        ir.constraints,
      ].join('\n'),
    },
    {
      filename: 'pde-pipeline.mdc',
      description: 'PDE pipeline status',
      globs: null,
      alwaysApply: true,
      body: [
        '## Pipeline Status',
        '',
        ir.pipelineStatus,
      ].join('\n'),
    },
  ];

  const written = [];
  for (const rule of rules) {
    writeMdcRule(rulesDir, rule.filename, {
      description: rule.description,
      globs: rule.globs,
      alwaysApply: rule.alwaysApply,
      body: rule.body,
      header,
    });
    written.push(rule.filename);
  }

  return { written: true, files: written, path: '.cursor/rules/' };
}

// ─── Legacy .cursorrules Emitter ────────────────────────────────────────────

/**
 * Emit legacy .cursorrules file at project root.
 * @param {object} ir - Context IR
 * @param {string} projectRoot - Project root directory
 * @returns {object} Result
 */
function emitCursorrules(ir, projectRoot) {
  const header = makeHeader(ir.sourceHash, ir.generatedAt);
  const content = [
    header,
    `# ${ir.projectName} - Cursor Rules`,
    '',
    '## Project Context',
    ir.projectSummary,
    '',
    '## Tech Stack',
    ir.techStack,
    '',
    '## Design System',
    ir.designTokens,
    '',
    '## Component APIs',
    ir.componentCatalog,
    '',
    '## Architecture',
    ir.constraints,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(projectRoot, '.cursorrules'), content, 'utf-8');
  return { written: true, path: '.cursorrules' };
}

// ─── GEMINI.md Hierarchy Emitter ────────────────────────────────────────────

/**
 * Emit hierarchical GEMINI.md files + auxiliary summaries for @file imports.
 * @param {object} ir - Context IR
 * @param {string} projectRoot - Project root directory
 * @param {string} planningDir - .planning/ directory path
 * @returns {object} Result with list of written files
 */
function emitGeminiMd(ir, projectRoot, planningDir) {
  const header = makeHeader(ir.sourceHash, ir.generatedAt);
  const written = [];

  // Ensure directories exist
  const designDir = path.join(planningDir, 'design');
  fs.mkdirSync(designDir, { recursive: true });

  // a) Root GEMINI.md
  const rootContent = [
    header,
    `# ${ir.projectName}`,
    '',
    '## Project Context',
    ir.projectSummary,
    '',
    '## Tech Stack',
    ir.techStack,
    '',
    '## Design System',
    '@.planning/design/pde-design-summary.md',
    '',
    '## Pipeline Status',
    '@.planning/pde-pipeline-summary.md',
    '',
    '## Conventions',
    ir.constraints,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(projectRoot, 'GEMINI.md'), rootContent, 'utf-8');
  written.push('GEMINI.md');

  // b) .planning/GEMINI.md
  const planningContent = [
    header,
    '# PDE Planning Context',
    '',
    '## Pipeline Status',
    ir.pipelineStatus,
    '',
    '## Project Requirements',
    `Project: ${ir.projectName}`,
    `Product type: ${ir.productType}`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(planningDir, 'GEMINI.md'), planningContent, 'utf-8');
  written.push('.planning/GEMINI.md');

  // c) .planning/design/GEMINI.md
  const designContent = [
    header,
    '# PDE Design System',
    '',
    '## Design Tokens',
    ir.designTokens,
    '',
    '## Component Catalog',
    ir.componentCatalog,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(designDir, 'GEMINI.md'), designContent, 'utf-8');
  written.push('.planning/design/GEMINI.md');

  // d) Auxiliary: .planning/pde-pipeline-summary.md
  const pipelineSummary = [
    header,
    ir.pipelineStatus,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(planningDir, 'pde-pipeline-summary.md'), pipelineSummary, 'utf-8');
  written.push('.planning/pde-pipeline-summary.md');

  // e) Auxiliary: .planning/design/pde-design-summary.md
  const designSummary = [
    header,
    ir.designTokens,
    '',
    ir.componentCatalog,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(designDir, 'pde-design-summary.md'), designSummary, 'utf-8');
  written.push('.planning/design/pde-design-summary.md');

  return { written: true, files: written, path: 'GEMINI.md (hierarchy)' };
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

/**
 * Build IR and emit all editor context files.
 * @param {string} cwd - Project root directory
 * @returns {object} Summary of all emitter results
 */
function emitAll(cwd) {
  const planningDir = path.join(cwd, '.planning');
  const projectRoot = cwd;

  const ir = buildContextIR(planningDir);

  const agentsMd = emitAgentsMd(ir, projectRoot);
  const cursorRules = emitCursorRules(ir, projectRoot);
  const cursorrules = emitCursorrules(ir, projectRoot);
  const geminiMd = emitGeminiMd(ir, projectRoot, planningDir);

  return {
    agentsMd,
    cursorRules,
    cursorrules,
    geminiMd,
    sourceHash: ir.sourceHash,
    generatedAt: ir.generatedAt,
  };
}

// ─── CLI command ────────────────────────────────────────────────────────────

/**
 * CLI entry point for context-sync command.
 * @param {string} cwd - Project root
 * @param {string[]} args - CLI args after 'context-sync'
 * @param {boolean} raw - Raw output flag
 */
function cmdContextSync(cwd, args, raw) {
  try {
    const editorFlag = args.indexOf('--editor');
    const editor = editorFlag !== -1 && args[editorFlag + 1]
      ? args[editorFlag + 1].toLowerCase()
      : 'all';

    const planningDir = path.join(cwd, '.planning');
    const ir = buildContextIR(planningDir);

    let result;
    if (editor === 'all') {
      result = emitAll(cwd);
    } else {
      // Emit only the requested editor
      const results = {};
      if (editor === 'cursor') {
        results.cursorRules = emitCursorRules(ir, cwd);
        results.cursorrules = emitCursorrules(ir, cwd);
      } else if (editor === 'gemini') {
        results.geminiMd = emitGeminiMd(ir, cwd, planningDir);
      } else if (editor === 'agents') {
        results.agentsMd = emitAgentsMd(ir, cwd);
      } else {
        error(`Unknown editor: ${editor}. Available: cursor, gemini, agents, all`);
        return;
      }
      results.sourceHash = ir.sourceHash;
      results.generatedAt = ir.generatedAt;
      result = results;
    }

    output(result, raw, raw ? JSON.stringify(result, null, 2) : undefined);
  } catch (err) {
    error(`context-sync failed: ${err.message}`);
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  buildContextIR,
  emitAll,
  emitAgentsMd,
  emitCursorRules,
  emitCursorrules,
  emitGeminiMd,
  computeSourceHash,
  cmdContextSync,
};
