// Phase 83 — Cross-Phase Wiring Fixes
// Tests for 3 integration gaps found by the v0.11 milestone audit:
// Gap 1: 10 workflow files missing hasPrintCollateral/hasProductionBible in designCoverage write
// Gap 2: wireframe.md reads SYS-experience-tokens.json from wrong path (assets/ vs visual/)
// Gap 3: REQUIREMENTS.md artifact code for WIRE-03 (FLP not FPL) — expected to already pass

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// The 10 workflow files that write designCoverage but had 14 or 15-field schema
// (flows.md and handoff.md are the correct baselines — they already have 16 fields)
const COVERAGE_WRITERS = [
  'workflows/system.md',
  'workflows/critique.md',
  'workflows/iterate.md',
  'workflows/hig.md',
  'workflows/ideate.md',
  'workflows/competitive.md',
  'workflows/opportunity.md',
  'workflows/recommend.md',
  'workflows/mockup.md',
  'workflows/wireframe.md',
];

// ---------------------------------------------------------------------------
// Gap 1: designCoverage 16-field schema
// ---------------------------------------------------------------------------

describe('Gap 1: designCoverage 16-field schema', () => {
  test('all 10 affected workflows contain hasPrintCollateral in designCoverage write section', () => {
    for (const relPath of COVERAGE_WRITERS) {
      const content = readFileSync(resolve(ROOT, relPath), 'utf-8');
      assert.ok(
        content.includes('hasPrintCollateral'),
        `${relPath}: missing hasPrintCollateral — workflow will clobber print collateral flag when it writes designCoverage`
      );
    }
  });

  test('all 10 affected workflows contain hasProductionBible in designCoverage write section', () => {
    for (const relPath of COVERAGE_WRITERS) {
      const content = readFileSync(resolve(ROOT, relPath), 'utf-8');
      assert.ok(
        content.includes('hasProductionBible'),
        `${relPath}: missing hasProductionBible — workflow will clobber production bible flag when it writes designCoverage`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Gap 2: wireframe.md token path
// ---------------------------------------------------------------------------

describe('Gap 2: wireframe.md token path', () => {
  test('wireframe.md reads experience tokens from visual/ path (not assets/)', () => {
    const content = readFileSync(resolve(ROOT, 'workflows/wireframe.md'), 'utf-8');
    assert.ok(
      content.includes('design/visual/SYS-experience-tokens.json'),
      'wireframe.md: missing design/visual/SYS-experience-tokens.json — must read from visual/ where system.md writes it'
    );
  });

  test('wireframe.md does NOT reference assets/ path for experience tokens', () => {
    const content = readFileSync(resolve(ROOT, 'workflows/wireframe.md'), 'utf-8');
    assert.ok(
      !content.includes('design/assets/SYS-experience-tokens.json'),
      'wireframe.md: still references design/assets/SYS-experience-tokens.json — old path must be replaced with design/visual/'
    );
  });
});

// ---------------------------------------------------------------------------
// Gap 3: REQUIREMENTS.md FLP artifact code (expected to already pass)
// ---------------------------------------------------------------------------

describe('Gap 3: REQUIREMENTS.md FLP artifact code', () => {
  test('REQUIREMENTS.md uses FLP not FPL for WIRE-03', () => {
    const content = readFileSync(resolve(ROOT, '.planning/REQUIREMENTS.md'), 'utf-8');
    const wire03Line = content
      .split('\n')
      .find(line => line.includes('WIRE-03'));
    assert.ok(wire03Line, 'REQUIREMENTS.md: WIRE-03 requirement line not found');
    assert.ok(
      wire03Line.includes('FLP'),
      `REQUIREMENTS.md: WIRE-03 line does not contain FLP — found: ${wire03Line}`
    );
    assert.ok(
      !wire03Line.includes('FPL'),
      `REQUIREMENTS.md: WIRE-03 line contains FPL typo — found: ${wire03Line}`
    );
  });
});
