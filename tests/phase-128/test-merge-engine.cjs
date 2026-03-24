'use strict';

/**
 * test-merge-engine.cjs — Nyquist test suite for Phase 128 (CUR-04, AGR-04)
 *
 * CUR-04: 3-way field-level merge engine (mergePartialIR) with conflict detection
 *         and NDJSON conflict logging (appendConflictLog)
 * AGR-04: design-manifest.json as canonical token source — SOURCE comment in
 *         BOTH emitDesignMd content paths (full and placeholder)
 * Finding 1 fix: parseMdcContent for pde-architecture.mdc maps both Tech Stack
 *                AND Architecture Conventions sections
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');

const {
  mergePartialIR,
  appendConflictLog,
  parseMdcContent,
  emitAll,
} = require('../../bin/lib/context-sync.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pde-128-'));
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

// ─── CUR-04: mergePartialIR — 5 merge cases ──────────────────────────────────

test("CUR-04: mergePartialIR — editor-only changed — editor value wins", () => {
  const base = { techStack: 'A' };
  const editorPartial = { techStack: 'B' };
  const currentIR = { techStack: 'A' };

  const { merged, conflicts } = mergePartialIR(base, editorPartial, currentIR, { source: 'test' });

  assert.equal(merged.techStack, 'B', 'editor value should win when only editor changed');
  assert.equal(conflicts.length, 0, 'no conflicts when only editor changed');
});

test("CUR-04: mergePartialIR — pde-only changed — PDE value preserved", () => {
  const base = { techStack: 'A' };
  const editorPartial = { techStack: 'A' };
  const currentIR = { techStack: 'C' };

  const { merged, conflicts } = mergePartialIR(base, editorPartial, currentIR, { source: 'test' });

  assert.equal(merged.techStack, 'C', 'PDE value should be preserved when only PDE changed');
  assert.equal(conflicts.length, 0, 'no conflicts when only PDE changed');
});

test("CUR-04: mergePartialIR — both changed to same value — no conflict", () => {
  const base = { techStack: 'A' };
  const editorPartial = { techStack: 'B' };
  const currentIR = { techStack: 'B' };

  const { merged, conflicts } = mergePartialIR(base, editorPartial, currentIR, { source: 'test' });

  assert.equal(merged.techStack, 'B', 'value should be the agreed value when both changed to same');
  assert.equal(conflicts.length, 0, 'no conflicts when both changed to same value');
});

test("CUR-04: mergePartialIR — both changed to different values — conflict logged", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  const base = { techStack: 'A' };
  const editorPartial = { techStack: 'B' };
  const currentIR = { techStack: 'C' };

  const { merged, conflicts } = mergePartialIR(base, editorPartial, currentIR, {
    planningDir,
    source: 'test',
  });

  assert.equal(conflicts.length, 1, 'one conflict when both sides changed to different values');
  const conflict = conflicts[0];
  assert.ok(conflict.field, 'conflict must have field');
  assert.ok('baseValue' in conflict, 'conflict must have baseValue');
  assert.ok('editorValue' in conflict, 'conflict must have editorValue');
  assert.ok('planningValue' in conflict, 'conflict must have planningValue');
  assert.ok('resolvedValue' in conflict, 'conflict must have resolvedValue');
  assert.ok(conflict.policy, 'conflict must have policy');
  assert.ok(conflict.timestamp, 'conflict must have timestamp');
  assert.ok(conflict.source, 'conflict must have source');
  assert.equal(conflict.field, 'techStack');
  assert.equal(conflict.baseValue, 'A');
  assert.equal(conflict.editorValue, 'B');
  assert.equal(conflict.planningValue, 'C');
});

test("CUR-04: mergePartialIR — neither changed — current preserved (no-op)", () => {
  const base = { techStack: 'A' };
  const editorPartial = { techStack: 'A' };
  const currentIR = { techStack: 'A' };

  const { merged, conflicts } = mergePartialIR(base, editorPartial, currentIR, { source: 'test' });

  assert.equal(merged.techStack, 'A', 'current value preserved when neither side changed');
  assert.equal(conflicts.length, 0, 'no conflicts when neither side changed');
});

test("CUR-04: mergePartialIR — partial editor input — untouched fields preserved", () => {
  const base = { techStack: 'A', constraints: 'X' };
  const editorPartial = { techStack: 'B' }; // Only techStack present in editor partial
  const currentIR = { techStack: 'A', constraints: 'X' };

  const { merged, conflicts } = mergePartialIR(base, editorPartial, currentIR, { source: 'test' });

  assert.equal(merged.techStack, 'B', 'editor wins for techStack');
  assert.equal(merged.constraints, 'X', 'untouched constraints field preserved');
  assert.equal(conflicts.length, 0, 'no conflicts for partial editor input');
});

test("CUR-04: mergePartialIR — null base (first run) — editor wins for provided fields", () => {
  const base = null;
  const editorPartial = { techStack: 'B' };
  const currentIR = { techStack: 'A' };

  const { merged, conflicts } = mergePartialIR(base, editorPartial, currentIR, { source: 'test' });

  assert.equal(merged.techStack, 'B', 'editor value wins on first run (null base)');
  assert.equal(conflicts.length, 0, 'no conflicts on first run');
});

// ─── CUR-04: appendConflictLog — NDJSON logging ───────────────────────────────

test("CUR-04: appendConflictLog — writes NDJSON to .sync-conflicts.log", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  const logPath = path.join(planningDir, '.sync-conflicts.log');

  const entry = {
    field: 'techStack',
    baseValue: 'A',
    editorValue: 'B',
    planningValue: 'C',
    resolvedValue: 'C',
    policy: 'planning-wins',
    timestamp: new Date().toISOString(),
    source: 'test',
  };

  appendConflictLog(planningDir, entry);

  assert.ok(fs.existsSync(logPath), '.sync-conflicts.log must exist after appendConflictLog');
  const content = fs.readFileSync(logPath, 'utf-8').trim();
  const parsed = JSON.parse(content);
  assert.equal(parsed.field, 'techStack');
  assert.ok('baseValue' in parsed, 'entry must have baseValue');
  assert.ok('editorValue' in parsed, 'entry must have editorValue');
  assert.ok('planningValue' in parsed, 'entry must have planningValue');
  assert.ok('timestamp' in parsed, 'entry must have timestamp');
});

test("CUR-04: appendConflictLog — appends (does not overwrite) existing entries", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);
  const logPath = path.join(planningDir, '.sync-conflicts.log');

  const entry1 = {
    field: 'techStack',
    baseValue: 'A',
    editorValue: 'B',
    planningValue: 'C',
    resolvedValue: 'C',
    policy: 'planning-wins',
    timestamp: new Date().toISOString(),
    source: 'test-1',
  };
  const entry2 = {
    field: 'constraints',
    baseValue: 'X',
    editorValue: 'Y',
    planningValue: 'Z',
    resolvedValue: 'Z',
    policy: 'planning-wins',
    timestamp: new Date().toISOString(),
    source: 'test-2',
  };

  appendConflictLog(planningDir, entry1);
  appendConflictLog(planningDir, entry2);

  const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n');
  assert.equal(lines.length, 2, 'log must contain 2 lines (one per entry)');
  const parsed1 = JSON.parse(lines[0]);
  const parsed2 = JSON.parse(lines[1]);
  assert.equal(parsed1.source, 'test-1');
  assert.equal(parsed2.source, 'test-2');
});

// ─── CUR-04: planning-wins default resolution ─────────────────────────────────

test("CUR-04: mergePartialIR — conflict resolves with planning-wins default", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  const base = { techStack: 'A' };
  const editorPartial = { techStack: 'B' };
  const currentIR = { techStack: 'C' };

  const { merged, conflicts } = mergePartialIR(base, editorPartial, currentIR, {
    planningDir,
    source: 'test',
  });

  assert.equal(merged.techStack, 'C', 'planning value wins by default in true conflict');
  assert.equal(conflicts.length, 1, 'one conflict recorded');
  assert.equal(conflicts[0].resolvedValue, 'C', 'resolvedValue === planningValue');
  assert.equal(conflicts[0].policy, 'planning-wins', 'policy must be "planning-wins"');
});

// ─── AGR-04: SOURCE comment in both emitDesignMd paths ───────────────────────

test("AGR-04: emitDesignMd full content output contains SOURCE comment", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  // Write design-manifest.json WITH color tokens — triggers full content path
  const designManifest = {
    color: {
      primary: { $type: 'color', $value: 'oklch(0.6 0.15 250)' },
    },
  };
  fs.writeFileSync(
    path.join(planningDir, 'design', 'design-manifest.json'),
    JSON.stringify(designManifest),
    'utf-8'
  );

  emitAll(tmpDir);

  const designMdPath = path.join(tmpDir, 'DESIGN.md');
  assert.ok(fs.existsSync(designMdPath), 'DESIGN.md must exist after emitAll');
  const content = fs.readFileSync(designMdPath, 'utf-8');
  assert.ok(
    content.includes('<!-- SOURCE: design-manifest.json | DERIVE-ONLY -->'),
    'full content DESIGN.md must contain SOURCE comment'
  );
});

test("AGR-04: emitDesignMd placeholder output contains SOURCE comment (Research F3 gap)", () => {
  const tmpDir = makeTmpDir();
  const planningDir = makePlanningDir(tmpDir);

  // design-manifest.json has no color key — triggers placeholder path
  fs.writeFileSync(
    path.join(planningDir, 'design', 'design-manifest.json'),
    JSON.stringify({}),
    'utf-8'
  );

  emitAll(tmpDir);

  const designMdPath = path.join(tmpDir, 'DESIGN.md');
  assert.ok(fs.existsSync(designMdPath), 'DESIGN.md must exist after emitAll (placeholder)');
  const content = fs.readFileSync(designMdPath, 'utf-8');
  assert.ok(
    content.includes('<!-- SOURCE: design-manifest.json | DERIVE-ONLY -->'),
    'placeholder DESIGN.md must also contain SOURCE comment'
  );
});

// ─── Finding 1: parseMdcContent pde-architecture.mdc extracts BOTH fields ─────

test("Finding 1: parseMdcContent for pde-architecture.mdc extracts both techStack AND constraints", () => {
  // Correct format: YAML frontmatter first, then PDE-GENERATED comment, then body
  // Architecture mdc files use D-07 backward compat (no PDE:BEGIN/END markers)
  const mdcContent = [
    '---',
    'description: Architecture patterns',
    'globs: "**/*.ts"',
    'alwaysApply: false',
    '---',
    '',
    '<!-- PDE-GENERATED | hash:' + 'a'.repeat(64) + ' | generated:2025-01-01T00:00:00.000Z -->',
    '',
    '## Tech Stack',
    '',
    'Node.js, TypeScript',
    '',
    '## Architecture Conventions',
    '',
    'Use barrel exports. No circular deps.',
    '',
  ].join('\n');

  const partial = parseMdcContent(mdcContent, 'pde-architecture.mdc');

  assert.ok(partial, 'parseMdcContent must return a non-null result');
  assert.ok(partial.techStack, 'pde-architecture.mdc must extract techStack from Tech Stack section');
  assert.ok(partial.constraints, 'pde-architecture.mdc must extract constraints from Architecture Conventions section');
});
