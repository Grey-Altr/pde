'use strict';

/**
 * divergence.cjs — Divergence Detection Engine
 *
 * Heuristic 3-tier drift detector comparing PDE handoff specs against the implementing
 * codebase. All detection is regex/glob/grep-based — no AST parsing (ADIV-01 deferred).
 *
 * Tiers:
 *   T1 Structural — glob-based check that component files exist (DIV-01)
 *   T2 Content    — regex interface parsing for prop comparison (DIV-02)
 *   T3 Behavioral — string grep for design token usage (DIV-03)
 *
 * Zero npm dependencies — Node.js built-ins only (fs, path).
 *
 * Phases: 122-divergence-detection
 */

const fs = require('node:fs');
const path = require('node:path');

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Canonical annotation regex — locked by Phase 120 artifact-format.cjs.
 * Matches: <!-- @component: X -->, <!-- @props: Y -->, <!-- @tokens: A, B -->
 */
const ANNOTATION_RE = /<!-- @(component|props|tokens): ([^>]+) -->/g;

/** Component file extensions to search for in T1 structural detection. */
const COMPONENT_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.vue', '.svelte'];

/** Directories to skip during recursive file walks. */
const SKIP_DIRS = new Set(['node_modules', '.git']);

/** Conventional component directory names for EXTRA detection. */
const COMPONENT_DIRS = new Set(['components', 'ui', 'widgets', 'elements']);

/** Handoff spec file glob pattern prefix (matched via readdir). */
const HANDOFF_SPEC_PREFIX = 'HND-handoff-spec-';

// ─── DIV-01: T1 Structural Detection ─────────────────────────────────────────

/**
 * Extract component specifications from a single handoff spec file content.
 *
 * Parses @component, @props, @tokens annotations in sequence. Each @component
 * annotation starts a new ComponentSpec; @props and @tokens populate the most
 * recently opened spec.
 *
 * @param {string} specContent - Raw string content of a handoff spec file
 * @returns {Array<{name: string, props: string|null, tokens: string[]}>} Parsed specs
 */
function extractAnnotations(specContent) {
  const components = [];
  let current = null;
  const re = /<!-- @(component|props|tokens): ([^>]+) -->/g;
  for (const match of specContent.matchAll(re)) {
    const [, key, value] = match;
    if (key === 'component') {
      current = { name: value.trim(), props: null, tokens: [] };
      components.push(current);
    } else if (key === 'props' && current) {
      current.props = value.trim();
    } else if (key === 'tokens' && current) {
      current.tokens = value.split(',').map(t => t.trim()).filter(Boolean);
    }
  }
  return components;
}

/**
 * Load and parse all handoff spec files from .planning/design/handoff/.
 *
 * Reads all files matching HND-handoff-spec-*.md in the handoff directory.
 * Returns empty array (not an error) if directory does not exist or is empty.
 * Handles individual file read errors gracefully — logs to stderr and skips.
 *
 * @param {string} planningDir - Absolute path to the .planning directory
 * @returns {Array<{name: string, props: string|null, tokens: string[]}>} All component specs
 */
function loadHandoffSpecs(planningDir) {
  const handoffDir = path.join(planningDir, 'design', 'handoff');
  let entries;
  try {
    entries = fs.readdirSync(handoffDir);
  } catch {
    return [];
  }

  const specFiles = entries.filter(
    f => f.startsWith(HANDOFF_SPEC_PREFIX) && f.endsWith('.md')
  );

  const allSpecs = [];
  for (const file of specFiles) {
    const filePath = path.join(handoffDir, file);
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      process.stderr.write('[divergence] failed to read handoff spec: ' + filePath + '\n');
      continue;
    }
    const specs = extractAnnotations(content);
    for (const spec of specs) {
      allSpecs.push(spec);
    }
  }
  return allSpecs;
}

/**
 * T1 Structural Detection — locate a component file in the project tree.
 *
 * Performs a recursive readdirSync walk starting from projectRoot, skipping
 * node_modules, .git, and all dotdirs. Matches case-insensitively against
 * all supported component extensions.
 *
 * @param {string} projectRoot - Absolute path to the project root directory
 * @param {string} componentName - PascalCase component name (without extension)
 * @returns {string|null} Absolute path to found file, or null if not found
 */
function findComponentFile(projectRoot, componentName) {
  const lowerName = componentName.toLowerCase();

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        const found = walk(path.join(dir, entry.name));
        if (found) return found;
      } else if (entry.isFile()) {
        for (const ext of COMPONENT_EXTENSIONS) {
          if (entry.name.toLowerCase() === lowerName + ext) {
            return path.join(dir, entry.name);
          }
        }
      }
    }
    return null;
  }

  return walk(projectRoot);
}

// ─── DIV-02: T2 Content Detection ────────────────────────────────────────────

