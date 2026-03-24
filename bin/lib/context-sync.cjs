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

const WRITABLE_FIELDS = ['techStack', 'constraints', 'componentCatalog', 'designTokens'];
const VALID_POLICIES = ['planning-wins', 'editor-wins', 'prompt'];

// Files snapshotted before each write-back batch (INF-07)
var WRITE_BACK_FILES = ['.planning/PROJECT.md', '.planning/design/design-manifest.json'];

// AGR-05: Marker delineating PDE-generated content from agent-written additions
const AGENT_MARKER = '<!-- AGENT-ADDITIONS: DO NOT EDIT THIS LINE -->';

// AGR-06: SKILL.md format version marker
var SKILL_VERSION_MARKER = '<!-- pde-skill-version: 1.0 -->';

// AGR-06: Pipeline stages for extractWorkflows
var PIPELINE_STAGES = [
  { name: 'System Tokens (/pde:system)', marker: 'SYS' },
  { name: 'Wireframes (/pde:wireframe)', marker: 'WFR' },
  { name: 'Mockups (/pde:mockup)', marker: 'MCK' },
  { name: 'Handoff Specs (/pde:handoff)', marker: 'HND' },
  { name: 'Visual Regression (/pde:visual-regression)', marker: 'VRG' },
];

// ─── Monitored editor output files (SYN-04, CUR-03) ─────────────────────────
// All editor output paths tracked for reverse-sync mtime detection
const MONITORED_FILES = [
  { path: '.cursor/rules/pde-project.mdc',      parser: 'mdc', filename: 'pde-project.mdc' },
  { path: '.cursor/rules/pde-architecture.mdc',  parser: 'mdc', filename: 'pde-architecture.mdc' },
  { path: '.cursor/rules/pde-design-tokens.mdc', parser: 'mdc', filename: 'pde-design-tokens.mdc' },
  { path: '.cursor/rules/pde-components.mdc',    parser: 'mdc', filename: 'pde-components.mdc' },
  { path: '.cursor/rules/pde-pipeline.mdc',      parser: 'mdc', filename: 'pde-pipeline.mdc' },
  { path: '.agent/skills/pde-design/SKILL.md',   parser: 'skill' },
  { path: 'DESIGN.md',                           parser: 'design' },
];

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
 * Extract workflow checklist from DESIGN-STATE.md for SKILL.md Workflows section.
 * @param {string} planningDir - Absolute path to .planning/
 * @returns {string} Checklist of pipeline stages with [x]/[ ] status
 */
