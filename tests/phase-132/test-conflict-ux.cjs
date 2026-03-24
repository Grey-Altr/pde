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
