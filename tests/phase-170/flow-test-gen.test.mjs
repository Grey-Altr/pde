/**
 * tests/phase-170/flow-test-gen.test.mjs
 * Tests for bin/lib/utils/flow-test-gen.cjs (UTL-05, UTL-06)
 *
 * All FS calls are mocked via dependency injection (_readdirFn).
 * No real design directory access required.
 */

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const flowTestGen = require('../../bin/lib/utils/flow-test-gen.cjs');
const { parseFlowchart, generateTestScaffold, findLatestFlowsFile } = flowTestGen;

// ---------------------------------------------------------------------------
// parseFlowchart
// ---------------------------------------------------------------------------
describe('parseFlowchart', () => {
  it('extracts nodes and edges from a simple LR flowchart', () => {
    const mermaid = `flowchart LR
    Home[Home Screen] --> Login[Login Screen]
    Login --> Dashboard[Dashboard]`;

    const result = parseFlowchart(mermaid);

    expect(result).toHaveProperty('nodes');
    expect(result).toHaveProperty('edges');
    expect(result.nodes).toBeInstanceOf(Map);
    expect(result.edges).toBeInstanceOf(Array);
    expect(result.edges.length).toBe(2);
    expect(result.edges[0]).toEqual({ from: 'Home', to: 'Login' });
    expect(result.edges[1]).toEqual({ from: 'Login', to: 'Dashboard' });
  });

  it('extracts node labels from bracket syntax', () => {
    const mermaid = `flowchart LR
    A[Alpha Node] --> B[Beta Node]
    B --> C[Gamma Node]`;

    const result = parseFlowchart(mermaid);

    expect(result.nodes.get('A')).toBe('Alpha Node');
    expect(result.nodes.get('B')).toBe('Beta Node');
    expect(result.nodes.get('C')).toBe('Gamma Node');
  });

  it('handles labeled edges with pipe syntax', () => {
    const mermaid = `flowchart LR
    Login -->|click login| Dashboard
    Dashboard -->|submit| Settings`;

    const result = parseFlowchart(mermaid);

    expect(result.edges.length).toBe(2);
    expect(result.edges[0]).toEqual({ from: 'Login', to: 'Dashboard' });
    expect(result.edges[1]).toEqual({ from: 'Dashboard', to: 'Settings' });
  });

  it('skips subgraph and end lines', () => {
    const mermaid = `flowchart LR
    subgraph auth [Authentication]
    Login[Login Screen] --> Dashboard[Dashboard]
    end
    Dashboard --> Settings[Settings]`;

    const result = parseFlowchart(mermaid);

    // subgraph and end lines should not appear as nodes
    expect(result.nodes.has('subgraph')).toBe(false);
    expect(result.nodes.has('end')).toBe(false);
    // valid edges should still be extracted
    expect(result.edges.some(e => e.from === 'Login' && e.to === 'Dashboard')).toBe(true);
    expect(result.edges.some(e => e.from === 'Dashboard' && e.to === 'Settings')).toBe(true);
  });

  it('skips comment lines starting with %%', () => {
    const mermaid = `flowchart LR
    %% This is a comment
    Home[Home Screen] --> Login[Login Screen]
    %% Another comment`;

    const result = parseFlowchart(mermaid);

    expect(result.edges.length).toBe(1);
    expect(result.edges[0]).toEqual({ from: 'Home', to: 'Login' });
  });

  it('skips flowchart/graph direction lines', () => {
    const mermaid = `flowchart LR
    graph TD
    LR
    Home[Home] --> Login[Login]`;

    const result = parseFlowchart(mermaid);

    // Should not produce spurious edges from direction keywords
    expect(result.nodes.has('LR')).toBe(false);
    expect(result.nodes.has('TD')).toBe(false);
    expect(result.edges.some(e => e.from === 'Home' && e.to === 'Login')).toBe(true);
  });

  it('handles parenthesis node syntax', () => {
    const mermaid = `flowchart LR
    A(Round Node) --> B[Square Node]`;

    const result = parseFlowchart(mermaid);
    expect(result.edges.length).toBe(1);
    expect(result.nodes.get('A')).toBe('Round Node');
  });

  it('handles diamond/decision node syntax', () => {
    const mermaid = `flowchart LR
    A{Decision?} --> B[Yes Path]`;

    const result = parseFlowchart(mermaid);
    expect(result.edges.length).toBe(1);
    expect(result.nodes.get('A')).toBe('Decision?');
  });
});

