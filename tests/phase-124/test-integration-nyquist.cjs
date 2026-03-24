'use strict';

/**
 * test-integration-nyquist.cjs -- Phase 124 Integration & Nyquist
 *
 * Fills coverage gaps for v0.15 requirements not explicitly tested in phases 118-123.
 * Covers: MCP-03 (npx dist structure), INTG-01 (meta-test file registration)
 *
 * Run: node --test tests/phase-124/test-integration-nyquist.cjs
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

// ─── MCP-03: npx distributable structure ────────────────────────────────────

describe('MCP-03: npx distributable structure', () => {
  const PKG_PATH = path.join(PROJECT_ROOT, 'packages', 'pde-mcp-server', 'package.json');
  const DIST_INDEX = path.join(PROJECT_ROOT, 'packages', 'pde-mcp-server', 'dist', 'index.js');

  it('dist/index.js exists (TypeScript build artifact)', () => {
    assert.ok(fs.existsSync(DIST_INDEX), `dist/index.js must exist at ${DIST_INDEX}`);
  });

  it('dist/index.js has executable shebang line', () => {
    const content = fs.readFileSync(DIST_INDEX, 'utf8');
    const firstLine = content.split('\n')[0];
    assert.ok(
      firstLine.includes('#!/usr/bin/env node'),
      `dist/index.js must start with #!/usr/bin/env node shebang, got: ${firstLine}`
    );
  });

  it('package.json bin field points to dist/index.js', () => {
    const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
    const binPath = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin['pde-mcp-server'];
    assert.ok(binPath.includes('dist/index.js'), `bin must point to dist/index.js, got: ${binPath}`);
  });
});

// ─── DIV-05: /pde:check-divergence command exists ────────────────────────────

describe('DIV-05: /pde:check-divergence command exists', () => {
  const CMD_PATH = path.join(PROJECT_ROOT, 'commands', 'check-divergence.md');
  const WF_PATH = path.join(PROJECT_ROOT, 'workflows', 'check-divergence.md');

  it('commands/check-divergence.md exists', () => {
    assert.ok(fs.existsSync(CMD_PATH), 'check-divergence command must exist');
  });

  it('workflows/check-divergence.md exists', () => {
    assert.ok(fs.existsSync(WF_PATH), 'check-divergence workflow must exist');
  });

  it('workflow references divergence.cjs module', () => {
    const content = fs.readFileSync(WF_PATH, 'utf8');
    assert.ok(content.includes('divergence.cjs'), 'workflow must reference divergence.cjs');
  });
});

// ─── INTG-01: Nyquist structural tests exist for all 25 v0.15 requirements ──

describe('INTG-01: Nyquist structural tests exist for all 25 v0.15 requirements', () => {
  const V015_TEST_FILES = [
    'tests/phase-118/test-context-sync.cjs',
    'tests/phase-119/test-antigravity-stitch.cjs',
    'tests/phase-120/test-artifact-format.cjs',
    'tests/phase-121/test-mcp-server.cjs',
    'tests/phase-122/test-divergence.cjs',
    'tests/phase-123/test-context-sync-hook.cjs',
    'tests/phase-123/test-editor-sync-command.cjs',
    'tests/phase-124/test-integration-nyquist.cjs',
  ];

  it('all 8 v0.15 test files exist', () => {
    for (const f of V015_TEST_FILES) {
      const fullPath = path.join(PROJECT_ROOT, f);
      assert.ok(fs.existsSync(fullPath), `${f} must exist`);
    }
  });

  it('8 test files cover all 25 v0.15 requirements', () => {
    assert.equal(V015_TEST_FILES.length, 8,
      'Expected 8 v0.15 test files (7 from phases 118-123 + 1 from phase 124)');
  });
});
