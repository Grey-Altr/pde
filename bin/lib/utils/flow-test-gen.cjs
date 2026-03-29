'use strict';

/**
 * bin/lib/utils/flow-test-gen.cjs
 *
 * Mermaid flowchart parser and Playwright test scaffold generator.
 * Parses /pde:flows output (FLW-flows-v*.md) and produces Playwright E2E
 * test skeletons with one test per flow edge (UTL-05, UTL-06).
 *
 * All FS calls use dependency injection (_readdirFn) for testability.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Default design directory for flow files
const DEFAULT_DESIGN_DIR = '.planning/design/ux';

// Lines to skip: subgraph, end, comments, direction keywords
const SKIP_RE = /^\s*(subgraph|end|%%|flowchart|graph|LR|TD|TB|RL)\b/;

// Edge pattern: A --> B, A[Label] --> B[Label], A -->|label| B, A --- B, A -.-> B, A ==> B
// Allows optional [label], (label), or {label} after node ID before the arrow
const EDGE_RE = /^\s*(\w+)(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?\s*(?:-->|---|-.->|===>|--[^>]*>)\s*(?:\|[^|]*\|\s*)?(\w+)/;

// ---------------------------------------------------------------------------
// parseFlowchart
// ---------------------------------------------------------------------------

/**
 * Parse a Mermaid flowchart text block and extract nodes and edges.
 *
 * @param {string} mermaidText - Raw Mermaid flowchart text
 * @returns {{ nodes: Map<string,string>, edges: Array<{from:string,to:string}> }}
 */
function parseFlowchart(mermaidText) {
  const nodes = new Map();
  const edges = [];

  const lines = mermaidText.split('\n');

  for (const line of lines) {
    // Skip non-content lines first
    if (SKIP_RE.test(line)) continue;

    // Try to match an edge (edges also reveal node IDs)
    const edgeMatch = line.match(EDGE_RE);
    if (edgeMatch) {
      const fromId = edgeMatch[1];
      const toId = edgeMatch[2];
      edges.push({ from: fromId, to: toId });

      // Register node IDs from edge (label may be set by standalone declaration)
      if (!nodes.has(fromId)) nodes.set(fromId, fromId);
      if (!nodes.has(toId)) nodes.set(toId, toId);

      // Extract label from inline node syntax on the same edge line
      _extractInlineLabels(line, nodes);
      continue;
    }

    // Try standalone node declarations (not edges)
    _extractInlineLabels(line, nodes);
  }

  return { nodes, edges };
}

/**
 * Extract node labels from a line (may contain multiple node declarations).
 * Updates nodes Map in place.
 *
 * @param {string} line
 * @param {Map<string,string>} nodes
 */
function _extractInlineLabels(line, nodes) {
  const patterns = [
    /(\w+)\[([^\]]+)\]/g,   // A[Label]
    /(\w+)\(([^)]+)\)/g,    // A(Label)
    /(\w+)\{([^}]+)\}/g,    // A{Label}
  ];

  for (const re of patterns) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(line)) !== null) {
      const id = m[1];
      const label = m[2].trim();
      if (SKIP_RE.test(id)) continue;
      nodes.set(id, label);
    }
  }
}

// ---------------------------------------------------------------------------
// generateTestScaffold
// ---------------------------------------------------------------------------

/**
 * Generate a Playwright test file from parsed flowchart data.
 *
 * @param {object} opts
 * @param {Map<string,string>} opts.nodes - Map of node ID to label
 * @param {Array<{from:string,to:string}>} opts.edges - List of flow edges
 * @param {string} [opts.baseUrl] - Base URL for page.goto (default: http://localhost:3000)
 * @returns {string} Complete Playwright test file content
 */
function generateTestScaffold({ nodes, edges, baseUrl }) {
  const url = baseUrl || 'http://localhost:3000';

  const lines = [
    "const { test, expect } = require('@playwright/test');",
    '',
  ];

  for (const edge of edges) {
    const fromLabel = (nodes && nodes.get(edge.from)) || edge.from;
    const toLabel   = (nodes && nodes.get(edge.to))   || edge.to;
    const toId      = edge.to;

    lines.push("test('navigates " + fromLabel + " -> " + toLabel + "', async ({ page }) => {");
    lines.push("  await page.goto('" + url + "');");
    lines.push("  await page.click('[data-testid=\"" + toId + "-link\"]');");
    lines.push("  await expect(page).toHaveURL(/" + toId + "/i);");
    lines.push('});');
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// findLatestFlowsFile
// ---------------------------------------------------------------------------

/**
 * Auto-detect the latest FLW-flows-v*.md file in the design UX directory.
 *
 * @param {string} [designDir] - Path to design UX directory
 * @param {function} [_readdirFn] - Injected readdirSync for testing
 * @returns {string|null} Absolute path to latest flows file, or null if none
 */
function findLatestFlowsFile(designDir, _readdirFn) {
  const dir = designDir || DEFAULT_DESIGN_DIR;
  const readdirFn = _readdirFn || fs.readdirSync;

  let files;
  try {
    files = readdirFn(dir);
  } catch (_) {
    return null;
  }

  const flowFiles = files.filter(function(f) {
    return /^FLW-flows-v\d+\.md$/.test(f);
  });

  if (flowFiles.length === 0) return null;

  // Sort by version number descending, return highest
  flowFiles.sort(function(a, b) {
    const vA = parseInt(a.match(/v(\d+)/)[1], 10);
    const vB = parseInt(b.match(/v(\d+)/)[1], 10);
    return vB - vA;
  });

  return path.join(dir, flowFiles[0]);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { parseFlowchart, generateTestScaffold, findLatestFlowsFile };
