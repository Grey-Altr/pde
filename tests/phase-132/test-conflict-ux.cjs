'use strict';

/**
 * test-conflict-ux.cjs — Nyquist test suite for Phase 132 (INF-06, INF-07, INF-08)
 *
 * INF-06: Sync audit trail — SYNC-LOG.md append-only markdown, git-committed, trimmed at 500 entries
 * INF-07: Sync rollback — pre-write snapshots in sync-snapshots/, 30-day auto-cleanup, git-ignored
 * INF-08: Conflict UX commands — sync-status (state-file-only) + sync-rollback (list + restore)
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const {
  appendSyncLog,
  trimSyncLog,
  snapshotFilesBeforeBatch,
  cleanupOldSnapshots,
  decodeSnapshotPath,
  cmdSyncStatus,
  cmdSyncRollback,
  writeStateFile,
  writeMdcRule,
  emitCursorRules,
  emitAntigravitySkill,
  extractWorkflows,
} = require('../../bin/lib/context-sync.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-132-'));
}

function makePlanningDir(baseDir) {
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  // Minimal PROJECT.md so buildContextIR doesn't fail
  fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), '# Test Project\n', 'utf-8');
  // Minimal STATE.md
  fs.writeFileSync(path.join(planningDir, 'STATE.md'), '# State\n', 'utf-8');
  // design/ subdirectory with required files
  const designDir = path.join(planningDir, 'design');
  fs.mkdirSync(designDir, { recursive: true });
  fs.writeFileSync(path.join(designDir, 'DESIGN-STATE.md'), '', 'utf-8');
  fs.writeFileSync(path.join(designDir, 'design-manifest.json'), '{}', 'utf-8');
  return planningDir;
}

/** Capture stdout output from a function call */
function captureOutput(fn) {
  const lines = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk) => {
    lines.push(chunk.toString());
    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = orig;
  }
  return lines.join('');
}

// ─── INF-06: appendSyncLog ────────────────────────────────────────────────────

test("INF-06-1: appendSyncLog writes markdown entry to SYNC-LOG.md with ## timestamp heading", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  appendSyncLog(planningDir, {
    trigger: 'reconcileOnStart',
    filesScanned: 7,
    changes: 2,
    writeBacks: 1,
    conflicts: 0,
  });

  const logsDir = path.join(planningDir, 'logs');
  const logPath = path.join(logsDir, 'SYNC-LOG.md');
  assert.ok(fs.existsSync(logPath), 'SYNC-LOG.md should be created');

  const content = fs.readFileSync(logPath, 'utf-8');
  assert.ok(content.includes('## '), 'entry should have ## timestamp heading');
  assert.ok(content.includes('reconcileOnStart'), 'entry should include trigger name');
  assert.ok(content.includes('7'), 'entry should include files scanned count');
  assert.ok(content.includes('2'), 'entry should include changes count');
});

