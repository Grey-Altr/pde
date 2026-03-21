// Phase 82 — Integration Validation and Regression Audit
// Cross-type regression matrix: SC-1 (no regressions), SC-3 (no new workflows), SC-4 (13 skills operational).
// Verifies software/hardware/hybrid code paths are preserved after v0.11 experience additions.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// The 13 pipeline skill workflow files (excludes brief.md and build.md which are
// orchestration/entry-point files, not design artifact-producing skills).
const THIRTEEN_PIPELINE_SKILLS = [
  'workflows/recommend.md',
  'workflows/competitive.md',
  'workflows/opportunity.md',
  'workflows/ideate.md',
  'workflows/brief.md',
  'workflows/system.md',
  'workflows/flows.md',
  'workflows/wireframe.md',
  'workflows/critique.md',
  'workflows/iterate.md',
  'workflows/mockup.md',
  'workflows/hig.md',
  'workflows/handoff.md',
];

// Experience implementation keywords for workflows that received full experience
// implementation during v0.11 (not just branch stubs).
const EXPERIENCE_IMPLEMENTED = {
  'workflows/critique.md': 'Experience Perspective 1: Safety',
  'workflows/hig.md': 'Physical HIG Domain 1: Wayfinding',
  'workflows/handoff.md': 'Production Bible',
  'workflows/wireframe.md': 'FLY artifact',
};

// Software/hardware path markers that must be preserved in v0.11+ workflows.
const SOFTWARE_PATH_MARKERS = {
  'workflows/critique.md': ['WCAG', 'POUR'],
  'workflows/hig.md': ['WCAG'],
  'workflows/handoff.md': ['TypeScript', 'HND'],
  'workflows/wireframe.md': ['WFR'],
};

// ---------------------------------------------------------------------------
// SC-4: skill registry — all 13 pipeline skills operational
// ---------------------------------------------------------------------------

describe('SC-4: skill registry — all 13 pipeline skills operational', () => {
  test('all 13 pipeline skill files exist', () => {
    for (const relPath of THIRTEEN_PIPELINE_SKILLS) {
      assert.ok(
        existsSync(join(ROOT, relPath)),
        `${relPath}: skill file does not exist`
      );
    }
  });

  test('all 13 pipeline skills contain experience branch site', () => {
    for (const relPath of THIRTEEN_PIPELINE_SKILLS) {
      const content = readFileSync(join(ROOT, relPath), 'utf-8');
      assert.ok(
        content.includes('experience'),
        `${relPath}: missing experience branch site or experience keyword`
      );
    }
  });

  test('implemented experience workflows contain their implementation keywords (not stubs)', () => {
    for (const [relPath, keyword] of Object.entries(EXPERIENCE_IMPLEMENTED)) {
      const content = readFileSync(join(ROOT, relPath), 'utf-8');
      assert.ok(
        content.includes(keyword),
        `${relPath}: missing experience implementation keyword "${keyword}" — expected full implementation, not stub`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// SC-1: software/hardware/hybrid code paths preserved
// ---------------------------------------------------------------------------

describe('SC-1: software/hardware/hybrid code paths preserved', () => {
  test('critique.md preserves WCAG and POUR software critique paths', () => {
    const content = readFileSync(join(ROOT, 'workflows/critique.md'), 'utf-8');
    assert.ok(content.includes('WCAG'), 'critique.md: WCAG software critique path missing');
    assert.ok(content.includes('POUR'), 'critique.md: POUR accessibility framework reference missing');
  });

  test('hig.md preserves WCAG software HIG path', () => {
    const content = readFileSync(join(ROOT, 'workflows/hig.md'), 'utf-8');
    assert.ok(content.includes('WCAG'), 'hig.md: WCAG software HIG path missing');
  });

  test('handoff.md preserves TypeScript interface generation and HND artifact code', () => {
    const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf-8');
    assert.ok(content.includes('TypeScript'), 'handoff.md: TypeScript interface generation path missing');
    assert.ok(content.includes('HND'), 'handoff.md: HND artifact code missing');
  });

  test('wireframe.md preserves WFR software wireframe artifact code', () => {
    const content = readFileSync(join(ROOT, 'workflows/wireframe.md'), 'utf-8');
    assert.ok(content.includes('WFR'), 'wireframe.md: WFR software wireframe artifact code missing');
  });
});

// ---------------------------------------------------------------------------
// SC-3: no new workflow files added during v0.11
// ---------------------------------------------------------------------------

describe('SC-3: no new workflow files added during v0.11', () => {
  test('git diff --diff-filter=A v0.10..HEAD shows zero new workflow files', () => {
    const result = spawnSync(
      'git',
      ['diff', '--diff-filter=A', 'v0.10..HEAD', '--name-only'],
      { cwd: ROOT, encoding: 'utf8' }
    );
    assert.strictEqual(
      result.status,
      0,
      `git diff failed: ${result.stderr}`
    );
    const newWorkflowFiles = (result.stdout || '')
      .split('\n')
      .filter(line => line.startsWith('workflows/'));
    assert.strictEqual(
      newWorkflowFiles.length,
      0,
      `v0.11 added ${newWorkflowFiles.length} new workflow file(s): ${newWorkflowFiles.join(', ')}. All experience behavior must live as conditional blocks in existing workflow files.`
    );
  });
});

// ---------------------------------------------------------------------------
// SC-1: cross-type regression — existing test suites green
// ---------------------------------------------------------------------------

describe('SC-1: cross-type regression — existing test suites green', () => {
  test('Phase 64 manifest schema tests pass (updated to 16 fields)', () => {
    const result = spawnSync(
      process.execPath,
      ['--test', join(ROOT, 'tests/phase-64/manifest-schema.test.mjs')],
      { cwd: ROOT, encoding: 'utf8' }
    );
    assert.strictEqual(
      result.status,
      0,
      `manifest-schema.test.mjs failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`
    );
  });

  test('Phase 64 workflow pass-through tests pass (relaxed hasStitchWireframes)', () => {
    const result = spawnSync(
      process.execPath,
      ['--test', join(ROOT, 'tests/phase-64/workflow-pass-through.test.mjs')],
      { cwd: ROOT, encoding: 'utf8' }
    );
    assert.strictEqual(
      result.status,
      0,
      `workflow-pass-through.test.mjs failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`
    );
  });

  test('Phase 74 experience regression tests pass', () => {
    const result = spawnSync(
      process.execPath,
      ['--test', join(ROOT, 'tests/phase-74/experience-regression.test.mjs')],
      { cwd: ROOT, encoding: 'utf8' }
    );
    assert.strictEqual(
      result.status,
      0,
      `experience-regression.test.mjs failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`
    );
  });
});
