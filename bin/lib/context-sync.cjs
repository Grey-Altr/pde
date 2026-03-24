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

// ─── Loop-break hash comparison ─────────────────────────────────────────────

/**
 * Regex to extract the embedded source hash from a PDE-GENERATED comment.
 * DERIVED from makeHeader() output — not a duplicated magic string.
 * If makeHeader() format changes, this regex auto-updates.
 * Matches: <!-- PDE-GENERATED | hash:<64hex> | generated:<ISO> -->
 */
const _sampleHeader = makeHeader('0'.repeat(64), '2000-01-01T00:00:00.000Z');
const _escaped = _sampleHeader
  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  .replace('0'.repeat(64), '([a-f0-9]{64})')
  .replace('2000-01-01T00:00:00\\.000Z', '([^>]+)');
const PDE_HASH_RE = new RegExp(_escaped);

/**
 * Determine whether a changed editor file was written by PDE or by a human/external tool.
 * Called before any reverse parse operation to prevent emission loops.
 *
 * @param {string|null} fileContent - Full content of the changed editor file
 * @param {string} planningDir - Absolute path to .planning/
 * @returns {'skip'|'proceed'} 'skip' = PDE-written (no loop); 'proceed' = external edit
 */
function computeLoopBreak(fileContent, planningDir) {
  if (!fileContent) return 'skip'; // Empty or null — not actionable
  const match = fileContent.match(PDE_HASH_RE);
  if (!match) return 'skip'; // No valid PDE-GENERATED marker — user-authored or malformed, skip
  const embeddedHash = match[1];
  const currentHash = computeSourceHash(planningDir);
  return embeddedHash === currentHash ? 'skip' : 'proceed';
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

// ─── Color Conversion ────────────────────────────────────────────────────────

/**
 * Convert an OKLCH color string to a 7-char hex code.
 * Passthrough for non-OKLCH strings.
 * Uses OKLCH -> OKLAB -> linear sRGB -> gamma sRGB -> hex pipeline.
 * Clamps linear RGB to [0,1] for gamut safety.
 *
 * @param {string} oklchStr - e.g. "oklch(0.7 0.15 150)"
 * @returns {string} "#rrggbb" hex code or original string if not OKLCH
 */
function oklchToHex(oklchStr) {
  const match = String(oklchStr).match(/oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\)/);
  if (!match) return oklchStr;

  const L = parseFloat(match[1]);
  const C = parseFloat(match[2]);
  const H = parseFloat(match[3]) * (Math.PI / 180);

  // OKLCH -> OKLAB
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);

  // OKLAB -> LMS (cube roots)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS -> linear sRGB
  let rLin =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // sRGB gamma encoding with clamp
  function gamma(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return x >= 0.0031308
      ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055
      : 12.92 * x;
  }

  const rG = gamma(rLin);
  const gG = gamma(gLin);
  const bG = gamma(bLin);

  function toHex(v) {
    return Math.round(v * 255).toString(16).padStart(2, '0');
  }

  return '#' + toHex(rG) + toHex(gG) + toHex(bG);
}

// ─── Stitch Source Detection ────────────────────────────────────────────────

/**
 * Check if a manifest source value indicates a Stitch origin.
 * Uses exact equality -- NOT includes() or startsWith().
 *
 * @param {string|undefined|null} source - Manifest artifact source field
 * @returns {boolean} True if source is "stitch" or "antigravity-stitch"
 */
