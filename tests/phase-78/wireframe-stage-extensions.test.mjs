// Phase 78 — Wireframe Stage Extensions
// Nyquist structural assertions for WIRE-01 through WIRE-03.
// Written BEFORE workflow edits (Wave 0) — expected to FAIL until wireframe.md is updated.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

function readWorkflow(name) {
  return readFileSync(join(ROOT, name), 'utf8');
}

// ---------------------------------------------------------------------------
// WIRE-01: floor plan wireframe as SVG-in-HTML
// ---------------------------------------------------------------------------

describe('WIRE-01: floor plan wireframe as SVG-in-HTML', () => {
  test('wireframe.md contains FLP generation instruction', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      content.includes('FLP') || content.includes('floor plan'),
      'WIRE-01: FLP floor plan generation instruction missing from wireframe.md'
    );
  });

  test('wireframe.md contains PRODUCT_TYPE experience guard before FLP block', () => {
    const content = readWorkflow('workflows/wireframe.md');
    const guardIdx = content.indexOf('PRODUCT_TYPE == "experience"');
    const flpIdx = Math.max(content.indexOf('FLP'), content.indexOf('floor plan'));
    assert.ok(guardIdx !== -1, 'WIRE-01: PRODUCT_TYPE experience guard missing from wireframe.md');
    assert.ok(flpIdx !== -1, 'WIRE-01: FLP/floor plan reference missing from wireframe.md');
    assert.ok(guardIdx < flpIdx, 'WIRE-01: PRODUCT_TYPE guard must precede FLP generation instruction');
  });

  test('wireframe.md contains SCHEMATIC ONLY disclaimer text', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      content.includes('SCHEMATIC ONLY'),
      'WIRE-01: SCHEMATIC ONLY disclaimer text missing from wireframe.md'
    );
  });

  test('wireframe.md contains spaces-inventory.json hard prerequisite reference', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      content.includes('spaces-inventory.json'),
      'WIRE-01: spaces-inventory.json hard prerequisite reference missing from wireframe.md'
    );
  });

  test('wireframe.md contains font-size 14 minimum instruction for zone labels', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      content.includes('font-size') && content.includes('14'),
      'WIRE-01: font-size minimum 14 instruction for zone labels missing from wireframe.md'
    );
  });

  test('wireframe.md contains stroke-width 3 minimum instruction for wall/boundary strokes', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      content.includes('stroke-width') && content.includes('3'),
      'WIRE-01: stroke-width minimum 3 instruction for wall strokes missing from wireframe.md'
    );
  });
});

// ---------------------------------------------------------------------------
// WIRE-02: timeline wireframe as gantt-style HTML
// ---------------------------------------------------------------------------

describe('WIRE-02: timeline wireframe as gantt-style HTML', () => {
  test('wireframe.md contains TML generation instruction', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      content.includes('TML') || content.includes('timeline'),
      'WIRE-02: TML timeline generation instruction missing from wireframe.md'
    );
  });

  test('wireframe.md contains gantt or mermaid reference for TML rendering', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      content.includes('gantt') || content.includes('mermaid'),
      'WIRE-02: gantt/mermaid chart reference missing from wireframe.md'
    );
  });

  test('wireframe.md contains energy curve or energy arc reference for TML overlay', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      content.includes('energy curve') || content.includes('energy arc'),
      'WIRE-02: energy curve/arc overlay reference missing from wireframe.md'
    );
  });
});

// ---------------------------------------------------------------------------
// WIRE-03: FLP and TML manifest registration
// ---------------------------------------------------------------------------

describe('WIRE-03: FLP and TML manifest registration', () => {
  test('wireframe.md contains manifest-update FLP registration instruction', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      content.includes('manifest-update FLP'),
      'WIRE-03: manifest-update FLP registration instruction missing from wireframe.md'
    );
  });

  test('wireframe.md contains manifest-update TML registration instruction', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      content.includes('manifest-update TML'),
      'WIRE-03: manifest-update TML registration instruction missing from wireframe.md'
    );
  });
});

// ---------------------------------------------------------------------------
// Isolation: experience wireframe ordering and stub removal
// ---------------------------------------------------------------------------

describe('Isolation: experience wireframe ordering and stub removal', () => {
  test('experience wireframe block appears after PRODUCT_TYPE experience guard', () => {
    const content = readWorkflow('workflows/wireframe.md');
    const guardIdx = content.indexOf('PRODUCT_TYPE == "experience"');
    const expBlockIdx = content.indexOf('Step 4-EXP');
    assert.ok(guardIdx !== -1, 'Isolation: PRODUCT_TYPE experience guard missing from wireframe.md');
    assert.ok(expBlockIdx !== -1, 'Isolation: Step 4-EXP experience block missing from wireframe.md');
    assert.ok(guardIdx < expBlockIdx, 'Isolation: PRODUCT_TYPE guard must appear before Step 4-EXP block');
  });

  test('Phase 74 stub NEVER produce floor plans text is removed', () => {
    const content = readWorkflow('workflows/wireframe.md');
    assert.ok(
      !content.includes('NEVER produce floor plans'),
      'Isolation: Phase 74 stub "NEVER produce floor plans" text still present — must be removed'
    );
  });
});