function extractWorkflows(planningDir) {
  const designStateContent = safeReadFile(path.join(planningDir, 'design', 'DESIGN-STATE.md'));
  if (!designStateContent || !designStateContent.trim()) {
    return 'Design pipeline not yet initialized.';
  }
  // Extract ## Domain Files section
  const domainFilesSection = extractSection(designStateContent, 'Domain Files');
  if (!domainFilesSection || !domainFilesSection.trim()) {
    return 'Design pipeline not yet initialized.';
  }
  const lines = PIPELINE_STAGES.map(function(stage) {
    const checked = domainFilesSection.includes(stage.marker);
    return (checked ? '[x] ' : '[ ] ') + stage.name;
  });
  return lines.join('\n');
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

/**
 * Convert hex color (#rrggbb or #rgb) to OKLCH string with 4-decimal precision.
 * Reverse of oklchToHex(). Pipeline: hex -> sRGB -> linear -> LMS -> OKLAB -> OKLCH.
 * @param {string} hexStr - 7-char or 4-char hex color string
 * @returns {string} 'oklch(L C H)' with 4-decimal precision
 */
function hexToOklch(hexStr) {
  let h = hexStr.replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const r = parseInt(h.slice(0,2),16)/255;
  const g = parseInt(h.slice(2,4),16)/255;
  const b = parseInt(h.slice(4,6),16)/255;

  function linearize(c) {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  const rL = linearize(r), gL = linearize(g), bL = linearize(b);

  // linear sRGB -> LMS (forward M matrix)
  const l = 0.4122214708*rL + 0.5363325363*gL + 0.0514459929*bL;
  const m = 0.2119034982*rL + 0.6806995451*gL + 0.1073969566*bL;
  const s = 0.0883024619*rL + 0.2817188376*gL + 0.6299787005*bL;

  // LMS -> OKLAB (cube root, then forward M2)
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  const L  =  0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_;
  const a  =  1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_;
  const b2 =  0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_;

  // OKLAB -> OKLCH
  const C = Math.sqrt(a*a + b2*b2);
  let H = Math.atan2(b2, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(4)})`;
}

/**
 * Compute per-channel max delta between two 7-char hex color strings.
 * Used for precision warning threshold in writeBackDesignTokens.
 * @param {string} hex1 - 7-char hex string (#rrggbb)
 * @param {string} hex2 - 7-char hex string (#rrggbb)
 * @returns {number} Max absolute per-channel difference on 0-1 scale
 */
function computeHexDelta(hex1, hex2) {
  const parse = h => [
    parseInt(h.slice(1,3),16)/255,
    parseInt(h.slice(3,5),16)/255,
    parseInt(h.slice(5,7),16)/255
  ];
  const [r1,g1,b1] = parse(hex1);
  const [r2,g2,b2] = parse(hex2);
  return Math.max(Math.abs(r1-r2), Math.abs(g1-g2), Math.abs(b1-b2));
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
  // CUR-06: Read existing file to preserve user content below PDE:END marker
  const MDC_BEGIN = '<!-- PDE:BEGIN -->';
  const MDC_END   = '<!-- PDE:END -->';
  let userContent = '';
  try {
    const existing = fs.readFileSync(path.join(rulesDir, filename), 'utf-8');
    const endIdx = existing.indexOf(MDC_END);
    if (endIdx !== -1) {
      userContent = existing.slice(endIdx + MDC_END.length);
    }
  } catch {
    // File doesn't exist yet — no user content to preserve
  }

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
  parts.push(MDC_BEGIN);
  parts.push('');
  parts.push(body);
  parts.push(MDC_END);

  let content = parts.join('\n');
  // Append preserved user content (preserves exactly, no trim — matches AGENT_MARKER pattern)
  if (userContent) {
    content += userContent;
  }

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
      globs: '**.{css,scss,tsx,jsx,ts}',
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
      globs: '**.{tsx,jsx,stories.tsx,test.tsx}',
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
 * @param {string} [planningDir] - .planning/ directory path (for Workflows section)
 * @returns {object} Result: { written, path }
 */
function emitAntigravitySkill(ir, projectRoot, planningDir) {
  const skillDir = path.join(projectRoot, '.agent', 'skills', 'pde-design');
  fs.mkdirSync(skillDir, { recursive: true });

  const skillPath = path.join(skillDir, 'SKILL.md');

  // AGR-05: Read existing agent additions before regeneration
  let agentBlock = '';
  try {
    const existing = fs.readFileSync(skillPath, 'utf-8');
    const markerIdx = existing.indexOf(AGENT_MARKER);
    if (markerIdx !== -1) {
      agentBlock = existing.slice(markerIdx + AGENT_MARKER.length);
    }
  } catch {
    // File doesn't exist yet -- no agent additions to preserve
  }

  // AGR-06: Extract workflows from DESIGN-STATE.md if planningDir provided
  const workflowsContent = planningDir
    ? extractWorkflows(planningDir)
    : 'Design pipeline not yet initialized.';

  const header = makeHeader(ir.sourceHash, ir.generatedAt);
  let content = [
    header,
    '---',
    'name: pde-design',
    'description: PDE design system context -- query palette colors, typography rules, spacing scale, and component patterns for the current project',
    '---',
    SKILL_VERSION_MARKER,
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
    '2. Design tokens are in DTCG format at .planning/design/design-manifest.json',
    '3. Component patterns are documented in handoff specs at .planning/design/handoff/',
    '',
    '## Workflows',
    '',
    workflowsContent,
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
    ir.constraints,
    '',
  ].join('\n');

  // AGR-05: ALWAYS append marker, then any preserved agent content
  content += '\n' + AGENT_MARKER + '\n';
  if (agentBlock) {
    content += agentBlock;
  }

  fs.writeFileSync(skillPath, content, 'utf-8');
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
  const sourceComment = '<!-- SOURCE: design-manifest.json | DERIVE-ONLY -->';

  if (!tokens || !tokens.color) {
    // Placeholder DESIGN.md when no tokens exist
    const content = [
      header,
      sourceComment,                          // AGR-04: canonical token source marker
      '<!-- pde-format-version: 1.0 -->',     // AGR-07: format version
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
    sourceComment,                          // AGR-04: canonical token source marker
    '<!-- pde-format-version: 1.0 -->',     // AGR-07: format version
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

// ─── CUR-04: 3-way merge engine ─────────────────────────────────────────────

/**
 * 3-way merge: base (lastIR snapshot) + editor (parsed partial) + current (.planning/ IR).
 * Field-level merge with conflict detection. Default policy: planning-wins.
 * @param {object|null} base - lastIR from readStateFile(), null on first run
 * @param {object} editorPartial - Partial IR from reverse parser
 * @param {object} currentIR - Full IR from buildContextIR()
 * @param {object} opts - { planningDir, source, fieldPolicies }
 * @returns {{ merged: object, conflicts: Array }}
 */
function mergePartialIR(base, editorPartial, currentIR, opts) {
  if (!opts) opts = {};
  var merged = {};
  var conflicts = [];

  for (var i = 0; i < WRITABLE_FIELDS.length; i++) {
    var field = WRITABLE_FIELDS[i];
    var currentVal = currentIR[field] || '';
    var editorVal = editorPartial[field];
    var baseVal = base ? (base[field] || '') : null;

    // Editor didn't touch this field -- preserve current
    if (editorVal === undefined) {
      merged[field] = currentVal;
      continue;
    }

    // No base (first run) -- editor wins for provided fields
    if (baseVal === null) {
      merged[field] = editorVal;
      continue;
    }

    // For designTokens, normalize before comparison to handle format mismatch (Finding 2)
    var compareEditorVal = editorVal;
    var compareBaseVal = baseVal;
    var compareCurrentVal = currentVal;
    if (field === 'designTokens') {
      compareEditorVal = normalizeDesignTokensForComparison(editorVal);
      compareBaseVal = normalizeDesignTokensForComparison(baseVal);
      compareCurrentVal = normalizeDesignTokensForComparison(currentVal);
    }

    var editorChanged = compareEditorVal !== compareBaseVal;
    var pdeChanged = compareCurrentVal !== compareBaseVal;

    if (!editorChanged) {
      // Editor unchanged -- use current PDE value (covers both "PDE changed" and "neither changed")
      merged[field] = currentVal;
    } else if (!pdeChanged) {
      // Only editor changed -- editor wins
      merged[field] = editorVal;
    } else if (compareEditorVal === compareCurrentVal) {
      // Both changed to same value -- no conflict
      merged[field] = currentVal;
    } else {
      // True conflict: both changed to different values
      var policy = readFieldPolicy(opts.planningDir, field, opts.fieldPolicies);
      var resolvedValue;
      if (policy === 'editor-wins') {
        resolvedValue = editorVal;
      } else if (policy === 'prompt') {
        resolvedValue = currentVal; // planning value as placeholder until user decides
      } else {
        resolvedValue = currentVal; // planning-wins (default)
      }
      var entry = {
        field: field,
        baseValue: baseVal,
        editorValue: editorVal,
        planningValue: currentVal,
        resolvedValue: resolvedValue,
        policy: policy,
        timestamp: new Date().toISOString(),
        source: opts.source || 'unknown',
      };
      if (policy === 'prompt') {
        entry.pendingResolution = true;
      }
      conflicts.push(entry);
      merged[field] = resolvedValue;
      if (opts.planningDir) {
        appendConflictLog(opts.planningDir, entry);
      }
    }
  }

  return { merged: merged, conflicts: conflicts };
}

/**
 * Append a conflict entry as NDJSON to .planning/.sync-conflicts.log.
 * Non-fatal: errors logged to stderr, never thrown.
 * @param {string} planningDir - Absolute path to .planning/
 * @param {object} entry - Conflict entry object
 */
function appendConflictLog(planningDir, entry) {
  try {
    var logPath = path.join(planningDir, '.sync-conflicts.log');
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (err) {
    process.stderr.write('[context-sync] conflict log write error: ' + err.message + '\n');
  }
}

/**
 * Read the conflict resolution policy for a specific field.
 * Checks overrides first, then config.json contextSync.fieldPolicies.
 * Returns 'planning-wins' as default for any error or missing config.
 * @param {string} planningDir - Absolute path to .planning/
 * @param {string} field - Field name from WRITABLE_FIELDS
 * @param {object} [overrides] - Per-call policy overrides (e.g., from opts.fieldPolicies)
 * @returns {string} One of VALID_POLICIES
 */
function readFieldPolicy(planningDir, field, overrides) {
  if (overrides && overrides[field] && VALID_POLICIES.indexOf(overrides[field]) !== -1) {
    return overrides[field];
  }
  try {
    var configPath = path.join(planningDir, 'config.json');
    var config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    var policy = config && config.contextSync && config.contextSync.fieldPolicies
      && config.contextSync.fieldPolicies[field];
    return (policy && VALID_POLICIES.indexOf(policy) !== -1) ? policy : 'planning-wins';
  } catch (e) {
    return 'planning-wins';
  }
}

/**
 * Normalize designTokens value for comparison by extracting sorted color set.
 * Handles both color-list format (from parseDesignMd) and token-summary format (from buildContextIR).
 * Falls back to trimmed raw string if no color patterns found.
 * @param {string} value - designTokens string in either format
 * @returns {string} Normalized comparison key
 */
function normalizeDesignTokensForComparison(value) {
  if (!value) return '';
  var colors = [];
  var re = /\*\*([^*]+)\*\*\s+\(#([a-fA-F0-9]{3,6})\)/g;
  var m;
  while ((m = re.exec(value)) !== null) {
    colors.push(m[1].trim().toLowerCase() + ':#' + m[2].toLowerCase());
  }
  if (colors.length === 0) return value.trim();
  return colors.sort().join('|');
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
  const antigravitySkill = emitAntigravitySkill(ir, projectRoot, planningDir);
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

// ─── SYN-04/SYN-05: Reverse-sync utilities ──────────────────────────────────

/**
 * Replace a ## SectionName section in a markdown file with new content.
 * Atomic write — returns true if section found and replaced, false if not found.
 * Only used for techStack -> ## Tech Stack, constraints -> ## Constraints.
 * @param {string} filePath - Absolute path to file
 * @param {string} sectionName - Heading text (exact case)
 * @param {string} newContent - New section body content
 * @returns {boolean} true if replaced, false if section not found
 */
function replaceSectionInFile(filePath, sectionName, newContent) {
  var content = fs.readFileSync(filePath, 'utf-8');
  var escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match from the heading to the next ## heading or end of file
  var pattern = new RegExp(
    '(^##\\s+' + escaped + '[ \\t]*$\\n)([\\s\\S]*?)(?=^##\\s|\\Z)',
    'im'
  );
  var replacement = '$1' + newContent.trim() + '\n\n';
  var updated = content.replace(pattern, replacement);
  if (updated === content) return false;
  fs.writeFileSync(filePath, updated, 'utf-8');
  return true;
}

/**
 * Parse a single monitored file using the appropriate reverse parser.
 * @param {string} absPath - Absolute path to the file
 * @param {object} entry - MONITORED_FILES entry { path, parser, filename }
 * @returns {object|null} Partial IR or null
 */
function parseMonitoredFile(absPath, entry) {
  try {
    var content = fs.readFileSync(absPath, 'utf-8');
    if (entry.parser === 'mdc') return parseMdcContent(content, entry.filename);
    if (entry.parser === 'skill') return parseSkillMd(content);
    if (entry.parser === 'design') return parseDesignMd(content);
    return null;
  } catch {
    return null;
  }
}

/**
 * Scan all MONITORED_FILES, detect mtime changes since lastEmittedAt,
 * merge editor partials, write back to PROJECT.md, call emitAll to re-normalize.
 * Called at session start to catch editor changes made between sessions.
 * @param {string} cwd - Project root directory
 * @returns {{ filesScanned, changesDetected, conflicts, elapsed }}
 */
function reconcileOnStart(cwd) {
  var startNs = process.hrtime.bigint();
  var planningDir = path.join(cwd, '.planning');
  var filesScanned = 0;
  var changesDetected = 0;
  var conflictCount = 0;

  try {
    var state = readStateFile(planningDir);
    var lastEmitted = (state && state.lastEmittedAt)
      ? new Date(state.lastEmittedAt).getTime() : 0;
    var GRACE_MS = 500;

    var currentIR = buildContextIR(planningDir);
    var base = state ? state.lastIR : null;

    var editorPartials = [];

    for (var i = 0; i < MONITORED_FILES.length; i++) {
      var entry = MONITORED_FILES[i];
      var absPath = path.join(cwd, entry.path);
      var stat;
      try { stat = fs.statSync(absPath); } catch { continue; }
      filesScanned++;

      // Skip files within grace window
      if (stat.mtimeMs <= lastEmitted + GRACE_MS) continue;

      // Loop-break gate: skip PDE-written files (hash matches current)
      var content;
      try { content = fs.readFileSync(absPath, 'utf-8'); } catch { continue; }
      var loopResult = computeLoopBreak(content, planningDir);
      if (loopResult === 'skip') continue;

      // File was externally edited — parse it
      var partial = parseMonitoredFile(absPath, entry);
      if (partial) {
        editorPartials.push({ partial: partial, source: entry.path });
        changesDetected++;
      }
    }

    // INF-07: Snapshot files before write-back batch
    if (editorPartials.length > 0) {
      snapshotFilesBeforeBatch(cwd);
    }

    // Merge all editor partials
    var mergedIR = Object.assign({}, currentIR);
    for (var j = 0; j < editorPartials.length; j++) {
      var ep = editorPartials[j];
      var mergeResult = mergePartialIR(base, ep.partial, mergedIR, {
        planningDir: planningDir,
        source: ep.source,
        fieldPolicies: {},
      });
      conflictCount += mergeResult.conflicts.length;
      // Write back editor-wins fields to PROJECT.md
      var projectMd = path.join(planningDir, 'PROJECT.md');
      var fieldMap = { techStack: 'Tech Stack', constraints: 'Constraints' };
      for (var field in fieldMap) {
        if (mergeResult.merged[field] && mergeResult.merged[field] !== currentIR[field]) {
          replaceSectionInFile(projectMd, fieldMap[field], mergeResult.merged[field]);
        }
      }
      // Update mergedIR for subsequent iterations
      for (var k = 0; k < WRITABLE_FIELDS.length; k++) {
        var wf = WRITABLE_FIELDS[k];
        if (mergeResult.merged[wf] !== undefined) {
          mergedIR[wf] = mergeResult.merged[wf];
        }
      }
    }

    // Re-normalize all editor files via emitAll
    emitAll(cwd);

    // Log results
    var elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    var logsDir = path.join(planningDir, 'logs');
    try { fs.mkdirSync(logsDir, { recursive: true }); } catch { /* ignore */ }
    var logLine = '[' + new Date().toISOString() + '] reconcile: scanned=' + filesScanned +
      ' changed=' + changesDetected + ' conflicts=' + conflictCount +
      ' elapsed=' + Math.round(elapsedMs) + 'ms\n';
    try { fs.appendFileSync(path.join(logsDir, 'sync-reconciliation.log'), logLine, 'utf-8'); } catch { /* non-fatal */ }

    // INF-06: Append to structured SYNC-LOG.md
    appendSyncLog(planningDir, {
      trigger: 'reconcileOnStart',
      filesScanned: filesScanned,
      changes: changesDetected,
      writeBacks: editorPartials.length,
      conflicts: conflictCount,
    });

    return {
      filesScanned: filesScanned,
      changesDetected: changesDetected,
      conflicts: conflictCount,
      elapsed: Math.round(elapsedMs),
    };
  } catch (err) {
    var elapsedErr = Number(process.hrtime.bigint() - startNs) / 1e6;
    return {
      filesScanned: filesScanned,
      changesDetected: changesDetected,
      conflicts: conflictCount,
      elapsed: Math.round(elapsedErr),
      error: err.message,
    };
  }
}

/**
 * Always-scan variant of reconcileOnStart.
 * Parses ALL monitored files regardless of mtime, processes pendingIngest queue,
 * merges, writes back, and calls emitAll (which resets pendingIngest to []).
 * Idempotent: after emitAll re-normalizes, second run detects no differences.
 * @param {string} cwd - Project root directory
 * @returns {{ filesScanned, changesDetected, conflicts }}
 */
function ingestAll(cwd) {
  var planningDir = path.join(cwd, '.planning');
  var filesScanned = 0;
  var changesDetected = 0;
  var conflictCount = 0;

  try {
    var state = readStateFile(planningDir);
    var currentIR = buildContextIR(planningDir);
    var base = state ? state.lastIR : null;

    // Process any pending ingest entries from state first
    var pendingPaths = (state && state.pendingIngest) ? state.pendingIngest.map(function(e) { return e.path; }) : [];
    var processedPaths = {};

    // Helper to process a single monitored file entry (filesScanned is incremented by caller)
    function processEntry(entry) {
      var absPath = path.join(cwd, entry.path);
      var content;
      try { content = fs.readFileSync(absPath, 'utf-8'); } catch { return; }

      var loopResult = computeLoopBreak(content, planningDir);
      if (loopResult === 'skip') return;

      var partial = parseMonitoredFile(absPath, entry);
      if (!partial) return;
      changesDetected++;

      var mergeResult = mergePartialIR(base, partial, currentIR, {
        planningDir: planningDir,
        source: entry.path,
        fieldPolicies: {},
      });
      conflictCount += mergeResult.conflicts.length;

      // Write back editor-wins fields to PROJECT.md
      var projectMd = path.join(planningDir, 'PROJECT.md');
      var fieldMap = { techStack: 'Tech Stack', constraints: 'Constraints' };
      for (var field in fieldMap) {
        if (mergeResult.merged[field] && mergeResult.merged[field] !== currentIR[field]) {
          replaceSectionInFile(projectMd, fieldMap[field], mergeResult.merged[field]);
        }
      }
      // Update currentIR for subsequent entries
      for (var k = 0; k < WRITABLE_FIELDS.length; k++) {
        var wf = WRITABLE_FIELDS[k];
        if (mergeResult.merged[wf] !== undefined) {
          currentIR[wf] = mergeResult.merged[wf];
        }
      }
    }

    // INF-07: Snapshot files before write-back batch
    snapshotFilesBeforeBatch(cwd);

    // Scan ALL monitored files (always, no mtime filter)
    // filesScanned counts ALL monitored files (the full scan set)
    for (var i = 0; i < MONITORED_FILES.length; i++) {
      var entry = MONITORED_FILES[i];
      processedPaths[entry.path] = true;
      filesScanned++;
      processEntry(entry);
    }

    // Call emitAll to re-normalize all editor files and reset pendingIngest to []
    emitAll(cwd);

    // INF-06: Append to structured SYNC-LOG.md
    appendSyncLog(planningDir, {
      trigger: 'ingestAll',
      filesScanned: filesScanned,
      changes: changesDetected,
      writeBacks: changesDetected,
      conflicts: conflictCount,
    });

    return {
      filesScanned: filesScanned,
      changesDetected: changesDetected,
      conflicts: conflictCount,
    };
  } catch {
    return {
      filesScanned: filesScanned,
      changesDetected: changesDetected,
      conflicts: conflictCount,
    };
  }
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
    // INF-08: route sync-status and sync-rollback subcommands before --editor/--ingest handling
    if (args[0] === 'sync-status') { cmdSyncStatus(cwd); return; }
    if (args[0] === 'sync-rollback') { cmdSyncRollback(cwd, args.slice(1)); return; }

    // SYN-05: --ingest flag routes to ingestAll (checked BEFORE --editor)
    var ingestFlag = args.indexOf('--ingest');
    if (ingestFlag !== -1) {
      var ingestResult = ingestAll(cwd);
      if (!raw) {
        process.stdout.write('Ingest complete: scanned=' + ingestResult.filesScanned +
          ' changed=' + ingestResult.changesDetected + ' conflicts=' + ingestResult.conflicts + '\n');
      } else {
        process.stdout.write(JSON.stringify(ingestResult));
      }
      return;
    }

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
        results.antigravitySkill = emitAntigravitySkill(ir, cwd, planningDir);
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
      var archConventions = extractSection(pdeOwned, 'Architecture Conventions');
      if (archConventions) partial.constraints = archConventions;
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

    // Constraints section uses ir.constraints (since Phase 132-02: AGR-06-5)
    const constraints = extractSection(body, 'Constraints');
    if (constraints !== '') partial.constraints = constraints;

    // agentAdditions: sections not in the known list (D-11)
    // Phase 132-02: Added 'Workflows' as a PDE-generated section (AGR-06-2)
    const KNOWN = ['Goal', 'Instructions', 'Workflows', 'Design Tokens Available', 'Component Catalog', 'Constraints'];
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

// ─── Antigravity Write-back ──────────────────────────────────────────────────

/**
 * Write back editor color changes to design-manifest.json.
 * Value-only DTCG update: changes only $value, preserves $type, $description, $extensions.
 * Uses atomic write-rename (same as writeStateFile).
 * @param {string} planningDir - Absolute path to .planning/
 * @param {Array<{name:string, hex:string, role:string}>} editorColors - Colors from parseDesignMd
 * @param {object} opts - Options: { cwd } for emitAll call
 * @returns {{updated:number, warnings:number}}
 */
function writeBackDesignTokens(planningDir, editorColors, opts) {
  const manifestPath = path.join(planningDir, 'design', 'design-manifest.json');
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(raw);

  let updated = 0, warnings = 0;

  for (const { hex, role } of editorColors) {
    const roleLower = role.replace(/\s+color\s+role$/i, '').trim().toLowerCase();
    if (manifest.tokens && manifest.tokens.color && manifest.tokens.color[roleLower]) {
      const token = manifest.tokens.color[roleLower];
      const newOklch = hexToOklch(hex);

      // Precision check: round-trip via oklchToHex
      const roundTripped = oklchToHex(newOklch);
      if (roundTripped !== hex) {
        const delta = computeHexDelta(hex, roundTripped);
        if (delta > 0.001) {
          process.stderr.write(`[context-sync] precision warning: ${hex} -> ${newOklch} -> ${roundTripped} (delta=${delta.toFixed(4)})\n`);
          warnings++;
        }
      }

      // VALUE-ONLY update
      token.$value = newOklch;
      updated++;
    }
  }

  // Atomic write-rename (same pattern as writeStateFile)
  const tmpPath = manifestPath + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf-8');
  fs.renameSync(tmpPath, manifestPath);

  // Re-normalize all editor files
  if (opts && opts.cwd) emitAll(opts.cwd);

  return { updated, warnings };
}

function appendSyncLog(planningDir, entry) {
  try {
    var logsDir = path.join(planningDir, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    var logPath = path.join(logsDir, 'SYNC-LOG.md');
    var ts = new Date().toISOString();
    var block = [
      '## ' + ts,
      '- Trigger: ' + (entry.trigger || 'unknown'),
      '- Files scanned: ' + (entry.filesScanned || 0),
      '- Changes detected: ' + (entry.changes || 0),
      '- Write-backs: ' + (entry.writeBacks || 0),
      '- Conflicts: ' + (entry.conflicts || 0),
      '',
    ].join('\n');
    fs.appendFileSync(logPath, block, 'utf-8');
    trimSyncLog(logPath, 500);
  } catch (err) {
    process.stderr.write('[context-sync] sync log write error: ' + err.message + '\n');
  }
}

/**
 * Trim SYNC-LOG.md to at most maxEntries entries (each entry starts with `## `).
 * Preserves the `# Sync Log` header if present. Atomic rewrite via PID tmp + rename.
 * Non-fatal: errors go to stderr, never thrown.
 *
 * @param {string} logPath - Absolute path to SYNC-LOG.md
 * @param {number} maxEntries - Maximum number of entries to keep
 */
function trimSyncLog(logPath, maxEntries) {
  try {
    if (!fs.existsSync(logPath)) return;
    var content = fs.readFileSync(logPath, 'utf-8');
    // Split on entry boundaries (## at start of line)
    // Each block is one entry (heading + body)
    var parts = content.split(/\n(?=## )/);
    // Check if first part is a header (# Sync Log)
    var headerLine = '';
    var entries = parts;
    if (parts.length > 0 && parts[0].startsWith('# ') && !parts[0].startsWith('## ')) {
      headerLine = parts[0];
      entries = parts.slice(1);
    }
    if (entries.length <= maxEntries) return; // nothing to trim
    // Keep last maxEntries blocks
    var kept = entries.slice(entries.length - maxEntries);
    var newContent = (headerLine ? headerLine + '\n\n' : '') + kept.join('\n');
    // Atomic write via PID-based tmp file
    var tmpPath = logPath + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmpPath, newContent, 'utf-8');
    fs.renameSync(tmpPath, logPath);
  } catch (err) {
    process.stderr.write('[context-sync] sync log trim error: ' + err.message + '\n');
  }
}

// ─── INF-07: Pre-write Snapshot System ──────────────────────────────────────

/**
 * Snapshot WRITE_BACK_FILES to .planning/sync-snapshots/ before a write-back batch.
 * Snapshot filename: <ISO-safe-ts>--<path-with-plus-for-slashes>
 * ISO-safe-ts: colons and periods replaced with hyphens to avoid filesystem issues.
 * Non-fatal: missing source files are silently skipped; errors go to stderr, never thrown.
 * Calls cleanupOldSnapshots after writing.
 *
 * @param {string} cwd - Project root directory
 */
function snapshotFilesBeforeBatch(cwd) {
  try {
    var planningDir = path.join(cwd, '.planning');
    var snapshotDir = path.join(planningDir, 'sync-snapshots');
    fs.mkdirSync(snapshotDir, { recursive: true });

    // ISO-safe timestamp: replace : and . with - to avoid filesystem issues
    var ts = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');

    for (var i = 0; i < WRITE_BACK_FILES.length; i++) {
      var relPath = WRITE_BACK_FILES[i];
      var srcPath = path.join(cwd, relPath);
      try {
        var content = fs.readFileSync(srcPath, 'utf-8');
        // Encode path: replace / with + (research finding 1)
        var encodedPath = relPath.replace(/\//g, '+');
        var snapshotName = ts + '--' + encodedPath;
        var snapshotPath = path.join(snapshotDir, snapshotName);
        var tmpPath = snapshotPath + '.' + process.pid + '.tmp';
        fs.writeFileSync(tmpPath, content, 'utf-8');
        fs.renameSync(tmpPath, snapshotPath);
      } catch (fileErr) {
        // Missing source file — silently skip (INF-07-3)
      }
    }

    cleanupOldSnapshots(snapshotDir, 30);
  } catch (err) {
    process.stderr.write('[context-sync] snapshot error: ' + err.message + '\n');
  }
}

/**
 * Remove snapshot files older than maxDays from snapshotDir.
 * Age is based on file mtime (modification time). Non-fatal.
 * Note: mtime is used rather than ctime because mtime can be set via fs.utimesSync
 * and is reliably settable on all platforms, while ctime reflects kernel-managed
 * metadata changes and cannot be set directly.
 *
 * @param {string} snapshotDir - Absolute path to .planning/sync-snapshots/
 * @param {number} maxDays - Maximum age in days before a snapshot is removed
 */
function cleanupOldSnapshots(snapshotDir, maxDays) {
  try {
    if (!fs.existsSync(snapshotDir)) return;
    var cutoffMs = Date.now() - (maxDays * 24 * 60 * 60 * 1000);
    var files = fs.readdirSync(snapshotDir);
    for (var i = 0; i < files.length; i++) {
      var filePath = path.join(snapshotDir, files[i]);
      try {
        var stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoffMs) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        // Non-fatal: skip individual file errors
      }
    }
  } catch (err) {
    process.stderr.write('[context-sync] snapshot cleanup error: ' + err.message + '\n');
  }
}

/**
 * Decode a snapshot filename to the original file path.
 * Snapshot format: <ISO-safe-ts>--<encoded-path>
 * Encoded path: forward slashes replaced with +
 *
 * @param {string} cwd - Project root directory
 * @param {string} snapshotName - Snapshot filename (not full path)
 * @returns {string|null} Absolute path to original file, or null if decode fails
 */
function decodeSnapshotPath(cwd, snapshotName) {
  try {
    var sepIdx = snapshotName.indexOf('--');
    if (sepIdx === -1) return null;
    var encodedPath = snapshotName.slice(sepIdx + 2);
    if (!encodedPath) return null;
    // Replace + with / to restore original path separators
    var relPath = encodedPath.replace(/\+/g, '/');
    return path.join(cwd, relPath);
  } catch (err) {
    return null;
  }
}

// ─── INF-08: Conflict UX Commands ───────────────────────────────────────────

/**
 * Display sync status: last sync time, source hash, monitored files, pending ingest,
 * and unresolved conflict count. Reads state file only — no file scanning.
 *
 * @param {string} cwd - Project root directory
 */
function cmdSyncStatus(cwd) {
  var planningDir = path.join(cwd, '.planning');
  var state = readStateFile(planningDir);

  process.stdout.write('=== PDE Sync Status ===\n');

  if (state) {
    process.stdout.write('Last sync:     ' + (state.lastEmittedAt || 'unknown') + '\n');
    var hashShort = state.lastSourceHash ? state.lastSourceHash.slice(0, 12) + '...' : 'none';
    process.stdout.write('Source hash:   ' + hashShort + '\n');
    var pendingCount = Array.isArray(state.pendingIngest) ? state.pendingIngest.length : 0;
    process.stdout.write('Pending ingest: ' + pendingCount + ' file(s)\n');
  } else {
    process.stdout.write('Last sync:     (no state file found)\n');
    process.stdout.write('Pending ingest: 0 file(s)\n');
  }

  // Count monitored files from WRITE_BACK_FILES + editor output files list
  var monitoredFiles = WRITE_BACK_FILES;
  process.stdout.write('Monitored files (' + monitoredFiles.length + '):\n');
  for (var i = 0; i < monitoredFiles.length; i++) {
    process.stdout.write('  - ' + monitoredFiles[i] + '\n');
  }

  // Count unresolved conflicts from .sync-conflicts.log
  var unresolvedCount = 0;
  try {
    var conflictLogPath = path.join(planningDir, '.sync-conflicts.log');
    if (fs.existsSync(conflictLogPath)) {
      var lines = fs.readFileSync(conflictLogPath, 'utf-8').split('\n');
      for (var j = 0; j < lines.length; j++) {
        var line = lines[j].trim();
        if (!line) continue;
        try {
          var entry = JSON.parse(line);
          if (entry.pendingResolution === true) unresolvedCount++;
        } catch (parseErr) {
          // Malformed line — skip
        }
      }
    }
  } catch (conflictErr) {
    // Non-fatal: conflict log may not exist
  }
  process.stdout.write('Unresolved conflicts: ' + unresolvedCount + '\n');
}

/**
 * List available rollback snapshots or restore one.
 *
 * Without --restore: lists .planning/sync-snapshots/ sorted newest-first (max 20 shown).
 * With --restore <snapshot-name>: decodes filename, writes file content back, calls emitAll().
 *
 * @param {string} cwd - Project root directory
 * @param {string[]} args - Args after 'sync-rollback'
 */
function cmdSyncRollback(cwd, args) {
  var planningDir = path.join(cwd, '.planning');
  var snapshotDir = path.join(planningDir, 'sync-snapshots');

  var restoreIdx = args.indexOf('--restore');

  if (restoreIdx !== -1) {
    // Restore mode
    var snapshotName = args[restoreIdx + 1] || '';
    if (!snapshotName) {
      process.stdout.write('[sync-rollback] --restore requires a snapshot name\n');
      return;
    }
    var snapshotPath = path.join(snapshotDir, snapshotName);
    if (!fs.existsSync(snapshotPath)) {
      process.stdout.write('[sync-rollback] snapshot not found: ' + snapshotName + '\n');
      return;
    }
    try {
      var content = fs.readFileSync(snapshotPath, 'utf-8');
      var targetPath = decodeSnapshotPath(cwd, snapshotName);
      if (!targetPath) {
        process.stdout.write('[sync-rollback] could not decode snapshot path from: ' + snapshotName + '\n');
        return;
      }
      // Ensure target directory exists
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content, 'utf-8');
      process.stdout.write('[sync-rollback] restored ' + targetPath + '\n');
      // Re-emit all editor context files after restore
      emitAll(cwd);
      process.stdout.write('[sync-rollback] emitAll complete after restore\n');
    } catch (err) {
      process.stdout.write('[sync-rollback] restore error: ' + err.message + '\n');
    }
    return;
  }

  // List mode
  try {
    if (!fs.existsSync(snapshotDir)) {
      process.stdout.write('[sync-rollback] no snapshots directory found (no snapshots taken yet)\n');
      return;
    }
    var files = fs.readdirSync(snapshotDir);
    if (files.length === 0) {
      process.stdout.write('[sync-rollback] no snapshots available\n');
      return;
    }
    // Sort newest-first (filenames start with ISO-safe timestamp, so lexicographic sort works)
    files.sort().reverse();
    var limit = Math.min(files.length, 20);
    process.stdout.write('Available snapshots (' + files.length + ' total, showing ' + limit + '):\n');
    for (var i = 0; i < limit; i++) {
      process.stdout.write('  ' + files[i] + '\n');
    }
    if (files.length > 20) {
      process.stdout.write('  ... and ' + (files.length - 20) + ' more\n');
    }
    process.stdout.write('\nTo restore: pde context-sync sync-rollback --restore <snapshot-name>\n');
  } catch (err) {
    process.stdout.write('[sync-rollback] error listing snapshots: ' + err.message + '\n');
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  buildContextIR, emitAll, emitAgentsMd, emitCursorRules, emitCursorrules,
  emitGeminiMd, computeSourceHash, cmdContextSync, oklchToHex,
  isStitchSource, emitAntigravitySkill, emitDesignMd, writeMdcRule,
  writeStateFile, readStateFile, computeLoopBreak,
  parseMdcContent, parseSkillMd, parseDesignMd,
  mergePartialIR, appendConflictLog, readFieldPolicy, normalizeDesignTokensForComparison,
  // SYN-04, SYN-05: reverse-sync utilities
  MONITORED_FILES, replaceSectionInFile, parseMonitoredFile, reconcileOnStart, ingestAll,
  hexToOklch, computeHexDelta, writeBackDesignTokens,
  // Phase 132: Audit trail, snapshot system, CLI commands (INF-06, INF-07, INF-08)
  WRITE_BACK_FILES, appendSyncLog, trimSyncLog, snapshotFilesBeforeBatch, cleanupOldSnapshots,
  decodeSnapshotPath, cmdSyncStatus, cmdSyncRollback,
  // Phase 132-02: AGR-06 extractWorkflows
  extractWorkflows,
};