function isStitchSource(source) {
  return source === 'stitch' || source === 'antigravity-stitch';
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

// ─── Antigravity SKILL.md Emitter ────────────────────────────────────────────

/**
 * Emit .agent/skills/pde-design/SKILL.md for Antigravity Agent Manager.
 * @param {object} ir - Context IR
 * @param {string} projectRoot - Project root directory
 * @returns {object} Result: { written, path }
 */
function emitAntigravitySkill(ir, projectRoot) {
  const skillDir = path.join(projectRoot, '.agent', 'skills', 'pde-design');
  fs.mkdirSync(skillDir, { recursive: true });

  const header = makeHeader(ir.sourceHash, ir.generatedAt);
  const content = [
    header,
    '---',
    'name: pde-design',
    'description: PDE design system context -- query palette colors, typography rules, spacing scale, and component patterns for the current project',
    '---',
    '',
    `# PDE Design System`,
    '',
    '## Goal',
    '',
    `Provide design system context for ${ir.projectName} to enable consistent`,
    "code generation aligned with the project's visual identity.",
    '',
    '## Instructions',
    '',
    '1. Check DESIGN.md at project root for full design DNA (palette, typography, spacing)',
    '2. Design tokens are in DTCG format at .planning/design/SYS-tokens.json',
    '3. Component patterns are documented in handoff specs at .planning/design/handoff/',
    '',
    '## Design Tokens Available',
    '',
    ir.designTokens,
    '',
    '## Component Catalog',
    '',
    ir.componentCatalog,
    '',
    '## Constraints',
    '',
    '- Use hex color values from DESIGN.md, not raw OKLCH from token files',
    '- Follow typography hierarchy defined in DESIGN.md section 3',
    '- Spacing uses the base unit defined in DESIGN.md section 5',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content, 'utf-8');
  return { written: true, path: '.agent/skills/pde-design/SKILL.md' };
}

// ─── DESIGN.md Emitter ──────────────────────────────────────────────────────

/**
 * Read DTCG color tokens from design-manifest.json.
 * @param {string} planningDir - Absolute path to .planning/
 * @returns {object|null} Tokens object with color entries or null
 */
function readDesignTokens(planningDir) {
  const manifestRaw = safeReadFile(path.join(planningDir, 'design', 'design-manifest.json'));
  if (!manifestRaw) return null;
  try {
    const manifest = JSON.parse(manifestRaw);
    if (manifest && manifest.tokens && manifest.tokens.color) {
      return manifest.tokens;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Emit DESIGN.md in Antigravity Design DNA format from DTCG tokens.
 * Gracefully handles missing tokens with placeholder content.
 * @param {object} ir - Context IR
 * @param {string} projectRoot - Project root directory
 * @param {string} planningDir - .planning/ directory path
 * @returns {object} Result: { written, path, placeholder? }
 */
function emitDesignMd(ir, projectRoot, planningDir) {
  const header = makeHeader(ir.sourceHash, ir.generatedAt);
  const tokens = readDesignTokens(planningDir);

  if (!tokens || !tokens.color) {
    // Placeholder DESIGN.md when no tokens exist
    const content = [
      header,
      `# Design System: ${ir.projectName}`,
      '',
      'Design tokens not yet generated -- run the PDE design pipeline to populate this file.',
      '',
      '## 1. Visual Theme & Atmosphere',
      '',
      'Not yet generated.',
      '',
      '## 2. Color Palette & Roles',
      '',
      'Not yet generated.',
      '',
      '## 3. Typography Rules',
      '',
      'Not yet generated.',
      '',
      '## 4. Component Stylings',
      '',
      'Not yet generated.',
      '',
      '## 5. Layout Principles',
      '',
      'Not yet generated.',
      '',
    ].join('\n');

    fs.writeFileSync(path.join(projectRoot, 'DESIGN.md'), content, 'utf-8');
    return { written: true, path: 'DESIGN.md', placeholder: true };
  }

  // Build color palette with hex conversion
  const colorEntries = Object.entries(tokens.color).map(([name, token]) => {
    const hex = oklchToHex(token.$value || token.value || '');
    const role = name.charAt(0).toUpperCase() + name.slice(1);
    return `- **${role}** (${hex}) -- ${name} color role`;
  });

  // Typography info
  let typographySection = 'Typography tokens not available.';
  if (tokens.typography) {
    const typoParts = [];
    if (tokens.typography.fontFamily) {
      typoParts.push(`**Primary Font Family:** ${tokens.typography.fontFamily.$value || tokens.typography.fontFamily.value || 'System default'}`);
    }
    typoParts.push('');
    typoParts.push('### Hierarchy & Weights');
    typoParts.push('- **H1:** Bold, standard letter-spacing');
    typoParts.push('- **Body:** Regular weight, comfortable line-height');
    typographySection = typoParts.join('\n');
  }

  // Spacing info
  let spacingSection = 'Spacing tokens not available.';
  if (tokens.spacing) {
    const spacingParts = ['### Whitespace Strategy'];
    for (const [name, token] of Object.entries(tokens.spacing)) {
      const val = token.$value || token.value || '';
      spacingParts.push(`- **${name.charAt(0).toUpperCase() + name.slice(1)}:** ${val}`);
    }
    spacingSection = spacingParts.join('\n');
  }

  const content = [
    header,
    `# Design System: ${ir.projectName}`,
    `**Source Hash:** ${ir.sourceHash.slice(0, 12)}`,
    '',
    '## 1. Visual Theme & Atmosphere',
    '',
    ir.projectSummary,
    '',
    '## 2. Color Palette & Roles',
    '',
    ...colorEntries,
    '',
    '## 3. Typography Rules',
    '',
    typographySection,
    '',
    '## 4. Component Stylings',
    '',
    ir.componentCatalog,
    '',
    '## 5. Layout Principles',
    '',
    spacingSection,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(projectRoot, 'DESIGN.md'), content, 'utf-8');
  return { written: true, path: 'DESIGN.md' };
}

// ─── Sync state file ────────────────────────────────────────────────────────

/**
 * Write persistent sync state file atomically using write-rename pattern.
 * Records the IR snapshot as 3-way merge base for Phase 128.
 * Non-fatal: emitAll() must not throw if this fails.
 * Uses process.pid in tmpPath to avoid race if concurrent hooks fire.
 * @param {object} ir - Full IR object from buildContextIR()
 * @param {string} planningDir - Absolute path to .planning/
 */
function writeStateFile(ir, planningDir) {
  const statePath = path.join(planningDir, '.context-sync-state.json');
  const tmpPath = statePath + '.' + process.pid + '.tmp';
  const state = {
    schemaVersion: '1.0',
    lastEmittedAt: ir.generatedAt,
    lastSourceHash: ir.sourceHash,
    lastIR: {
      techStack: ir.techStack,
      constraints: ir.constraints,
      componentCatalog: ir.componentCatalog,
      designTokens: ir.designTokens,
    },
    pendingIngest: [],
  };
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpPath, statePath);
  } catch {
    // State file write failure is non-fatal — emitAll() contract requires silent resilience
    // Cleanup orphaned tmp file if rename failed
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}

/**
 * Read and validate the persistent sync state file.
 * Returns null if file is missing, corrupt, or wrong schema version.
 * Design note: the broad catch is intentional — permission errors and OOM
 * surface as null (missing state), which is safe because emitAll() recreates
 * the file on every call. Callers must tolerate null gracefully.
 * @param {string} planningDir - Absolute path to .planning/
 * @returns {object|null} Parsed state or null
 */
function readStateFile(planningDir) {
  const statePath = path.join(planningDir, '.context-sync-state.json');
  try {
    const raw = fs.readFileSync(statePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== '1.0') return null;
    return parsed;
  } catch {
    return null;
  }
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
  const antigravitySkill = emitAntigravitySkill(ir, projectRoot);
  const designMd = emitDesignMd(ir, projectRoot, planningDir);

  // Phase 126: Write persistent state file for 3-way merge base (SYN-01, SYN-03)
  writeStateFile(ir, planningDir);

  return {
    agentsMd,
    cursorRules,
    cursorrules,
    geminiMd,
    antigravitySkill,
    designMd,
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
      } else if (editor === 'antigravity') {
        results.antigravitySkill = emitAntigravitySkill(ir, cwd);
        results.designMd = emitDesignMd(ir, cwd, planningDir);
      } else {
        error(`Unknown editor: ${editor}. Available: cursor, gemini, agents, antigravity, all`);
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

// ─── Reverse parsers ─────────────────────────────────────────────────────────

/**
 * Parse a single PDE .mdc rule file content into a partial IR object.
 * Returns null when: content is empty, PDE-GENERATED marker absent, or parse error occurs.
 *
 * @param {string} content - Raw .mdc file content (NOT a file path — caller must read file first)
 * @param {string} filename - Base filename e.g. 'pde-project.mdc' (drives IR field mapping)
 * @returns {object|null} Partial IR with frontmatter fields + mapped IR field, or null on failure
 */
function parseMdcContent(content, filename) {
  if (!content) return null;
  if (!PDE_HASH_RE.test(content)) return null;
  try {
    // Extract YAML frontmatter (between first --- and second ---)
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const block = fmMatch[1];
    const frontmatter = {
      description: (block.match(/^description:\s*(.+)$/m) || [])[1]?.trim() || '',
      globs: (block.match(/^globs:\s*(.+)$/m) || [])[1]?.trim() || null,
      alwaysApply: (block.match(/^alwaysApply:\s*(true|false)$/m) || [])[1] === 'true',
    };

    // Extract body (everything after the closing --- delimiter)
    const closingDelim = content.indexOf('\n---\n', content.indexOf('---\n') + 4);
    const body = closingDelim !== -1 ? content.slice(closingDelim + 5) : '';

    // PDE:BEGIN/PDE:END gate — D-06/D-07
    // If both markers are present and END comes after BEGIN, extract only that region.
    // If either marker is absent (including malformed BEGIN-without-END), fall back:
    //   - D-07 backward compat: no markers -> entire body is PDE-owned
    //   - Malformed (BEGIN without END): markers present but malformed -> nothing extracted
    const BEGIN = '<!-- PDE:BEGIN -->';
    const END   = '<!-- PDE:END -->';
    const bi = body.indexOf(BEGIN);
    const ei = body.indexOf(END);
    let pdeOwned;
    if (bi !== -1 && ei !== -1 && ei > bi) {
      // Both markers present and valid — extract content between them
      pdeOwned = body.slice(bi + BEGIN.length, ei).trim();
    } else if (bi !== -1 || ei !== -1) {
      // Malformed: one marker present without the other — extract nothing (D-05)
      pdeOwned = '';
    } else {
      // D-07 backward compat: no markers -> entire body is PDE-owned
      pdeOwned = body;
    }

    // Map section content to IR field by filename
    const partial = { ...frontmatter };
    if (filename === 'pde-project.mdc') {
      partial.constraints = extractSection(pdeOwned, 'Conventions');
    } else if (filename === 'pde-architecture.mdc') {
      partial.techStack = extractSection(pdeOwned, 'Tech Stack');
    } else if (filename === 'pde-design-tokens.mdc') {
      partial.designTokens = extractSection(pdeOwned, 'Design Tokens');
    } else if (filename === 'pde-components.mdc') {
      partial.componentCatalog = extractSection(pdeOwned, 'Component Catalog');
    }
    return partial;
  } catch (err) {
    process.stderr.write(`[context-sync] mdc parse error (${filename}): ${err.message}\n`);
    return null;
  }
}

// ─── AGR-01: SKILL.md Reverse Parser ─────────────────────────────────────────

/**
 * Parse .agent/skills/pde-design/SKILL.md into a partial IR object.
 * Returns null when: content is empty, PDE-GENERATED marker absent,
 * name != pde-design, or parse error occurs.
 * Returns {} (valid empty partial IR) when SKILL.md has no extractable content.
 *
 * @param {string} content - Raw SKILL.md file content
 * @returns {object|null} Partial IR { designTokens?, componentCatalog?, constraints?, agentAdditions? } or null
 */
function parseSkillMd(content) {
  if (!content) return null;
  if (!PDE_HASH_RE.test(content)) return null;
  try {
    // Pitfall 1: PDE-GENERATED marker precedes frontmatter in SKILL.md (marker on line 1, --- on line 2)
    // Strip first HTML comment line before parsing frontmatter
    const withoutHeader = content.replace(/^<!--[^>]+-->\n/, '');

    // Validate frontmatter contains name: pde-design (D-12)
    const fmMatch = withoutHeader.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    if (!/^name:\s*pde-design$/m.test(fmMatch[1])) return null;

    const body = withoutHeader.slice(fmMatch[0].length).trim();
    const partial = {};

    // Pitfall 3: section heading is "Design Tokens Available", NOT "Design Tokens"
    const designTokens = extractSection(body, 'Design Tokens Available');
    if (designTokens !== '') partial.designTokens = designTokens;

    const componentCatalog = extractSection(body, 'Component Catalog');
    if (componentCatalog !== '') partial.componentCatalog = componentCatalog;

    // Pitfall 4: Constraints in SKILL.md are hardcoded strings, not ir.constraints
    const constraints = extractSection(body, 'Constraints');
    if (constraints !== '') partial.constraints = constraints;

    // agentAdditions: sections not in the known list (D-11)
    const KNOWN = ['Goal', 'Instructions', 'Design Tokens Available', 'Component Catalog', 'Constraints'];
    const unknownSections = body.split(/^(?=## )/m).filter(s => {
      const h = s.match(/^## (.+)/)?.[1]?.trim();
      return h && !KNOWN.includes(h);
    });
    if (unknownSections.length > 0) {
      partial.agentAdditions = unknownSections.join('\n').trim();
    }

    return partial;
  } catch (err) {
    process.stderr.write(`[context-sync] skill.md parse error: ${err.message}\n`);
    return null;
  }
}

// ─── AGR-02: DESIGN.md Reverse Parser ────────────────────────────────────────

/**
 * Parse DESIGN.md (Antigravity Design DNA format) into a partial IR object.
 * Returns null when: content is empty, PDE-GENERATED marker absent, or parse error.
 * Returns {} (valid empty partial IR) when DESIGN.md is a placeholder with no color entries.
 *
 * Note: designTokens returned here is a color-list string, not a full token summary.
 * Phase 128 merge engine is responsible for reconciling this with DTCG token data.
 *
 * @param {string} content - Raw DESIGN.md file content
 * @returns {object|null} Partial IR { designTokens? } or null
 */
function parseDesignMd(content) {
  if (!content) return null;
  if (!PDE_HASH_RE.test(content)) return null;
  try {
    // D-08: format version detection — warn if absent, but continue (lenient fallback)
    const isV1 = /<!--\s*pde-format-version:\s*1\.0\s*-->/.test(content);
    if (!isV1) {
      process.stderr.write('[context-sync] design.md: no pde-format-version marker, using lenient fallback\n');
    }

    // Pitfall 5: color pattern applied to entire document (not section-gated) for resilience
    // Pattern matches confirmed emitter output: - **Name** (#hex) -- role
    const colorPattern = /^-\s+\*\*([^*]+)\*\*\s+\(#([a-fA-F0-9]{3,6})\)\s+--\s+(.+)$/gm;
    const colors = [];
    let m;
    while ((m = colorPattern.exec(content)) !== null) {
      colors.push({ name: m[1].trim(), hex: `#${m[2]}`, role: m[3].trim() });
    }

    if (colors.length === 0) return {};

    const designTokens = colors.map(c => `- **${c.name}** (${c.hex}) -- ${c.role}`).join('\n');
    return { designTokens };
  } catch (err) {
    process.stderr.write(`[context-sync] design.md parse error: ${err.message}\n`);
    return null;
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  buildContextIR, emitAll, emitAgentsMd, emitCursorRules, emitCursorrules,
  emitGeminiMd, computeSourceHash, cmdContextSync, oklchToHex,
  isStitchSource, emitAntigravitySkill, emitDesignMd,
  writeStateFile, readStateFile, computeLoopBreak,
  parseMdcContent, parseSkillMd, parseDesignMd,
};