test("INF-06-2: trimSyncLog trims to 500 entries when exceeded", () => {
  const baseDir = makeTmpDir();
  const logsDir = path.join(baseDir, 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  const logPath = path.join(logsDir, 'SYNC-LOG.md');

  // Write 505 entries — each ## heading starts a new entry
  const entries = [];
  for (let i = 1; i <= 505; i++) {
    entries.push(`## 2026-03-24T${String(i).padStart(5, '0')}.000Z\n- Trigger: test-${i}\n`);
  }
  fs.writeFileSync(logPath, entries.join('\n'), 'utf-8');

  trimSyncLog(logPath, 500);

  const after = fs.readFileSync(logPath, 'utf-8');
  // Count ## headings that start entries
  const headingCount = (after.match(/^## /gm) || []).length;
  assert.ok(headingCount <= 500, `should have at most 500 entries, got ${headingCount}`);
  assert.ok(headingCount >= 490, `should retain close to 500 entries, got ${headingCount}`);
});

test("INF-06-3: appendSyncLog is non-fatal when logs dir is unwritable (or at least doesn't throw)", () => {
  const baseDir = makeTmpDir();
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  // Make .planning read-only to simulate permission error
  // Note: on macOS with root, this may not error — just verify no throw
  assert.doesNotThrow(() => {
    appendSyncLog('/nonexistent/path/that/cannot/be/created', {
      trigger: 'test',
      filesScanned: 0,
      changes: 0,
      writeBacks: 0,
      conflicts: 0,
    });
  }, 'appendSyncLog should not throw on write error');
});

test("INF-06-4: appendSyncLog entry contains only counts not raw field values", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  appendSyncLog(planningDir, {
    trigger: 'ingestAll',
    filesScanned: 3,
    changes: 1,
    writeBacks: 1,
    conflicts: 0,
  });

  const logPath = path.join(planningDir, 'logs', 'SYNC-LOG.md');
  const content = fs.readFileSync(logPath, 'utf-8');

  // Entry should contain counts but not fields like 'techStack', 'constraints' raw values
  // (which could contain multi-line content that breaks trim parsing)
  assert.ok(!content.includes('techStack'), 'entry should not contain raw field names');
  assert.ok(!content.includes('constraints'), 'entry should not contain raw field names');
  assert.ok(content.includes('ingestAll'), 'entry should include trigger');
});

// ─── INF-07: snapshotFilesBeforeBatch ────────────────────────────────────────

test("INF-07-1: snapshotFilesBeforeBatch creates snapshot files with + path encoding and -- separator", () => {
  const baseDir = makeTmpDir();
  // Create .planning/PROJECT.md to be snapshotted
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), '# Test Project content\n', 'utf-8');

  snapshotFilesBeforeBatch(baseDir);

  const snapshotDir = path.join(planningDir, 'sync-snapshots');
  assert.ok(fs.existsSync(snapshotDir), 'sync-snapshots directory should be created');

  const files = fs.readdirSync(snapshotDir);
  // Should have at least 1 snapshot (for .planning/PROJECT.md which exists)
  assert.ok(files.length >= 1, 'should have at least one snapshot file');

  // Check that snapshot filename uses + encoding and -- separator
  const snapshotFile = files[0];
  assert.ok(snapshotFile.includes('--'), 'snapshot filename should include -- separator');
  // Path portion should use + instead of /
  const pathPart = snapshotFile.split('--').slice(1).join('--');
  assert.ok(!pathPart.includes('/'), 'path portion should not contain / (should use + instead)');
  assert.ok(pathPart.includes('+'), 'path portion should use + for path separators');
});

test("INF-07-2: cleanupOldSnapshots removes files older than 30 days", () => {
  const baseDir = makeTmpDir();
  const snapshotDir = path.join(baseDir, 'sync-snapshots');
  fs.mkdirSync(snapshotDir, { recursive: true });

  // Create an old file (31 days ago via utimesSync)
  const oldFile = path.join(snapshotDir, '2026-01-01T000000-000Z--old-file');
  fs.writeFileSync(oldFile, 'old content', 'utf-8');
  const thirtyOneDaysAgo = (Date.now() - (31 * 24 * 60 * 60 * 1000)) / 1000;
  fs.utimesSync(oldFile, thirtyOneDaysAgo, thirtyOneDaysAgo);

  // Create a new file (now)
  const newFile = path.join(snapshotDir, '2026-03-24T000000-000Z--new-file');
  fs.writeFileSync(newFile, 'new content', 'utf-8');

  cleanupOldSnapshots(snapshotDir, 30);

  assert.ok(!fs.existsSync(oldFile), 'old snapshot file should be removed');
  assert.ok(fs.existsSync(newFile), 'new snapshot file should remain');
});

test("INF-07-3: snapshotFilesBeforeBatch is non-fatal when source files are missing", () => {
  const baseDir = makeTmpDir();
  // Don't create any .planning files — they'll be missing

  assert.doesNotThrow(() => {
    snapshotFilesBeforeBatch(baseDir);
  }, 'snapshotFilesBeforeBatch should not throw when files are missing');
});

