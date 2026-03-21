// Phase 75 — Brief Extensions
// Nyquist structural assertions for BREF-01 through BREF-05.
// Written BEFORE workflow edits (Wave 0) — expected to FAIL until brief.md is updated.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// BREF-01: promise statement section in brief.md
// ---------------------------------------------------------------------------

describe('BREF-01: promise statement section in brief.md', () => {
  test('brief.md contains Promise Statement section generation instruction', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(
      content.includes('Promise Statement'),
      'brief.md missing Promise Statement section'
    );
  });
});

// ---------------------------------------------------------------------------
// BREF-02: vibe contract section in brief.md
// ---------------------------------------------------------------------------

describe('BREF-02: vibe contract section in brief.md', () => {
  test('brief.md contains Vibe Contract section with emotional arc field', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(
      content.includes('Vibe Contract'),
      'brief.md missing Vibe Contract section'
    );
    assert.ok(
      content.includes('emotional arc'),
      'brief.md missing emotional arc field in Vibe Contract'
    );
  });
});

// ---------------------------------------------------------------------------
// BREF-03: audience archetype section in brief.md
// ---------------------------------------------------------------------------

describe('BREF-03: audience archetype section in brief.md', () => {
  test('brief.md contains Audience Archetype section with mobility needs dimension', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(
      content.includes('Audience Archetype'),
      'brief.md missing Audience Archetype section'
    );
    assert.ok(
      content.includes('mobility needs') || content.includes('Mobility needs'),
      'brief.md missing mobility needs dimension in Audience Archetype'
    );
  });
});

// ---------------------------------------------------------------------------
// BREF-04: venue constraints section in brief.md
// ---------------------------------------------------------------------------

describe('BREF-04: venue constraints section in brief.md', () => {
  test('brief.md contains Venue Constraints section with curfew and noise limits', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(
      content.includes('Venue Constraints'),
      'brief.md missing Venue Constraints section'
    );
    assert.ok(
      content.includes('Curfew') || content.includes('curfew'),
      'brief.md missing Curfew row in Venue Constraints table'
    );
    assert.ok(
      content.includes('Noise limits') || content.includes('noise limits'),
      'brief.md missing Noise limits row in Venue Constraints table'
    );
  });
});

// ---------------------------------------------------------------------------
// BREF-05: repeatability intent section in brief.md
// ---------------------------------------------------------------------------

describe('BREF-05: repeatability intent section in brief.md', () => {
  test('brief.md contains Repeatability Intent section with one-off type option', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(
      content.includes('Repeatability Intent'),
      'brief.md missing Repeatability Intent section'
    );
    assert.ok(
      content.includes('one-off') || content.includes('series'),
      'brief.md missing one-off/series type options in Repeatability Intent'
    );
  });
});

// ---------------------------------------------------------------------------
// Cross-type regression: experience sections guarded by product_type conditional
// ---------------------------------------------------------------------------

describe('Cross-type regression: experience sections guarded by product_type conditional', () => {
  test('product_type == "experience" guard appears BEFORE Promise Statement in brief.md', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    const guardIdx = content.indexOf('product_type == "experience"') !== -1
      ? content.indexOf('product_type == "experience"')
      : content.indexOf("product_type === 'experience'");
    const promiseIdx = content.indexOf('Promise Statement');
    assert.ok(
      guardIdx !== -1,
      'brief.md missing product_type == "experience" guard'
    );
    assert.ok(
      promiseIdx !== -1,
      'brief.md missing Promise Statement section'
    );
    assert.ok(
      guardIdx < promiseIdx,
      `product_type guard (idx ${guardIdx}) must appear before Promise Statement (idx ${promiseIdx})`
    );
  });

  test('brief.md contains VERIFY WITH LOCAL AUTHORITY inline tag', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(
      content.includes('VERIFY WITH LOCAL AUTHORITY'),
      'brief.md missing VERIFY WITH LOCAL AUTHORITY inline tag in venue constraints'
    );
  });
});

// ---------------------------------------------------------------------------
// Template sync: design-brief.md includes experience type
// ---------------------------------------------------------------------------

describe('Template sync: design-brief.md includes experience type', () => {
  test('templates/design-brief.md Type line includes experience as a valid type', () => {
    const content = readFileSync(join(ROOT, 'templates/design-brief.md'), 'utf8');
    assert.ok(
      content.includes('experience'),
      'templates/design-brief.md missing experience as a valid product type'
    );
  });
});
