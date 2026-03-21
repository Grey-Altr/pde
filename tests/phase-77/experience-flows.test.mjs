// Phase 77 — Experience Flow Diagrams
// Nyquist structural assertions for FLOW-01 through FLOW-04.
// Written BEFORE workflow edits (Wave 0) — expected to FAIL until flows.md is updated.

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
// FLOW-01: temporal flow diagram
// ---------------------------------------------------------------------------

describe('FLOW-01: temporal flow diagram in flows.md', () => {
  test('flows.md contains temporal flow generation instruction', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(
      content.includes('TFL') || content.includes('temporal flow'),
      'flows.md missing temporal flow generation instruction (FLOW-01)'
    );
  });

  test('flows.md contains PRODUCT_TYPE experience guard before TFL generation', () => {
    const content = readWorkflow('workflows/flows.md');
    const guardIdx = content.indexOf('PRODUCT_TYPE == "experience"');
    const tflIdx = Math.max(content.indexOf('TFL'), content.indexOf('temporal flow'));
    assert.ok(guardIdx !== -1, 'flows.md missing PRODUCT_TYPE experience guard');
    assert.ok(tflIdx !== -1, 'flows.md missing TFL/temporal flow reference');
    assert.ok(guardIdx < tflIdx, 'PRODUCT_TYPE guard must precede TFL generation instruction');
  });

  test('flows.md contains 8-stage attendee arc keywords', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(content.includes('Awareness'), 'FLOW-01: Awareness stage missing');
    assert.ok(content.includes('Anticipation'), 'FLOW-01: Anticipation stage missing');
    assert.ok(content.includes('Arrival'), 'FLOW-01: Arrival stage missing');
    assert.ok(content.includes('Immersion'), 'FLOW-01: Immersion stage missing');
    assert.ok(content.includes('Peak'), 'FLOW-01: Peak stage missing');
    assert.ok(content.includes('Comedown'), 'FLOW-01: Comedown stage missing');
    assert.ok(content.includes('Departure'), 'FLOW-01: Departure stage missing');
    assert.ok(content.includes('Afterglow'), 'FLOW-01: Afterglow stage missing');
  });
});

// ---------------------------------------------------------------------------
// FLOW-02: spatial flow diagram
// ---------------------------------------------------------------------------

describe('FLOW-02: spatial flow diagram in flows.md', () => {
  test('flows.md contains spatial flow generation instruction', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(
      content.includes('SFL') || content.includes('spatial flow'),
      'flows.md missing spatial flow generation instruction (FLOW-02)'
    );
  });

  test('flows.md contains zone and bottleneck keywords for spatial flow', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(content.includes('BOTTLENECK'), 'FLOW-02: BOTTLENECK annotation keyword missing');
    assert.ok(
      content.includes('Emergency Egress') || content.includes('emergency egress') || content.includes('EMERGENCY'),
      'FLOW-02: emergency egress reference missing'
    );
  });
});

// ---------------------------------------------------------------------------
// FLOW-03: social flow diagram
// ---------------------------------------------------------------------------

describe('FLOW-03: social flow diagram in flows.md', () => {
  test('flows.md contains social flow generation instruction', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(
      content.includes('SOC') || content.includes('social flow'),
      'flows.md missing social flow generation instruction (FLOW-03)'
    );
  });

  test('flows.md contains solo vs group social dynamic keywords', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(content.includes('solo') || content.includes('Solo'), 'FLOW-03: solo dynamic missing');
    assert.ok(content.includes('group') || content.includes('Group'), 'FLOW-03: group dynamic missing');
  });
});

// ---------------------------------------------------------------------------
// FLOW-04: spaces-inventory.json
// ---------------------------------------------------------------------------

describe('FLOW-04: spaces-inventory.json in flows.md', () => {
  test('flows.md contains spaces-inventory.json generation instruction', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(
      content.includes('spaces-inventory.json'),
      'flows.md missing spaces-inventory.json generation instruction (FLOW-04)'
    );
  });

  test('flows.md specifies spaces-inventory.json schema fields', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(content.includes('venueCapacity'), 'FLOW-04: venueCapacity field missing from schema');
    assert.ok(content.includes('adjacentTo'), 'FLOW-04: adjacentTo field missing from schema');
    assert.ok(content.includes('densityTarget'), 'FLOW-04: densityTarget field missing from schema');
  });

  test('flows.md specifies spaces-inventory.json write path in ux directory', () => {
    const content = readWorkflow('workflows/flows.md');
    assert.ok(
      content.includes('.planning/design/ux/spaces-inventory.json'),
      'FLOW-04: canonical write path .planning/design/ux/spaces-inventory.json missing'
    );
  });
});

// ---------------------------------------------------------------------------
// Experience flow isolation: software products unaffected
// ---------------------------------------------------------------------------

describe('Experience flow isolation: software products unaffected', () => {
  test('experience flow artifact codes appear only inside PRODUCT_TYPE experience guard', () => {
    const content = readWorkflow('workflows/flows.md');
    const guardIdx = content.indexOf('PRODUCT_TYPE == "experience"');
    if (guardIdx === -1) return; // guard tested elsewhere
    const tflIdx = content.indexOf('TFL-temporal-flow');
    const sflIdx = content.indexOf('SFL-spatial-flow');
    const socIdx = content.indexOf('SOC-social-flow');
    if (tflIdx !== -1) assert.ok(tflIdx > guardIdx, 'TFL reference appears before experience guard');
    if (sflIdx !== -1) assert.ok(sflIdx > guardIdx, 'SFL reference appears before experience guard');
    if (socIdx !== -1) assert.ok(socIdx > guardIdx, 'SOC reference appears before experience guard');
  });
});
