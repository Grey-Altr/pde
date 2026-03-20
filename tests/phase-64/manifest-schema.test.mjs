/**
 * manifest-schema.test.mjs
 * Phase 64 — Coverage Schema Migration (MCP-04)
 *
 * Tests: All 5 JSON manifest files have the 14-field canonical designCoverage schema
 * with hasStitchWireframes present and set to false. Existing true values are not
 * clobbered. Field order follows the canonical 14-field sequence.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const CANONICAL_FIELDS = [
  'hasDesignSystem',
  'hasWireframes',
  'hasFlows',
  'hasHardwareSpec',
  'hasCritique',
  'hasIterate',
  'hasHandoff',
  'hasIdeation',
  'hasCompetitive',
  'hasOpportunity',
  'hasMockup',
  'hasHigAudit',
  'hasRecommendations',
  'hasStitchWireframes',
];

const JSON_FILES = [
  'templates/design-manifest.json',
  '.planning/design/design-manifest.json',
  '.planning/pressure-test/fixture-greenfield/design/design-manifest.json',
  '.planning/pressure-test/fixture-partial/design/design-manifest.json',
  '.planning/pressure-test/fixture-rerun/design/design-manifest.json',
];

function loadManifest(relPath) {
  const fullPath = join(ROOT, relPath);
  const raw = readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw);
}

test('all 5 JSON manifest files contain hasStitchWireframes in designCoverage', () => {
  for (const relPath of JSON_FILES) {
    const manifest = loadManifest(relPath);
    assert.ok(
      'designCoverage' in manifest,
      `${relPath}: missing designCoverage block`
    );
    assert.ok(
      'hasStitchWireframes' in manifest.designCoverage,
      `${relPath}: designCoverage missing hasStitchWireframes`
    );
  }
});

test('hasStitchWireframes is false in all 5 JSON manifest files (schema extension only — not yet activated)', () => {
  for (const relPath of JSON_FILES) {
    const manifest = loadManifest(relPath);
    assert.strictEqual(
      manifest.designCoverage.hasStitchWireframes,
      false,
      `${relPath}: hasStitchWireframes should be false, got ${manifest.designCoverage.hasStitchWireframes}`
    );
  }
});

test('all 5 JSON manifest files have all 14 canonical designCoverage fields', () => {
  for (const relPath of JSON_FILES) {
    const manifest = loadManifest(relPath);
    const keys = Object.keys(manifest.designCoverage).filter(k => k !== '_comment');
    for (const field of CANONICAL_FIELDS) {
      assert.ok(
        keys.includes(field),
        `${relPath}: designCoverage missing field "${field}"`
      );
    }
    assert.strictEqual(
      keys.length,
      14,
      `${relPath}: designCoverage has ${keys.length} fields, expected 14. Got: ${keys.join(', ')}`
    );
  }
});

test('canonical 14-field order is maintained in all 5 JSON manifest files', () => {
  for (const relPath of JSON_FILES) {
    const manifest = loadManifest(relPath);
    const keys = Object.keys(manifest.designCoverage).filter(k => k !== '_comment');
    for (let i = 0; i < CANONICAL_FIELDS.length; i++) {
      assert.strictEqual(
        keys[i],
        CANONICAL_FIELDS[i],
        `${relPath}: designCoverage field at position ${i} is "${keys[i]}", expected "${CANONICAL_FIELDS[i]}"`
      );
    }
  }
});

test('fixture-partial preserves pre-existing true coverage values alongside hasStitchWireframes', () => {
  const manifest = loadManifest('.planning/pressure-test/fixture-partial/design/design-manifest.json');
  const dc = manifest.designCoverage;
  // fixture-partial has several true values that must not have been clobbered
  assert.strictEqual(dc.hasDesignSystem, true, 'fixture-partial: hasDesignSystem should remain true');
  assert.strictEqual(dc.hasWireframes, true, 'fixture-partial: hasWireframes should remain true');
  assert.strictEqual(dc.hasFlows, true, 'fixture-partial: hasFlows should remain true');
  assert.strictEqual(dc.hasIdeation, true, 'fixture-partial: hasIdeation should remain true');
  assert.strictEqual(dc.hasCompetitive, true, 'fixture-partial: hasCompetitive should remain true');
  assert.strictEqual(dc.hasOpportunity, true, 'fixture-partial: hasOpportunity should remain true');
  assert.strictEqual(dc.hasRecommendations, true, 'fixture-partial: hasRecommendations should remain true');
  // hasStitchWireframes must be false (not yet activated)
  assert.strictEqual(dc.hasStitchWireframes, false, 'fixture-partial: hasStitchWireframes should be false');
});

test('fixture-rerun preserves all pre-existing true coverage values alongside hasStitchWireframes', () => {
  const manifest = loadManifest('.planning/pressure-test/fixture-rerun/design/design-manifest.json');
  const dc = manifest.designCoverage;
  // fixture-rerun has all 13 legacy fields set to true
  for (const field of CANONICAL_FIELDS.slice(0, 13)) {
    assert.strictEqual(dc[field], true, `fixture-rerun: ${field} should remain true`);
  }
  assert.strictEqual(dc.hasStitchWireframes, false, 'fixture-rerun: hasStitchWireframes should be false');
});