test("INF-07-4: snapshot naming uses + not - for path separators", () => {
  const baseDir = makeTmpDir();
  const planningDir = path.join(baseDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  // Create the design/design-manifest.json to snapshot
  const designDir = path.join(planningDir, 'design');
  fs.mkdirSync(designDir, { recursive: true });
  fs.writeFileSync(path.join(designDir, 'design-manifest.json'), '{}', 'utf-8');

  snapshotFilesBeforeBatch(baseDir);

  const snapshotDir = path.join(planningDir, 'sync-snapshots');
  if (fs.existsSync(snapshotDir)) {
    const files = fs.readdirSync(snapshotDir);
    for (const f of files) {
      const pathPart = f.split('--').slice(1).join('--');
      // Path components should be separated by + (not /)
      assert.ok(!pathPart.includes('/'), `path part "${pathPart}" should not contain /`);
    }
  }
});

// ─── decodeSnapshotPath ───────────────────────────────────────────────────────

test("decodeSnapshotPath decodes snapshot filename to original file path", () => {
  const baseDir = makeTmpDir();
  // Snapshot name: <ts>--<encoded-path>
  // e.g. 2026-03-24T210000-000Z--.planning+PROJECT.md
  const snapshotName = '2026-03-24T210000-000Z--.planning+PROJECT.md';
  const decoded = decodeSnapshotPath(baseDir, snapshotName);
  assert.ok(decoded !== null, 'should decode successfully');
  assert.ok(decoded.endsWith('.planning/PROJECT.md') || decoded.endsWith('.planning' + path.sep + 'PROJECT.md'),
    `decoded path should end with .planning/PROJECT.md, got ${decoded}`);
});

test("decodeSnapshotPath returns null for malformed snapshot name (no -- separator)", () => {
  const baseDir = makeTmpDir();
  const decoded = decodeSnapshotPath(baseDir, 'no-separator-here');
  assert.equal(decoded, null, 'should return null for malformed snapshot name');
});

// ─── INF-08: cmdSyncStatus ───────────────────────────────────────────────────

test("INF-08-1: cmdSyncStatus reads state file and outputs last sync time and monitored files", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  // Write a state file via writeStateFile
  const ir = {
    projectName: 'Test',
    productType: 'cli',
    techStack: 'Node.js',
    projectSummary: 'A test project',
    designTokens: '',
    componentCatalog: '',
    pipelineStatus: '',
    constraints: '',
    sourceHash: 'a'.repeat(64),
    generatedAt: '2026-03-24T20:00:00.000Z',
  };
  writeStateFile(ir, planningDir);

  const out = captureOutput(() => cmdSyncStatus(baseDir));
  assert.ok(out.length > 0, 'cmdSyncStatus should produce output');
  // Should contain "sync" or "status" related info
  assert.ok(
    out.toLowerCase().includes('sync') || out.includes('2026-03-24') || out.includes('monitored'),
    `output should include sync info, got: ${out.slice(0, 200)}`
  );
});

test("INF-08-2: cmdSyncStatus counts unresolved conflicts from .sync-conflicts.log", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  // Write state file
  const ir = {
    projectName: 'Test', productType: 'cli', techStack: 'Node.js',
    projectSummary: '', designTokens: '', componentCatalog: '',
    pipelineStatus: '', constraints: '',
    sourceHash: 'b'.repeat(64), generatedAt: '2026-03-24T20:00:00.000Z',
  };
  writeStateFile(ir, planningDir);

  // Write some conflict entries: 2 pending, 1 resolved
  const conflictLog = path.join(planningDir, '.sync-conflicts.log');
  fs.writeFileSync(conflictLog, [
    JSON.stringify({ field: 'techStack', pendingResolution: true }),
    JSON.stringify({ field: 'constraints', pendingResolution: true }),
    JSON.stringify({ field: 'designTokens', pendingResolution: false }),
  ].join('\n') + '\n', 'utf-8');

  const out = captureOutput(() => cmdSyncStatus(baseDir));
  // Should contain unresolved count of 2
  assert.ok(out.includes('2'), `output should show unresolved conflict count of 2, got: ${out}`);
});

