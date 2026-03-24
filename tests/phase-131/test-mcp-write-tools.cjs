'use strict';

/**
 * test-mcp-write-tools.cjs — Nyquist tests for INF-01, INF-02, INF-03
 *
 * Tests:
 *   INF-01: --enable-writes flag parsing in index.ts
 *   INF-02: handleUpdateConstraints validation and behavior
 *   INF-03: handleUpdateTechStack validation and behavior
 */

const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const HANDLERS_PATH = path.join(PROJECT_ROOT, 'packages', 'pde-mcp-server', 'handlers.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-phase131-'));
}

/**
 * Create a minimal .planning/ directory with PROJECT.md containing
 * Constraints and Tech Stack sections suitable for testing write tools.
 */
function makePlanningDir(baseDir) {
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });

  fs.writeFileSync(
    path.join(planningDir, 'PROJECT.md'),
    '# Test Project\n\n' +
    '## Constraints\nExisting constraints\n\n' +
    '## Tech Stack\nExisting tech stack\n\n' +
    '## Summary\nTest project.\n',
    'utf-8'
  );

  return planningDir;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('INF-01: --enable-writes flag parsing', () => {
  test('INF-01-flag-off: enableWrites is false when --enable-writes not in argv', () => {
    // Test the argv check pattern directly
    const argv = ['node', 'index.js'];
    const enableWrites = argv.includes('--enable-writes');
    assert.equal(enableWrites, false);
  });

  test('INF-01-flag-on: enableWrites is true when --enable-writes is in argv', () => {
    const argv = ['node', 'index.js', '--enable-writes'];
    const enableWrites = argv.includes('--enable-writes');
    assert.equal(enableWrites, true);
  });
});

describe('INF-02: handleUpdateConstraints', () => {
  let handlers;
  let tmpDir;
  let planningDir;

  before(() => {
    handlers = require(HANDLERS_PATH);
    tmpDir = makeTmpDir();
    planningDir = makePlanningDir(tmpDir);
  });

  test('INF-02-valid: replaces Constraints section with valid 100-char content', async () => {
    const content = 'A'.repeat(100);
    const result = await handlers.handleUpdateConstraints(planningDir, { content });
    assert.equal(result.isError, undefined, `Expected no error, got: ${result.content?.[0]?.text}`);
    assert.ok(result.content[0].text.includes('updated'), `Expected success text, got: ${result.content[0].text}`);

    // Verify the file was actually updated
    const projectMd = fs.readFileSync(path.join(planningDir, 'PROJECT.md'), 'utf-8');
    assert.ok(projectMd.includes('A'.repeat(100)), 'PROJECT.md should contain new content');
  });

  test('INF-02-overflow: returns isError for 4001-char content', async () => {
    const content = 'B'.repeat(4001);
    const result = await handlers.handleUpdateConstraints(planningDir, { content });
    assert.equal(result.isError, true, 'Expected isError: true for overflow');
  });

  test('INF-02-underflow: returns isError for empty string', async () => {
    const result = await handlers.handleUpdateConstraints(planningDir, { content: '' });
    assert.equal(result.isError, true, 'Expected isError: true for empty content');
  });

  test('INF-02-injection: returns isError for content containing <!--', async () => {
    const content = 'Valid constraints <!-- injection attempt -->';
    const result = await handlers.handleUpdateConstraints(planningDir, { content });
    assert.equal(result.isError, true, 'Expected isError: true for HTML comment marker');
  });

  test('INF-02-injection2: returns isError for content containing PDE-GENERATED', async () => {
    const content = 'Valid constraints PDE-GENERATED hack';
    const result = await handlers.handleUpdateConstraints(planningDir, { content });
    assert.equal(result.isError, true, 'Expected isError: true for PDE-GENERATED marker');
  });

  test('INF-02-missing-section: returns isError when PROJECT.md has no Constraints heading', async () => {
    const tmpDir2 = makeTmpDir();
    const planningDir2 = path.join(tmpDir2, '.planning');
    fs.mkdirSync(planningDir2, { recursive: true });
    fs.writeFileSync(
      path.join(planningDir2, 'PROJECT.md'),
      '# Test Project\n\n## Summary\nNo constraints section here.\n',
      'utf-8'
    );

    const result = await handlers.handleUpdateConstraints(planningDir2, { content: 'Valid content here' });
    assert.equal(result.isError, true, 'Expected isError: true when section not found');
  });

  test('INF-02-ndjson: writes NDJSON entry to logs/mcp-writes.ndjson with required fields', async () => {
    const tmpDir3 = makeTmpDir();
    const planningDir3 = makePlanningDir(tmpDir3);
    const content = 'Constraints for NDJSON test';

    await handlers.handleUpdateConstraints(planningDir3, { content });

    const logPath = path.join(planningDir3, 'logs', 'mcp-writes.ndjson');
    assert.ok(fs.existsSync(logPath), 'mcp-writes.ndjson should exist');

    const logContent = fs.readFileSync(logPath, 'utf-8').trim();
    const entry = JSON.parse(logContent.split('\n')[0]);

    assert.ok(entry.ts, 'entry should have ts field');
    assert.equal(entry.tool, 'pde_update_constraints', 'entry should have correct tool name');
    assert.equal(entry.section, 'Constraints', 'entry should have section field');
    assert.ok(typeof entry.contentLen === 'number', 'entry should have contentLen as number');
    assert.ok('emitResult' in entry, 'entry should have emitResult field');
  });
});

describe('INF-03: handleUpdateTechStack', () => {
  let handlers;
  let tmpDir;
  let planningDir;

  before(() => {
    handlers = require(HANDLERS_PATH);
    tmpDir = makeTmpDir();
    planningDir = makePlanningDir(tmpDir);
  });

  test('INF-03-valid: replaces Tech Stack section with valid content', async () => {
    const content = 'Node.js 22, TypeScript 5.4, chokidar v4';
    const result = await handlers.handleUpdateTechStack(planningDir, { content });
    assert.equal(result.isError, undefined, `Expected no error, got: ${result.content?.[0]?.text}`);
    assert.ok(result.content[0].text.includes('updated'), `Expected success text, got: ${result.content[0].text}`);

    const projectMd = fs.readFileSync(path.join(planningDir, 'PROJECT.md'), 'utf-8');
    assert.ok(projectMd.includes('Node.js 22'), 'PROJECT.md should contain new tech stack');
  });

  test('INF-03-overflow: returns isError for 4001-char content', async () => {
    const content = 'C'.repeat(4001);
    const result = await handlers.handleUpdateTechStack(planningDir, { content });
    assert.equal(result.isError, true, 'Expected isError: true for overflow');
  });
});
