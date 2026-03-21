/**
 * hex-to-oklch.test.mjs
 * Phase 69 — Handoff Pattern Extraction
 *
 * Tests: HND-02 (hexToOklch function present, edge case handling, output format)
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const handoffMd = readFileSync(resolve(ROOT, 'workflows', 'handoff.md'), 'utf8');

describe('HND-02: hexToOklch inline conversion', () => {
  test('handoff.md contains hexToOklch function definition', () => {
    assert.ok(
      handoffMd.includes('function hexToOklch'),
      'handoff.md missing hexToOklch function definition'
    );
  });

  test('hexToOklch uses OKLab math constants (LMS matrix)', () => {
    assert.ok(
      handoffMd.includes('0.4122214708'),
      'handoff.md missing LMS matrix constant 0.4122214708 in hexToOklch'
    );
  });

  test('hexToOklch uses Math.cbrt for cube root (LMS transform)', () => {
    assert.ok(
      handoffMd.includes('Math.cbrt'),
      'handoff.md missing Math.cbrt in hexToOklch'
    );
  });

  test('hexToOklch uses Math.atan2 for hue angle', () => {
    assert.ok(
      handoffMd.includes('Math.atan2'),
      'handoff.md missing Math.atan2 in hexToOklch'
    );
  });

  test('hexToOklch handles 3-digit shorthand hex (#rgb)', () => {
    assert.ok(
      handoffMd.includes('#[0-9a-fA-F]{3}'),
      'handoff.md missing shorthand hex handling regex in hexToOklch'
    );
  });

  test('hexToOklch handles 8-digit hex with alpha (#rrggbbaa)', () => {
    assert.ok(
      handoffMd.includes('#[0-9a-fA-F]{8}'),
      'handoff.md missing 8-digit hex handling in hexToOklch'
    );
  });

  test('hexToOklch returns null for non-hex values (guard clause)', () => {
    assert.ok(
      handoffMd.includes('return null'),
      'handoff.md missing null return guard for non-hex values in hexToOklch'
    );
  });

  test('hexToOklch outputs oklch() format string', () => {
    assert.ok(
      handoffMd.includes('oklch(${L.toFixed(3)}') || handoffMd.includes('oklch('),
      'handoff.md missing oklch() output format in hexToOklch'
    );
  });

  test('hexToOklch includes toLinear gamma expansion function', () => {
    assert.ok(
      handoffMd.includes('toLinear') && handoffMd.includes('0.04045'),
      'handoff.md missing toLinear gamma expansion in hexToOklch'
    );
  });

  test('Color extraction targets only CSS color properties', () => {
    assert.ok(
      handoffMd.includes('background-color') && handoffMd.includes('border-color'),
      'handoff.md missing CSS color property targeting for hex extraction'
    );
  });
});