test("INF-08-3: cmdSyncRollback with no --restore lists snapshots sorted newest-first", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);
  const snapshotDir = path.join(planningDir, 'sync-snapshots');
  fs.mkdirSync(snapshotDir, { recursive: true });

  // Create 3 snapshot files with different timestamps
  const snapshots = [
    '2026-03-22T100000-000Z--.planning+PROJECT.md',
    '2026-03-23T100000-000Z--.planning+PROJECT.md',
    '2026-03-24T100000-000Z--.planning+PROJECT.md',
  ];
  for (const s of snapshots) {
    fs.writeFileSync(path.join(snapshotDir, s), 'snapshot content', 'utf-8');
  }

  const out = captureOutput(() => cmdSyncRollback(baseDir, []));
  assert.ok(out.length > 0, 'cmdSyncRollback should produce output listing snapshots');
  // Newest should appear first
  const idx24 = out.indexOf('2026-03-24');
  const idx22 = out.indexOf('2026-03-22');
  assert.ok(idx24 !== -1, 'should list the 2026-03-24 snapshot');
  assert.ok(idx22 !== -1, 'should list the 2026-03-22 snapshot');
  assert.ok(idx24 < idx22, 'newest snapshot (2026-03-24) should appear before oldest (2026-03-22)');
});

test("INF-08-4: cmdSyncRollback --restore decodes path, writes content, and does not throw", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);
  const snapshotDir = path.join(planningDir, 'sync-snapshots');
  fs.mkdirSync(snapshotDir, { recursive: true });

  // Create a snapshot for .planning/PROJECT.md
  const snapshotName = '2026-03-24T200000-000Z--.planning+PROJECT.md';
  const snapshotContent = '# Restored Project\n\nThis was restored.\n';
  fs.writeFileSync(path.join(snapshotDir, snapshotName), snapshotContent, 'utf-8');

  // Ensure the target file exists (it will be overwritten)
  fs.writeFileSync(path.join(planningDir, 'PROJECT.md'), '# Original\n', 'utf-8');

  // Also set up design/ dir for emitAll to not crash
  const designDir = path.join(planningDir, 'design');
  fs.mkdirSync(designDir, { recursive: true });
  fs.writeFileSync(path.join(designDir, 'DESIGN-STATE.md'), '', 'utf-8');
  fs.writeFileSync(path.join(designDir, 'design-manifest.json'), '{}', 'utf-8');

  assert.doesNotThrow(() => {
    cmdSyncRollback(baseDir, ['--restore', snapshotName]);
  }, 'cmdSyncRollback --restore should not throw');

  // File should be restored
  const restored = fs.readFileSync(path.join(planningDir, 'PROJECT.md'), 'utf-8');
  assert.equal(restored, snapshotContent, 'PROJECT.md should be restored to snapshot content');
});

test("INF-08-5: cmdSyncRollback --restore handles missing snapshot file gracefully", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  assert.doesNotThrow(() => {
    cmdSyncRollback(baseDir, ['--restore', 'nonexistent-snapshot-file']);
  }, 'cmdSyncRollback should not throw when snapshot file is missing');
});

// ─── INF-08: cmdSyncRollback no snapshots ────────────────────────────────────

test("cmdSyncRollback handles missing sync-snapshots directory gracefully", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);
  // Do NOT create sync-snapshots dir

  assert.doesNotThrow(() => {
    cmdSyncRollback(baseDir, []);
  }, 'cmdSyncRollback should not throw when snapshot directory is missing');
});

