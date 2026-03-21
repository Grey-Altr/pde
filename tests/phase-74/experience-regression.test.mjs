// Phase 74 — Foundation and Regression Infrastructure
// Regression smoke matrix: cross-type assertions covering FNDX-01 through FNDX-04.
// Written BEFORE workflow edits so that failing tests validate the pre-state.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// Source: direct codebase inspection — these 14 files are the pipeline workflow set.
// Canonical list confirmed from tests/phase-64/workflow-pass-through.test.mjs plus
// brief.md (product type detection entry point) and build.md (stage orchestration).
const PIPELINE_WORKFLOW_FILES = [
  'workflows/brief.md',
  'workflows/flows.md',
  'workflows/system.md',
  'workflows/wireframe.md',
  'workflows/critique.md',
  'workflows/iterate.md',
  'workflows/handoff.md',
  'workflows/ideate.md',
  'workflows/competitive.md',
  'workflows/opportunity.md',
  'workflows/hig.md',
  'workflows/recommend.md',
  'workflows/mockup.md',
  'workflows/build.md',
];

// ---------------------------------------------------------------------------
// FNDX-01: experience product type detection in brief.md
// ---------------------------------------------------------------------------

describe('FNDX-01: experience product type detection in brief.md', () => {
  test('brief.md contains experience signal keywords', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(
      content.includes('experience'),
      'brief.md missing experience type reference'
    );
    assert.ok(
      content.includes('festival') || content.includes('venue'),
      'brief.md missing experience signals (festival/venue not found)'
    );
  });

  test('brief.md contains sub-type detection logic for all 5 sub-types', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(
      content.includes('single-night'),
      'brief.md missing single-night sub-type'
    );
    assert.ok(
      content.includes('multi-day'),
      'brief.md missing multi-day sub-type'
    );
    assert.ok(
      content.includes('recurring-series'),
      'brief.md missing recurring-series sub-type'
    );
    assert.ok(
      content.includes('installation'),
      'brief.md missing installation sub-type'
    );
    assert.ok(
      content.includes('hybrid-event'),
      'brief.md missing hybrid-event sub-type'
    );
  });

  test('brief.md writes experienceSubType to manifest', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(
      content.includes('experienceSubType'),
      'brief.md missing experienceSubType manifest write instruction'
    );
  });
});

// ---------------------------------------------------------------------------
// FNDX-02: experience branch sites in all 14 pipeline workflow files
// ---------------------------------------------------------------------------

describe('FNDX-02: experience branch sites in all 14 pipeline workflow files', () => {
  test('all 14 pipeline workflow files contain experience branch site', () => {
    for (const relPath of PIPELINE_WORKFLOW_FILES) {
      const content = readFileSync(join(ROOT, relPath), 'utf8');
      assert.ok(
        content.includes('experience'),
        `${relPath}: missing experience branch site or experience keyword`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// FNDX-03: cross-type regression — existing types unaffected
// ---------------------------------------------------------------------------

describe('FNDX-03: cross-type regression — existing types unaffected', () => {
  test('brief.md still resolves software as a valid product type', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    // software type string must still appear as a valid resolved value
    assert.ok(
      content.includes('software'),
      'brief.md: software as resolved type must be present'
    );
  });

  test('experience branch appears BEFORE the final software default in brief.md', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    const expIdx = content.indexOf('experience');
    // Find the last occurrence of the software default assignment
    const softwareDefaultIdx =
      content.lastIndexOf('product_type = "software"') !== -1
        ? content.lastIndexOf('product_type = "software"')
        : content.lastIndexOf("product_type = 'software'");
    assert.ok(expIdx !== -1, 'experience branch not found in brief.md');
    assert.ok(softwareDefaultIdx !== -1, 'software default not found in brief.md');
    assert.ok(
      expIdx < softwareDefaultIdx,
      `experience branch (idx ${expIdx}) must appear before the software default (idx ${softwareDefaultIdx})`
    );
  });
});

// ---------------------------------------------------------------------------
// FNDX-04: sub-types as metadata attributes — not structural branches elsewhere
// ---------------------------------------------------------------------------

describe('FNDX-04: sub-types as metadata attributes (not structural branches outside brief.md)', () => {
  test('no workflow other than brief.md contains sub-type structural branching', () => {
    const nonBriefWorkflows = PIPELINE_WORKFLOW_FILES.filter(
      (f) => !f.includes('brief.md')
    );
    for (const relPath of nonBriefWorkflows) {
      const content = readFileSync(join(ROOT, relPath), 'utf8');
      // Sub-type names in non-brief workflows may appear in comments or stubs,
      // but must NOT appear as independent IF/ELSE structural branches.
      const hasSingleNightBranch =
        /IF.*single-night|ELSE IF.*single-night/i.test(content);
      assert.ok(
        !hasSingleNightBranch,
        `${relPath}: contains sub-type structural branching (single-night IF/ELSE IF) — sub-types must be metadata only`
      );
    }
  });
});