/**
 * T2 Content Detection — extract prop names from a TypeScript interface.
 *
 * Locates the interface by name, extracts the body using brace-counting
 * (handles nested generics), then parses prop names line by line while
 * skipping JSDoc and line comment fragments.
 *
 * @param {string} fileContent - Raw source content of the component file
 * @param {string} propsInterfaceName - Interface name to extract (e.g., 'ButtonProps')
 * @returns {string[]|null} Array of prop names, or null if interface not found
 */
function extractPropsFromFile(fileContent, propsInterfaceName) {
  const openRe = new RegExp(
    'interface\\s+' + propsInterfaceName + '\\s*(?:extends[^{]+)?\\{',
    's'
  );
  const openMatch = openRe.exec(fileContent);
  if (!openMatch) return null;

  // Extract body via brace counting — handles nested generics
  const bodyStart = openMatch.index + openMatch[0].length;
  let depth = 1;
  let i = bodyStart;
  while (i < fileContent.length && depth > 0) {
    const ch = fileContent[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  const body = fileContent.slice(bodyStart, i - 1);

  const lines = body.split('\n');
  const props = [];
  const propLineRe = /^\s*(\w+)\??\s*:/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip comment lines
    if (trimmed.startsWith('//')) continue;
    if (trimmed.startsWith('*')) continue;
    if (trimmed.startsWith('/**')) continue;
    if (trimmed.startsWith('/*')) continue;

    const m = propLineRe.exec(line);
    if (m) {
      props.push(m[1]);
    }
  }

  return props;
}

// ─── DIV-03: T3 Behavioral Detection ─────────────────────────────────────────

/**
 * T3 Behavioral Detection — check that a component file references each design token.
 *
 * Uses simple String.includes checks — T3 is heuristic, not semantic.
 * Known limitation: CSS-in-JS or CSS Modules may not contain the token string literally.
 *
 * @param {string} fileContent - Raw source content of the component file
 * @param {string[]} tokens - CSS custom property names (e.g., '--color-primary-500')
 * @returns {string[]} Tokens not found in fileContent (empty = all tokens used)
 */
function checkTokenUsage(fileContent, tokens) {
  const missing = [];
  for (const token of tokens) {
    if (!fileContent.includes(token)) {
      missing.push(token);
    }
  }
  return missing;
}

// ─── DIV-06: Ignore Mechanism ─────────────────────────────────────────────────

/**
 * Load the divergence ignore list from .pde-divergence-ignore.
 *
 * Each non-blank, non-comment line is an exact component name to suppress.
 * Lines starting with # are comments. Missing file returns empty Set.
 *
 * @param {string} projectRoot - Absolute path to the project root
 * @returns {Set<string>} Set of component names to suppress
 */
function loadIgnoreList(projectRoot) {
  const ignorePath = path.join(projectRoot, '.pde-divergence-ignore');
  try {
    const content = fs.readFileSync(ignorePath, 'utf-8');
    return new Set(
      content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
    );
  } catch {
    return new Set();
  }
}

// ─── Integration: EXTRA Detection ────────────────────────────────────────────

/**
 * Find component files in conventional directories not declared in handoff specs.
 *
 * @param {string} projectRoot - Absolute path to project root
 * @param {Set<string>} knownNames - Component names from handoff specs
 * @returns {Array<{name: string, filePath: string}>}
 */
function _findExtraComponents(projectRoot, knownNames) {
  const extras = [];

  function scanDir(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const parsed = path.parse(entry.name);
      if (!COMPONENT_EXTENSIONS.includes(parsed.ext)) continue;
      if (/\.(test|spec)$/.test(parsed.name)) continue;
      if (parsed.name === 'index') continue;
      // Only PascalCase files treated as components
      if (parsed.name[0] !== parsed.name[0].toUpperCase()) continue;
      if (!knownNames.has(parsed.name)) {
        extras.push({ name: parsed.name, filePath: path.join(dir, entry.name) });
      }
    }
  }

  const searchRoots = [projectRoot, path.join(projectRoot, 'src'), path.join(projectRoot, 'app')];
  for (const searchRoot of searchRoots) {
    let topEntries;
    try {
      topEntries = fs.readdirSync(searchRoot, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of topEntries) {
      if (entry.isDirectory() && COMPONENT_DIRS.has(entry.name)) {
        scanDir(path.join(searchRoot, entry.name));
      }
    }
  }

  return extras;
}

// ─── Integration: runDivergenceCheck ─────────────────────────────────────────

/**
 * Main entry point — run the full divergence detection pipeline.
 *
 * @param {string} projectRoot - Absolute path to the project root directory
 * @returns {{ components: object[], noSpecs: boolean, suppressedCount: number }}
 */
function runDivergenceCheck(projectRoot) {
  const planningDir = path.join(projectRoot, '.planning');
  const specs = loadHandoffSpecs(planningDir);

  if (specs.length === 0) {
    return { components: [], noSpecs: true };
  }

  const ignoreList = loadIgnoreList(projectRoot);
  const knownNames = new Set(specs.map(s => s.name));
  const results = [];

  for (const spec of specs) {
    const filePath = findComponentFile(projectRoot, spec.name);
    const t1 = { found: filePath !== null, filePath };

    let t2 = null;
    let t3 = null;
    let status;
    let notes = '';

    if (!t1.found) {
      status = 'MISSING';
      notes = 'component file not found';
    } else {
      let fileContent = '';
      try {
        fileContent = fs.readFileSync(filePath, 'utf-8');
      } catch {}

      if (spec.props) {
        const fileProps = extractPropsFromFile(fileContent, spec.props);
        if (fileProps === null) {
          t2 = { handoffProps: [], fileProps: null, missing: [], extra: [] };
          notes = 'interface ' + spec.props + ' not found in file';
          status = 'DRIFTED';
        } else {
          t2 = { handoffProps: [], fileProps, missing: [], extra: [] };
        }
      }

      if (spec.tokens.length > 0) {
        const missingTokens = checkTokenUsage(fileContent, spec.tokens);
        t3 = { missingTokens };
        if (missingTokens.length > 0 && !status) {
          status = 'DRIFTED';
          notes = notes || 'missing tokens: ' + missingTokens.join(', ');
        }
      } else {
        t3 = { missingTokens: [] };
      }

      status = status || 'ALIGNED';
    }

    results.push({ name: spec.name, status, t1, t2, t3, notes });
  }

  const extraComponents = _findExtraComponents(projectRoot, knownNames);
  for (const extra of extraComponents) {
    results.push({
      name: extra.name,
      status: 'EXTRA',
      t1: { found: true, filePath: extra.filePath },
      t2: null,
      t3: null,
      notes: 'not in handoff specs',
    });
  }

  let suppressedCount = 0;
  const filtered = results.filter(r => {
    if (ignoreList.has(r.name)) {
      suppressedCount++;
      return false;
    }
    return true;
  });

  return { components: filtered, noSpecs: false, suppressedCount };
}

// ─── DIV-04: DIVERGENCE.md Output ────────────────────────────────────────────

/**
 * Generate a DIVERGENCE.md report from detection results.
 *
 * @param {{ components: object[], noSpecs: boolean, suppressedCount?: number }} result
 * @returns {string} Markdown string
 */
function buildDivergenceReport(result) {
  const now = new Date().toISOString();
  const { components, suppressedCount } = result;

  const counts = { ALIGNED: 0, DRIFTED: 0, MISSING: 0, EXTRA: 0 };
  for (const c of components) {
    if (counts[c.status] !== undefined) counts[c.status]++;
    else counts[c.status] = 1;
  }

  const lines = [];

  lines.push('---');
  lines.push('Generated: ' + now);
  lines.push('Skill: /pde:check-divergence');
  lines.push('---');
  lines.push('');
  lines.push('# Divergence Report');
  lines.push('');
  lines.push('| Component | Status | T1 Structural | T2 Content | T3 Behavioral | Notes |');
  lines.push('|-----------|--------|--------------|------------|---------------|-------|');

  for (const c of components) {
    const t1Cell = c.t1 ? (c.t1.found ? 'found' : 'not found') : '--';
    const t2Cell = c.t2
      ? (c.t2.fileProps === null
          ? 'interface missing'
          : (c.t2.missing && c.t2.missing.length > 0
              ? 'missing: ' + c.t2.missing.join(', ')
              : 'props match'))
      : '--';
    const t3Cell = c.t3
      ? (c.t3.missingTokens && c.t3.missingTokens.length > 0
          ? 'missing: ' + c.t3.missingTokens.join(', ')
          : 'tokens used')
      : '--';
    lines.push('| ' + c.name + ' | ' + c.status + ' | ' + t1Cell + ' | ' + t2Cell + ' | ' + t3Cell + ' | ' + (c.notes || '') + ' |');
  }

  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('- ALIGNED: ' + counts.ALIGNED);
  lines.push('- DRIFTED: ' + counts.DRIFTED);
  lines.push('- MISSING: ' + counts.MISSING);
  lines.push('- EXTRA: ' + counts.EXTRA);

  if (suppressedCount && suppressedCount > 0) {
    lines.push('');
    lines.push('*' + suppressedCount + ' divergences suppressed via .pde-divergence-ignore*');
  }

  lines.push('');
  lines.push('---');
  lines.push('*Generated by PDE-OS /pde:check-divergence | ' + now + '*');

  return lines.join('\n');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  extractAnnotations,
  loadHandoffSpecs,
  findComponentFile,
  extractPropsFromFile,
  checkTokenUsage,
  loadIgnoreList,
  runDivergenceCheck,
  buildDivergenceReport,
};