test("cmdSyncRollback shows max 20 snapshots when more exist", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);
  const snapshotDir = path.join(planningDir, 'sync-snapshots');
  fs.mkdirSync(snapshotDir, { recursive: true });

  // Create 25 snapshot files
  for (let i = 1; i <= 25; i++) {
    const ts = `2026-03-${String(i).padStart(2, '0')}T100000-000Z`;
    fs.writeFileSync(path.join(snapshotDir, `${ts}--.planning+PROJECT.md`), 'content', 'utf-8');
  }

  const out = captureOutput(() => cmdSyncRollback(baseDir, []));
  // Count how many snapshot entries appear (each line with a timestamp)
  const timestampMatches = out.match(/2026-03-\d{2}/g) || [];
  assert.ok(timestampMatches.length <= 20, `should display at most 20 snapshots, got ${timestampMatches.length}`);
});

// ─── CUR-06: writeMdcRule PDE:BEGIN/END markers ───────────────────────────────

test("CUR-06-1: writeMdcRule wraps body content between <!-- PDE:BEGIN --> and <!-- PDE:END --> markers", () => {
  const baseDir = makeTmpDir();
  const rulesDir = path.join(baseDir, '.cursor', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  writeMdcRule(rulesDir, 'test.mdc', {
    description: 'Test rule',
    globs: '*.ts',
    alwaysApply: false,
    body: '## Test Body\n\nSome content here',
    header: '<!-- PDE-GENERATED | hash:abc | generated:2026-03-24 -->',
  });

  const content = fs.readFileSync(path.join(rulesDir, 'test.mdc'), 'utf-8');
  assert.ok(content.includes('<!-- PDE:BEGIN -->'), 'should contain PDE:BEGIN marker');
  assert.ok(content.includes('<!-- PDE:END -->'), 'should contain PDE:END marker');

  const beginIdx = content.indexOf('<!-- PDE:BEGIN -->');
  const endIdx = content.indexOf('<!-- PDE:END -->');
  assert.ok(beginIdx < endIdx, 'PDE:BEGIN should appear before PDE:END');

  const bodyInSection = content.slice(beginIdx + '<!-- PDE:BEGIN -->'.length, endIdx);
  assert.ok(bodyInSection.includes('## Test Body'), 'body content should be between PDE:BEGIN and PDE:END');
});

test("CUR-06-2: writeMdcRule on fresh file produces correct structure without user content", () => {
  const baseDir = makeTmpDir();
  const rulesDir = path.join(baseDir, '.cursor', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  writeMdcRule(rulesDir, 'fresh.mdc', {
    description: 'Fresh rule',
    globs: '*.ts',
    alwaysApply: false,
    body: '## Fresh Body\n',
    header: '<!-- PDE-GENERATED | hash:xyz | generated:2026-03-24 -->',
  });

  const content = fs.readFileSync(path.join(rulesDir, 'fresh.mdc'), 'utf-8');
  assert.ok(content.includes('<!-- PDE:BEGIN -->'), 'fresh file should have PDE:BEGIN');
  assert.ok(content.includes('<!-- PDE:END -->'), 'fresh file should have PDE:END');

  // No extra content after PDE:END (no user content on fresh write)
  const endIdx = content.indexOf('<!-- PDE:END -->');
  const afterEnd = content.slice(endIdx + '<!-- PDE:END -->'.length);
  // Should only be a newline (or empty) after PDE:END, not unexpected content
  assert.ok(afterEnd.trim() === '', `fresh file should have no user content after PDE:END, got: "${afterEnd}"`);
});

test("CUR-06-3: writeMdcRule with existing file containing user content below PDE:END preserves that content exactly", () => {
  const baseDir = makeTmpDir();
  const rulesDir = path.join(baseDir, '.cursor', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  const filepath = path.join(rulesDir, 'existing.mdc');

  // Write initial file
  writeMdcRule(rulesDir, 'existing.mdc', {
    description: 'Existing rule',
    globs: '*.ts',
    alwaysApply: false,
    body: '## Body v1\n',
    header: '<!-- PDE-GENERATED | hash:aaa | generated:2026-03-24 -->',
  });

  // Append user content after PDE:END
  const initial = fs.readFileSync(filepath, 'utf-8');
  const userAddition = '\n\n## My Custom Section\n\n- Custom rule 1\n- Custom rule 2\n';
  fs.writeFileSync(filepath, initial + userAddition, 'utf-8');

  // Regenerate with new body
  writeMdcRule(rulesDir, 'existing.mdc', {
    description: 'Existing rule',
    globs: '*.ts',
    alwaysApply: false,
    body: '## Body v2 — updated\n',
    header: '<!-- PDE-GENERATED | hash:bbb | generated:2026-03-24 -->',
  });

  const result = fs.readFileSync(filepath, 'utf-8');
  assert.ok(result.includes('## Body v2 — updated'), 'body should be updated to v2');
  assert.ok(!result.includes('## Body v1'), 'old body should be replaced');
  assert.ok(result.includes('## My Custom Section'), 'user custom section should be preserved');
  assert.ok(result.includes('Custom rule 1'), 'user content should be preserved exactly');
});

test("CUR-06-4: writeMdcRule round-trip preserves user content without doubling", () => {
  const baseDir = makeTmpDir();
  const rulesDir = path.join(baseDir, '.cursor', 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  const filepath = path.join(rulesDir, 'roundtrip.mdc');

  // First write
  writeMdcRule(rulesDir, 'roundtrip.mdc', {
    description: 'Roundtrip test',
    globs: '*.tsx',
    alwaysApply: false,
    body: '## Design Tokens\n\ntoken-a: #fff\n',
    header: '<!-- PDE-GENERATED | hash:111 | generated:2026-03-24 -->',
  });

  // Add user content
  const v1 = fs.readFileSync(filepath, 'utf-8');
  fs.writeFileSync(filepath, v1 + '\n<!-- user note: keep this -->\n', 'utf-8');

  // Second regeneration
  writeMdcRule(rulesDir, 'roundtrip.mdc', {
    description: 'Roundtrip test',
    globs: '*.tsx',
    alwaysApply: false,
    body: '## Design Tokens\n\ntoken-a: #fff\ntoken-b: #000\n',
    header: '<!-- PDE-GENERATED | hash:222 | generated:2026-03-24 -->',
  });

  // Third regeneration (should not double user content)
  writeMdcRule(rulesDir, 'roundtrip.mdc', {
    description: 'Roundtrip test',
    globs: '*.tsx',
    alwaysApply: false,
    body: '## Design Tokens\n\ntoken-a: #fff\ntoken-b: #000\ntoken-c: #123\n',
    header: '<!-- PDE-GENERATED | hash:333 | generated:2026-03-24 -->',
  });

  const final = fs.readFileSync(filepath, 'utf-8');
  const userNoteMatches = (final.match(/user note: keep this/g) || []).length;
  assert.equal(userNoteMatches, 1, `user note should appear exactly once, got ${userNoteMatches}`);
  assert.ok(final.includes('token-c: #123'), 'latest body should be present');
});

test("CUR-06-5: emitCursorRules produces pde-design-tokens.mdc with glob **.{css,scss,tsx,jsx,ts}", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const ir = {
    projectName: 'Test', productType: 'web', techStack: 'React', projectSummary: 'Test',
    designTokens: '## Tokens\n', componentCatalog: '', pipelineStatus: '', constraints: '',
    sourceHash: 'a'.repeat(64), generatedAt: '2026-03-24T00:00:00.000Z',
  };

  emitCursorRules(ir, baseDir);

  const tokensMdc = fs.readFileSync(path.join(baseDir, '.cursor', 'rules', 'pde-design-tokens.mdc'), 'utf-8');
  assert.ok(
    tokensMdc.includes('**.{css,scss,tsx,jsx,ts}'),
    `pde-design-tokens.mdc glob should be **.{css,scss,tsx,jsx,ts}, got: ${tokensMdc.slice(0, 200)}`
  );
});

test("CUR-06-6: emitCursorRules produces pde-components.mdc with glob **.{tsx,jsx,stories.tsx,test.tsx}", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const ir = {
    projectName: 'Test', productType: 'web', techStack: 'React', projectSummary: 'Test',
    designTokens: '', componentCatalog: '## Components\n', pipelineStatus: '', constraints: '',
    sourceHash: 'b'.repeat(64), generatedAt: '2026-03-24T00:00:00.000Z',
  };

  emitCursorRules(ir, baseDir);

  const componentsMdc = fs.readFileSync(path.join(baseDir, '.cursor', 'rules', 'pde-components.mdc'), 'utf-8');
  assert.ok(
    componentsMdc.includes('**.{tsx,jsx,stories.tsx,test.tsx}'),
    `pde-components.mdc glob should be **.{tsx,jsx,stories.tsx,test.tsx}, got: ${componentsMdc.slice(0, 200)}`
  );
});

// ─── AGR-06: emitAntigravitySkill enhancements ────────────────────────────────

test("AGR-06-1: emitAntigravitySkill output contains <!-- pde-skill-version: 1.0 --> after PDE-GENERATED header", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const ir = {
    projectName: 'Test', productType: 'web', techStack: 'React', projectSummary: 'Test',
    designTokens: '', componentCatalog: '', pipelineStatus: '', constraints: 'Use hex colors',
    sourceHash: 'a'.repeat(64), generatedAt: '2026-03-24T00:00:00.000Z',
  };

  emitAntigravitySkill(ir, baseDir, planningDir);

  const skillPath = path.join(baseDir, '.agent', 'skills', 'pde-design', 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf-8');

  assert.ok(content.includes('<!-- pde-skill-version: 1.0 -->'), 'SKILL.md should contain pde-skill-version: 1.0 marker');

  // Must appear after PDE-GENERATED header
  const headerIdx = content.indexOf('<!-- PDE-GENERATED');
  const versionIdx = content.indexOf('<!-- pde-skill-version: 1.0 -->');
  assert.ok(versionIdx > headerIdx, 'pde-skill-version should appear after PDE-GENERATED header');
});

test("AGR-06-2: emitAntigravitySkill SKILL.md output contains ## Workflows section", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const ir = {
    projectName: 'Test', productType: 'web', techStack: 'React', projectSummary: 'Test',
    designTokens: '', componentCatalog: '', pipelineStatus: '', constraints: '',
    sourceHash: 'b'.repeat(64), generatedAt: '2026-03-24T00:00:00.000Z',
  };

  emitAntigravitySkill(ir, baseDir, planningDir);

  const skillPath = path.join(baseDir, '.agent', 'skills', 'pde-design', 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf-8');

  assert.ok(content.includes('## Workflows'), 'SKILL.md should contain ## Workflows section');
});

test("AGR-06-3: extractWorkflows with DESIGN-STATE.md containing SYS marker returns [x] System Tokens", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  // Write a DESIGN-STATE.md with a Domain Files table row containing SYS
  const designStateContent = `# DESIGN-STATE\n\n## Domain Files\n\n| Domain | File | Artifacts | Last Updated |\n|--------|------|-----------|----------|\n| ux | SYS-domain.md | SYS | 2026-03-24 |\n`;
  fs.writeFileSync(path.join(planningDir, 'design', 'DESIGN-STATE.md'), designStateContent, 'utf-8');

  const result = extractWorkflows(planningDir);
  assert.ok(result.includes('[x] System Tokens'), `should show [x] for SYS stage, got: ${result}`);
});

test("AGR-06-4: extractWorkflows returns 'Design pipeline not yet initialized.' when DESIGN-STATE.md is empty", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  // DESIGN-STATE.md is empty (makePlanningDir writes empty string)
  const result = extractWorkflows(planningDir);
  assert.equal(result, 'Design pipeline not yet initialized.', 'empty DESIGN-STATE should return not-initialized message');
});

