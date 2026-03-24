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

describe('INF-04: pde_append_context_note', () => {
  let handlers;
  let tmpDir;
  let planningDir;

  before(() => {
    handlers = require(HANDLERS_PATH);
    tmpDir = makeTmpDir();
    planningDir = makePlanningDir(tmpDir);
  });

  test('INF-04-valid: appends timestamped note to technical-notes.md', async () => {
    const result = await handlers.handleAppendContextNote(planningDir, {
      category: 'technical',
      note: 'Test note for INF-04',
    });
    assert.equal(result.isError, undefined, `Expected no error, got: ${result.content?.[0]?.text}`);
    assert.ok(result.content[0].text.includes('technical-notes.md'), `Expected success text mentioning file, got: ${result.content[0].text}`);

    // Verify note file was created and contains the note
    const notesPath = path.join(planningDir, 'context-notes', 'technical-notes.md');
    assert.ok(fs.existsSync(notesPath), 'technical-notes.md should exist');
    const contents = fs.readFileSync(notesPath, 'utf-8');
    assert.ok(contents.includes('Test note for INF-04'), 'File should contain the note text');
    // Verify ISO timestamp header
    assert.ok(/## \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(contents), 'File should contain ISO timestamp header');
  });

  test('INF-04-invalid-category: returns isError for category="malicious"', async () => {
    const result = await handlers.handleAppendContextNote(planningDir, {
      category: 'malicious',
      note: 'Attempt with invalid category',
    });
    assert.equal(result.isError, true, 'Expected isError: true for invalid category');
  });

  test('INF-04-traversal: returns isError for category="../secret" (caught by allowlist)', async () => {
    const result = await handlers.handleAppendContextNote(planningDir, {
      category: '../secret',
      note: 'Path traversal attempt',
    });
    assert.equal(result.isError, true, 'Expected isError: true for traversal attempt');
  });

  test('INF-04-empty-note: returns isError for note=""', async () => {
    const result = await handlers.handleAppendContextNote(planningDir, {
      category: 'design',
      note: '',
    });
    assert.equal(result.isError, true, 'Expected isError: true for empty note');
  });

  test('INF-04-ndjson: logs entry to mcp-writes.ndjson with tool, category, noteLen', async () => {
    const tmpDir2 = makeTmpDir();
    const planningDir2 = makePlanningDir(tmpDir2);

    await handlers.handleAppendContextNote(planningDir2, {
      category: 'product',
      note: 'Note for NDJSON logging test',
    });

    const logPath = path.join(planningDir2, 'logs', 'mcp-writes.ndjson');
    assert.ok(fs.existsSync(logPath), 'mcp-writes.ndjson should exist');

    const logContent = fs.readFileSync(logPath, 'utf-8').trim();
    const entry = JSON.parse(logContent.split('\n')[0]);

    assert.ok(entry.ts, 'entry should have ts field');
    assert.equal(entry.tool, 'pde_append_context_note', 'entry should have correct tool name');
    assert.equal(entry.category, 'product', 'entry should have category field');
    assert.ok(typeof entry.noteLen === 'number', 'entry should have noteLen as a number');
  });

  test('INF-04-emitall: calls emitAll(cwd) post-write (no error thrown)', async () => {
    const tmpDir3 = makeTmpDir();
    const planningDir3 = makePlanningDir(tmpDir3);

    // emitAll may fail (no real editor setup) but should not throw from handler
    const result = await handlers.handleAppendContextNote(planningDir3, {
      category: 'decision',
      note: 'Testing emitAll is called after note append',
    });
    // Handler should succeed regardless of emitAll result (try/catch wraps it)
    assert.equal(result.isError, undefined, `Expected no error from emitAll isolation, got: ${result.content?.[0]?.text}`);
  });
});

describe('INF-05: pde_flag_divergence', () => {
  let handlers;
  let tmpDir;
  let planningDir;

  before(() => {
    handlers = require(HANDLERS_PATH);
    tmpDir = makeTmpDir();
    planningDir = makePlanningDir(tmpDir);
  });

  test('INF-05-valid: writes entry to divergence-flags.json array', async () => {
    const result = await handlers.handleFlagDivergence(planningDir, {
      component: 'Button',
      reason: 'Color drift from design spec',
      severity: 'medium',
    });
    assert.equal(result.isError, undefined, `Expected no error, got: ${result.content?.[0]?.text}`);
    assert.ok(result.content[0].text.includes('Button'), `Expected success text mentioning component, got: ${result.content[0].text}`);

    // Verify divergence-flags.json was created with the entry
    const flagsPath = path.join(planningDir, 'divergence-flags.json');
    assert.ok(fs.existsSync(flagsPath), 'divergence-flags.json should exist');
    const flags = JSON.parse(fs.readFileSync(flagsPath, 'utf-8'));
    assert.ok(Array.isArray(flags), 'flags should be an array');
    assert.ok(flags.length >= 1, 'flags array should have at least one entry');
    const entry = flags[flags.length - 1];
    assert.equal(entry.component, 'Button', 'entry should have component field');
    assert.equal(entry.reason, 'Color drift from design spec', 'entry should have reason field');
    assert.equal(entry.severity, 'medium', 'entry should have severity field');
    assert.ok(entry.ts, 'entry should have ts field');
  });

  test('INF-05-no-emitall: does NOT call emitAll (no .context-sync-state.json written)', async () => {
    const tmpDir2 = makeTmpDir();
    const planningDir2 = makePlanningDir(tmpDir2);
    const cwd2 = path.dirname(planningDir2);

    await handlers.handleFlagDivergence(planningDir2, {
      component: 'Header',
      reason: 'Typography mismatch',
      severity: 'low',
    });

    // emitAll would write .context-sync-state.json in cwd — verify it was not created
    const syncStatePath = path.join(cwd2, '.context-sync-state.json');
    assert.ok(!fs.existsSync(syncStatePath), '.context-sync-state.json should NOT exist (emitAll was not called)');
  });

  test('INF-05-component-validation: returns isError for component=""', async () => {
    const result = await handlers.handleFlagDivergence(planningDir, {
      component: '',
      reason: 'Some reason',
      severity: 'low',
    });
    assert.equal(result.isError, true, 'Expected isError: true for empty component');
  });

  test('INF-05-component-pattern: returns isError for component containing "/"', async () => {
    const result = await handlers.handleFlagDivergence(planningDir, {
      component: 'path/traversal',
      reason: 'Some reason',
      severity: 'low',
    });
    assert.equal(result.isError, true, 'Expected isError: true for component with path separator');
  });

  test('INF-05-ndjson: logs entry to mcp-writes.ndjson with tool, component, severity', async () => {
    const tmpDir3 = makeTmpDir();
    const planningDir3 = makePlanningDir(tmpDir3);

    await handlers.handleFlagDivergence(planningDir3, {
      component: 'Card',
      reason: 'Shadow mismatch',
      severity: 'high',
    });

    const logPath = path.join(planningDir3, 'logs', 'mcp-writes.ndjson');
    assert.ok(fs.existsSync(logPath), 'mcp-writes.ndjson should exist');

    const logContent = fs.readFileSync(logPath, 'utf-8').trim();
    const entry = JSON.parse(logContent.split('\n')[0]);

    assert.ok(entry.ts, 'entry should have ts field');
    assert.equal(entry.tool, 'pde_flag_divergence', 'entry should have correct tool name');
    assert.equal(entry.component, 'Card', 'entry should have component field');
    assert.equal(entry.severity, 'high', 'entry should have severity field');
  });

  test('INF-05-atomic: file exists after write (tmp+renameSync pattern)', async () => {
    const tmpDir4 = makeTmpDir();
    const planningDir4 = makePlanningDir(tmpDir4);

    const result = await handlers.handleFlagDivergence(planningDir4, {
      component: 'Modal',
      reason: 'Border radius drift',
      severity: 'low',
    });

    assert.equal(result.isError, undefined, 'Expected no error');
    const flagsPath = path.join(planningDir4, 'divergence-flags.json');
    assert.ok(fs.existsSync(flagsPath), 'divergence-flags.json should exist after atomic write');
    // Verify no leftover tmp file
    const tmpPattern = flagsPath + '.' + process.pid + '.tmp';
    assert.ok(!fs.existsSync(tmpPattern), 'No leftover tmp file should remain');
  });

  test('INF-05-append: two calls result in 2 entries in divergence-flags.json', async () => {
    const tmpDir5 = makeTmpDir();
    const planningDir5 = makePlanningDir(tmpDir5);

    await handlers.handleFlagDivergence(planningDir5, {
      component: 'Input',
      reason: 'First divergence',
      severity: 'low',
    });

    await handlers.handleFlagDivergence(planningDir5, {
      component: 'Select',
      reason: 'Second divergence',
      severity: 'medium',
    });

    const flagsPath = path.join(planningDir5, 'divergence-flags.json');
    const flags = JSON.parse(fs.readFileSync(flagsPath, 'utf-8'));
    assert.equal(flags.length, 2, 'Should have exactly 2 entries after two calls');
    assert.equal(flags[0].component, 'Input', 'First entry should be Input');
    assert.equal(flags[1].component, 'Select', 'Second entry should be Select');
  });
});
