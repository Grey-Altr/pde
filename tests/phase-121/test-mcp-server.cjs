'use strict';

/**
 * test-mcp-server.cjs — Phase 121: MCP Server tests
 *
 * Covers:
 *   MCP-01: package.json structure validation
 *   MCP-02: All 10 tools registered, handlers return correct content
 *   MCP-03: discoverPlanningDir walk-up behavior
 *   MCP-04: pipeline-status resource handler
 *   MCP-05: get-tokens returns @theme block from DTCG tokens
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const PKG_PATH = path.join(PROJECT_ROOT, 'packages', 'pde-mcp-server', 'package.json');
const TSCONFIG_PATH = path.join(PROJECT_ROOT, 'packages', 'pde-mcp-server', 'tsconfig.json');
const HANDLERS_PATH = path.join(PROJECT_ROOT, 'packages', 'pde-mcp-server', 'handlers.cjs');
const DISCOVER_PATH = path.join(PROJECT_ROOT, 'packages', 'pde-mcp-server', 'discover.cjs');

// ─── MCP-01: Package Structure ──────────────────────────────────────────────

describe('MCP-01: package.json structure', () => {
  test('package.json exists', () => {
    assert.ok(fs.existsSync(PKG_PATH), `package.json not found at ${PKG_PATH}`);
  });

  test('package.json has correct name', () => {
    const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
    assert.equal(pkg.name, 'pde-mcp-server');
  });

  test('package.json has bin field pointing to dist/index.js', () => {
    const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
    assert.ok(pkg.bin, 'bin field missing');
    const binValue = pkg.bin['pde-mcp-server'] || pkg.bin;
    const binPath = typeof binValue === 'string' ? binValue : binValue['pde-mcp-server'];
    assert.ok(binPath.includes('dist/index.js'), `bin should point to dist/index.js, got: ${binPath}`);
  });

  test('package.json has @modelcontextprotocol/sdk dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
    assert.ok(
      pkg.dependencies && pkg.dependencies['@modelcontextprotocol/sdk'],
      '@modelcontextprotocol/sdk not in dependencies'
    );
  });

  test('tsconfig.json exists with outDir and rootDir', () => {
    assert.ok(fs.existsSync(TSCONFIG_PATH), `tsconfig.json not found at ${TSCONFIG_PATH}`);
    const tsconfig = JSON.parse(fs.readFileSync(TSCONFIG_PATH, 'utf8'));
    assert.ok(tsconfig.compilerOptions, 'compilerOptions missing');
    assert.ok(tsconfig.compilerOptions.outDir, 'outDir missing');
    assert.ok(tsconfig.compilerOptions.rootDir, 'rootDir missing');
  });
});

// ─── MCP-03: discoverPlanningDir ─────────────────────────────────────────────

describe('MCP-03: discoverPlanningDir', () => {
  let discover;

  test('discover.cjs exists and exports discoverPlanningDir', () => {
    assert.ok(fs.existsSync(DISCOVER_PATH), `discover.cjs not found at ${DISCOVER_PATH}`);
    discover = require(DISCOVER_PATH);
    assert.equal(typeof discover.discoverPlanningDir, 'function', 'discoverPlanningDir should be exported');
  });

  test('finds .planning/ in current directory', () => {
    if (!discover) discover = require(DISCOVER_PATH);
    // Use the actual project root which has .planning/
    const result = discover.discoverPlanningDir(PROJECT_ROOT);
    assert.ok(result !== null, 'Should find .planning/ in project root');
    assert.ok(result.endsWith('.planning'), `Expected path ending in .planning, got: ${result}`);
  });

  test('finds .planning/ via ancestor directory walk-up', () => {
    if (!discover) discover = require(DISCOVER_PATH);
    // Use a subdirectory of the project root
    const subdir = path.join(PROJECT_ROOT, 'tests', 'phase-121');
    const result = discover.discoverPlanningDir(subdir);
    assert.ok(result !== null, 'Should find .planning/ via walk-up from tests/phase-121');
    assert.ok(result.endsWith('.planning'), `Expected path ending in .planning, got: ${result}`);
  });

  test('returns null when no .planning/ exists', () => {
    if (!discover) discover = require(DISCOVER_PATH);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    try {
      const result = discover.discoverPlanningDir(tmpDir);
      assert.equal(result, null, 'Should return null when no .planning/ found');
    } finally {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  test('finds .planning/ in temp dir with nested structure', () => {
    if (!discover) discover = require(DISCOVER_PATH);
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-test-'));
    const planningDir = path.join(tmpBase, '.planning');
    const nested = path.join(tmpBase, 'a', 'b', 'c');
    fs.mkdirSync(planningDir, { recursive: true });
    fs.mkdirSync(nested, { recursive: true });
    try {
      const result = discover.discoverPlanningDir(nested);
      assert.ok(result !== null, 'Should find .planning/ in ancestor of nested dir');
      assert.equal(result, planningDir);
    } finally {
      fs.rmSync(tmpBase, { recursive: true });
    }
  });
});

// ─── MCP-02: All 10 tools ────────────────────────────────────────────────────

describe('MCP-02: Tool handlers', () => {
  let handlers;
  let tmpPlanningDir;

  // Setup a mock .planning/ directory
  function setupMockPlanningDir() {
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-mock-'));
    const planningDir = path.join(tmpBase, '.planning');
    fs.mkdirSync(path.join(planningDir, 'design', 'handoff'), { recursive: true });

    fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), '# Test Project\nA test project.');
    fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '# Roadmap\nPhase 1: Done');
    fs.writeFileSync(path.join(planningDir, 'REQUIREMENTS.md'), '# Requirements\nREQ-01: Done');
    fs.writeFileSync(path.join(planningDir, 'design', 'DESIGN-STATE.md'), '# Design State\nStage: handoff');

    const tokensPath = path.join(planningDir, 'design', 'tokens.json');
    const mockTokens = {
      color: {
        primary: { $value: '#3b82f6', $type: 'color' },
        secondary: { $value: '#8b5cf6', $type: 'color' },
      }
    };
    fs.writeFileSync(tokensPath, JSON.stringify(mockTokens));

    const manifest = {
      schemaVersion: '1.0.0',
      projectName: 'Test',
      artifacts: {
        tokens: tokensPath,
        wireframes: path.join(planningDir, 'design', 'wireframes.md'),
      }
    };
    fs.writeFileSync(path.join(planningDir, 'design', 'design-manifest.json'), JSON.stringify(manifest, null, 2));
    fs.writeFileSync(path.join(planningDir, 'design', 'wireframes.md'), '# Wireframes\nScreen 1');
    fs.writeFileSync(path.join(planningDir, 'design', 'handoff', 'component-handoff.md'), '# Component Handoff\nSpec here');

    return { tmpBase, planningDir };
  }

  test('handlers.cjs exists and exports expected functions', () => {
    assert.ok(fs.existsSync(HANDLERS_PATH), `handlers.cjs not found at ${HANDLERS_PATH}`);
    handlers = require(HANDLERS_PATH);
    const expectedHandlers = [
      'handleGetProject',
      'handleGetDesignState',
      'handleGetManifest',
      'handleGetTokens',
      'handleGetHandoff',
      'handleGetArtifact',
      'handleGetRoadmap',
      'handleGetRequirements',
      'handleGetPipelineStatus',
      'handleListArtifacts',
      'handlePipelineStatusResource',
    ];
    for (const fn of expectedHandlers) {
      assert.equal(typeof handlers[fn], 'function', `${fn} should be exported from handlers.cjs`);
    }
  });

  test('exactly 10 tool handlers exported (read-only, no write tools)', () => {
    if (!handlers) handlers = require(HANDLERS_PATH);
    const toolHandlers = [
      'handleGetProject', 'handleGetDesignState', 'handleGetManifest', 'handleGetTokens',
      'handleGetHandoff', 'handleGetArtifact', 'handleGetRoadmap', 'handleGetRequirements',
      'handleGetPipelineStatus', 'handleListArtifacts',
    ];
    assert.equal(toolHandlers.length, 10, 'Should have exactly 10 tool handlers');
    for (const fn of toolHandlers) {
      assert.equal(typeof handlers[fn], 'function', `Missing: ${fn}`);
    }
  });

  test('get-project returns PROJECT.md content', async () => {
    if (!handlers) handlers = require(HANDLERS_PATH);
    const { planningDir, tmpBase } = setupMockPlanningDir();
    try {
      const result = await handlers.handleGetProject(planningDir);
      assert.ok(result.content, 'Should have content array');
      assert.ok(result.content[0].text.includes('Test Project'), 'Should contain PROJECT.md content');
      assert.ok(!result.isError, 'Should not be error');
    } finally {
      fs.rmSync(path.dirname(planningDir), { recursive: true });
    }
  });

  test('get-design-state returns DESIGN-STATE.md content', async () => {
    if (!handlers) handlers = require(HANDLERS_PATH);
    const { planningDir, tmpBase } = setupMockPlanningDir();
    try {
      const result = await handlers.handleGetDesignState(planningDir);
      assert.ok(result.content[0].text.includes('Design State'), 'Should contain DESIGN-STATE.md content');
      assert.ok(!result.isError);
    } finally {
      fs.rmSync(path.dirname(planningDir), { recursive: true });
    }
  });

  test('get-manifest returns design-manifest.json content', async () => {
    if (!handlers) handlers = require(HANDLERS_PATH);
    const { planningDir } = setupMockPlanningDir();
    try {
      const result = await handlers.handleGetManifest(planningDir);
      assert.ok(result.content[0].text.includes('Test'), 'Should contain manifest content');
      assert.ok(!result.isError);
    } finally {
      fs.rmSync(path.dirname(planningDir), { recursive: true });
    }
  });

  test('get-roadmap returns ROADMAP.md content', async () => {
    if (!handlers) handlers = require(HANDLERS_PATH);
    const { planningDir } = setupMockPlanningDir();
    try {
      const result = await handlers.handleGetRoadmap(planningDir);
      assert.ok(result.content[0].text.includes('Roadmap'), 'Should contain ROADMAP.md content');
      assert.ok(!result.isError);
    } finally {
      fs.rmSync(path.dirname(planningDir), { recursive: true });
    }
  });

  test('get-requirements returns REQUIREMENTS.md content', async () => {
    if (!handlers) handlers = require(HANDLERS_PATH);
    const { planningDir } = setupMockPlanningDir();
    try {
      const result = await handlers.handleGetRequirements(planningDir);
      assert.ok(result.content[0].text.includes('Requirements'), 'Should contain REQUIREMENTS.md content');
      assert.ok(!result.isError);
    } finally {
      fs.rmSync(path.dirname(planningDir), { recursive: true });
    }
  });

  test('get-handoff with name param returns that file content', async () => {
    if (!handlers) handlers = require(HANDLERS_PATH);
    const { planningDir } = setupMockPlanningDir();
    try {
      const result = await handlers.handleGetHandoff(planningDir, { name: 'component-handoff' });
      assert.ok(result.content[0].text.includes('Component Handoff'), 'Should contain handoff file content');
      assert.ok(!result.isError);
    } finally {
      fs.rmSync(path.dirname(planningDir), { recursive: true });
    }
  });

  test('get-handoff without name param lists available files', async () => {
    if (!handlers) handlers = require(HANDLERS_PATH);
    const { planningDir } = setupMockPlanningDir();
    try {
      const result = await handlers.handleGetHandoff(planningDir, {});
      assert.ok(result.content[0].text.includes('component-handoff'), 'Should list available handoff files');
      assert.ok(!result.isError);
    } finally {
      fs.rmSync(path.dirname(planningDir), { recursive: true });
    }
  });

  test('get-artifact with name param reads artifact from manifest', async () => {
    if (!handlers) handlers = require(HANDLERS_PATH);
    const { planningDir } = setupMockPlanningDir();
    try {
      const result = await handlers.handleGetArtifact(planningDir, { name: 'wireframes' });
      assert.ok(result.content[0].text.includes('Wireframes'), 'Should contain wireframes artifact content');
      assert.ok(!result.isError);
    } finally {
      fs.rmSync(path.dirname(planningDir), { recursive: true });
    }
  });

  test('get-pipeline-status returns JSON with designState and manifest keys', async () => {
    if (!handlers) handlers = require(HANDLERS_PATH);
    const { planningDir } = setupMockPlanningDir();
    try {
      const result = await handlers.handleGetPipelineStatus(planningDir);
      assert.ok(!result.isError);
      const parsed = JSON.parse(result.content[0].text);
      assert.ok('designState' in parsed, 'Should have designState key');
      assert.ok('manifest' in parsed, 'Should have manifest key');
    } finally {
      fs.rmSync(path.dirname(planningDir), { recursive: true });
    }
  });

  test('list-artifacts returns array of artifact names', async () => {
    if (!handlers) handlers = require(HANDLERS_PATH);
    const { planningDir } = setupMockPlanningDir();
    try {
      const result = await handlers.handleListArtifacts(planningDir);
      assert.ok(!result.isError);
      const keys = JSON.parse(result.content[0].text);
      assert.ok(Array.isArray(keys), 'Should return JSON array');
      assert.ok(keys.includes('tokens'), 'Should include "tokens" artifact');
      assert.ok(keys.includes('wireframes'), 'Should include "wireframes" artifact');
    } finally {
      fs.rmSync(path.dirname(planningDir), { recursive: true });
    }
  });

  test('tools return isError: true when files are missing', async () => {
    if (!handlers) handlers = require(HANDLERS_PATH);
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-empty-'));
    const emptyPlanningDir = path.join(tmpBase, '.planning');
    fs.mkdirSync(emptyPlanningDir, { recursive: true });
    try {
      const result = await handlers.handleGetProject(emptyPlanningDir);
      assert.ok(result.isError === true, 'Should return isError: true for missing file');
    } finally {
      fs.rmSync(tmpBase, { recursive: true });
    }
  });
});

// ─── MCP-04: Pipeline resource ───────────────────────────────────────────────

describe('MCP-04: pipeline-status resource', () => {
  let handlers;

  test('handlePipelineStatusResource returns JSON with designState and manifest keys', async () => {
    handlers = require(HANDLERS_PATH);
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-res-'));
    const planningDir = path.join(tmpBase, '.planning');
    fs.mkdirSync(path.join(planningDir, 'design'), { recursive: true });
    fs.writeFileSync(path.join(planningDir, 'design', 'DESIGN-STATE.md'), '# Design State');
    fs.writeFileSync(path.join(planningDir, 'design', 'design-manifest.json'), JSON.stringify({ projectName: 'Test' }));
    try {
      const result = await handlers.handlePipelineStatusResource(planningDir);
      assert.ok(result.contents, 'Should have contents array');
      const parsed = JSON.parse(result.contents[0].text);
      assert.ok('designState' in parsed, 'Should have designState key');
      assert.ok('manifest' in parsed, 'Should have manifest key');
    } finally {
      fs.rmSync(tmpBase, { recursive: true });
    }
  });

  test('resource returns same structure as get-pipeline-status tool', async () => {
    handlers = require(HANDLERS_PATH);
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-res2-'));
    const planningDir = path.join(tmpBase, '.planning');
    fs.mkdirSync(path.join(planningDir, 'design'), { recursive: true });
    fs.writeFileSync(path.join(planningDir, 'design', 'DESIGN-STATE.md'), '# State Content');
    fs.writeFileSync(path.join(planningDir, 'design', 'design-manifest.json'), JSON.stringify({ projectName: 'T2' }));
    try {
      const toolResult = await handlers.handleGetPipelineStatus(planningDir);
      const resourceResult = await handlers.handlePipelineStatusResource(planningDir);
      const toolParsed = JSON.parse(toolResult.content[0].text);
      const resParsed = JSON.parse(resourceResult.contents[0].text);
      assert.deepEqual(Object.keys(toolParsed).sort(), Object.keys(resParsed).sort(), 'Both should have same keys');
    } finally {
      fs.rmSync(tmpBase, { recursive: true });
    }
  });
});

// ─── MCP-05: get-tokens @theme ───────────────────────────────────────────────

describe('MCP-05: get-tokens returns @theme block', () => {
  test('get-tokens returns string containing "@theme" from DTCG fixture', async () => {
    const handlers = require(HANDLERS_PATH);
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-tok-'));
    const planningDir = path.join(tmpBase, '.planning');
    fs.mkdirSync(path.join(planningDir, 'design'), { recursive: true });

    const tokensPath = path.join(planningDir, 'design', 'tokens.json');
    const dtcgTokens = {
      color: {
        primary: { $value: '#3b82f6', $type: 'color' },
        secondary: { $value: '#8b5cf6', $type: 'color' },
      },
      spacing: {
        sm: { $value: '4px', $type: 'dimension' },
        md: { $value: '8px', $type: 'dimension' },
      }
    };
    fs.writeFileSync(tokensPath, JSON.stringify(dtcgTokens));
    const manifest = {
      artifacts: { tokens: tokensPath }
    };
    fs.writeFileSync(path.join(planningDir, 'design', 'design-manifest.json'), JSON.stringify(manifest));

    try {
      const result = await handlers.handleGetTokens(planningDir);
      assert.ok(!result.isError, `Should not be error: ${result.content?.[0]?.text}`);
      assert.ok(result.content[0].text.includes('@theme'), `Should contain @theme, got: ${result.content[0].text.substring(0, 200)}`);
    } finally {
      fs.rmSync(tmpBase, { recursive: true });
    }
  });

  test('get-tokens returns informative message when no tokens in manifest', async () => {
    const handlers = require(HANDLERS_PATH);
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-notok-'));
    const planningDir = path.join(tmpBase, '.planning');
    fs.mkdirSync(path.join(planningDir, 'design'), { recursive: true });
    fs.writeFileSync(path.join(planningDir, 'design', 'design-manifest.json'), JSON.stringify({ artifacts: {} }));
    try {
      const result = await handlers.handleGetTokens(planningDir);
      // Should not be an error, just informative
      assert.ok(result.content[0].text.length > 0, 'Should return some message');
    } finally {
      fs.rmSync(tmpBase, { recursive: true });
    }
  });
});