test("AGR-06-5: SKILL.md Constraints section contains ir.constraints value not hardcoded lines", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const customConstraints = 'Always use TypeScript strict mode\nPrefer functional components\n';
  const ir = {
    projectName: 'Test', productType: 'web', techStack: 'React', projectSummary: 'Test',
    designTokens: '', componentCatalog: '', pipelineStatus: '', constraints: customConstraints,
    sourceHash: 'c'.repeat(64), generatedAt: '2026-03-24T00:00:00.000Z',
  };

  emitAntigravitySkill(ir, baseDir, planningDir);

  const skillPath = path.join(baseDir, '.agent', 'skills', 'pde-design', 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf-8');

  assert.ok(content.includes('Always use TypeScript strict mode'), 'SKILL.md should contain ir.constraints');
  assert.ok(content.includes('Prefer functional components'), 'SKILL.md should contain ir.constraints');
  // Should NOT have the old hardcoded constraint
  assert.ok(!content.includes('Use hex color values from DESIGN.md, not raw OKLCH'), 'should not have old hardcoded constraints');
});

test("AGR-06-6: SKILL.md Instructions references design-manifest.json not SYS-tokens.json", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const ir = {
    projectName: 'Test', productType: 'web', techStack: 'React', projectSummary: 'Test',
    designTokens: '', componentCatalog: '', pipelineStatus: '', constraints: '',
    sourceHash: 'd'.repeat(64), generatedAt: '2026-03-24T00:00:00.000Z',
  };

  emitAntigravitySkill(ir, baseDir, planningDir);

  const skillPath = path.join(baseDir, '.agent', 'skills', 'pde-design', 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf-8');

  assert.ok(content.includes('design-manifest.json'), 'SKILL.md Instructions should reference design-manifest.json');
  assert.ok(!content.includes('SYS-tokens.json'), 'SKILL.md should not reference old SYS-tokens.json path');
});