// ---------------------------------------------------------------------------
// generateTestScaffold
// ---------------------------------------------------------------------------
describe('generateTestScaffold', () => {
  const sampleNodes = new Map([
    ['Home', 'Home Screen'],
    ['Login', 'Login Screen'],
    ['Dashboard', 'Dashboard'],
  ]);
  const sampleEdges = [
    { from: 'Home', to: 'Login' },
    { from: 'Login', to: 'Dashboard' },
  ];

  it('produces a string containing @playwright/test import', () => {
    const result = generateTestScaffold({ nodes: sampleNodes, edges: sampleEdges });

    expect(typeof result).toBe('string');
    expect(result).toContain('@playwright/test');
  });

  it('produces one test() block per edge', () => {
    const result = generateTestScaffold({ nodes: sampleNodes, edges: sampleEdges });

    const testMatches = result.match(/\btest\(/g);
    expect(testMatches).not.toBeNull();
    expect(testMatches.length).toBe(sampleEdges.length);
  });

  it('includes page.goto in each test', () => {
    const result = generateTestScaffold({ nodes: sampleNodes, edges: sampleEdges });
    expect(result).toContain('page.goto');
  });

  it('includes page.click in each test', () => {
    const result = generateTestScaffold({ nodes: sampleNodes, edges: sampleEdges });
    expect(result).toContain('page.click');
  });

  it('uses node labels in test names', () => {
    const result = generateTestScaffold({ nodes: sampleNodes, edges: sampleEdges });
    expect(result).toContain('Home Screen');
    expect(result).toContain('Login Screen');
  });

  it('uses baseUrl when provided', () => {
    const result = generateTestScaffold({
      nodes: sampleNodes,
      edges: sampleEdges,
      baseUrl: 'http://localhost:8080',
    });
    expect(result).toContain('http://localhost:8080');
  });

  it('defaults to localhost:3000 when baseUrl not provided', () => {
    const result = generateTestScaffold({ nodes: sampleNodes, edges: sampleEdges });
    expect(result).toContain('localhost:3000');
  });

  it('returns empty test file with no tests when edges array is empty', () => {
    const result = generateTestScaffold({ nodes: new Map(), edges: [] });
    expect(typeof result).toBe('string');
    expect(result).toContain('@playwright/test');
  });
});

// ---------------------------------------------------------------------------
// findLatestFlowsFile
// ---------------------------------------------------------------------------
describe('findLatestFlowsFile', () => {
  it('returns path to highest version number when multiple files exist', () => {
    const mockReaddir = vi.fn().mockReturnValue([
      'FLW-flows-v1.md',
      'FLW-flows-v3.md',
      'FLW-flows-v2.md',
      'other-file.md',
    ]);

    const result = findLatestFlowsFile('/some/design/ux', mockReaddir);

    expect(result).not.toBeNull();
    expect(result).toContain('FLW-flows-v3.md');
  });

  it('returns null when no flows files exist in directory', () => {
    const mockReaddir = vi.fn().mockReturnValue(['other-file.md', 'README.md']);

    const result = findLatestFlowsFile('/some/design/ux', mockReaddir);

    expect(result).toBeNull();
  });

  it('returns null when directory is empty', () => {
    const mockReaddir = vi.fn().mockReturnValue([]);

    const result = findLatestFlowsFile('/some/design/ux', mockReaddir);

    expect(result).toBeNull();
  });

  it('returns single flow file when only one exists', () => {
    const mockReaddir = vi.fn().mockReturnValue(['FLW-flows-v1.md']);

    const result = findLatestFlowsFile('/some/design/ux', mockReaddir);

    expect(result).not.toBeNull();
    expect(result).toContain('FLW-flows-v1.md');
  });

  it('includes the design directory in the returned path', () => {
    const mockReaddir = vi.fn().mockReturnValue(['FLW-flows-v2.md']);

    const result = findLatestFlowsFile('/custom/design/ux', mockReaddir);

    expect(result).toContain('/custom/design/ux');
  });

  it('returns null when _readdirFn throws (directory does not exist)', () => {
    const mockReaddir = vi.fn().mockImplementation(() => {
      const err = new Error('ENOENT: no such file or directory');
      err.code = 'ENOENT';
      throw err;
    });

    const result = findLatestFlowsFile('/nonexistent/path', mockReaddir);

    expect(result).toBeNull();
  });
});
