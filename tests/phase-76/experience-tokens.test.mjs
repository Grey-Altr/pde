// Phase 76 — Experience Design Token Architecture
// Nyquist structural assertions for DSYS-01 through DSYS-07.
// Written BEFORE workflow edits (Wave 0) — expected to FAIL until system.md is updated.

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
// DSYS-07: experience tokens in separate file (test FIRST — gates everything)
// ---------------------------------------------------------------------------

describe('DSYS-07: experience tokens in separate file', () => {
  test('system.md contains SYS-experience-tokens.json generation instruction', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(
      content.includes('SYS-experience-tokens.json'),
      'system.md missing SYS-experience-tokens.json generation instruction'
    );
  });

  test('PRODUCT_TYPE experience guard appears before SYS-experience-tokens.json', () => {
    const content = readWorkflow('workflows/system.md');
    const guardIdxDouble = content.indexOf('PRODUCT_TYPE == "experience"');
    const guardIdxSingle = content.indexOf("PRODUCT_TYPE === 'experience'");
    const guardIdx = guardIdxDouble !== -1 ? guardIdxDouble
      : guardIdxSingle !== -1 ? guardIdxSingle : -1;
    const expFileIdx = content.indexOf('SYS-experience-tokens.json');
    assert.ok(guardIdx !== -1, 'system.md missing PRODUCT_TYPE experience guard');
    assert.ok(expFileIdx !== -1, 'system.md missing SYS-experience-tokens.json reference');
    assert.ok(
      guardIdx < expFileIdx,
      `PRODUCT_TYPE guard (idx ${guardIdx}) must appear before SYS-experience-tokens.json (idx ${expFileIdx})`
    );
  });

  test('system.md does NOT add experience categories to SYS-tokens.json instructions', () => {
    const content = readWorkflow('workflows/system.md');
    // Find the SYS-tokens.json File 1 section (Step 5) and the SYS-experience-tokens.json section
    const baseFileIdx = content.indexOf('File 1: `visual/SYS-tokens.json`');
    const expFileIdx = content.indexOf('SYS-experience-tokens.json');
    assert.ok(baseFileIdx !== -1, 'system.md missing File 1 SYS-tokens.json section');
    assert.ok(expFileIdx !== -1, 'system.md missing SYS-experience-tokens.json reference');
    // The section between File 1 and the experience file section must not contain sonic or lighting
    const baseSection = content.slice(baseFileIdx, expFileIdx);
    assert.ok(
      !baseSection.includes('sonic'),
      'system.md base token section (before Step 5b) must not contain "sonic" — would pollute SYS-tokens.json'
    );
    assert.ok(
      !baseSection.includes('lighting'),
      'system.md base token section (before Step 5b) must not contain "lighting" — would pollute SYS-tokens.json'
    );
  });
});

// ---------------------------------------------------------------------------
// DSYS-01: sonic design tokens
// ---------------------------------------------------------------------------

describe('DSYS-01: sonic design tokens in system.md', () => {
  test('system.md includes sonic token generation with bpm-range', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(
      content.includes('sonic'),
      'system.md missing "sonic" token category'
    );
    assert.ok(
      content.includes('bpm-range'),
      'system.md missing "bpm-range" token in sonic category'
    );
  });
});

// ---------------------------------------------------------------------------
// DSYS-02: lighting design tokens
// ---------------------------------------------------------------------------

describe('DSYS-02: lighting design tokens in system.md', () => {
  test('system.md includes lighting token generation with zone-main-color', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(
      content.includes('lighting'),
      'system.md missing "lighting" token category'
    );
    assert.ok(
      content.includes('zone-main-color'),
      'system.md missing "zone-main-color" token in lighting category'
    );
  });
});

// ---------------------------------------------------------------------------
// DSYS-03: spatial design tokens
// ---------------------------------------------------------------------------

describe('DSYS-03: spatial design tokens in system.md', () => {
  test('system.md includes spatial token generation with density-target', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(
      content.includes('spatial'),
      'system.md missing "spatial" token category'
    );
    assert.ok(
      content.includes('density-target'),
      'system.md missing "density-target" token in spatial category'
    );
  });
});

// ---------------------------------------------------------------------------
// DSYS-04: atmospheric design tokens
// ---------------------------------------------------------------------------

describe('DSYS-04: atmospheric design tokens in system.md', () => {
  test('system.md includes atmospheric token generation with ventilation-type', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(
      content.includes('atmospheric'),
      'system.md missing "atmospheric" token category'
    );
    assert.ok(
      content.includes('ventilation-type'),
      'system.md missing "ventilation-type" token in atmospheric category'
    );
  });
});

// ---------------------------------------------------------------------------
// DSYS-05: wayfinding design tokens
// ---------------------------------------------------------------------------

describe('DSYS-05: wayfinding design tokens in system.md', () => {
  test('system.md includes wayfinding token generation with sign-hierarchy', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(
      content.includes('wayfinding'),
      'system.md missing "wayfinding" token category'
    );
    assert.ok(
      content.includes('sign-hierarchy'),
      'system.md missing "sign-hierarchy" token in wayfinding category'
    );
  });
});

// ---------------------------------------------------------------------------
// DSYS-06: brand-coherence design tokens
// ---------------------------------------------------------------------------

describe('DSYS-06: brand-coherence design tokens in system.md', () => {
  test('system.md includes brand-coherence token generation with identity-thread', () => {
    const content = readWorkflow('workflows/system.md');
    assert.ok(
      content.includes('brand-coherence'),
      'system.md missing "brand-coherence" token category'
    );
    assert.ok(
      content.includes('identity-thread'),
      'system.md missing "identity-thread" token in brand-coherence category'
    );
  });
});

// ---------------------------------------------------------------------------
// 30-token cap
// ---------------------------------------------------------------------------

describe('30-token cap enforcement', () => {
  test('system.md enforces 30-token cap on experience token file', () => {
    const content = readWorkflow('workflows/system.md');
    const has30Cap =
      content.includes('30-token cap') ||
      content.includes('MUST NOT exceed 30') ||
      content.includes('must not exceed 30') ||
      content.includes('not exceed 30 leaf') ||
      content.includes('30 leaf nodes');
    assert.ok(
      has30Cap,
      'system.md missing 30-token cap constraint on experience tokens'
    );
  });
});