test("AGR-06-7: emitAntigravitySkill accepts planningDir as third argument without error", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);

  const ir = {
    projectName: 'Test', productType: 'web', techStack: 'React', projectSummary: 'Test',
    designTokens: '', componentCatalog: '', pipelineStatus: '', constraints: '',
    sourceHash: 'e'.repeat(64), generatedAt: '2026-03-24T00:00:00.000Z',
  };

  assert.doesNotThrow(() => {
    emitAntigravitySkill(ir, baseDir, planningDir);
  }, 'emitAntigravitySkill should accept planningDir as third argument without throwing');
});

test("AGR-06-8: SKILL.md agent additions below AGENT_MARKER are preserved after enhancement", () => {
  const baseDir = makeTmpDir();
  const planningDir = makePlanningDir(baseDir);
  const skillPath = path.join(baseDir, '.agent', 'skills', 'pde-design', 'SKILL.md');

  const ir = {
    projectName: 'Test', productType: 'web', techStack: 'React', projectSummary: 'Test',
    designTokens: '', componentCatalog: '', pipelineStatus: '', constraints: '',
    sourceHash: 'f'.repeat(64), generatedAt: '2026-03-24T00:00:00.000Z',
  };

  // First write
  emitAntigravitySkill(ir, baseDir, planningDir);

  // Append agent additions below AGENT_MARKER
  const existing = fs.readFileSync(skillPath, 'utf-8');
  const agentAddition = '\n## Agent Custom Section\n\n- Custom agent rule 1\n';
  fs.writeFileSync(skillPath, existing + agentAddition, 'utf-8');

  // Regenerate
  emitAntigravitySkill(ir, baseDir, planningDir);

  const result = fs.readFileSync(skillPath, 'utf-8');
  assert.ok(result.includes('## Agent Custom Section'), 'agent additions should be preserved after regeneration');
  assert.ok(result.includes('Custom agent rule 1'), 'agent addition content should be preserved');
});
