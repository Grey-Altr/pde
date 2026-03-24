'use strict';

/**
 * artifact-format.cjs — Artifact formatting functions for the handoff pipeline
 *
 * Provides:
 *   - @file annotations for component sections in handoff specs (FMT-01)
 *   - DTCG-to-Tailwind v4 @theme block conversion (FMT-02)
 *   - Framework detection from package.json + framework-appropriate component stubs (FMT-03)
 *
 * Zero npm dependencies — Node.js built-ins only (fs, path).
 *
 * Phases: 120-artifact-formatting
 */

const fs = require('node:fs');
const path = require('node:path');

// ─── FMT-01: @file Annotations ────────────────────────────────────────────────

/**
 * Generate @file annotation HTML comment block for a component.
 *
 * Produces lines in the format:
 *   <!-- @component: {name} -->
 *   <!-- @props: {props} -->
 *   <!-- @tokens: {token1}, {token2}, ... -->   (omitted if tokens is empty/missing)
 *
 * All annotations are extractable via: /<!-- @(component|props|tokens): ([^>]+) -->/g
 *
 * @param {object} options
 * @param {string} options.name - Component name
 * @param {string} [options.props] - Props interface name (defaults to {name}Props)
 * @param {string[]} [options.tokens] - Array of CSS token variable names (omitted if empty)
 * @returns {string} Multi-line HTML comment block
 */
function generateFileAnnotations({ name, props, tokens } = {}) {
  const propsName = props || (name + 'Props');
  const lines = [
    `<!-- @component: ${name} -->`,
    `<!-- @props: ${propsName} -->`,
  ];
  if (tokens && tokens.length > 0) {
    lines.push(`<!-- @tokens: ${tokens.join(', ')} -->`);
  }
  return lines.join('\n');
}

// ─── FMT-02: DTCG-to-Tailwind @theme Conversion ───────────────────────────────

/**
 * Map a DTCG $type string to the corresponding Tailwind v4 theme namespace prefix.
 *
 * @param {string|null|undefined} dtcgType
 * @returns {string} Tailwind namespace prefix (e.g. '--color-', '--spacing-')
 */
function typeToNamespace(dtcgType) {
  switch (dtcgType) {
    case 'color':        return '--color-';
    case 'dimension':    return '--spacing-';
    case 'fontFamily':   return '--font-';
    case 'fontSize':     return '--text-';
    case 'fontWeight':   return '--font-weight-';
    case 'borderRadius': return '--radius-';
    case 'shadow':       return '--shadow-';
    default:             return '--';
  }
}

/**
 * Recursively convert a DTCG token tree to Tailwind @theme variable lines.
 *
 * Mirrors dtcgToCssLines() from bin/lib/design.cjs, but uses $type-aware namespace
 * prefix mapping instead of a flat '--' prefix.
 *
 * The top-level group keys (e.g. "color", "spacing", "typography") act as type
 * category containers. They are NOT included in the variable name suffix — the
 * namespace prefix (derived from the leaf's $type) already captures the category.
 * Only keys below the first level contribute to the suffix.
 *
 * Examples:
 *   color.primary.$type=color          →  --color-primary: ...
 *   color.primary.500.$type=color      →  --color-primary-500: ...
 *   typography.fontFamily.$type=font   →  --font-fontFamily: ...
 *
 * @param {object} tokens - DTCG token tree
 * @param {string} suffix - Accumulated key suffix from group keys below top level (default '')
 * @param {number} [depth] - Recursion depth (0 = top level, default 0)
 * @returns {string[]} CSS variable declaration lines (with leading spaces)
 */
function dtcgToThemeLines(tokens, suffix, depth) {
  suffix = suffix || '';
  depth = depth || 0;
  const lines = [];
  if (!tokens || typeof tokens !== 'object') return lines;

  for (const key of Object.keys(tokens)) {
    if (key.startsWith('$')) continue;
    const node = tokens[key];
    if (node && typeof node === 'object' && '$value' in node) {
      // Leaf token — use its $type to determine namespace prefix
      const namespace = typeToNamespace(node.$type);
      // At depth 0, the key itself is the variable name (no suffix yet)
      // At depth > 0, suffix holds the path from depth-1 keys
      const varName = suffix ? suffix + key : key;
      lines.push('  ' + namespace + varName + ': ' + node.$value + ';');
    } else if (node && typeof node === 'object') {
      // Group node — recurse
      // At top level (depth 0): skip adding this key to suffix (it's the type category)
      // At deeper levels: append key to suffix
      const nextSuffix = depth === 0 ? '' : (suffix ? suffix + key + '-' : key + '-');
      const nested = dtcgToThemeLines(node, nextSuffix, depth + 1);
      for (const line of nested) lines.push(line);
    }
  }
  return lines;
}

/**
 * Generate a Tailwind v4 @theme { } block from a DTCG token tree.
 *
 * OKLCH values pass through unmodified — Tailwind v4 natively supports oklch().
 * Empty/null tokens returns empty string.
 *
 * @param {object|null} tokens - DTCG token tree
 * @returns {string} @theme { ... } CSS block, or empty string if no tokens
 */
function generateTailwindTheme(tokens) {
  if (!tokens || typeof tokens !== 'object') return '';
  const lines = dtcgToThemeLines(tokens, '');
  if (lines.length === 0) return '';
  return '@theme {\n' + lines.join('\n') + '\n}\n';
}

/**
 * Generate a companion :root { } CSS custom properties block from a DTCG token tree.
 *
 * Uses the same variable names as generateTailwindTheme() to allow fallback CSS
 * custom property access alongside Tailwind utility class generation.
 *
 * @param {object|null} tokens - DTCG token tree
 * @returns {string} :root { ... } CSS block, or empty string if no tokens
 */
function generateCssVarsFromTheme(tokens) {
  if (!tokens || typeof tokens !== 'object') return '';
  const lines = dtcgToThemeLines(tokens, '');
  if (lines.length === 0) return '';
  return ':root {\n' + lines.join('\n') + '\n}\n';
}

// ─── FMT-03: Framework Detection + Component Stubs ────────────────────────────

/**
 * Detect the frontend framework from package.json dependencies.
 *
 * Priority order: Vue > Svelte > React (React is default fallback anyway).
 * React detection requires BOTH react AND react-dom to avoid false positives
 * from testing libraries that only declare react.
 *
 * @param {string} projectRoot - Absolute path to the project root
 * @returns {'Vue'|'Svelte'|'React'|null} Detected framework or null if not detected
 */
function detectFramework(projectRoot) {
  const pkgPath = path.join(projectRoot, 'package.json');
  try {
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw);
    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
    if (deps['vue']) return 'Vue';
    if (deps['svelte']) return 'Svelte';
    if (deps['react'] && deps['react-dom']) return 'React';
    return null;
  } catch {
    // Missing or malformed package.json — graceful fallback
    return null;
  }
}

/**
 * Generate a framework-appropriate component stub.
 *
 * Produces minimal but valid TypeScript stubs:
 *   - React: FC<{Name}Props> functional component
 *   - Vue: <script setup lang="ts"> with defineProps<Props>()
 *   - Svelte: <script lang="ts"> with export let declarations
 *   - null/undefined: defaults to React
 *
 * @param {string} componentName - PascalCase component name
 * @param {string[]} propNames - Array of prop names (used as string typed by default)
 * @param {'React'|'Vue'|'Svelte'|null|undefined} framework - Target framework
 * @returns {string} Component stub source code
 */
function generateComponentStub(componentName, propNames, framework) {
  const effectiveFramework = framework || 'React';
  const propsType = componentName + 'Props';

  if (effectiveFramework === 'Vue') {
    return _vueStub(componentName, propNames, propsType);
  }
  if (effectiveFramework === 'Svelte') {
    return _svelteStub(componentName, propNames);
  }
  // Default: React
  return _reactStub(componentName, propNames, propsType);
}

/**
 * @private
 */
function _reactStub(componentName, propNames, propsType) {
  const propLines = (propNames || []).map(p => `  ${p}: string;`).join('\n');
  const destructure = (propNames || []).join(', ');
  return [
    `import type { FC } from 'react';`,
    ``,
    `interface ${propsType} {`,
    propLines,
    `}`,
    ``,
    `export const ${componentName}: FC<${propsType}> = ({ ${destructure} }) => {`,
    `  return null;`,
    `};`,
  ].join('\n');
}

/**
 * @private
 */
function _vueStub(componentName, propNames, propsType) {
  const propLines = (propNames || []).map(p => `  ${p}: string;`).join('\n');
  return [
    `<script setup lang="ts">`,
    `interface ${propsType} {`,
    propLines,
    `}`,
    `const props = defineProps<${propsType}>();`,
    `</script>`,
    ``,
    `<template>`,
    `  <!-- ${componentName} template -->`,
    `</template>`,
  ].join('\n');
}

/**
 * @private
 */
function _svelteStub(componentName, propNames) {
  const exportLines = (propNames || []).map(p => `  export let ${p}: string;`).join('\n');
  return [
    `<script lang="ts">`,
    exportLines,
    `</script>`,
    ``,
    `<!-- ${componentName} template -->`,
  ].join('\n');
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  generateFileAnnotations,
  generateTailwindTheme,
  generateCssVarsFromTheme,
  dtcgToThemeLines,
  typeToNamespace,
  detectFramework,
  generateComponentStub,
};
